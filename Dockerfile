# Dockerfile - Multi-stage build for Slotify
# Build stage for backend
FROM node:16-alpine AS backend-build

WORKDIR /app

# Copy backend package files
COPY package*.json ./
RUN npm ci --only=production

# Copy backend source code
COPY backend/ ./backend/
COPY .env.example ./.env

# Build stage for frontend
FROM node:16-alpine AS frontend-build

WORKDIR /app

# Copy frontend package files
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci

# Copy frontend source code
COPY frontend/ ./
RUN npm run build

# Production stage
FROM node:16-alpine

# Install necessary packages
RUN apk add --no-cache \
    mongodb-tools \
    curl

WORKDIR /app

# Copy backend from build stage
COPY --from=backend-build /app/node_modules ./node_modules
COPY --from=backend-build /app/backend ./backend
COPY --from=backend-build /app/.env ./.env
COPY package*.json ./

# Copy frontend build
COPY --from=frontend-build /app/frontend/build ./frontend/build

# Create required directories
RUN mkdir -p uploads/reports

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start command
CMD ["node", "backend/server.js"]
