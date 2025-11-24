# ILO Clustering API - Railway Deployment Guide

## Quick Setup

### Step 1: Deploy to Railway

1. **Go to Railway Dashboard** (https://railway.app)
2. **Create New Project**
3. **Add Service** → **GitHub Repo** (or deploy from GitHub)
4. **Select** the `python-ilo-clustering-api` directory as the root directory
5. **Railway will auto-detect** Python and install dependencies from `requirements.txt`

### Step 2: Set Environment Variables in Railway

In your Railway service settings, add:

- **`DATABASE_URL`** - Your PostgreSQL connection string
  - Example: `postgresql://user:password@host:port/database`
  - You can copy this from your backend environment variables

- **`PORT`** - Railway will set this automatically (usually 10000)

### Step 3: Get Your Railway Service URL

1. In Railway, go to your service settings
2. Go to **Settings** → **Networking**
3. Generate a **Public Domain** (if not already done)
4. Copy the URL (e.g., `https://your-ilo-clustering-api.up.railway.app`)

### Step 4: Update Backend Environment Variable (Render)

1. Go to your Render dashboard
2. Select your backend service (`crms-backend-api`)
3. Go to **Environment** tab
4. Add new environment variable:
   - **Key**: `ILO_CLUSTERING_API_URL`
   - **Value**: `https://your-ilo-clustering-api.up.railway.app` (your Railway URL)
5. Save and redeploy your backend service

### Step 5: Verify Deployment

1. Test the Railway service health check:
   ```
   GET https://your-ilo-clustering-api.up.railway.app/
   ```
   Should return: `{"status": "healthy", ...}`

2. Check backend logs - should see:
   ```
   🌐 [ILO CLUSTERING] Calling Railway API: https://your-ilo-clustering-api.up.railway.app
   ```

## Troubleshooting

### Issue: "ILO_CLUSTERING_API_URL environment variable is not set"

**Solution**: Add the environment variable in Render backend settings (Step 4 above)

### Issue: Railway service returns 500 errors

**Check**:
1. Railway service logs for errors
2. Database connection (DATABASE_URL is correct)
3. All dependencies installed correctly

### Issue: Script not found errors

**Solution**: Make sure `scripts/ilo-clustering-analysis.py` is in the `python-ilo-clustering-api/scripts/` directory

## Local Development (Optional)

For local testing:

```bash
cd python-ilo-clustering-api
pip install -r requirements.txt
python app.py
```

Then in your backend `.env` file:
```
ILO_CLUSTERING_API_URL=http://localhost:10001
```

