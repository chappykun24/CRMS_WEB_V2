# CRMS Web v2 - Deployment Script for PowerShell
Write-Host "🚀 Starting CRMS Web v2 deployment process..." -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Please run this script from the CRMS_WEB_v2 directory." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if vercel.json exists
if (-not (Test-Path "vercel.json")) {
    Write-Host "❌ Error: vercel.json not found. Please ensure it's created before deployment." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Project structure verified" -ForegroundColor Green

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
} catch {
    Write-Host "❌ Error: Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Test build locally
Write-Host "🔨 Testing local build..." -ForegroundColor Yellow
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "npm run build failed"
    }
} catch {
    Write-Host "❌ Error: Local build failed. Please fix build issues before deploying." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Local build successful" -ForegroundColor Green

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "❌ Error: Git repository not initialized. Please run 'git init' first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check git status
Write-Host "📝 Checking git status..." -ForegroundColor Yellow
git status

# Add all changes
Write-Host "📝 Adding changes to git..." -ForegroundColor Yellow
git add .

# Commit changes
Write-Host "💾 Committing changes..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "Prepare for Vercel deployment - $timestamp"

# Push to remote
Write-Host "🚀 Pushing to remote repository..." -ForegroundColor Yellow
try {
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        throw "git push failed"
    }
} catch {
    Write-Host "❌ Error: Failed to push to remote repository" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Changes pushed successfully!" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Deployment preparation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to https://vercel.com" -ForegroundColor White
Write-Host "2. Sign in with your GitHub account" -ForegroundColor White
Write-Host "3. Click 'New Project'" -ForegroundColor White
Write-Host "4. Import your repository: chappykun24/CRMS_WEB_V2" -ForegroundColor White
Write-Host "5. Configure project settings:" -ForegroundColor White
Write-Host "   - Framework Preset: Vite" -ForegroundColor White
Write-Host "   - Root Directory: ./" -ForegroundColor White
Write-Host "   - Build Command: npm run build" -ForegroundColor White
Write-Host "   - Output Directory: dist" -ForegroundColor White
Write-Host "6. Add environment variables if needed" -ForegroundColor White
Write-Host "7. Click 'Deploy'" -ForegroundColor White
Write-Host ""
Write-Host "Your vercel.json is already configured with:" -ForegroundColor Cyan
Write-Host "✅ SPA routing" -ForegroundColor Green
Write-Host "✅ Security headers" -ForegroundColor Green
Write-Host "✅ Asset caching" -ForegroundColor Green
Write-Host "✅ Node.js runtime configuration" -ForegroundColor Green
Write-Host ""
Write-Host "Good luck with your deployment! 🚀" -ForegroundColor Green
Read-Host "Press Enter to exit"
