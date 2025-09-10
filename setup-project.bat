@echo off
echo Setting up CRMS Project for Development and Deployment...

echo.
echo Installing root dependencies...
call npm install

echo.
echo Installing backend dependencies...
cd backend
call npm install
cd ..

echo.
echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo Building frontend...
cd frontend
call npm run build
cd ..

echo.
echo Setup complete!
echo.
echo To start development:
echo   npm run dev
echo.
echo To deploy backend to Render:
echo   1. Set up Neon database
echo   2. Configure environment variables in Render
echo   3. Deploy using render.yaml
echo.
echo To deploy frontend to Vercel:
echo   cd frontend
echo   vercel --prod
echo.
pause
