@echo off
echo CRMS Health Check

echo.
echo Checking backend health...
curl -s https://crms-backend-api.onrender.com/api/health
if %errorlevel% neq 0 (
    echo Backend health check failed!
) else (
    echo Backend is healthy!
)

echo.
echo Checking frontend...
echo Frontend should be accessible at your Vercel URL

echo.
echo Health check complete!
pause
