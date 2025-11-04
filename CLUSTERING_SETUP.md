# Clustering Service Setup Guide

## Problem: All Students Showing "Not Clustered"

If all students are showing "Not Clustered" in the Analytics page, it means the clustering service URL is not configured in your backend environment.

## Solution: Configure Clustering Service URL

### For Vercel Deployment (Backend)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following environment variable:

   **Variable Name:** `VITE_CLUSTER_API_URL`
   
   **Value:** Your Python clustering API URL (e.g., `https://crms-cluster-api.onrender.com`)
   
   **Environment:** Production, Preview, Development (select all)

### Alternative Variable Names

The backend also checks for these environment variables (in order):
1. `VITE_CLUSTER_API_URL` (recommended for Vercel)
2. `CLUSTER_SERVICE_URL`
3. `CLUSTER_API_URL`

### For Render Deployment (Backend)

1. Go to your Render dashboard
2. Select your backend service
3. Navigate to **Environment** tab
4. Add environment variable:
   - **Key:** `CLUSTER_SERVICE_URL`
   - **Value:** Your Python clustering API URL

### Deploy Python Clustering API

Make sure your Python clustering API is deployed and accessible. You can deploy it to:
- **Render.com** (free tier available)
- **Fly.io** (free tier available)
- **Railway** (free tier available)
- **Any other hosting service**

### Verify Setup

After setting the environment variable:

1. **Redeploy your backend** (Vercel/Render will automatically redeploy when env vars change)
2. **Check backend logs** - you should see:
   ```
   🎯 [Backend] Cluster service URL: https://your-cluster-api-url.com
   🚀 [Backend] Attempting to call clustering API...
   ✅ [Backend] Received X clustered results
   📈 [Backend] Cluster distribution: {...}
   ```
3. **Check browser console** (F12) - you should see:
   ```
   ✅ [Analytics] Clustering enabled: true
   📈 [Analytics] Cluster distribution: { "Excellent Performance": X, "On Track": Y, ... }
   ```

### Troubleshooting

**If clustering is still not working:**

1. **Check backend logs** for errors:
   - `⚠️ [Backend] Clustering disabled: CLUSTER_SERVICE_URL not set`
   - `❌ [Backend] Clustering error: ...`
   - `❌ [Backend] Clustering request failed: ...`

2. **Verify Python API is accessible:**
   ```bash
   curl https://your-cluster-api-url.com/
   ```
   Should return: "KMeans Clustering API is running!"

3. **Test clustering endpoint:**
   ```bash
   curl -X POST https://your-cluster-api-url.com/api/cluster \
     -H "Content-Type: application/json" \
     -d '[{"student_id": 1, "attendance_percentage": 90, "average_score": 85, "average_days_late": 1, "submission_rate": 0.9}]'
   ```

4. **Check timeout settings:**
   - Default timeout is 8 seconds
   - Set `CLUSTER_TIMEOUT_MS=15000` if your API is slow

5. **Disable clustering temporarily:**
   - Set `DISABLE_CLUSTERING=1` to disable clustering (students will show "Not Clustered")

### Expected Cluster Labels

Once configured, students should be assigned to one of these clusters:
- **Excellent Performance** (Green) - High attendance, grades, and submission rates
- **On Track** (Blue) - Good performance across metrics
- **Needs Improvement** (Orange) - Moderate performance
- **At Risk** (Red) - Low performance across metrics
- **Not Clustered** (Gray) - Students without sufficient data

