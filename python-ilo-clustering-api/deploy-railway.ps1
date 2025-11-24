# Railway Deployment Script for Windows PowerShell
# Automates the deployment of ILO Clustering API to Railway

Write-Host "🚂 Railway Deployment Script for ILO Clustering API" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Railway CLI is installed
function Test-RailwayCLI {
    try {
        $null = railway --version 2>&1
        return $true
    } catch {
        return $false
    }
}

# Check prerequisites
Write-Host "📋 Step 1: Checking prerequisites..." -ForegroundColor Yellow
Write-Host ""

if (-not (Test-RailwayCLI)) {
    Write-Host "❌ Railway CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "📦 Installing Railway CLI..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please run this command to install:" -ForegroundColor White
    Write-Host "  iwr https://railway.app/install.ps1 -useb | iex" -ForegroundColor Green
    Write-Host ""
    Write-Host "OR:" -ForegroundColor White
    Write-Host "  npm install -g @railway/cli" -ForegroundColor Green
    Write-Host ""
    Write-Host "After installing, run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Railway CLI found" -ForegroundColor Green
Write-Host ""

# Check if logged in
Write-Host "📋 Step 2: Checking Railway login status..." -ForegroundColor Yellow
Write-Host ""

try {
    railway whoami 2>&1 | Out-Null
    Write-Host "✅ Logged in to Railway" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Not logged in to Railway" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔐 Please login first:" -ForegroundColor Yellow
    Write-Host "  railway login" -ForegroundColor Green
    Write-Host ""
    Write-Host "After logging in, run this script again." -ForegroundColor Yellow
    exit 1
}

# Change to service directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath
Write-Host "📁 Working directory: $scriptPath" -ForegroundColor Cyan
Write-Host ""

# Check if linked
Write-Host "📋 Step 3: Checking project link..." -ForegroundColor Yellow
Write-Host ""

$railwayLinkPath = Join-Path $scriptPath ".railway\link.json"
if (-not (Test-Path $railwayLinkPath)) {
    Write-Host "📦 Linking to Railway project..." -ForegroundColor Yellow
    Write-Host "Please select or create a project when prompted." -ForegroundColor White
    Write-Host ""
    
    try {
        railway link
        Write-Host ""
        Write-Host "✅ Project linked" -ForegroundColor Green
    } catch {
        Write-Host ""
        Write-Host "❌ Failed to link project" -ForegroundColor Red
        Write-Host "Please run: railway link" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "✅ Already linked to Railway project" -ForegroundColor Green
}
Write-Host ""

# Check environment variables
Write-Host "📋 Step 4: Checking environment variables..." -ForegroundColor Yellow
Write-Host ""

try {
    $vars = railway variables 2>&1
    Write-Host "Current environment variables:"
    Write-Host $vars
    
    if ($vars -notmatch "DATABASE_URL") {
        Write-Host ""
        Write-Host "⚠️  DATABASE_URL not found!" -ForegroundColor Yellow
        Write-Host "Please set it using:" -ForegroundColor White
        Write-Host '  railway variables set DATABASE_URL="your-database-url"' -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "✅ DATABASE_URL is set" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Could not check variables" -ForegroundColor Yellow
}
Write-Host ""

# Deploy
Write-Host "📋 Step 5: Deploying to Railway..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor White
Write-Host ""

try {
    railway up
    Write-Host ""
    Write-Host "✅ Deployment initiated!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    Write-Host "Check the error messages above for details." -ForegroundColor Yellow
    exit 1
}

# Get domain
Write-Host "📋 Step 6: Getting service URL..." -ForegroundColor Yellow
Write-Host ""

try {
    $domain = (railway domain 2>&1).ToString().Trim()
    Write-Host "✅ Your Railway service URL:" -ForegroundColor Green
    Write-Host "   $domain" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Yellow
    Write-Host "1. Copy the URL above"
    Write-Host "2. Go to Render dashboard → Your backend service → Environment"
    Write-Host "3. Add: ILO_CLUSTERING_API_URL=$domain"
    Write-Host ""
} catch {
    Write-Host "⚠️  Could not get domain" -ForegroundColor Yellow
    Write-Host "Please check Railway dashboard for your service URL" -ForegroundColor White
    Write-Host ""
}

Write-Host "🎉 Deployment complete!" -ForegroundColor Green
Write-Host ""

