# 🚀 Quick Deployment Checklist - ILO Clustering API

Follow these steps to deploy in **5 minutes**:

## ✅ Step 1: Deploy to Railway (2 minutes)

1. **Open Railway**: Go to https://railway.app
2. **Sign in** or create account (if needed)
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
   - Connect your GitHub account if needed
   - Select your repository: `CRMS_WEB_V3` or `CRMS_WEB_V2`
5. **IMPORTANT**: Set **Root Directory** to: `python-ilo-clustering-api`
6. **Railway will automatically**:
   - Detect Python
   - Install dependencies from `requirements.txt`
   - Start the service

## ✅ Step 2: Set Database URL (1 minute)

1. In Railway, click on your new service
2. Go to **"Variables"** tab
3. Click **"New Variable"**
4. Add:
   - **Name**: `DATABASE_URL`
   - **Value**: Copy from your Render backend → Environment → `DATABASE_URL`
5. Click **"Add"**

## ✅ Step 3: Get Service URL (30 seconds)

1. Still in Railway, go to **"Settings"** tab
2. Scroll to **"Networking"** section
3. Click **"Generate Domain"**
4. **Copy the URL** (e.g., `https://your-service.up.railway.app`)

## ✅ Step 4: Update Render Backend (1 minute)

1. **Open Render Dashboard**: https://dashboard.render.com
2. Click on your backend service (`crms-backend-api`)
3. Go to **"Environment"** tab
4. Click **"Add Environment Variable"**
5. Add:
   - **Key**: `ILO_CLUSTERING_API_URL`
   - **Value**: Paste the Railway URL from Step 3
6. Click **"Save Changes"**
7. Render will automatically redeploy your backend

## ✅ Step 5: Verify (30 seconds)

1. **Test Railway Service**:
   - Open: `https://your-service.up.railway.app/` in browser
   - Should see: `{"status":"healthy","service":"ILO Clustering API",...}`

2. **Check Backend Logs**:
   - Go to Render → Your backend → Logs
   - Should see: `🌐 [ILO CLUSTERING] Calling Railway API: https://...`

## 🎉 Done!

Your clustering API is now live and working!

---

## ⚠️ Troubleshooting

### If Railway service fails to start:
- Check Railway logs for errors
- Verify `DATABASE_URL` is correct
- Make sure `scripts/ilo-clustering-analysis.py` exists

### If backend still shows error:
- Wait 1-2 minutes for Render to redeploy
- Check that `ILO_CLUSTERING_API_URL` is set correctly
- Verify the Railway URL is accessible

### Need help?
- Railway logs: Click on service → "Deployments" → View logs
- Render logs: Your backend → "Logs" tab

