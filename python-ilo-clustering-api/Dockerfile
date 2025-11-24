FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Flask app
COPY app.py .

# Copy scripts directory (should be in python-ilo-clustering-api/scripts/)
COPY scripts/ ./scripts/

# Expose port
EXPOSE 10001

# Run with gunicorn
CMD ["sh", "-c", "gunicorn app:app --bind 0.0.0.0:${PORT:-10001} --workers 1 --threads 2 --timeout 300 --access-logfile - --error-logfile -"]

