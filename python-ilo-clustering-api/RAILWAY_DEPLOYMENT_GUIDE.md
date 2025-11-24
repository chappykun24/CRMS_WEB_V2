# 🚂 Complete Railway Deployment Guide - ILO Clustering API

This guide will walk you through deploying the ILO Clustering API to Railway step-by-step with detailed screenshots references and troubleshooting.

---

## 📋 Prerequisites

Before starting, make sure you have:
- ✅ A Railway account (sign up at https://railway.app)
- ✅ Your GitHub repository connected (or ready to connect)
- ✅ Access to your Render backend to copy the `DATABASE_URL`

---

## 🚀 Step 1: Create Railway Account & Project

### 1.1 Sign Up/Login to Railway
1. Go to **https://railway.app**
2. Click **"Start a New Project"** or **"Login"**
3. If new, sign up with:
   - GitHub account (recommended)
   - Email address
   - Or Google account

### 1.2 Create New Project
1. After logging in, click the **"+"** button or **"New Project"**
2. You'll see deployment options:
   - **Deploy from GitHub repo** ⭐ (Recommended)
   - **Deploy a template**
   - **Empty project**

---

## 📦 Step 2: Connect GitHub Repository

### 2.1 Select Deployment Method
1. Click **"Deploy from GitHub repo"**
2. Railway will ask for GitHub permissions:
   - Click **"Configure GitHub App"**
   - Select which repositories to give access:
     - **All repositories** (if you trust Railway)
     - **Only select repositories** (recommended for security)
   - Select your repository: `CRMS_WEB_V3` or `CRMS_WEB_V2`
   - Click **"Install"**

### 2.2 Select Repository
1. Railway will show your repositories
2. Find and click on your repository: `CRMS_WEB_V3` or `CRMS_WEB_V2`
3. Railway will start detecting the project structure

---

## ⚙️ Step 3: Configure Service Settings

### 3.1 Set Root Directory (CRITICAL!)
1. After selecting the repository, Railway may show a configuration screen
2. **Look for "Root Directory" or "Service Root"**
3. **IMPORTANT**: Set it to: `python-ilo-clustering-api`
   - This tells Railway to use only the `python-ilo-clustering-api` folder as the root
   - Without this, Railway won't find your `app.py` or `requirements.txt`
4. If you don't see this option immediately:
   - Wait for Railway to finish auto-detecting
   - After deployment starts, go to **Settings** tab
   - Scroll down to find **"Root Directory"** section
   - Click on the input field (currently shows `/` or empty)
   - Enter: `python-ilo-clustering-api`
   - Click **"Save"** or press Enter

**Visual Guide:**
- In Settings tab, look for a section labeled **"Root Directory"** or **"Service Root"**
- It's usually near the top, below the "Builder" section
- The input field should show `/` by default
- Change it to: `python-ilo-clustering-api` (no leading slash needed)

### 3.2 Configure Start Command
1. In the **Settings** tab, scroll to the **"Deploy"** section
2. Look for **"Custom Start Command"** subsection
3. Click the **"+ Start Command"** button
4. Enter the start command:
   ```
   gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 2 --timeout 300
   ```
5. Click **"Save"** or press Enter

**Note**: Railway should auto-detect this from your `Procfile`, but if it doesn't, you can set it manually here.

### 3.3 Verify Builder Settings
1. In **Settings** tab, check the **"Builder"** section
2. You should see **"Railpack"** selected (this is correct)
3. **Do NOT enable "Metal Build Environment"** (it's in beta and not recommended for production)
4. Leave the builder as **"Railpack"** (default)

### 3.4 Verify Auto-Detection
Railway should automatically detect:
- ✅ **Language**: Python (from `requirements.txt` and `app.py`)
- ✅ **Build Command**: `pip install -r requirements.txt` (auto-detected)
- ✅ **Start Command**: From `Procfile` or the custom command you set

If not automatically detected:
- Go to **Settings** → **Deploy** section
- Set **Custom Start Command** as shown in step 3.2 above

---

## 🔐 Step 4: Set Environment Variables

### 4.1 Open Variables Tab
1. Click on your service (it should be building/deploying)
2. Go to the **"Variables"** tab (top navigation)

### 4.2 Add DATABASE_URL
1. Click **"New Variable"** or **"+"** button
2. In the variable form:
   - **Name**: `DATABASE_URL`
   - **Value**: Copy from your Render backend
     - Go to Render dashboard → Your backend service → Environment tab
     - Find `DATABASE_URL` and copy its value
     - Paste into Railway
   - **Apply to**: All environments (default)
3. Click **"Add"** or **"Save"**

**Example DATABASE_URL format:**
```
postgresql://user:password@host:port/database?sslmode=require
```

### 4.3 Verify Variables
Your variables tab should now show:
- ✅ `DATABASE_URL` (your database connection string)
- ✅ `PORT` (automatically set by Railway, usually `10000` or similar)

**Note**: Railway automatically sets `PORT` - you don't need to add it manually.

---

## 🌐 Step 5: Generate Public Domain

### 5.1 Access Networking Settings
1. Click on your service
2. Go to **"Settings"** tab
3. Scroll down to **"Networking"** section

### 5.2 Generate Domain
1. Under **"Domains"**, you'll see options:
   - **Railway Domain** (auto-generated, like `your-service-production.up.railway.app`)
   - **Custom Domain** (optional, for your own domain)
2. If Railway domain is not visible:
   - Click **"Generate Domain"** button
   - Railway will create a URL like: `https://your-service-production.up.railway.app`
3. **Copy this URL** - you'll need it for the next step!

### 5.3 Test Your Domain
1. Open the Railway domain URL in your browser
2. You should see:
   ```json
   {
     "status": "healthy",
     "service": "ILO Clustering API",
     "timestamp": "2024-..."
   }
   ```
3. If you see this, your service is working! ✅

---

## 🔄 Step 6: Update Render Backend

### 6.1 Access Render Dashboard
1. Go to **https://dashboard.render.com**
2. Sign in to your account
3. Find your backend service: `crms-backend-api`

### 6.2 Add Environment Variable
1. Click on your backend service
2. In the left sidebar, click **"Environment"**
3. Scroll down to see existing environment variables
4. Click **"Add Environment Variable"** button

### 6.3 Set ILO_CLUSTERING_API_URL
1. In the form:
   - **Key**: `ILO_CLUSTERING_API_URL`
   - **Value**: Paste the Railway URL from Step 5.2
     - Example: `https://your-service-production.up.railway.app`
   - **Note**: Make sure there's NO trailing slash (`/`)
2. Click **"Save Changes"**

### 6.4 Trigger Redeploy
1. After saving, Render will show: **"Environment variables updated"**
2. Render will automatically:
   - Trigger a new deployment
   - Restart the service with new environment variables
3. Wait 1-2 minutes for deployment to complete

---

## ✅ Step 7: Verify Everything Works

### 7.1 Check Railway Service Health
1. Open your Railway domain in browser
2. Visit: `https://your-service.up.railway.app/`
3. Should return:
   ```json
   {
     "status": "healthy",
     "service": "ILO Clustering API",
     "timestamp": "..."
   }
   ```

### 7.2 Check Render Backend Logs
1. Go to Render dashboard → Your backend service
2. Click **"Logs"** tab
3. Look for messages like:
   ```
   🌐 [ILO CLUSTERING] Calling Railway API: https://your-service.up.railway.app
   ```
4. You should **NOT** see:
   - ❌ `ILO_CLUSTERING_API_URL environment variable is not set`
   - ❌ `ModuleNotFoundError: No module named 'psycopg2'`

### 7.3 Test Clustering Feature
1. Go to your application
2. Navigate to Dean's ILO Attainment page
3. Enable clustering toggle
4. Select a class and ILO
5. Check if clusters load successfully

---

## 🔍 Troubleshooting Guide

### Problem: Railway Service Won't Start

**Symptoms:**
- Service shows "Crashed" or "Failed" status
- Build completes but service won't start

**Solutions:**
1. **Check Railway Logs**:
   - Go to your service → **"Deployments"** tab
   - Click on the latest deployment
   - View **"Build Logs"** and **"Deploy Logs"**
   - Look for error messages

2. **Common Issues:**
   - **"Module not found"**: Check `requirements.txt` includes all dependencies
   - **"Script not found"**: Verify `scripts/ilo-clustering-analysis.py` exists
   - **"Port already in use"**: Railway handles this automatically

3. **Fix Root Directory**:
   - Settings → Root Directory → Set to `python-ilo-clustering-api`

---

### Problem: Database Connection Fails

**Symptoms:**
- Service starts but clustering requests fail
- Logs show: `could not connect to server` or `authentication failed`

**Solutions:**
1. **Verify DATABASE_URL**:
   - Check Railway Variables → `DATABASE_URL` is set correctly
   - Ensure it matches your Render backend `DATABASE_URL`

2. **Test Database Connection**:
   - Copy `DATABASE_URL` from Railway
   - Test with a PostgreSQL client
   - Verify credentials are correct

3. **Check Database Firewall**:
   - Some databases restrict connections
   - May need to whitelist Railway IPs
   - Check your database provider's settings

---

### Problem: Backend Still Shows Error

**Symptoms:**
- Render backend logs show: `ILO_CLUSTERING_API_URL environment variable is not set`
- Clustering feature doesn't work

**Solutions:**
1. **Verify Environment Variable**:
   - Render → Your backend → Environment tab
   - Confirm `ILO_CLUSTERING_API_URL` exists
   - Value should be Railway URL (no trailing slash)

2. **Force Redeploy**:
   - Render → Your backend → Manual Deploy → Deploy latest commit
   - This ensures environment variables are loaded

3. **Check Variable Name**:
   - Must be exactly: `ILO_CLUSTERING_API_URL`
   - Case-sensitive!

---

### Problem: Railway Service Times Out

**Symptoms:**
- Requests to Railway API timeout
- Service responds but takes too long

**Solutions:**
1. **Check Service Logs**:
   - Railway → Your service → Logs
   - Look for slow database queries
   - Check for errors in clustering script

2. **Increase Timeout**:
   - Railway automatically handles timeouts
   - If needed, adjust in `Procfile`:
     ```
     web: gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 2 --timeout 600
     ```

3. **Optimize Database Queries**:
   - Check clustering script for slow queries
   - Add database indexes if needed

---

### Problem: Script Not Found Error

**Symptoms:**
- Railway logs show: `Script directory not found` or `ilo-clustering-analysis.py not found`

**Solutions:**
1. **Verify File Structure**:
   - In your repository, confirm:
     ```
     python-ilo-clustering-api/
     └── scripts/
         └── ilo-clustering-analysis.py
     ```

2. **Check Root Directory**:
   - Railway Settings → Root Directory
   - Should be: `python-ilo-clustering-api`
   - NOT: `/` or empty

3. **Rebuild Service**:
   - Railway → Your service → Deployments
   - Click **"Redeploy"** to rebuild

---

## 📊 Monitoring & Logs

### View Railway Logs
1. **Service Logs**:
   - Railway → Your service → **"Logs"** tab
   - Shows real-time logs
   - Useful for debugging

2. **Deployment Logs**:
   - Railway → Your service → **"Deployments"** tab
   - Click on a deployment
   - View **Build Logs** and **Deploy Logs**

### View Render Logs
1. Render → Your backend service → **"Logs"** tab
2. Filter for: `[ILO CLUSTERING]` to see clustering-related logs

---

## 🔄 Updating/Re-deploying

### After Code Changes
1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Update clustering API"
   git push
   ```

2. **Railway Auto-Deploys**:
   - Railway watches your GitHub repo
   - Automatically deploys on push
   - Check Railway dashboard for deployment status

### Manual Redeploy
1. Railway → Your service → **"Deployments"** tab
2. Click **"Redeploy"** button
3. Select which commit to deploy

---

## 💰 Railway Pricing & Limits

### Free Tier
- **$5 credit per month** (enough for small projects)
- **500 hours** of build time
- **Automatic sleep** after inactivity
- **Public domain** included

### If You Need More
- Railway Pro: $20/month for always-on services
- Check Railway dashboard for usage

---

## 📞 Getting Help

### Railway Support
- **Documentation**: https://docs.railway.app
- **Discord**: https://discord.gg/railway
- **Email**: support@railway.app

### Common Railway Commands (CLI)
If you install Railway CLI:
```bash
railway login              # Login to Railway
railway status             # Check service status
railway logs               # View logs
railway domain             # Show domain URL
railway variables          # List environment variables
```

---

## ✅ Deployment Checklist

Before considering deployment complete, verify:

- [ ] Railway service is running (status: "Running")
- [ ] Railway domain is accessible (health check works)
- [ ] `DATABASE_URL` is set in Railway
- [ ] `ILO_CLUSTERING_API_URL` is set in Render backend
- [ ] Backend logs show Railway API calls
- [ ] Clustering feature works in application
- [ ] No errors in Railway logs
- [ ] No errors in Render backend logs

---

## 🎉 Success!

Once all checklist items are checked, your ILO Clustering API is fully deployed and operational!

The clustering feature should now work without any "ModuleNotFoundError" or "environment variable not set" errors.

---

## 📝 Quick Reference

### Railway Service URL Format
```
https://[service-name]-[project-hash].up.railway.app
```

### Environment Variables Needed

**In Railway:**
- `DATABASE_URL` - PostgreSQL connection string

**In Render Backend:**
- `ILO_CLUSTERING_API_URL` - Railway service URL

### Important Files Structure
```
python-ilo-clustering-api/
├── app.py                          # Flask API
├── requirements.txt                # Python dependencies
├── Procfile                        # Process configuration
├── railway.json / railway.toml     # Railway config
└── scripts/
    └── ilo-clustering-analysis.py  # Clustering script
```

---

**Last Updated**: Based on Railway platform as of 2024
**Support**: For issues, check logs first, then Railway/Render documentation

