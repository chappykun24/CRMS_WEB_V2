# Analytics Clustering: How It Works

## Overview

The analytics clustering system groups students based on their academic performance patterns using machine learning. This document explains the complete flow from raw database data to final cluster assignments.

---

## 📊 Data Flow Pipeline

```
Raw Database Data
    ↓
SQL Query (Aggregates & Calculates Metrics)
    ↓
Student Analytics Data (JSON)
    ↓
Data Normalization & Sanitization
    ↓
Python Clustering API (K-Means Algorithm)
    ↓
Cluster Assignments (Labels & Numbers)
    ↓
Cache Storage (Database)
    ↓
Frontend Display
```

---

## 🔍 Step-by-Step Process

### **Step 1: Raw Data Collection** (`backend/routes/assessments.js`)

The system starts by querying the database to collect student performance metrics:

**SQL Query Features:**
- **Attendance Data:**
  - `attendance_percentage`: (Present / Total Sessions) × 100
  - `attendance_present_count`: Number of present sessions
  - `attendance_absent_count`: Number of absent sessions
  - `attendance_late_count`: Number of late arrivals
  - `attendance_total_sessions`: Total attendance sessions logged

- **Score Data:**
  - `average_score`: Final grade using transmuted scoring formula
    - Formula: `((adjusted_score / total_points) × 62.5 + 37.5) × (weight_percentage / 100)`
    - Averaged across all courses
  - `ilo_weighted_score`: Same as average_score but with ILO boost factor (1.0-1.5x)
  - `assessment_scores_by_ilo`: JSON array of scores grouped by ILO

- **Submission Behavior:**
  - `submission_rate`: (Ontime + Late) / Total Assessments
  - `submission_ontime_count`: Number of ontime submissions
  - `submission_late_count`: Number of late submissions
  - `submission_missing_count`: Number of missing submissions
  - `submission_total_assessments`: Total assessments assigned
  - `average_submission_status_score`: Numerical score (0=ontime, 1=late, 2=missing)

**ILO Filtering:**
- When an ILO is selected, the query filters to only include assessments mapped to that ILO via:
  - `assessment_ilo_weights` table (direct mapping)
  - `ilo_so_mappings`, `ilo_iga_mappings`, `ilo_cdio_mappings` tables (mapping-based assessment_tasks)

**Result:** Array of student objects with all performance metrics

---

### **Step 2: Data Normalization** (`backend/services/clusteringService.js`)

Before sending to the clustering API, data is normalized:

```javascript
normalizeStudentData(students) {
  // Converts all values to proper types:
  // - Numbers: attendance_percentage, average_score, submission_rate, etc.
  // - Null handling: Converts undefined/null to null
  // - NaN handling: Filters out invalid numbers
}
```

**Purpose:**
- Ensures consistent data types
- Handles missing/null values
- Prevents API errors from invalid data

**Result:** Sanitized array ready for ML processing

---

### **Step 3: Cache Check** (`backend/services/clusteringService.js`)

Before calling the API, the system checks for cached clusters:

**Cache Strategy:**
- **Cache Key:** Based on `term_id`, `section_course_id`, and `student_id`
- **Cache Age:** Default 24 hours (configurable)
- **Cache Location:** `analytics_clusters` database table

**Cache Hit:**
- If all students have cached clusters within the age limit → Return immediately (FAST PATH)
- No API call needed

**Cache Miss:**
- Continue to API call (SLOW PATH)

---

### **Step 4: Feature Engineering** (`python-cluster-api/app.py`)

The Python API receives the normalized data and creates enhanced features:

**Feature Calculation:**

1. **Attendance Features:**
   ```python
   attendance_present_rate = present_count / total_sessions
   attendance_late_rate = late_count / total_sessions
   attendance_absent_rate = absent_count / total_sessions
   ```

2. **Submission Features:**
   ```python
   submission_ontime_rate = ontime_count / total_assessments
   submission_late_rate = late_count / total_assessments
   submission_missing_rate = missing_count / total_assessments
   submission_quality_score = (ontime_rate × 100) + (late_rate × 20)  # Prioritizes ontime
   submission_ontime_priority_score = (ontime_count / total_assessments) × 100
   ```

3. **Score Features:**
   ```python
   final_score = ilo_weighted_score if available, else average_score
   ```

**Final Feature Set (12 features):**
1. `attendance_percentage` - Overall attendance
2. `attendance_present_rate` - Present rate (0-1)
3. `attendance_late_rate` - Late rate (0-1)
4. `final_score` - Academic score (ILO-weighted preferred)
5. `submission_ontime_rate` - **PRIORITY** (highest weight)
6. `submission_ontime_priority_score` - **PRIORITY** (high weight)
7. `submission_quality_score` - **PRIORITY** (high weight)
8. `submission_rate` - Overall submission rate
9. `submission_late_rate` - Late submission rate
10. `submission_missing_rate` - Missing submission rate
11. `submission_status_score` - Status score (0.0-2.0)

**Note:** Features are ordered by priority - ontime submissions have higher influence on clustering.

---

### **Step 5: Data Preprocessing** (`python-cluster-api/app.py`)

Before clustering:

1. **Type Conversion:**
   - All features converted to numeric
   - Invalid values → NaN

2. **Missing Value Imputation:**
   ```python
   attendance_percentage: 75.0 (default)
   final_score: 50.0 (default)
   submission_ontime_rate: 0.6 (default)
   submission_quality_score: 68.0 (default)
   # ... etc
   ```

3. **Feature Scaling:**
   ```python
   StandardScaler()  # Normalizes features to mean=0, std=1
   # Ensures all features have equal weight in clustering
   ```

**Result:** Scaled feature matrix ready for clustering

---

### **Step 6: K-Means Clustering** (`python-cluster-api/app.py`)

**Algorithm:**
```python
KMeans(n_clusters=4, random_state=42)
clusters = kmeans.fit_predict(X_scaled)
```

**Process:**
1. **Determine Cluster Count:**
   - Default: 4 clusters
   - Minimum: 2 clusters (need at least 2 students)
   - Maximum: Number of students (if < 4)

2. **Clustering:**
   - K-Means groups students into clusters based on similarity
   - Students with similar performance patterns → Same cluster
   - Uses Euclidean distance in 12-dimensional feature space

3. **Quality Assessment:**
   - **Silhouette Score:** Measures cluster quality (-1 to 1)
     - > 0.5: Excellent
     - > 0.3: Good
     - > 0.1: Fair
     - < 0.1: Poor

---

### **Step 7: Cluster Labeling** (`python-cluster-api/app.py`)

After clustering, each cluster is assigned a human-readable label:

**Label Assignment Logic:**
1. Calculate cluster statistics (centroids):
   - Average attendance percentage
   - Average score
   - Average submission rates
   - Average ontime rate

2. Compare to thresholds:
   ```python
   # Example thresholds:
   - "At Risk": Low attendance (< 70%) AND Low score (< 60%) AND Low ontime rate (< 50%)
   - "Needs Improvement": Moderate performance across all metrics
   - "Average Performance": Good attendance (> 80%) OR Good score (> 70%)
   - "Excellent Performance": High attendance (> 90%) AND High score (> 85%) AND High ontime rate (> 80%)
   ```

3. Assign label based on cluster characteristics

**Result:** Each student gets:
- `cluster`: Number (0, 1, 2, 3)
- `cluster_label`: String ("At Risk", "Needs Improvement", etc.)
- `silhouette_score`: Quality metric

---

### **Step 8: Cache Storage** (`backend/services/clusteringService.js`)

Clusters are saved to the database for future use:

**Storage:**
```sql
INSERT INTO analytics_clusters (
  student_id,
  term_id,
  section_course_id,  -- NULL for term-wide clustering
  cluster_label,
  cluster_number,
  based_on,  -- JSON: {attendance, score, submission_rate}
  algorithm_used,
  model_version,
  silhouette_score,
  generated_at
)
```

**Cache Invalidation:**
- Old clusters deleted when new ones are generated
- Scope-based: Term-specific or class-specific

---

### **Step 9: Application to Students** (`backend/services/clusteringService.js`)

Clusters are merged back into student data:

```javascript
applyClustersToStudents(students, clusterMap) {
  // For each student:
  // - Look up cluster in map by student_id
  // - Add cluster, cluster_label, silhouette_score to student object
  // - Return enriched student data
}
```

**Result:** Students now have cluster assignments

---

### **Step 10: Frontend Display** (`frontend/src/pages/dean/Analytics.jsx`)

The frontend receives students with cluster data and displays:

1. **Cluster Filter Dropdown:**
   - Filter students by cluster label
   - Shows count per cluster

2. **Cluster Badges:**
   - Color-coded by cluster type:
     - Red: "At Risk"
     - Orange: "Needs Improvement"
     - Blue: "Average Performance"
     - Green: "Excellent Performance"

3. **Charts:**
   - Scatter plots colored by cluster
   - Pie charts showing cluster distribution

---

## 🎯 ILO-Based Clustering

When an ILO is selected in the frontend:

1. **Backend Query Filters:**
   - Only includes assessments mapped to selected ILO
   - Uses `assessment_ilo_weights` and mapping tables
   - Calculates scores based only on ILO-aligned assessments

2. **Clustering Impact:**
   - Students are clustered based on performance in ILO-specific assessments
   - Different clusters may emerge compared to "Overall" mode
   - Useful for identifying students struggling with specific learning outcomes

3. **Example:**
   - **Overall:** Student might be "Average Performance"
   - **ILO-Specific:** Same student might be "At Risk" for a specific ILO

---

## 🔄 Caching Strategy

**Cache Levels:**
1. **Database Cache:** `analytics_clusters` table (24 hours default)
2. **Session Cache:** Browser sessionStorage (instant)
3. **Enhanced Cache:** LocalStorage with expiration (10 minutes)

**Cache Invalidation:**
- Force refresh button → Bypasses all caches
- New term → Cache miss
- New ILO filter → Different cache key

---

## 📈 Performance Metrics

**Clustering Quality Indicators:**

1. **Silhouette Score:**
   - Measures how well-separated clusters are
   - Higher = Better clustering
   - Displayed in frontend

2. **Cluster Distribution:**
   - Number of students per cluster
   - Balanced distribution = Good clustering
   - One large cluster = Poor clustering

3. **Feature Variation:**
   - Low variation in features → Poor clustering
   - High variation → Better clustering

---

## 🛠️ Configuration

**Environment Variables:**
- `CLUSTER_SERVICE_URL`: Python API endpoint
- `CLUSTER_CACHE_MAX_AGE_HOURS`: Cache age (default: 24)
- `CLUSTER_API_TIMEOUT_MS`: API timeout (default: 30000)
- `DISABLE_CLUSTERING`: Set to '1' to disable

---

## 🔍 Debugging

**Key Log Points:**
1. `[Backend]` - SQL query execution
2. `[Clustering]` - Cache checks, API calls
3. `[Python API]` - Feature engineering, clustering, labeling

**Common Issues:**
- **No clusters:** Check Python API logs, verify data quality
- **All same cluster:** Low feature variation, check data
- **Null labels:** Python API error, check API logs
- **Cache not working:** Check database connection, cache age

---

## 📝 Summary

The clustering system transforms raw student data into meaningful performance groups through:

1. **Data Collection:** SQL aggregates performance metrics
2. **Feature Engineering:** Creates 12 numerical features
3. **Machine Learning:** K-Means clustering groups similar students
4. **Labeling:** Assigns human-readable labels based on cluster characteristics
5. **Caching:** Stores results for fast retrieval
6. **Display:** Frontend visualizes clusters with filters and charts

The system prioritizes **ontime submissions** and uses **ILO-aligned assessments** when filtering, providing actionable insights for identifying at-risk students and tracking learning outcomes.

