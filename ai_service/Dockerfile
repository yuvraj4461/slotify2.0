# ai_service/Dockerfile - FastAPI with Tesseract + Gunicorn
FROM python:3.10-slim

# Install system deps (tesseract + libjpeg for pillow etc)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential \
      tesseract-ocr \
      libtesseract-dev \
      libleptonica-dev \
      pkg-config \
      libjpeg-dev \
      zlib1g-dev \
      poppler-utils \
      git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY ai_service/requirements.txt /app/requirements.txt
RUN pip install --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy app source
COPY ai_service/ /app/

# Expose port
ENV PORT 8000
EXPOSE 8000

# Use gunicorn + uvicorn workers
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "app:app", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120"]
