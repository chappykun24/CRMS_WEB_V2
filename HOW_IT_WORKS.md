# How Deployment Works: One Repo → Two Services

## 📁 Your Repository Structure

```
CRMS_WEB_V2/
├── render.yaml              ← Tells Render to create 2 services
├── backend/                 ← Service 1: Node.js backend
│   ├── server.js
│   ├── routes/
│   └── ...
├── python-cluster-api/      ← Service 2: Python clustering API
│   ├── app.py
│   ├── requirements.txt
│   └── ...
└── frontend/                ← Deployed separately (Vercel)
    └── ...
```

---

## 🚀 Deployment Flow

### Step 1: Push Once to GitHub ✅

```bash
git push origin master
```

**Result:** All code (backend + python-cluster-api) is on GitHub

---

### Step 2: Render Reads `render.yaml`

Render looks at your `render.yaml` and sees:

```yaml
services:
  - name: crms-backend-api      ← Creates Service #1
    rootDir: backend
    ...
  
  - name: crms-cluster-api      ← Creates Service #2  
    rootDir: python-cluster-api
    ...
```

**Result:** Render creates **TWO separate services** from ONE repo!

---

### Step 3: Each Service Uses Different Folder

**Service 1: `crms-backend-api`**
- Looks in `backend/` folder
- Runs: `npm install` → `npm start`
- Becomes: `https://crms-backend-api.onrender.com`

**Service 2: `crms-cluster-api`**
- Looks in `python-cluster-api/` folder  
- Runs: `pip install -r requirements.txt` → `gunicorn app:app`
- Becomes: `https://crms-cluster-api.onrender.com`

---

## ✅ One Push = Two Services!

**You push ONCE to GitHub.**
**Render creates TWO separate services automatically.**

Each service:
- Has its own URL
- Has its own logs
- Has its own environment variables
- Can be scaled independently
- But they're all from the same repo!

---

## 🔧 After Deployment

1. **Service 1** (`crms-backend-api`) deploys
2. **Service 2** (`crms-cluster-api`) deploys  
3. Copy Service 2's URL
4. Add to Service 1's environment:
   ```
   CLUSTER_SERVICE_URL=https://crms-cluster-api.onrender.com
   ```
5. Redeploy Service 1

**Done!** ✅

---

## 🎯 Why This Works

- `rootDir: backend` tells Render which folder to use for Service 1
- `rootDir: python-cluster-api` tells Render which folder to use for Service 2
- Both services share the same GitHub repo but use different code paths

**One repo, one push, two services!** 🎉

