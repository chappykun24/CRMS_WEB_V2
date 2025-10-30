# PowerShell script to create assessments using Neon database
# Replace DATABASE_URL with your actual Neon connection string

$env:DATABASE_URL = "YOUR_NEON_DATABASE_URL_HERE"

if ($env:DATABASE_URL -eq "YOUR_NEON_DATABASE_URL_HERE") {
    Write-Host "❌ Error: Please set your DATABASE_URL in the script first" -ForegroundColor Red
    Write-Host ""
    Write-Host "📝 Edit this file and replace YOUR_NEON_DATABASE_URL_HERE with your Neon connection string" -ForegroundColor Yellow
    Write-Host "   Example: postgresql://user:password@ep-cool-name-123456.us-east-1.aws.neon.tech/dbname?sslmode=require"
    exit 1
}

Write-Host "🚀 Running assessment creation script..." -ForegroundColor Cyan
Write-Host ""

# Parse DATABASE_URL and set individual environment variables
$url = [System.Uri]$env:DATABASE_URL
$env:NEON_HOST = $url.Host
$env:NEON_PORT = $url.Port
$env:NEON_DATABASE = $url.AbsolutePath.TrimStart('/')
$env:NEON_USER = $url.UserInfo.Split(':')[0]
$env:NEON_PASSWORD = $url.UserInfo.Split(':')[1]
$env:NODE_ENV = "production"

# Run the Node.js script
node scripts/create-assessments.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Assessments created successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Failed to create assessments" -ForegroundColor Red
}

