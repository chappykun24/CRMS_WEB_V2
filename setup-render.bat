@echo off
echo 🚀 CRMS Render Setup Script
echo ==========================
echo.

REM Check if we're in the right directory
if not exist "backend\package.json" (
    echo ❌ Error: Please run this script from the project root directory
    pause
    exit /b 1
)

echo ✅ Project structure verified
echo.

REM Check if backend dependencies are installed
echo 📦 Checking backend dependencies...
cd backend
if not exist "node_modules" (
    echo Installing backend dependencies...
    call npm install
) else (
    echo ✅ Backend dependencies already installed
)
cd ..

echo.

REM Check if frontend dependencies are installed
echo 📦 Checking frontend dependencies...
cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
) else (
    echo ✅ Frontend dependencies already installed
)
cd ..

echo.

REM Create environment template files
echo 📝 Creating environment template files...

REM Backend environment template
(
echo # Database Configuration
echo NEON_HOST=your-neon-host
echo NEON_DATABASE=your-database-name
echo NEON_USER=your-username
echo NEON_PASSWORD=your-password
echo NEON_PORT=5432
echo.
echo # Application Configuration
echo NODE_ENV=production
echo PORT=3001
echo FRONTEND_URL=https://your-frontend-domain.vercel.app
echo.
echo # JWT Configuration
echo JWT_SECRET=your-super-secret-jwt-key-here
echo.
echo # CORS Configuration
echo CORS_ORIGIN=https://your-frontend-domain.vercel.app
) > backend\.env.template

REM Frontend environment template
(
echo # API Configuration
echo VITE_API_BASE_URL=https://your-backend-url.onrender.com/api
echo.
echo # App Configuration
echo VITE_APP_NAME=CRMS
echo VITE_APP_VERSION=2.0.0
) > frontend\.env.template

echo ✅ Environment templates created
echo.

REM Test frontend build
echo 🏗️  Testing frontend build...
cd frontend
call npm run build >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Frontend build successful
) else (
    echo ❌ Frontend build failed
    pause
    exit /b 1
)
cd ..

echo.

REM Display next steps
echo 🎯 Next Steps:
echo ==============
echo.
echo 1. 📚 Read the RENDER_SETUP_GUIDE.md for detailed instructions
echo 2. 🗄️  Set up your Neon PostgreSQL database
echo 3. 🚀 Deploy backend to Render
echo 4. 🌐 Deploy frontend to Vercel
echo 5. 🔗 Update environment variables
echo 6. 🧪 Test your deployment
echo.
echo 📋 Quick Commands:
echo ==================
echo.
echo Backend (local):
echo   cd backend ^&^& npm run dev
echo.
echo Frontend (local):
echo   cd frontend ^&^& npm run dev
echo.
echo Build frontend:
echo   cd frontend ^&^& npm run build
echo.
echo 🎉 Your project is ready for deployment!
echo.
echo 📖 For detailed instructions, see: RENDER_SETUP_GUIDE.md
echo.
pause
