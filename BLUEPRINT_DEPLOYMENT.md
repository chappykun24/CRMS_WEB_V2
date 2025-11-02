# Blueprint Deployment - Simple Instructions

## ✅ YES! Just Use Blueprint!

Go to Render → **New +** → **Blueprint** → Connect your GitHub repo.

**That's it!** Render will create both services automatically.

---

## 📋 What Blueprint Does

Your `render.yaml` defines **2 services**:
1. `crms-backend-api` (Node.js)
2. `crms-cluster-api` (Python)

Blueprint reads the file and creates both automatically!

---

## ⚠️ IMPORTANT: If You Already Have Backend Deployed

If you **already have** `crms-backend-api` running:

### Option A: Just Create Python API Manually ✅ RECOMMENDED
1. **New +** → **Web Service**
2. Use these settings:
   - **Root Directory:** `python-cluster-api`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT`
   - **Health Check:** `/`
3. Click "Create"

### Option B: Use Blueprint (Will Skip Existing Backend)
- Render will create the Python API
- Skip or merge the existing backend

---

## 🎯 After Blueprint Deployment

Once both services are running:

1. Copy Python API URL: `https://crms-cluster-api.onrender.com`
2. Go to `crms-backend-api` → **Environment**
3. Add: `CLUSTER_SERVICE_URL=https://crms-cluster-api.onrender.com`
4. Save (auto-redeploys)
5. Test Analytics page!

**Done!** ✅

