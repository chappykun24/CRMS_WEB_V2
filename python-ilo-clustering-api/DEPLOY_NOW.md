# Quick Deployment Guide - ILO Clustering API to Railway

## Option 1: Railway Web Dashboard (Recommended - Easiest)

### Step-by-Step Instructions:

1. **Go to Railway Dashboard**
   - Visit: https://railway.app
   - Sign up or log in

2. **Create New Project**
   - Click **"New Project"**
   - Select **"Deploy from GitHub repo"**
   - Choose your repository
   - **IMPORTANT**: When asked for the root directory, select: `python-ilo-clustering-api`

3. **Railway Auto-Detection**
   - Railway will automatically detect Python
   - It will run: `pip install -r requirements.txt`
   - It will start with: `gunicorn app:app --bind 0.0.0.0:$PORT`

4. **Set Environment Variables**
   - Go to your service → **Variables** tab
   - Add: `DATABASE_URL` = (your PostgreSQL connection string from Render backend)
   - Railway automatically sets `PORT`

5. **Get Public URL**
   - Go to **Settings** → **Networking**
   - Click **Generate Domain**
   - Copy the URL (e.g., `https://your-service.up.railway.app`)

6. **Update Render Backend**
   - Go to Render dashboard → Your backend service
   - Go to **Environment** tab
   - Add: `ILO_CLUSTERING_API_URL` = (your Railway URL from step 5)
   - Save and redeploy backend

✅ **Done!** Your clustering API is now live!

---

## Option 2: Railway CLI (For Advanced Users)

### Prerequisites:
```bash
npm install -g @railway/cli
# OR
curl -fsSL https://railway.app/install.sh | sh
```

### Deploy:
```bash
cd python-ilo-clustering-api
railway login
railway init
railway variables set DATABASE_URL="your-database-url"
railway up
railway domain
```

---

## Option 3: Manual Deployment (If GitHub isn't connected)

### Using Railway Dashboard:
1. **New Project** → **Empty Project**
2. **Add Service** → **GitHub Repo**
3. Select repository and set root directory to: `python-ilo-clustering-api`
4. Follow steps 4-6 from Option 1 above

---

## Verification

After deployment, test your service:

```bash
# Health check
curl https://your-service.up.railway.app/

# Should return:
# {"status": "healthy", "service": "ILO Clustering API", ...}
```

---

## Troubleshooting

### Issue: "Script not found"
- Make sure `scripts/ilo-clustering-analysis.py` exists in the `python-ilo-clustering-api/scripts/` directory
- Check Railway build logs for errors

### Issue: Database connection fails
- Verify `DATABASE_URL` is set correctly in Railway
- Check that your database allows connections from Railway's IPs

### Issue: Service times out
- Check Railway logs: `railway logs` or in Railway dashboard
- Verify the script has all dependencies installed

---

## Need Help?

Check the logs in Railway dashboard or run:
```bash
railway logs --tail
```

