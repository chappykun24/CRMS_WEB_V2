# Visualization Guide - Using Real Database Data

## Option 1: Use Backend API (Recommended)

The backend API already has database access. You can:

1. **Get clustering results from your backend API:**
   ```bash
   # The backend endpoint: GET /api/assessments/dean-analytics/sample
   # This returns clustering results with all student data
   ```

2. **Save the response to JSON:**
   - Open your browser's developer tools
   - Go to Network tab
   - Call your analytics endpoint
   - Copy the response JSON
   - Save it as `clustering_results.json`

3. **Visualize it:**
   ```bash
   python visualize_clusters.py --json-file clustering_results.json
   ```

## Option 2: Direct Database Access

If you want to fetch directly from the database:

1. **Set environment variables** (temporarily for this session):
   ```powershell
   # PowerShell
   $env:VITE_NEON_HOST = "your-host"
   $env:VITE_NEON_DATABASE = "your-database"
   $env:VITE_NEON_USER = "your-user"
   $env:VITE_NEON_PASSWORD = "your-password"
   $env:VITE_NEON_PORT = "5432"
   ```

2. **Run the fetch script:**
   ```bash
   python fetch_and_visualize.py --limit 100
   ```

## Option 3: Use Clustering API Directly

If your Python clustering API is running:

```bash
# The API will fetch data from database if you have env vars set
python visualize_from_api.py --api-url http://localhost:10000/api/cluster
```

## Quick Start (Easiest)

1. **Get data from your running backend:**
   - Visit: `http://localhost:3000/api/assessments/dean-analytics/sample?limit=100`
   - Copy the JSON response
   - Save as `clustering_results.json`

2. **Visualize:**
   ```bash
   python visualize_clusters.py --json-file clustering_results.json
   ```

This will create:
- `clusters_2d.png` - 2D visualization
- `silhouette_analysis.png` - Quality analysis  
- `cluster_statistics.png` - Statistics dashboard

## Built-in Frontend Sample

Need to demo the scatter plot without calling the API?

1. Open `frontend/src/data/sampleClusterVisualizationData.js`  
   (contains hard-coded students with clusters, score/attendance, and PCA coordinates)

2. Render the sample component:
   ```jsx
   import ClusterVisualizationSample from '../components/demo/ClusterVisualizationSample';
   
   const DemoPage = () => (
     <div className="min-h-screen bg-gray-50">
       <ClusterVisualizationSample />
     </div>
   );
   ```

3. Each dot already has a student name assigned, so hovering shows the tooltip immediately.

