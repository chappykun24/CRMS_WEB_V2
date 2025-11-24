# 🚀 Automated Railway Deployment

I've installed Railway CLI and created deployment scripts! Follow these steps:

## Quick Deploy (3 Steps)

### Step 1: Login to Railway

Run this command:
```bash
railway login
```

This will:
- Open your browser
- Ask you to authorize Railway
- Save your credentials

### Step 2: Run the Deployment Script

**Windows PowerShell:**
```powershell
cd python-ilo-clustering-api
.\deploy-railway.ps1
```

**Linux/Mac:**
```bash
cd python-ilo-clustering-api
chmod +x deploy-railway.sh
./deploy-railway.sh
```

**Or use Node.js script:**
```bash
cd python-ilo-clustering-api
node deploy-railway.js
```

### Step 3: Set Environment Variables

When prompted, set your DATABASE_URL:
```bash
railway variables set DATABASE_URL="your-database-connection-string"
```

## What the Script Does

1. ✅ Checks if Railway CLI is installed
2. ✅ Verifies you're logged in
3. ✅ Links to Railway project (or creates new)
4. ✅ Checks environment variables
5. ✅ Deploys your service
6. ✅ Gets your service URL
7. ✅ Shows you next steps

## Manual Deployment (Alternative)

If you prefer to do it manually:

```bash
cd python-ilo-clustering-api

# Login (if not already)
railway login

# Initialize project
railway init

# Set database URL
railway variables set DATABASE_URL="your-database-url"

# Deploy
railway up

# Get your URL
railway domain
```

## After Deployment

1. Copy your Railway service URL
2. Go to Render dashboard → Backend service → Environment
3. Add: `ILO_CLUSTERING_API_URL=https://your-service.up.railway.app`
4. Save and redeploy

## Need Help?

- Railway docs: https://docs.railway.app
- Check logs: `railway logs`
- Check status: `railway status`

