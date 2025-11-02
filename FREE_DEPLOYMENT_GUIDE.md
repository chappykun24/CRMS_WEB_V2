# 🆓 Free Deployment Guide - No Credit Card Needed!

## Problem: Render Free Tier Requires Card for Multiple Services

**Solution: Deploy Python API to Fly.io (100% FREE, NO CARD)**

---

## Option 1: Fly.io (Recommended - Truly Free) ✨

### Step 1: Install Fly.io CLI

**Windows (PowerShell):**
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

**Or visit:** https://fly.io/docs/getting-started/installing-flyctl/

### Step 2: Login to Fly.io

```bash
fly auth login
```
(Follow prompts in browser)

### Step 3: Deploy Python API

```bash
cd python-cluster-api
fly launch
```

**Answer prompts:**
- **App name:** `crms-cluster-api` (or any unique name)
- **Region:** Choose closest (e.g., `iad` for US East)
- **Postgres?:** No
- **Redis?:** No
- **Deploy now?:** Yes

### Step 4: Set Environment Variable

```bash
fly secrets set PORT=10000
```

### Step 5: Get Your URL

```bash
fly status
```

You'll see: `https://crms-cluster-api.fly.dev`

### Step 6: Update Backend on Render

1. Go to Render → Your backend service → Environment
2. Add: `CLUSTER_SERVICE_URL=https://crms-cluster-api.fly.dev`
3. Save and redeploy

✅ **Done! No second Render service needed!**

---

## Option 2: Railway (Alternative - Also Free)

### Step 1: Go to Railway.app

1. Visit: https://railway.app
2. Sign up with GitHub (FREE, no card)
3. Click "New Project"

### Step 2: Deploy Python API

1. Click "Deploy from GitHub repo"
2. Select `chappykun24/CRMS_WEB_V2`
3. **Set Root Directory:** `python-cluster-api`
4. Railway auto-detects Python and deploys!

### Step 3: Get URL & Configure

1. Click on your service
2. Go to "Settings" → "Generate Domain"
3. Copy the URL (e.g., `https://crms-cluster-api.up.railway.app`)
4. Add to Render backend: `CLUSTER_SERVICE_URL=https://crms-cluster-api.up.railway.app`

✅ **Done!**

---

## Option 3: PythonAnywhere (Alternative)

1. Sign up at https://www.pythonanywhere.com (FREE tier)
2. Upload `python-cluster-api` folder
3. Configure WSGI file
4. Get URL and add to backend

---

## 🎯 Recommended: Fly.io

**Why Fly.io?**
- ✅ 100% FREE tier (no card needed)
- ✅ Generous limits (3 shared VMs free)
- ✅ Fast deployment
- ✅ Easy CLI
- ✅ Auto HTTPS

**Free tier includes:**
- 3 shared-cpu-1x VMs
- 160GB outbound data transfer/month
- Perfect for your clustering API!

---

## Quick Commands Summary (Fly.io)

```bash
# Install
iwr https://fly.io/install.ps1 -useb | iex

# Login
fly auth login

# Deploy
cd python-cluster-api
fly launch

# Set port
fly secrets set PORT=10000

# Get URL
fly status

# View logs
fly logs
```

---

## ✅ After Deployment

1. **Test Python API:**
   - Visit: `https://crms-cluster-api.fly.dev`
   - Should show: "KMeans Clustering API is running!"

2. **Update Backend:**
   - Add `CLUSTER_SERVICE_URL` to Render backend
   - Redeploy backend

3. **Test Analytics:**
   - Open Analytics page
   - Check console for clustering status

**That's it!** 🎉

