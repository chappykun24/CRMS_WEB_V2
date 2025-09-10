#!/bin/bash

echo "Testing CRMS Application Locally..."

echo ""
echo "Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!

echo ""
echo "Waiting for backend to start..."
sleep 5

echo ""
echo "Starting frontend server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Both servers are starting..."
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait
