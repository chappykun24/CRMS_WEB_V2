#!/bin/bash

# CRMS Web v2 - Deployment Script
echo "🚀 Starting CRMS Web v2 deployment process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the CRMS_WEB_v2 directory."
    exit 1
fi

# Check if vercel.json exists
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: vercel.json not found. Please ensure it's created before deployment."
    exit 1
fi

echo "✅ Project structure verified"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to install dependencies"
    exit 1
fi

# Test build locally
echo "🔨 Testing local build..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error: Local build failed. Please fix build issues before deploying."
    exit 1
fi

echo "✅ Local build successful"

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Error: Git repository not initialized. Please run 'git init' first."
    exit 1
fi

# Check git status
echo "📝 Checking git status..."
git status

# Add all changes
echo "📝 Adding changes to git..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "Prepare for Vercel deployment - $(date)"

# Push to remote
echo "🚀 Pushing to remote repository..."
git push origin main

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to push to remote repository"
    exit 1
fi

echo "✅ Changes pushed successfully!"

echo ""
echo "🎉 Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Go to https://vercel.com"
echo "2. Sign in with your GitHub account"
echo "3. Click 'New Project'"
echo "4. Import your repository: chappykun24/CRMS_WEB_V2"
echo "5. Configure project settings:"
echo "   - Framework Preset: Vite"
echo "   - Root Directory: ./"
echo "   - Build Command: npm run build"
echo "   - Output Directory: dist"
echo "6. Add environment variables if needed"
echo "7. Click 'Deploy'"
echo ""
echo "Your vercel.json is already configured with:"
echo "✅ SPA routing"
echo "✅ Security headers"
echo "✅ Asset caching"
echo "✅ Node.js runtime configuration"
echo ""
echo "Good luck with your deployment! 🚀"
