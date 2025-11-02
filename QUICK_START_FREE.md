# 🚀 Quick Start - Deploy Python API for FREE (No Card)

## The Problem
Render free tier requires a credit card for a second service. As a student, you can't afford that.

## The Solution
Deploy Python API to **Fly.io** (100% FREE, no card required!)

---

## ⚡ 5-Minute Setup

### Step 1: Install Fly.io CLI (Windows)

Open PowerShell and run:
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

### Step 2: Login

```powershell
fly auth login
```
(Opens browser - sign in with GitHub)

### Step 3: Deploy Python API

```powershell
cd python-cluster-api
fly launch
```

**Answer the prompts:**
- App name: `crms-cluster-api` (or any unique name)
- Region: `iad` (US East) or closest to you
- Postgres? **No**
- Redis? **No**
- Deploy now? **Yes**

⏳ Wait 2-3 minutes for deployment

### Step 4: Get Your URL

After deployment completes, you'll see:
```
Your app is live at: https://crms-cluster-api.fly.dev
```

**Copy that URL!**

### Step 5: Update Your Render Backend

1. Go to Render dashboard
2. Open your backend service (`crms-backend-api`)
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. **Key:** `CLUSTER_SERVICE_URL`
6. **Value:** `https://crms-cluster-api.fly.dev` (the URL from Step 4)
7. Click **Save Changes**
8. Backend will auto-redeploy

### Step 6: Test!

1. Visit: `https://crms-cluster-api.fly.dev`
   - Should show: "KMeans Clustering API is running!"

2. Go to your Analytics page
3. Open browser console (F12)
4. Click "Show Analytics"
5. Check console: Should see `🎯 [Analytics] Clustering enabled: true`
6. Students should now have cluster badges! 🎉

---

## ✅ That's It!

**You now have:**
- ✅ Backend on Render (your existing service)
- ✅ Python API on Fly.io (FREE, no card!)
- ✅ Clustering working!

---

## 🆘 Troubleshooting

**Python API not responding:**
```powershell
fly logs
```
(Shows error logs)

**Can't deploy:**
- Make sure you're in `python-cluster-api` folder
- Check `fly.toml` exists (already created for you)

**Backend can't connect:**
- Verify `CLUSTER_SERVICE_URL` is set correctly
- Check backend logs on Render

---

## 📊 Free Tier Limits (Fly.io)

- **3 shared VMs** (plenty for your API)
- **160GB/month** data transfer
- **Perfect for student projects!**

**No credit card ever required!** 🎉

