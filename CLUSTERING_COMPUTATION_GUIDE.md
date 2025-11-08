# Student Clustering Computation Guide

## Overview

The clustering system uses **K-Means clustering** to group students based on their academic performance metrics. This guide explains how clusters are determined and how to debug clustering issues.

## Data Flow

```
Backend (Node.js) → Clustering API (Python) → K-Means Algorithm → Cluster Labels
```

1. **Backend sends student data** to Python API with these metrics:
   - `attendance_percentage` (0-100)
   - `average_score` (0-100)
   - `average_days_late` (number of days)
   - `submission_rate` (0-100 or 0-1)

2. **Python API processes data** using K-Means clustering

3. **Clusters are labeled** based on performance patterns

4. **Results are cached** in database for 24 hours (configurable)

## Clustering Algorithm (Python)

### Input Features

The algorithm uses 4 features for clustering:

1. **Attendance Percentage** (0-100%)
   - Higher is better
   - Normalized using StandardScaler

2. **Average Score** (0-100)
   - Higher is better
   - Normalized using StandardScaler

3. **Average Days Late** (number of days)
   - Lower is better
   - Normalized using StandardScaler

4. **Submission Rate** (0-100% or 0-1)
   - Higher is better
   - If > 1, converted to decimal (95 → 0.95)
   - If missing, calculated from `average_days_late` or defaults to 0.8

### Data Preprocessing

```python
# 1. Convert to numeric types
features = ['attendance_percentage', 'average_score', 'average_days_late', 'submission_rate']
for col in features:
    df[col] = pd.to_numeric(df[col], errors='coerce')

# 2. Handle missing values
- attendance_percentage: Default to 75% if missing
- average_score: Default to 50 if missing
- average_days_late: Default to 3 if missing
- submission_rate: Default to 0.8 if missing

# 3. Normalize data using StandardScaler
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
```

### K-Means Clustering

```python
# Determine number of clusters based on data size
n_clusters = min(4, max(2, len(students) // 10))

# Perform clustering
kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto')
clusters = kmeans.fit_predict(X_scaled)
```

### Cluster Label Assignment

After clustering, each cluster is assigned a label based on its **performance score**:

#### Performance Score Calculation

```python
# Weighted score for each cluster
score = (
    avg_attendance * 0.30 +           # 30% weight
    avg_score * 0.30 +                 # 30% weight
    avg_submission_rate * 100 * 0.25 + # 25% weight
    (100 - avg_days_late * 10) * 0.15 # 15% weight (lower days late = higher score)
)
```

#### Cluster Labels (4 clusters)

1. **Excellent Performance** - Highest score cluster
   - High attendance, high scores, high submission rate, low days late

2. **On Track** - Second highest score cluster
   - Good attendance, good scores, good submission rate

3. **Needs Improvement** - Second lowest score cluster
   - Moderate attendance, moderate scores, moderate submission rate

4. **At Risk** - Lowest score cluster
   - Low attendance, low scores, low submission rate, high days late

#### Cluster Labels (3 clusters)

1. **Excellent Performance** - Highest score
2. **On Track** - Middle score
3. **Needs Guidance** - Lowest score

#### Cluster Labels (2 clusters)

1. **Performing Well** - Higher score
2. **Needs Support** - Lower score

## Expected Cluster Characteristics

### Excellent Performance
- **Attendance**: Typically > 85%
- **Average Score**: Typically > 45
- **Submission Rate**: Typically > 90%
- **Days Late**: Typically < 2 days

### Good Performance
- **Attendance**: Typically 75-85%
- **Average Score**: Typically 40-45
- **Submission Rate**: Typically 80-90%
- **Days Late**: Typically 2-3 days

### Needs Improvement
- **Attendance**: Typically 60-75%
- **Average Score**: Typically 35-40
- **Submission Rate**: Typically 70-80%
- **Days Late**: Typically 3-5 days

### At Risk
- **Attendance**: Typically < 60%
- **Average Score**: Typically < 35
- **Submission Rate**: Typically < 70%
- **Days Late**: Typically > 5 days

## Common Issues & Debugging

### Issue 1: All Students in Same Cluster

**Symptoms:**
- All students show "At Risk", "Needs Improvement", or "Excellent Performance"
- No variation in cluster assignments

**Possible Causes:**

1. **Data Quality Issues**
   - All students have similar metrics (e.g., all have 100% submission rate)
   - Missing or null values being replaced with defaults
   - Data not normalized properly

2. **Insufficient Data Variation**
   - All students have very similar scores
   - K-Means can't distinguish between students
   - Need more diverse data

3. **Cache Issues**
   - Old cached clusters being used
   - Cache contains incorrect data from previous run

**Solutions:**

```sql
-- Check cached clusters
SELECT 
    cluster_label, 
    COUNT(*) as count,
    AVG(attendance_percentage) as avg_attendance,
    AVG(average_score) as avg_score
FROM analytics_clusters
GROUP BY cluster_label;

-- Clear cache for a specific term
DELETE FROM analytics_clusters WHERE term_id = <term_id>;

-- Check student data variation
SELECT 
    MIN(attendance_percentage) as min_attendance,
    MAX(attendance_percentage) as max_attendance,
    AVG(attendance_percentage) as avg_attendance,
    MIN(average_score) as min_score,
    MAX(average_score) as max_score,
    AVG(average_score) as avg_score
FROM students;
```

### Issue 2: Incorrect Cluster Assignments

**Symptoms:**
- Students with high scores in "At Risk" cluster
- Students with low scores in "Excellent Performance" cluster

**Possible Causes:**

1. **Feature Scaling Issues**
   - Data not properly normalized
   - One feature dominating others
   - Outliers affecting clustering

2. **Wrong Number of Clusters**
   - Too few clusters (all grouped together)
   - Too many clusters (over-segmentation)

3. **Missing Features**
   - Null values replaced with defaults
   - Incorrect default values
   - Feature calculation errors

**Solutions:**

```python
# Check feature distributions
print(df[['attendance_percentage', 'average_score', 'average_days_late', 'submission_rate']].describe())

# Check for null values
print(df[features].isnull().sum())

# Check cluster centroids
for cluster_id in range(n_clusters):
    cluster_data = df[df['cluster'] == cluster_id]
    print(f"Cluster {cluster_id}:")
    print(f"  Attendance: {cluster_data['attendance_percentage'].mean():.2f}")
    print(f"  Score: {cluster_data['average_score'].mean():.2f}")
    print(f"  Days Late: {cluster_data['average_days_late'].mean():.2f}")
    print(f"  Submission Rate: {cluster_data['submission_rate'].mean():.2f}")
```

### Issue 3: Cluster Labels Not Matching Performance

**Symptoms:**
- Cluster labels don't match expected performance levels
- "Excellent Performance" cluster has low scores

**Possible Causes:**

1. **Label Assignment Logic Error**
   - Performance score calculation incorrect
   - Cluster sorting wrong
   - Label mapping incorrect

2. **Data Quality**
   - Missing or incorrect data
   - Default values skewing results
   - Outliers affecting centroids

**Solutions:**

```python
# Verify performance score calculation
cluster_scores = {}
for cluster_id, stats in cluster_stats.items():
    score = (
        stats['avg_attendance'] * 0.30 +
        stats['avg_score'] * 0.30 +
        stats['avg_submission_rate'] * 100 * 0.25 +
        (100 - stats['avg_days_late'] * 10) * 0.15
    )
    cluster_scores[cluster_id] = score
    print(f"Cluster {cluster_id}: Score = {score:.2f}")

# Verify label assignment
sorted_clusters = sorted(cluster_scores.items(), key=lambda x: x[1], reverse=True)
print("Cluster order (highest to lowest):", sorted_clusters)
```

## Manual Cluster Verification

### Step 1: Check Input Data

```sql
-- Get sample student data sent to clustering API
SELECT 
    student_id,
    attendance_percentage,
    average_score,
    average_days_late,
    submission_rate
FROM students
LIMIT 10;
```

### Step 2: Calculate Performance Score Manually

For each student, calculate:

```javascript
const performanceScore = (
    attendance_percentage * 0.30 +
    average_score * 0.30 +
    submission_rate * 0.25 +
    (100 - average_days_late * 10) * 0.15
);
```

### Step 3: Verify Cluster Assignment

Students should be grouped by similar performance scores. Higher scores → Better clusters.

### Step 4: Check Cluster Distribution

```sql
-- Check cluster distribution
SELECT 
    cluster_label,
    COUNT(*) as student_count,
    ROUND(AVG(attendance_percentage), 2) as avg_attendance,
    ROUND(AVG(average_score), 2) as avg_score,
    ROUND(AVG(average_days_late), 2) as avg_days_late,
    ROUND(AVG(submission_rate), 2) as avg_submission_rate
FROM analytics_clusters ac
JOIN students s ON ac.student_id = s.student_id
GROUP BY cluster_label
ORDER BY 
    CASE cluster_label
        WHEN 'Excellent Performance' THEN 1
        WHEN 'Good Performance' THEN 2
        WHEN 'Needs Improvement' THEN 3
        WHEN 'At Risk' THEN 4
    END;
```

## Testing Clustering Logic

### Test Case 1: High Performer

```json
{
  "student_id": 1,
  "attendance_percentage": 95,
  "average_score": 85,
  "average_days_late": 0,
  "submission_rate": 100
}
```

**Expected**: Excellent Performance

### Test Case 2: Low Performer

```json
{
  "student_id": 2,
  "attendance_percentage": 50,
  "average_score": 30,
  "average_days_late": 10,
  "submission_rate": 60
}
```

**Expected**: At Risk

### Test Case 3: Average Performer

```json
{
  "student_id": 3,
  "attendance_percentage": 75,
  "average_score": 40,
  "average_days_late": 3,
  "submission_rate": 80
}
```

**Expected**: Needs Improvement or Good Performance

## Python API Debugging

### Enable Debug Logging

Add logging to `python-cluster-api/app.py`:

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Log input data
print(f'📊 Input data shape: {df.shape}')
print(f'📊 Feature ranges:')
print(f'  Attendance: {df["attendance_percentage"].min():.2f} - {df["attendance_percentage"].max():.2f}')
print(f'  Score: {df["average_score"].min():.2f} - {df["average_score"].max():.2f}')
print(f'  Days Late: {df["average_days_late"].min():.2f} - {df["average_days_late"].max():.2f}')
print(f'  Submission Rate: {df["submission_rate"].min():.2f} - {df["submission_rate"].max():.2f}')

# Log cluster centroids
print(f'📊 Cluster centroids:')
for cluster_id, stats in cluster_stats.items():
    print(f'  Cluster {cluster_id}: {stats}')

# Log performance scores
print(f'📊 Cluster performance scores:')
for cluster_id, score in cluster_scores.items():
    print(f'  Cluster {cluster_id}: {score:.2f}')
```

### Check API Response

```bash
# Test clustering API locally
curl -X POST http://localhost:10000/api/cluster \
  -H "Content-Type: application/json" \
  -d '[
    {
      "student_id": 1,
      "attendance_percentage": 95,
      "average_score": 85,
      "average_days_late": 0,
      "submission_rate": 100
    },
    {
      "student_id": 2,
      "attendance_percentage": 50,
      "average_score": 30,
      "average_days_late": 10,
      "submission_rate": 60
    }
  ]'
```

## Recommended Actions

1. **Check Data Quality**
   - Verify student metrics are accurate
   - Check for missing or null values
   - Ensure data ranges are correct

2. **Verify Clustering API**
   - Test API with sample data
   - Check cluster centroids
   - Verify label assignment logic

3. **Clear Cache**
   - Delete old cached clusters
   - Re-run clustering with fresh data

4. **Monitor Cluster Distribution**
   - Check if clusters are balanced
   - Verify cluster labels match performance
   - Ensure sufficient data variation

5. **Review Python Code**
   - Check feature normalization
   - Verify performance score calculation
   - Ensure label mapping is correct

## Contact & Support

If clustering issues persist:

1. Check backend logs for clustering API calls
2. Check Python API logs for clustering errors
3. Verify database cache is correct
4. Test with sample data to isolate issues

## References

- **K-Means Clustering**: https://scikit-learn.org/stable/modules/generated/sklearn.cluster.KMeans.html
- **StandardScaler**: https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.StandardScaler.html
- **Clustering Service**: `backend/services/clusteringService.js`
- **Python API**: `python-cluster-api/app.py`

