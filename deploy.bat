@echo off
REM CRMS Web v2 - Deployment Script for Windows
echo 🚀 Starting CRMS Web v2 deployment process...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the CRMS_WEB_v2 directory.
    pause
    exit /b 1
)

REM Check if vercel.json exists
if not exist "vercel.json" (
    echo ❌ Error: vercel.json not found. Please ensure it's created before deployment.
    pause
    exit /b 1
)

echo ✅ Project structure verified

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

if %errorlevel% neq 0 (
    echo ❌ Error: Failed to install dependencies
    pause
    exit /b 1
)

REM Test build locally
echo 🔨 Testing local build...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Error: Local build failed. Please fix build issues before deploying.
    pause
    exit /b 1
)

echo ✅ Local build successful

REM Check if git is initialized
if not exist ".git" (
    echo ❌ Error: Git repository not initialized. Please run 'git init' first.
    pause
    exit /b 1
)

REM Check git status
echo 📝 Checking git status...
git status

REM Add all changes
echo 📝 Adding changes to git...
git add .

REM Commit changes
echo 💾 Committing changes...
git commit -m "Prepare for Vercel deployment - %date% %time%"

REM Push to remote
echo 🚀 Pushing to remote repository...
git push origin main

if %errorlevel% neq 0 (
    echo ❌ Error: Failed to push to remote repository
    pause
    exit /b 1
)

echo ✅ Changes pushed successfully!

echo.
echo 🎉 Deployment preparation complete!
echo.
echo Next steps:
echo 1. Go to https://vercel.com
echo 2. Sign in with your GitHub account
echo 3. Click 'New Project'
echo 4. Import your repository: chappykun24/CRMS_WEB_V2
echo 5. Configure project settings:
echo    - Framework Preset: Vite
echo    - Root Directory: ./
echo    - Build Command: npm run build
echo    - Output Directory: dist
echo 6. Add environment variables if needed
echo 7. Click 'Deploy'
echo.
echo Your vercel.json is already configured with:
echo ✅ SPA routing
echo ✅ Security headers
echo ✅ Asset caching
echo ✅ Node.js runtime configuration
echo.
echo Good luck with your deployment! 🚀
pause
