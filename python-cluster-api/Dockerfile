FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code and startup script
COPY app.py .
COPY start.sh .

# Make startup script executable
RUN chmod +x start.sh

# Expose port (Railway will set PORT)
EXPOSE 10000

# Run the application using the startup script
CMD ./start.sh
