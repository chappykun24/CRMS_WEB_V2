#!/bin/bash

# Railway Deployment Script for Linux/Mac
# Automates the deployment of ILO Clustering API to Railway

echo "🚂 Railway Deployment Script for ILO Clustering API"
echo "=================================================="
echo ""

# Check if Railway CLI is installed
check_railway_cli() {
    if command -v railway &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Check prerequisites
echo "📋 Step 1: Checking prerequisites..."
echo ""

if ! check_railway_cli; then
    echo "❌ Railway CLI not found!"
    echo ""
    echo "📦 Installing Railway CLI..."
    echo ""
    echo "Please run this command to install:"
    echo "  curl -fsSL https://railway.app/install.sh | sh"
    echo ""
    echo "OR:"
    echo "  npm install -g @railway/cli"
    echo ""
    echo "After installing, run this script again."
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Check if logged in
echo "📋 Step 2: Checking Railway login status..."
echo ""

if railway whoami &> /dev/null; then
    echo "✅ Logged in to Railway"
    echo ""
else
    echo "❌ Not logged in to Railway"
    echo ""
    echo "🔐 Please login first:"
    echo "  railway login"
    echo ""
    echo "After logging in, run this script again."
    exit 1
fi

# Change to service directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
echo "📁 Working directory: $SCRIPT_DIR"
echo ""

# Check if linked
echo "📋 Step 3: Checking project link..."
echo ""

RAILWAY_LINK_PATH="$SCRIPT_DIR/.railway/link.json"
if [ ! -f "$RAILWAY_LINK_PATH" ]; then
    echo "📦 Linking to Railway project..."
    echo "Please select or create a project when prompted."
    echo ""
    
    if railway link; then
        echo ""
        echo "✅ Project linked"
    else
        echo ""
        echo "❌ Failed to link project"
        echo "Please run: railway link"
        exit 1
    fi
else
    echo "✅ Already linked to Railway project"
fi
echo ""

# Check environment variables
echo "📋 Step 4: Checking environment variables..."
echo ""

VARS=$(railway variables 2>&1)
echo "Current environment variables:"
echo "$VARS"

if ! echo "$VARS" | grep -q "DATABASE_URL"; then
    echo ""
    echo "⚠️  DATABASE_URL not found!"
    echo "Please set it using:"
    echo '  railway variables set DATABASE_URL="your-database-url"'
    echo ""
else
    echo ""
    echo "✅ DATABASE_URL is set"
fi
echo ""

# Deploy
echo "📋 Step 5: Deploying to Railway..."
echo "This may take a few minutes..."
echo ""

if railway up; then
    echo ""
    echo "✅ Deployment initiated!"
    echo ""
else
    echo ""
    echo "❌ Deployment failed"
    echo "Check the error messages above for details."
    exit 1
fi

# Get domain
echo "📋 Step 6: Getting service URL..."
echo ""

DOMAIN=$(railway domain 2>&1 | tr -d '\n')
if [ -n "$DOMAIN" ]; then
    echo "✅ Your Railway service URL:"
    echo "   $DOMAIN"
    echo ""
    echo "📝 Next steps:"
    echo "1. Copy the URL above"
    echo "2. Go to Render dashboard → Your backend service → Environment"
    echo "3. Add: ILO_CLUSTERING_API_URL=$DOMAIN"
    echo ""
else
    echo "⚠️  Could not get domain"
    echo "Please check Railway dashboard for your service URL"
    echo ""
fi

echo "🎉 Deployment complete!"
echo ""

