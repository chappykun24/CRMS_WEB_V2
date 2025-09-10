#!/bin/bash

echo "Deploying CRMS Frontend to Vercel..."

cd frontend

echo "Building frontend..."
npm run build

echo "Deploying to Vercel..."
vercel --prod

echo "Deployment complete!"
