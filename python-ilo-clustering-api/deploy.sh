#!/bin/bash

# Railway Deployment Script for ILO Clustering API
# This script helps deploy the service to Railway

echo "🚀 ILO Clustering API - Railway Deployment Helper"
echo "=================================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Railway CLI not found. Installing..."
    echo "Please install Railway CLI first:"
    echo "  npm install -g @railway/cli"
    echo "  OR"
    echo "  curl -fsSL https://railway.app/install.sh | sh"
    echo ""
    echo "After installing, run: railway login"
    echo ""
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Not logged in to Railway. Please run: railway login"
    exit 1
fi

echo "✅ Logged in to Railway"
echo ""

# Create new project or use existing
echo "Creating Railway service..."
echo ""

# Link to existing project or create new
read -p "Do you want to link to an existing project? (y/n): " link_existing
if [ "$link_existing" = "y" ]; then
    railway link
else
    railway init
fi

echo ""
echo "📋 Setting up environment variables..."
echo ""

# Get DATABASE_URL from user
read -p "Enter DATABASE_URL (or press Enter to set later in Railway dashboard): " db_url
if [ ! -z "$db_url" ]; then
    railway variables set DATABASE_URL="$db_url"
fi

echo ""
echo "🚀 Deploying to Railway..."
railway up

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "Next steps:"
echo "1. Check deployment status: railway status"
echo "2. View logs: railway logs"
echo "3. Get your service URL: railway domain"
echo "4. Copy the URL and set ILO_CLUSTERING_API_URL in your Render backend"
echo ""

