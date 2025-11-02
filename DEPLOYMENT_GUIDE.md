# Complete Deployment Guide for CRMS with Clustering

## Overview

This repository deploys **two services** on Render.com from a single repo:
1. **CRMS Backend API** (Node.js) - Main backend
2. **CRMS Cluster API** (Python) - KMeans clustering service

Both are configured in `render.yaml` at the root of this repository.

---

## Step 1: Push to GitHub

```bash
git add .
git commit -m "Add clustering integration with Python API"
git push origin main
```

---

## Step 2: Deploy to Render

### Option A: Auto Deploy (Using render.yaml)

1. Go to https://render.com/dashboard
2. Click **"New +"** → **"Blueprint"** (or "Apply Blueprint")
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml` and create **both services**

### Option B: Manual Deploy

If auto-deploy doesn't work, create services manually:

#### 1. Backend Service (Node.js)

1. **New +** → **Web Service**
2. Connect your repo
3. **Settings:**
   - Name: `crms-backend-api`
   - Branch: `main`
   - Root Directory: `backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Health Check Path: `/api/health`
4. **Environment Variables:**
   - `NODE_ENV` = `production`
   - `PORT` = `3001`
   - `CLUSTER_SERVICE_URL` = (see step below)
   - Add your Neon database credentials

#### 2. Cluster Service (Python)

1. **New +** → **Web Service**
2. Connect your **same** repo
3. **Settings:**
   - Name: `crms-cluster-api`
   - Branch: `main`
   - Root Directory: `python-cluster-api`
   - Environment: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT`
   - Health Check Path: `/`
4. **Environment Variables:**
   - `PORT` = `10000`

#### 3. Link Services

After the cluster service deploys:

1. Copy the cluster service URL: `https://crms-cluster-api.onrender.com`
2. Go to **crms-backend-api** → **Environment**
3. Add: `CLUSTER_SERVICE_URL` = `https://crms-cluster-api.onrender.com`
4. Save and redeploy

---

## Step 3: Verify Deployment

### Check Cluster API

Visit: `https://crms-cluster-api.onrender.com`

Expected: "KMeans Clustering API is running!"

### Check Backend API

Visit: `https://crms-backend-api.onrender.com/api/health`

Expected: `{"status": "healthy", ...}`

### Check Integration

1. Go to your frontend Analytics page
2. Click "Show Analytics"
3. Verify you see cluster badges (not "Not Clustered")

---

## Troubleshooting

### "Clustering service not configured"

- Check that `CLUSTER_SERVICE_URL` is set in backend environment
- Verify cluster API is deployed and accessible

### "Not Clustered" badges

- Check backend logs for Python API connection errors
- Verify cluster API URL is correct (no trailing slash)

### Free Tier Sleep Behavior

Render free tier services sleep after 15 minutes of inactivity. First request will be slow while waking up.

---

## File Structure

```
CRMS_WEB_V2/
├── render.yaml                 # Deploys both services
├── backend/                    # Node.js backend
│   ├── server.js
│   ├── routes/
│   │   └── assessments.js     # Has clustering endpoint
│   └── index.js               # Fixed entry point
├── python-cluster-api/         # Python clustering service
│   ├── app.py                 # Flask API
│   ├── requirements.txt
│   └── README.md
└── frontend/                   # React frontend
    └── src/pages/dean/
        └── Analytics.jsx       # Shows cluster results
```

