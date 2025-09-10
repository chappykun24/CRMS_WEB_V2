#!/bin/bash

echo "CRMS Health Check"

echo ""
echo "Checking backend health..."
if curl -s https://crms-backend-api.onrender.com/api/health; then
    echo "Backend is healthy!"
else
    echo "Backend health check failed!"
fi

echo ""
echo "Checking frontend..."
echo "Frontend should be accessible at your Vercel URL"

echo ""
echo "Health check complete!"
