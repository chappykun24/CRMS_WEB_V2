#!/bin/sh
set -e

# Get PORT from environment or default to 10000
PORT=${PORT:-10000}

echo "========================================="
echo "Starting Python Clustering API"
echo "PORT environment variable: ${PORT}"
echo "Working directory: $(pwd)"
echo "Files in /app: $(ls -la)"
echo "========================================="

# Start Gunicorn
exec gunicorn app:app \
    --bind 0.0.0.0:$PORT \
    --workers 2 \
    --threads 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info

