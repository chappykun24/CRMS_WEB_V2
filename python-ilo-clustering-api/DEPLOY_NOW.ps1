# 🚀 One-Click Railway Deployment Script
# Run this script to automatically deploy the ILO Clustering API to Railway

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Railway Deployment - ILO Clustering API               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Step 1: Check Railway CLI
Write-Host "[1/6] Checking Railway CLI..." -ForegroundColor Yellow
try {
    $version = railway --version 2>&1 | Select-String -Pattern "\d+\.\d+\.\d+" | ForEach-Object { $_.Matches.Value }
    Write-Host "      ✅ Railway CLI installed (v$version)" -ForegroundColor Green
} catch {
    Write-Host "      ❌ Railway CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "      Please install Railway CLI first:" -ForegroundColor White
    Write-Host "      npm install -g @railway/cli" -ForegroundColor Cyan
    exit 1
}
Write-Host ""

# Step 2: Check login
Write-Host "[2/6] Checking Railway login..." -ForegroundColor Yellow
try {
    $whoami = railway whoami 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      ✅ Logged in as: $($whoami.Trim())" -ForegroundColor Green
    } else {
        throw "Not logged in"
    }
} catch {
    Write-Host "      ⚠️  Not logged in to Railway" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "      Opening Railway login..." -ForegroundColor White
    Write-Host "      (This will open your browser)" -ForegroundColor Gray
    Write-Host ""
    Start-Sleep -Seconds 2
    railway login
    
    # Wait for login to complete
    Write-Host ""
    Write-Host "      Waiting for login to complete..." -ForegroundColor White
    Start-Sleep -Seconds 3
    
    # Verify login
    try {
        railway whoami | Out-Null
        Write-Host "      ✅ Login successful!" -ForegroundColor Green
    } catch {
        Write-Host "      ❌ Login failed. Please try again." -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Step 3: Link project
Write-Host "[3/6] Setting up Railway project..." -ForegroundColor Yellow
$linkFile = Join-Path $scriptDir ".railway" | Join-Path -ChildPath "link.json"
if (-not (Test-Path $linkFile)) {
    Write-Host "      📦 Linking to Railway project..." -ForegroundColor White
    Write-Host "      (Select or create a project when prompted)" -ForegroundColor Gray
    Write-Host ""
    
    railway init
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "      ❌ Failed to link project" -ForegroundColor Red
        exit 1
    }
    Write-Host "      ✅ Project linked" -ForegroundColor Green
} else {
    Write-Host "      ✅ Already linked to Railway project" -ForegroundColor Green
}
Write-Host ""

# Step 4: Check DATABASE_URL
Write-Host "[4/6] Checking environment variables..." -ForegroundColor Yellow
try {
    $vars = railway variables 2>&1 | Out-String
    if ($vars -match "DATABASE_URL") {
        Write-Host "      ✅ DATABASE_URL is set" -ForegroundColor Green
    } else {
        Write-Host "      ⚠️  DATABASE_URL not found" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "      Enter your DATABASE_URL (or press Enter to skip):" -ForegroundColor White
        $dbUrl = Read-Host "      DATABASE_URL"
        
        if ($dbUrl -ne "") {
            railway variables set "DATABASE_URL=$dbUrl" | Out-Null
            Write-Host "      ✅ DATABASE_URL set" -ForegroundColor Green
        } else {
            Write-Host "      ⚠️  Skipping DATABASE_URL (set it later in Railway dashboard)" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "      ⚠️  Could not check variables" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Deploy
Write-Host "[5/6] Deploying to Railway..." -ForegroundColor Yellow
Write-Host "      This may take 2-5 minutes. Please wait..." -ForegroundColor Gray
Write-Host ""

try {
    railway up
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      ✅ Deployment successful!" -ForegroundColor Green
    } else {
        throw "Deployment failed"
    }
} catch {
    Write-Host "      ❌ Deployment failed" -ForegroundColor Red
    Write-Host "      Check the errors above for details." -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Step 6: Get URL
Write-Host "[6/6] Getting service URL..." -ForegroundColor Yellow
try {
    $domain = (railway domain 2>&1).ToString().Trim()
    
    if ($domain -match "https?://") {
        Write-Host ""
        Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║              🎉 Deployment Complete!                     ║" -ForegroundColor Green
        Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
        Write-Host ""
        Write-Host "   Your Railway Service URL:" -ForegroundColor White
        Write-Host "   $domain" -ForegroundColor Cyan -BackgroundColor Black
        Write-Host ""
        Write-Host "   📝 Next Steps:" -ForegroundColor Yellow
        Write-Host "   1. Copy the URL above" -ForegroundColor White
        Write-Host "   2. Go to Render dashboard → Backend service → Environment" -ForegroundColor White
        Write-Host "   3. Add: ILO_CLUSTERING_API_URL=$domain" -ForegroundColor White
        Write-Host "   4. Save and redeploy your backend" -ForegroundColor White
        Write-Host ""
        
        # Copy to clipboard if possible
        try {
            $domain | Set-Clipboard
            Write-Host "   ✨ URL copied to clipboard!" -ForegroundColor Green
            Write-Host ""
        } catch {
            # Clipboard copy failed, that's okay
        }
    } else {
        throw "Invalid domain format"
    }
} catch {
    Write-Host "      ⚠️  Could not get domain automatically" -ForegroundColor Yellow
    Write-Host "      Check Railway dashboard for your service URL" -ForegroundColor White
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
