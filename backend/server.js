// server.js - Main Backend Server for Slotify
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');
const socketIO = require('socket.io');
const http = require('http');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

// Import routes
const triageRoutes = require('./routes/triage');
const queueRoutes = require('./routes/queue');
const patientRoutes = require('./routes/patient');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');

// Import database config
const connectDB = require('./config/database');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    methods: ['GET', 'POST']
  }
});

// Connect to Database
connectDB();

// Security Middleware
app.use(helmet());
app.use(compression());

// CORS Configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body Parser Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static Files (for uploaded images/reports)
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/triage', triageRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/admin', adminRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Slotify API is running',
    timestamp: new Date().toISOString()
  });
});

// Socket.io for Real-time Updates
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Join patient to their token room
  socket.on('join-token-room', (tokenId) => {
    socket.join(`token-${tokenId}`);
    console.log(`Socket ${socket.id} joined room: token-${tokenId}`);
  });
  
  // Admin joins queue management room
  socket.on('join-admin-room', () => {
    socket.join('admin-queue');
    console.log(`Admin ${socket.id} joined admin room`);
  });
  
  // Handle queue updates
  socket.on('queue-updated', (data) => {
    // Broadcast to all connected clients
    io.emit('queue-update', data);
  });
  
  // Handle token updates
  socket.on('token-updated', (data) => {
    // Send to specific patient room
    io.to(`token-${data.tokenId}`).emit('token-update', data);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
    🏥 Slotify Server Started Successfully!
    📍 Server running on port ${PORT}
    🔗 API URL: http://localhost:${PORT}/api
    🚀 Environment: ${process.env.NODE_ENV || 'development'}
    📊 Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}
  `);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = { app, io };
