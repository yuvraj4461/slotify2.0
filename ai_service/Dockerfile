# ai_service/Dockerfile - FastAPI with Tesseract + OpenCV (headless) + Gunicorn
FROM python:3.10-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies (tesseract, image libs, ffmpeg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    tesseract-ocr \
    libleptonica-dev \
    libtesseract-dev \
    pkg-config \
    libjpeg-dev \
    zlib1g-dev \
    poppler-utils \
    ffmpeg \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install Python packages
COPY requirements.txt /app/requirements.txt
RUN python -m pip install --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy application code
COPY . /app

# Expose port
ENV PORT=8000
EXPOSE 8000

# Use single worker on small instances (change workers if you upgrade plan)
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "app:app", "--bind", "0.0.0.0:8000", "--workers", "1", "--timeout", "120"]
