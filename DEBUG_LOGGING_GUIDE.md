# Debug Logging Guide for Clustering Pipeline

## Overview

Comprehensive debug logging has been added across the entire clustering pipeline to help diagnose issues and track data flow from frontend → backend → Python API.

---

## 🎯 Where Debug Logs Are Located

### **1. Frontend (Analytics.jsx)**

**Location:** Browser Developer Console (F12)

**Logs to Look For:**
```javascript
🔍 [Analytics] Starting fetch...
📡 [Analytics] Response status: 200
✅ [Analytics] Received data: {...}
🎯 [Analytics] Clustering enabled: true/false
📊 [Analytics] Sample data: [...]
📈 [Analytics] Cluster distribution: { "Needs Guidance": 5, "On Track": 12, "Excellent": 3 }
```

**What These Tell You:**
- Whether the frontend fetch started
- HTTP response status
- Whether clustering is enabled
- Sample of the data received
- Distribution of students across clusters

---

### **2. Backend (assessments.js)**

**Location:** Render logs or terminal if running locally

**Logs to Look For:**
```javascript
🔍 [Backend] Dean analytics endpoint called
✅ [Backend] Fetched 50 students from database
🎯 [Backend] Cluster service URL: https://crms-cluster-api.onrender.com
🌍 [Backend] NODE_ENV: production
🚀 [Backend] Attempting to call clustering API...
📦 [Backend] Sending 50 students to clustering API
🌐 [Backend] Calling: https://crms-cluster-api.onrender.com/api/cluster
📡 [Backend] Clustering API response status: 200
✅ [Backend] Received 50 clustered results
📈 [Backend] Cluster distribution: { "Needs Guidance": 5, "On Track": 12, "Excellent": 3 }
```

**What These Tell You:**
- Number of students fetched from database
- What cluster service URL is being used
- Whether the backend is calling the Python API
- Status of the clustering API call
- Final cluster distribution

**Error Logs:**
```javascript
⚠️  [Backend] Clustering disabled: CLUSTER_SERVICE_URL not set
❌ [Backend] Clustering error: fetch failed
❌ [Backend] Clustering request failed: 500 Internal Server Error
```

---

### **3. Python API (app.py)**

**Location:** Render logs or terminal if running locally

**Logs to Look For:**
```python
🔍 [Python API] Received clustering request
📦 [Python API] Received 50 students
✅ [Python API] 50 students have valid features
📈 [Python API] Cluster distribution: {'Needs Guidance': 5, 'On Track': 12, 'Excellent': 3}
🚀 [Python API] Returning 50 results
```

**What These Tell You:**
- Whether the Python API received the request
- How many students were processed
- How many had valid features (some might be dropped if missing data)
- Cluster distribution calculated
- How many results are being returned

---

## 🐛 Troubleshooting with Logs

### **Problem: "Clustering service not configured"**

**Check Backend Logs:**
```
🎯 [Backend] Cluster service URL: null
⚠️  [Backend] Clustering disabled: CLUSTER_SERVICE_URL not set
```

**Solution:** Set `CLUSTER_SERVICE_URL` environment variable in Render

---

### **Problem: "Not Clustered" badges showing**

**Check Backend Logs:**
```
🌐 [Backend] Calling: https://crms-cluster-api.onrender.com/api/cluster
📡 [Backend] Clustering API response status: 500
❌ [Backend] Clustering request failed: 500 Internal Server Error
```

**Then Check Python Logs:**
```
🔍 [Python API] Received clustering request
📦 [Python API] Received 0 students
```

**Solution:** Check Python API logs for the actual error

---

### **Problem: Clustering API not reachable**

**Check Backend Logs:**
```
❌ [Backend] Clustering error: fetch failed: Failed to fetch
```

**Solution:** 
1. Verify Python API is deployed and accessible
2. Check firewall/CORS settings
3. Verify the URL is correct

---

### **Problem: All students in one cluster**

**Check Python Logs:**
```
📈 [Python API] Cluster distribution: {'Needs Guidance': 50, 'On Track': 0, 'Excellent': 0}
```

**Solution:** This might be normal if all students have similar metrics. Check the actual data values.

---

### **Problem: "Valid features" count is lower than total students**

**Check Python Logs:**
```
📦 [Python API] Received 50 students
✅ [Python API] 45 students have valid features
```

**Solution:** Some students are missing attendance, score, or lateness data. Check your database for null values.

---

## 📊 How to Access Logs

### **On Render (Production)**

1. **Backend Logs:**
   - Go to Render dashboard
   - Click `crms-backend-api` service
   - Click "Logs" tab
   - Look for logs with `[Backend]` prefix

2. **Python API Logs:**
   - Go to Render dashboard
   - Click `crms-cluster-api` service
   - Click "Logs" tab
   - Look for logs with `[Python API]` prefix

### **In Browser (Frontend)**

1. Open your analytics page
2. Press F12 to open Developer Tools
3. Go to "Console" tab
4. Click "Show Analytics" button
5. Look for logs with `[Analytics]` prefix

### **Locally**

- **Backend:** Check terminal where you ran `npm start` or `npm run dev`
- **Python API:** Check terminal where you ran `python app.py`
- **Frontend:** Same as browser instructions above

---

## 🎯 What to Look For in Each Deployment

### **Successful Clustering Flow:**

**Frontend:**
```
🔍 [Analytics] Starting fetch...
📡 [Analytics] Response status: 200
✅ [Analytics] Received data: {...}
🎯 [Analytics] Clustering enabled: true
📈 [Analytics] Cluster distribution: {"Needs Guidance": 5, "On Track": 12, "Excellent": 3}
```

**Backend:**
```
🔍 [Backend] Dean analytics endpoint called
✅ [Backend] Fetched 20 students from database
🎯 [Backend] Cluster service URL: https://crms-cluster-api.onrender.com
🚀 [Backend] Attempting to call clustering API...
📡 [Backend] Clustering API response status: 200
✅ [Backend] Received 20 clustered results
📈 [Backend] Cluster distribution: {"Needs Guidance": 5, "On Track": 12, "Excellent": 3}
```

**Python API:**
```
🔍 [Python API] Received clustering request
📦 [Python API] Received 20 students
✅ [Python API] 20 students have valid features
📈 [Python API] Cluster distribution: {'Needs Guidance': 5, 'On Track': 12, 'Excellent': 3}
🚀 [Python API] Returning 20 results
```

---

## 🔧 Common Issues and Solutions

### **Issue: Logs show clustering is disabled**

**Look for:** `⚠️  [Backend] Clustering disabled: CLUSTER_SERVICE_URL not set`

**Solution:**
1. Go to Render backend service
2. Add environment variable: `CLUSTER_SERVICE_URL=https://crms-cluster-api.onrender.com`
3. Redeploy backend

---

### **Issue: Python API returns 500 error**

**Look for:** `❌ [Backend] Clustering request failed: 500`

**Check Python logs for:**
- Missing dependencies
- Data type errors
- Memory issues

**Solution:**
1. Check Python API logs in Render
2. Look for Python error stack traces
3. Verify all dependencies are in `requirements.txt`

---

### **Issue: All students show "Not Clustered"**

**Look for:** `✅ [Backend] Received 50 clustered results` but data doesn't have cluster_label

**Check Python logs:**
```
📦 [Python API] Received 50 students
✅ [Python API] 50 students have valid features
```

**Solution:**
- The merge might be failing
- Check that student_id field is being preserved

---

## 📝 Log Color Coding

- 🔍 **Blue** = Starting/Discovery
- ✅ **Green** = Success
- 📡 **Orange** = Network/Communication
- 📈 **Purple** = Statistics/Summary
- ❌ **Red** = Errors
- ⚠️ **Yellow** = Warnings

Use these color indicators to quickly scan logs for issues!

