@echo off
echo Deploying CRMS Frontend to Vercel...

cd frontend

echo Building frontend...
call npm run build

echo Deploying to Vercel...
call vercel --prod

echo Deployment complete!
pause
