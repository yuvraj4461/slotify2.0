# ai_service/Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install Tesseract (Debian)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY ai_service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ai_service/ .

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
