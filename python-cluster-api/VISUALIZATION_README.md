# Clustering Visualization Guide

This guide explains how to visualize your K-Means clustering results using pandas and matplotlib.

## Quick Start

### Option 1: Generate Sample Data (Demo)

```bash
cd python-cluster-api
python visualize_clusters.py --sample --n-students 100
```

This will:
- Generate 100 sample students with realistic performance data
- Run clustering on them
- Create 3 visualizations:
  1. **2D Cluster Visualization** - Shows clusters in PCA space and feature pairs
  2. **Silhouette Analysis** - Detailed Silhouette score breakdown by cluster
  3. **Cluster Statistics** - Distribution, metrics, and quality indicators

### Option 2: Visualize Real API Results

1. **Get clustering results from your API:**
   ```bash
   # Save API response to JSON file
   curl -X POST http://localhost:10000/api/cluster \
     -H "Content-Type: application/json" \
     -d @student_data.json > clustering_results.json
   ```

2. **Visualize the results:**
   ```bash
   python visualize_clusters.py --json-file clustering_results.json
   ```

### Option 3: Simple Quick Visualization

For a quick 2D plot:

```bash
python visualize_example.py
```

(Place your API response in `clustering_results.json`)

## Visualizations Included

### 1. **2D Cluster Visualization** (`clusters_2d.png`)

Shows two views:
- **Left:** PCA 2D projection (reduces all features to 2 dimensions)
- **Right:** Feature pair plot (Score vs Attendance)

**What to look for:**
- ✅ Well-separated clusters (like your target images)
- ✅ Clear boundaries between groups
- ✅ Distinct colors for each cluster

### 2. **Silhouette Analysis** (`silhouette_analysis.png`)

Shows:
- Silhouette coefficient for each student
- Average Silhouette score
- Quality indicator (Excellent/Good/Fair/Poor)

**What to look for:**
- ✅ Score > 0.5 = Excellent (target range)
- ✅ All clusters have positive Silhouette values
- ✅ Similar cluster sizes

### 3. **Cluster Statistics** (`cluster_statistics.png`)

Shows:
- **Top Left:** Cluster distribution (bar chart)
- **Top Right:** Score distribution by cluster (box plot)
- **Bottom Left:** Average metrics heatmap
- **Bottom Right:** Silhouette score gauge

**What to look for:**
- ✅ Balanced cluster sizes (not one huge cluster)
- ✅ Clear differences in metrics between clusters
- ✅ Silhouette score in 0.5-0.7 range

## Example Output

When you run with sample data, you should see:

```
📊 Generating sample student data...
✅ Generated 100 students with 3 clusters
📈 Silhouette Score: 0.6123

🎨 Creating visualizations...
  1. Creating 2D cluster visualization...
✅ Saved visualization to ./clusters_2d.png
  2. Creating Silhouette analysis...
✅ Saved Silhouette analysis to ./silhouette_analysis.png
  3. Creating cluster statistics...
✅ Saved cluster statistics to ./cluster_statistics.png

✅ All visualizations complete!
```

## Interpreting Results

### Excellent Clustering (0.5-0.7 Silhouette Score)

**Visual Characteristics:**
- Clear separation between clusters
- Distinct colors don't overlap much
- Well-defined cluster boundaries
- Balanced cluster sizes

**Example:**
```
Silhouette Score: 0.6123
Quality: Excellent ✅
Interpretation: Well-separated clusters
```

### Good Clustering (0.3-0.5 Silhouette Score)

**Visual Characteristics:**
- Some overlap between clusters
- Still distinguishable groups
- Some boundary ambiguity

### Fair/Poor Clustering (< 0.3 Silhouette Score)

**Visual Characteristics:**
- Significant overlap
- Unclear boundaries
- Clusters may not be meaningful

## Customization

### Change Number of Students

```bash
python visualize_clusters.py --sample --n-students 200
```

### Save to Specific Directory

```bash
python visualize_clusters.py --sample --save-dir ./visualizations
```

### Use Your Own Data

1. Export clustering results from your API to JSON
2. Run:
   ```bash
   python visualize_clusters.py --json-file your_results.json
   ```

## Troubleshooting

### "ModuleNotFoundError: No module named 'matplotlib'"

Install dependencies:
```bash
pip install -r requirements.txt
```

### "No cluster column found"

Make sure your JSON file includes:
- `cluster` (cluster ID: 0, 1, 2, etc.)
- `cluster_label` (e.g., "Excellent Performance")
- `silhouette_score` (overall score)

### Visualizations look blurry

The script saves at 300 DPI. If you need higher quality:
- Edit `savefig(dpi=300)` to `savefig(dpi=600)`

## Integration with Your System

### Option A: Add Visualization Endpoint

You could add a visualization endpoint to your Flask API:

```python
@app.route("/api/cluster/visualize", methods=["POST"])
def visualize_clusters():
    data = request.get_json()
    df = pd.DataFrame(data)
    # Generate visualization
    # Return image or save to file
```

### Option B: Use in Jupyter Notebook

```python
import pandas as pd
from visualize_clusters import visualize_clusters_2d, visualize_silhouette_analysis

# Load your data
df = pd.read_json('clustering_results.json')

# Visualize
visualize_clusters_2d(df)
visualize_silhouette_analysis(df)
```

## Next Steps

1. **Run sample visualization** to see what good clustering looks like
2. **Export your real clustering results** from the API
3. **Compare** your results with the sample to see improvements
4. **Adjust clustering parameters** if needed to achieve 0.5-0.7 scores

## Files

- `visualize_clusters.py` - Full-featured visualization script
- `visualize_example.py` - Simple quick visualization
- `VISUALIZATION_README.md` - This file

## Questions?

Check the main clustering documentation:
- `docs/ACHIEVING_OPTIMAL_CLUSTERS.md` - How to get 0.5-0.7 scores
- `docs/CLUSTERING_OPTIMIZATION_SUMMARY.md` - Optimization details

