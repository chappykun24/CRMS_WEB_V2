# 📝 Simple Deployment Steps - Follow These Exactly

## Step 1: Deploy on Render

1. Go to: **https://render.com/dashboard**
2. Click **"New +"** button (top right)
3. Click **"Web Service"**
4. Connect your GitHub account if not already connected
5. Select your repository: **`chappykun24/CRMS_WEB_V2`**
6. Click **"Connect"**

---

## Step 2: Create Python Clustering API (FIRST)

### Configuration:
- **Name:** `crms-cluster-api`
- **Region:** Choose closest to you
- **Branch:** `master` (or `main`)
- **Root Directory:** `python-cluster-api` ⚠️ **IMPORTANT**
- **Runtime:** `Python 3`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT`

### Environment Variables (Click "Advanced"):
- **Key:** `PORT`
- **Value:** `10000`
- Click **"Add"**

### Click **"Create Web Service"**

⏳ **Wait for deployment** (5-10 minutes)

✅ **Copy the service URL** (e.g., `https://crms-cluster-api.onrender.com`)
✅ **Visit the URL to verify** - Should say: "KMeans Clustering API is running!"

---

## Step 3: Create Backend API (SECOND)

1. Click **"New +"** → **"Web Service"**
2. Select your repository: **`chappykun24/CRMS_WEB_V2`**
3. Click **"Connect"**

### Configuration:
- **Name:** `crms-backend-api`
- **Region:** Same as before
- **Branch:** `master` (or `main`)
- **Root Directory:** `backend` ⚠️ **IMPORTANT**
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

### Environment Variables (Click "Advanced"):
Add these one by one:

1. **Key:** `NODE_ENV` **Value:** `production`
2. **Key:** `PORT` **Value:** `3001`
3. **Key:** `CLUSTER_SERVICE_URL` **Value:** `https://crms-cluster-api.onrender.com` (the URL from Step 2)
4. Add your database credentials (if not already):
   - `VITE_NEON_HOST` (or `NEON_HOST`)
   - `VITE_NEON_DATABASE` (or `NEON_DATABASE`)
   - `VITE_NEON_USER` (or `NEON_USER`)
   - `VITE_NEON_PASSWORD` (or `NEON_PASSWORD`)
   - `VITE_NEON_PORT` (or `NEON_PORT`)

### Click **"Create Web Service"**

⏳ **Wait for deployment** (5-10 minutes)

---

## Step 4: Test Everything

1. **Check Python API:**
   - Visit: `https://crms-cluster-api.onrender.com`
   - Should show: "KMeans Clustering API is running!"

2. **Check Backend API:**
   - Visit: `https://crms-backend-api.onrender.com/api/health`
   - Should return JSON with status: "healthy"

3. **Check Analytics Page:**
   - Go to your frontend Analytics page
   - Open browser console (F12 → Console tab)
   - Click "Show Analytics" button
   - Look for: `🎯 [Analytics] Clustering enabled: true`
   - You should see cluster badges now!

---

## ✅ Done!

Your clustering feature should now be working!

### If Something Fails:

**Python API not running:**
- Check Render logs
- Verify all files are committed to GitHub

**Backend can't connect to Python API:**
- Verify `CLUSTER_SERVICE_URL` is set correctly
- Check backend logs for errors

**Still showing "Not Clustered":**
- Check browser console for errors
- Check Render logs for both services
- Verify Python API is accessible

---

## 🆘 Need Help?

Check `DEBUG_LOGGING_GUIDE.md` for troubleshooting with logs!

