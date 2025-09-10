@echo off
echo Testing CRMS Application Locally...

echo.
echo Starting backend server...
start "Backend Server" cmd /k "cd backend && npm run dev"

echo.
echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo.
echo Starting frontend server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Press any key to close this window...
pause > nul
