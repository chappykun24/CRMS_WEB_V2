# 🚀 ONE-CLICK DEPLOYMENT - START HERE!

Railway CLI is already installed! Follow these **3 simple steps** to deploy:

---

## 📝 Step 1: Login to Railway (One-time setup)

Open PowerShell and run:

```powershell
railway login
```

This will:
- Open your browser
- Ask you to authorize Railway
- Save your credentials for future use

**You only need to do this once!**

---

## 🚀 Step 2: Run the Deployment Script

After logging in, run this command:

```powershell
cd python-ilo-clustering-api
.\DEPLOY_NOW.ps1
```

The script will automatically:
1. ✅ Check Railway CLI (already installed)
2. ✅ Verify you're logged in
3. ✅ Link to/create Railway project
4. ✅ Check environment variables
5. ✅ Deploy your service
6. ✅ Get your service URL
7. ✅ Show you next steps

---

## 🔑 Step 3: Set Database URL (When Prompted)

When the script runs, it will ask for your `DATABASE_URL`. You can:

**Option A:** Enter it now
- Copy `DATABASE_URL` from your Render backend → Environment tab
- Paste it when prompted

**Option B:** Skip and set later
- Press Enter to skip
- Set it manually in Railway dashboard after deployment

---

## ✅ Step 4: Update Render Backend

After deployment completes, the script will show you a URL like:
```
https://your-service-production.up.railway.app
```

**Copy this URL** and:

1. Go to **Render Dashboard** → Your backend service
2. Go to **Environment** tab
3. Add new variable:
   - **Key**: `ILO_CLUSTERING_API_URL`
   - **Value**: `https://your-service-production.up.railway.app`
4. **Save** and Render will auto-redeploy

---

## 🎉 Done!

Your clustering API is now live and working!

---

## 📋 Quick Command Reference

```powershell
# Login (first time only)
railway login

# Deploy
cd python-ilo-clustering-api
.\DEPLOY_NOW.ps1

# Check status
railway status

# View logs
railway logs

# Get URL
railway domain
```

---

## ⚠️ Troubleshooting

### "Not logged in"
Run `railway login` first

### "Script not found"
Make sure you're in the `python-ilo-clustering-api` directory

### "Deployment failed"
Check Railway dashboard → Your service → Deployments → View logs

---

**Ready?** Run `railway login` then `.\DEPLOY_NOW.ps1`! 🚀

