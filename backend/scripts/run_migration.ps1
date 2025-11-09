# PowerShell Migration Script for Windows
# This script runs the Node.js migration script with proper error handling

param(
    [switch]$DryRun,
    [string]$Step = "complete"
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Database Migration Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Build command
$scriptPath = Join-Path $PSScriptRoot "run_migration.js"
$command = "node `"$scriptPath`""

if ($DryRun) {
    $command += " --dry-run"
}

if ($Step -ne "complete") {
    $command += " --step=$Step"
}

Write-Host "Executing: $command`n" -ForegroundColor Yellow

# Run the migration
try {
    Invoke-Expression $command
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host "`n✓ Migration completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "`n✗ Migration failed with exit code: $exitCode" -ForegroundColor Red
        exit $exitCode
    }
} catch {
    Write-Host "`n✗ Error executing migration:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

