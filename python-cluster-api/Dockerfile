FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .

# Expose port (Railway will set PORT)
EXPOSE 10000

# Run the application
# Use exec form with sh -c to properly expand PORT environment variable
CMD ["sh", "-c", "gunicorn app:app --bind 0.0.0.0:${PORT:-10000} --workers 2 --threads 2 --timeout 120 --access-logfile - --error-logfile -"]