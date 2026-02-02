# Use official lightweight Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Prevent Python from writing pyc files and buffering stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies (if needed later, but good practice)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (must match app.py or gunicorn config)
EXPOSE 8080

# Run with Gunicorn
# access-logfile - means stdout
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "3", "--access-logfile", "-", "--error-logfile", "-", "app:app"]
