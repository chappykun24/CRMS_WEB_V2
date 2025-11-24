# 🎯 Railway Settings Configuration Guide

This guide shows you exactly what to configure in Railway's Settings tab for the ILO Clustering API.

---

## 📍 Accessing Settings

1. Go to Railway dashboard: https://railway.app
2. Click on your project: **CRMS_WEB_V2**
3. Click on your service (the ILO Clustering API service)
4. Click the **"Settings"** tab in the top navigation

---

## ⚙️ Required Settings Configuration

### 1. Root Directory (MOST IMPORTANT!)

**Location:** Settings tab → Scroll to "Root Directory" section

**What to do:**
1. Find the **"Root Directory"** input field
2. It currently shows: `/` (root of repository)
3. **Change it to:** `python-ilo-clustering-api`
4. Click **"Save"** or press Enter

**Why this matters:**
- Without this, Railway looks for files in the repository root
- Your `app.py` and `requirements.txt` are in `python-ilo-clustering-api/` folder
- Setting this tells Railway where your service code is located

**Visual:**
```
Root Directory: [python-ilo-clustering-api]  ← Enter this here
```

---

### 2. Custom Start Command

**Location:** Settings tab → "Deploy" section → "Custom Start Command"

**What to do:**
1. Scroll to **"Deploy"** section
2. Find **"Custom Start Command"** subsection
3. Click **"+ Start Command"** button
4. Enter this command:
   ```
   gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 2 --timeout 300
   ```
5. Click **"Save"**

**Note:** Railway should auto-detect this from your `Procfile`, but setting it manually ensures it works.

---

### 3. Builder Settings

**Location:** Settings tab → "Builder" section

**What to do:**
1. Find the **"Builder"** section
2. You should see **"Railpack"** selected (this is correct ✅)
3. **Do NOT enable "Metal Build Environment"** (leave it OFF)
   - It's in beta
   - Not recommended for production
   - May cause compatibility issues

**Visual:**
```
Builder
└── Railpack [Default] ✅  ← Keep this selected

Metal Build Environment
└── [Toggle OFF] ⚠️  ← Leave this OFF
```

---

### 4. Regions (Optional - Default is Fine)

**Location:** Settings tab → "Deploy" section → "Regions"

**What to do:**
- **Default setting is fine** - no changes needed
- Railway will deploy to **"US West (California, USA)"** by default
- **1 Instance** is sufficient for this service

**Note:** Multi-region requires Pro plan, so leave as default.

---

## ✅ Settings Checklist

Before deploying, verify:

- [ ] **Root Directory** = `python-ilo-clustering-api`
- [ ] **Custom Start Command** = `gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 2 --timeout 300`
- [ ] **Builder** = Railpack (default)
- [ ] **Metal Build Environment** = OFF (disabled)
- [ ] **Regions** = US West, 1 Instance (default)

---

## 🔄 After Changing Settings

1. **Save all changes** in Settings tab
2. Railway will automatically **trigger a new deployment**
3. Go to **"Deployments"** tab to watch the build
4. Wait for deployment to complete (usually 2-5 minutes)

---

## 🐛 Common Settings Issues

### Issue: "Service failed to start" after setting Root Directory

**Solution:**
1. Verify Root Directory is exactly: `python-ilo-clustering-api` (no leading slash, no trailing slash)
2. Check that `app.py` exists in that directory
3. Check deployment logs for specific errors

### Issue: "Module not found" errors

**Solution:**
1. Verify `requirements.txt` exists in `python-ilo-clustering-api/` directory
2. Check build logs to see if dependencies installed correctly
3. Root Directory must be set correctly for Railway to find `requirements.txt`

### Issue: "Command not found: gunicorn"

**Solution:**
1. Verify `gunicorn` is in `requirements.txt`
2. Check that Start Command is set correctly
3. Railway should install gunicorn from requirements.txt during build

---

## 📸 Settings Tab Layout Reference

When you're in the Settings tab, you should see this structure:

```
Settings Tab
├── Builder
│   ├── Railpack [Default] ✅
│   └── Metal Build Environment [OFF] ⚠️
├── Root Directory
│   └── [python-ilo-clustering-api] ← Set this!
├── Deploy
│   ├── Custom Start Command
│   │   └── [+ Start Command] ← Click and set
│   └── Regions
│       └── US West, 1 Instance (default)
└── ... (other sections)
```

---

## 💡 Pro Tips

1. **Save after each change** - Railway will auto-deploy on save
2. **Check deployment logs** after changing settings
3. **Root Directory is case-sensitive** - use exact folder name
4. **Start Command uses $PORT** - Railway sets this automatically, don't change it

---

## 🎯 Quick Settings Summary

**Minimum Required Settings:**
1. ✅ Root Directory: `python-ilo-clustering-api`
2. ✅ Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 2 --timeout 300`

**Everything else can stay as default!**

---

**Next Step:** After configuring settings, proceed to [Step 4: Set Environment Variables](./RAILWAY_DEPLOYMENT_GUIDE.md#step-4-set-environment-variables) in the main deployment guide.

