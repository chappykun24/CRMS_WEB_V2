# Cluster Visualization Implementation Guide

## Overview

This guide explains how to implement cluster visualizations in your CRMS system. The visualization shows student clusters in a 2D scatter plot, similar to the K-Means clustering examples you saw.

## What's Been Added

### 1. **React Component** (`frontend/src/components/ClusterVisualization.jsx`)

A reusable component that displays clusters as a 2D scatter plot:
- **X-axis**: Final Score (0-100)
- **Y-axis**: Attendance Percentage (0-100)
- **Colors**: Each cluster has a distinct color
- **Interactive**: Hover to see student details

### 2. **Integration in Analytics Pages**

The component has been added to:
- `frontend/src/pages/dean/Analytics.jsx`
- Ready to add to other analytics pages (faculty, program-chair)

## How It Works

### Data Flow

```
1. Backend API (/api/assessments/dean-analytics/sample)
   ↓ Returns student data with cluster assignments
   
2. Frontend Analytics Page
   ↓ Receives data with cluster_label, final_score, attendance_percentage
   
3. ClusterVisualization Component
   ↓ Groups students by cluster_label
   ↓ Creates scatter plot points
   ↓ Renders using Recharts
```

### Component Usage

```jsx
import ClusterVisualization from '../../components/ClusterVisualization';

// In your component:
<ClusterVisualization 
  data={studentData}  // Array of student objects with cluster_label
  height={300}        // Optional: chart height
/>
```

### Required Data Structure

Each student object should have:
```javascript
{
  student_id: 1,
  full_name: "John Doe",
  cluster_label: "Excellent Performance",  // Required
  final_score: 85.5,                       // For Score vs Attendance
  attendance_percentage: 92.0,             // For Score vs Attendance
  submission_ontime_priority_score: 88.0,  // Optional
  pca_x: -1.23,                            // NEW: PCA component 1 (optional)
  pca_y: 0.87,                             // NEW: PCA component 2 (optional)
  pca_component_1_variance: 0.45,          // NEW: Explained variance (optional)
  pca_component_2_variance: 0.32           // NEW: Explained variance (optional)
}
```

## Implementation Steps

### Step 1: Verify Component is Added

The component is already imported in `dean/Analytics.jsx`:
```jsx
import ClusterVisualization from '../../components/ClusterVisualization';
```

### Step 2: Component is Already Rendered

The visualization appears in the charts section:
```jsx
{data && data.length > 0 && (
  <ClusterVisualization data={data} height={300} />
)}
```

### Step 3: Add to Other Analytics Pages (Optional)

To add to Faculty or Program Chair analytics:

1. **Import the component:**
```jsx
import ClusterVisualization from '../../components/ClusterVisualization';
```

2. **Add in the charts section:**
```jsx
{chartData && chartsLoaded && (
  <div className="space-y-3">
    {/* Cluster Visualization */}
    {data && data.length > 0 && (
      <ClusterVisualization data={data} height={300} />
    )}
    
    {/* Other charts... */}
  </div>
)}
```

## Visual Features

### Color Scheme

- **Excellent Performance**: Green (#10b981)
- **Good Performance**: Blue (#3b82f6)
- **Average Performance**: Amber (#f59e0b)
- **Needs Improvement**: Orange (#f97316)
- **At Risk**: Red (#ef4444)

### Interactive Features

- **Hover Tooltip**: Shows student name, cluster, score, and attendance
- **Legend**: Displays all cluster types
- **Responsive**: Adapts to container width

## Customization

### Change Chart Dimensions

```jsx
<ClusterVisualization data={data} height={400} />
```

### Change Axes

Edit `ClusterVisualization.jsx` to use different features:
```jsx
// Current: Score vs Attendance
x: student.final_score || student.average_score || 0,
y: student.attendance_percentage || 0,

// Could change to: Score vs Submission Rate
x: student.final_score || 0,
y: student.submission_ontime_priority_score || 0,
```

### Add More Visualizations

You can create additional components:
- `ClusterPCAVisualization.jsx` - PCA 2D projection
- `ClusterSilhouetteChart.jsx` - Silhouette score visualization
- `ClusterStatistics.jsx` - Cluster metrics dashboard

## Testing

1. **Open Analytics Page**: Navigate to Dean Analytics
2. **Load Data**: Apply filters and load student data
3. **View Visualization**: Scroll to charts section
4. **Verify**: 
   - Clusters are visible and separated
   - Colors match cluster labels
   - Tooltips work on hover
   - Legend shows all clusters

## Troubleshooting

### No Visualization Appears

**Check:**
- Is `data` array populated?
- Do students have `cluster_label` assigned?
- Are `final_score` and `attendance_percentage` present?

**Solution:**
```jsx
// Add debug logging
console.log('Data for visualization:', data);
console.log('Students with clusters:', data.filter(s => s.cluster_label));
```

### Clusters Overlap Too Much

**This indicates low Silhouette score (< 0.3)**

**Solutions:**
1. Check Silhouette score in clustering metadata
2. Review clustering optimization guide: `docs/ACHIEVING_OPTIMAL_CLUSTERS.md`
3. Ensure you have 30+ students for reliable clustering
4. Verify features have good variance

### Colors Don't Match

**Check:**
- Cluster labels match exactly (case-sensitive)
- `getClusterColor()` function in component

**Solution:**
Update color mapping in `ClusterVisualization.jsx`:
```jsx
const colors = {
  'Excellent Performance': '#10b981',
  // Add your cluster labels here
};
```

## Advanced: Multiple Visualizations

You can add multiple views:

```jsx
<div className="grid grid-cols-2 gap-4">
  {/* Score vs Attendance */}
  <ClusterVisualization 
    data={data} 
    xKey="final_score"
    yKey="attendance_percentage"
    title="Score vs Attendance"
  />
  
  {/* Score vs Submission Rate */}
  <ClusterVisualization 
    data={data} 
    xKey="final_score"
    yKey="submission_ontime_priority_score"
    title="Score vs Submission Rate"
  />
</div>
```

## Performance

- **Rendering**: Handles 100+ students smoothly
- **Updates**: Re-renders only when data changes (useMemo)
- **Memory**: Minimal - only processes visible data

## Next Steps

1. ✅ Component created and integrated
2. ✅ Added to Dean Analytics page
3. 🔄 Test with real data
4. 🔄 Add to other analytics pages (optional)
5. 🔄 Create additional visualization types (optional)

## Files Modified

- ✅ `frontend/src/components/ClusterVisualization.jsx` - New component
- ✅ `frontend/src/pages/dean/Analytics.jsx` - Added visualization
- 📝 `docs/CLUSTER_VISUALIZATION_IMPLEMENTATION.md` - This guide

## Support

For questions or issues:
- Check clustering optimization: `docs/ACHIEVING_OPTIMAL_CLUSTERS.md`
- Review analytics explained: `docs/CLUSTERING_ANALYTICS_EXPLAINED.md`
- Check component code: `frontend/src/components/ClusterVisualization.jsx`

