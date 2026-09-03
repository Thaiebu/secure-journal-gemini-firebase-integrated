# Production Dockerfile for MindReflect FastAPI Backend
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source code
COPY . .

# Expose standard Cloud Run port
EXPOSE 8080

# Launch FastAPI app with Uvicorn
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT}
