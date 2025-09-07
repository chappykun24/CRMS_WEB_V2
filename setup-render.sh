#!/bin/bash

# CRMS Render Setup Script
# This script helps you prepare your project for Render deployment

echo "🚀 CRMS Render Setup Script"
echo "=========================="
echo ""

# Check if we're in the right directory
if [ ! -f "backend/package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "✅ Project structure verified"
echo ""

# Check if backend dependencies are installed
echo "📦 Checking backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
else
    echo "✅ Backend dependencies already installed"
fi
cd ..

echo ""

# Check if frontend dependencies are installed
echo "📦 Checking frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
else
    echo "✅ Frontend dependencies already installed"
fi
cd ..

echo ""

# Create environment template files
echo "📝 Creating environment template files..."

# Backend environment template
cat > backend/.env.template << EOF
# Database Configuration
NEON_HOST=your-neon-host
NEON_DATABASE=your-database-name
NEON_USER=your-username
NEON_PASSWORD=your-password
NEON_PORT=5432

# Application Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend-domain.vercel.app

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.vercel.app
EOF

# Frontend environment template
cat > frontend/.env.template << EOF
# API Configuration
VITE_API_BASE_URL=https://your-backend-url.onrender.com/api

# App Configuration
VITE_APP_NAME=CRMS
VITE_APP_VERSION=2.0.0
EOF

echo "✅ Environment templates created"
echo ""

# Test backend locally
echo "🧪 Testing backend locally..."
cd backend
echo "Starting backend server for testing..."
timeout 10s npm run dev > /dev/null 2>&1 &
BACKEND_PID=$!

sleep 3

# Test health endpoint
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Backend health check passed"
else
    echo "⚠️  Backend health check failed (this is normal if database is not configured)"
fi

# Kill the test server
kill $BACKEND_PID 2>/dev/null
cd ..

echo ""

# Test frontend build
echo "🏗️  Testing frontend build..."
cd frontend
if npm run build > /dev/null 2>&1; then
    echo "✅ Frontend build successful"
else
    echo "❌ Frontend build failed"
    exit 1
fi
cd ..

echo ""

# Display next steps
echo "🎯 Next Steps:"
echo "=============="
echo ""
echo "1. 📚 Read the RENDER_SETUP_GUIDE.md for detailed instructions"
echo "2. 🗄️  Set up your Neon PostgreSQL database"
echo "3. 🚀 Deploy backend to Render"
echo "4. 🌐 Deploy frontend to Vercel"
echo "5. 🔗 Update environment variables"
echo "6. 🧪 Test your deployment"
echo ""
echo "📋 Quick Commands:"
echo "=================="
echo ""
echo "Backend (local):"
echo "  cd backend && npm run dev"
echo ""
echo "Frontend (local):"
echo "  cd frontend && npm run dev"
echo ""
echo "Build frontend:"
echo "  cd frontend && npm run build"
echo ""
echo "🎉 Your project is ready for deployment!"
echo ""
echo "📖 For detailed instructions, see: RENDER_SETUP_GUIDE.md"
