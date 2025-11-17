# Analytics Clustering: How It Works

## Overview

The analytics clustering system groups students based on their academic performance patterns using machine learning. This document explains the complete flow from raw database data to final cluster assignments.

---

## 📋 Data Requirements

### **Minimum Required Data for Clustering**

For the elbow method and clustering to work, you need the following minimum data per student:

#### **1. Core Student Identifier**
- `student_id` (REQUIRED): Unique student identifier

#### **2. Attendance Data (At least one field)**
- `attendance_percentage` OR detailed counts:
  - `attendance_present_count` + `attendance_total_sessions`
  - `attendance_absent_count` (optional)
  - `attendance_late_count` (optional)

#### **3. Score Data (At least one field)**
- `average_score` (REQUIRED): Final grade using transmuted scoring formula
- `assessment_scores_by_ilo` (optional): ILO-specific scores for filtered clustering

#### **4. Submission Data (At least one field)**
- `submission_rate` OR detailed counts:
  - `submission_ontime_count` + `submission_total_assessments`
  - `submission_late_count` (optional)
  - `submission_missing_count` (optional)

### **Minimum Data for Elbow Method**

**Requirements:**
- At least **2 students** (need at least 2 to form clusters)
- At least **4 students** for elbow method to test k=2 to k=8
- Data size determines max_clusters: `max_clusters = min(8, n_students // 2)`

**Example:**
```
2 students  → k=2 only (no elbow method, uses k=2)
4 students  → Tests k=2 (elbow method)
8 students  → Tests k=2 to k=4 (max_clusters = 8 // 2 = 4)
16 students → Tests k=2 to k=8 (full range)
```

### **Complete Data Schema**

Here's the complete data structure sent to the clustering API:

```javascript
{
  student_id: number,                    // REQUIRED
  
  // ATTENDANCE DATA
  attendance_percentage: number,         // REQUIRED (or use counts below)
  attendance_present_count: number,      // Optional (if attendance_percentage not available)
  attendance_absent_count: number,       // Optional
  attendance_late_count: number,         // Optional
  attendance_total_sessions: number,     // Required if using counts
  
  // SCORE DATA
  average_score: number,                 // REQUIRED
  assessment_scores_by_ilo: [            // Optional (for ILO-filtered clustering)
    {
      ilo_id: number,
      ilo_code: string,
      assessments: [
        {
          assessment_id: number,
          transmuted_score: number,
          weight_percentage: number
        }
      ]
    }
  ],
  
  // SUBMISSION DATA
  submission_rate: number,               // Optional (or use counts below)
  submission_ontime_count: number,       // Optional (if submission_rate not available)
  submission_late_count: number,         // Optional
  submission_missing_count: number,      // Optional
  submission_total_assessments: number,  // Required if using counts
  average_submission_status_score: number // Optional (0=ontime, 1=late, 2=missing)
}
```

### **Default Values (Missing Data Handling)**

If data is missing, the system uses reasonable defaults:

```python
# Attendance defaults
attendance_percentage: 75.0        # 75% default
attendance_present_rate: 0.75      # 75% present
attendance_late_rate: 0.10         # 10% late

# Score defaults
final_score: 50.0                  # 50% default score

# Submission defaults (prioritizing ontime)
submission_ontime_rate: 0.6        # 60% ontime default
submission_ontime_priority_score: 60.0  # 60% ontime priority
submission_quality_score: 68.0     # Weighted quality score
submission_rate: 0.8               # 80% submission rate
submission_late_rate: 0.2          # 20% late
submission_missing_rate: 0.0       # 0% missing
submission_status_score: 0.5       # Moderate status
```

### **Data Quality Requirements**

**For Optimal Clustering:**

1. **Minimum Variation:**
   - Need variation in features to distinguish students
   - If all students have same attendance/score/submission → Poor clustering
   - System warns if feature variation < 0.01

2. **Minimum Sample Size:**
   - **2 students**: Minimum for clustering (k=2)
   - **4 students**: Minimum for elbow method
   - **8+ students**: Recommended for reliable clustering

3. **Data Completeness:**
   - More complete data → Better clustering quality
   - Missing data uses defaults (may reduce accuracy)
   - At least 50% of data fields should be populated for best results

### **What Happens with Insufficient Data?**

| Data Size | Elbow Method | Clustering Result |
|-----------|--------------|-------------------|
| 0-1 student | ❌ Not enough data | Returns "Not Clustered" |
| 2 students | ⚠️ Uses k=2 directly | Creates 2 clusters |
| 3 students | ⚠️ Uses k=2 directly | Creates 2 clusters (one will be small) |
| 4-7 students | ✅ Tests k=2 to k=(n//2) | Optimal k determined |
| 8+ students | ✅ Tests k=2 to k=8 | Full elbow method analysis |

### **Database Tables Required**

To collect this data, the following database tables must exist:

**Required Tables:**
- `students` - Student basic info
- `attendance` - Attendance records
- `assessment_grades` - Grade scores
- `submissions` - Submission records
- `course_enrollments` - Enrollment links

**Optional Tables (for ILO filtering):**
- `assessment_ilo_weights` - ILO mappings
- `ilo_so_mappings` - SO standard mappings
- `ilo_iga_mappings` - IGA standard mappings
- `ilo_cdio_mappings` - CDIO standard mappings

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
   final_score = average_score  # Uses transmuted scoring formula
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

### **Step 6: Optimal Cluster Selection (Elbow Method)** (`python-cluster-api/app.py`)

**Elbow Method Process:**
```python
find_optimal_clusters_elbow_method(X_scaled, max_clusters=8, min_clusters=2)
```

**How Elbow Method Works:**
1. **Test Multiple k Values:**
   - Tests k values from 2 to max_clusters (default: 8)
   - Adjusts max_clusters based on data size (need at least 2 samples per cluster)
   - For each k, runs K-Means and calculates WCSS (Within-Cluster Sum of Squares)

2. **Find Elbow Point:**
   - Calculates rate of change (first derivative) in WCSS
   - Calculates acceleration (second derivative) to find sharpest bend
   - The elbow point is where the rate of decrease in WCSS changes most sharply
   - This indicates the optimal number of clusters

3. **Optimal k Selection:**
   - Uses the k value at the sharpest elbow point
   - Falls back to middle value if no clear elbow is found
   - Ensures k is between 2 and max_clusters

**Result:** Optimal number of clusters (k) determined automatically

---

### **Step 7: K-Means Clustering** (`python-cluster-api/app.py`)

**Algorithm:**
```python
KMeans(n_clusters=optimal_k, random_state=42)
clusters = kmeans.fit_predict(X_scaled)
```

**Process:**
1. **Cluster Count:**
   - Uses optimal k determined by elbow method
   - Minimum: 2 clusters (need at least 2 students)
   - Maximum: Adjusted based on data size (at least 2 samples per cluster)

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

### **Step 8: Cluster Labeling** (`python-cluster-api/app.py`)

After clustering, each cluster is assigned a human-readable label:

**Label Assignment Logic:**
1. Calculate cluster statistics (centroids):
   - Average attendance percentage
   - Average score
   - Average submission rates
   - Average ontime rate

2. Rank clusters by performance score:
   ```python
   # Weighted performance score:
   score = (
       avg_attendance * 0.20 +
       avg_score * 0.25 +
       avg_ontime_priority_score * 0.25 +  # PRIORITY
       avg_quality_score * 0.15 +  # PRIORITY
       avg_submission_rate * 100 * 0.10 +
       (100 - avg_status_score * 50) * 0.05
   )
   ```

3. Assign labels based on cluster ranking and count:
   - **2 clusters:** "Performing Well" / "Needs Support"
   - **3 clusters:** "Excellent Performance" / "Average Performance" / "Needs Guidance"
   - **4 clusters:** "Excellent Performance" / "Average Performance" / "Needs Improvement" / "At Risk"
   - **5 clusters:** Adds "Good Performance" tier
   - **6 clusters:** Adds "Below Average" tier
   - **7 clusters:** Adds "Very Good Performance" tier
   - **8+ clusters:** Uses tiered distribution (Top 25% / Middle 50% / Bottom 25%)

**Result:** Each student gets:
- `cluster`: Number (0, 1, 2, ..., k-1) where k is determined by elbow method
- `cluster_label`: String based on optimal k and cluster ranking
- `silhouette_score`: Quality metric

---

### **Step 9: Cache Storage** (`backend/services/clusteringService.js`)

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

### **Step 10: Application to Students** (`backend/services/clusteringService.js`)

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

### **Step 11: Frontend Display** (`frontend/src/pages/dean/Analytics.jsx`)

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

## 🎯 Elbow Method for Optimal Cluster Selection

### **Why Elbow Method?**

The elbow method automatically determines the optimal number of clusters instead of using a fixed value (e.g., k=4). This provides:

1. **Data-Driven Clustering:** Adapts to your specific dataset
2. **Better Separation:** Finds the natural number of distinct groups in your data
3. **Quality Improvement:** Often produces better silhouette scores than fixed k
4. **Flexibility:** Works with different data sizes and distributions

### **How It Works**

1. **Test Multiple k Values:**
   - Tests k from 2 to max_clusters (default: 8)
   - Adjusted based on data size (needs at least 2 samples per cluster)
   - For each k, calculates WCSS (Within-Cluster Sum of Squares)

2. **Calculate Elbow Point:**
   ```
   WCSS for k=2: 1500
   WCSS for k=3: 1000  (decrease: 500)
   WCSS for k=4: 700   (decrease: 300) ← Elbow: sharpest change
   WCSS for k=5: 550   (decrease: 150)
   WCSS for k=6: 450   (decrease: 100)
   ```

3. **Find Optimal k:**
   - Calculates rate of change (first derivative)
   - Calculates acceleration (second derivative)
   - Selects k where acceleration is maximum (sharpest bend)

### **Example Output**

```
📊 [Python API] Elbow Method: Testing 2 to 6 clusters...
   k=2: WCSS=1245.23
   k=3: WCSS=892.45
   k=4: WCSS=687.12  ← Optimal (sharpest bend)
   k=5: WCSS=543.89
   k=6: WCSS=456.78

✅ [Python API] Elbow Method: Optimal k=4 (sharpest bend at k=4)
🎯 [Python API] Using optimal k=4 clusters (determined by elbow method)
```

### **Limitations & Fallbacks**

- **Small Datasets:** If fewer than 4 students, defaults to k=2
- **No Clear Elbow:** Falls back to middle value if elbow is ambiguous
- **Computational Cost:** Tests multiple k values, so takes slightly longer than fixed k

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
3. **Optimal Cluster Selection:** Elbow method determines the best number of clusters automatically
4. **Machine Learning:** K-Means clustering groups similar students using optimal k
5. **Labeling:** Assigns human-readable labels based on cluster characteristics (supports variable cluster counts)
6. **Caching:** Stores results for fast retrieval
7. **Display:** Frontend visualizes clusters with filters and charts

**Key Improvement: Elbow Method**
- Automatically determines optimal number of clusters (k) instead of fixed k=4
- Tests multiple k values (2 to 8, adjusted by data size)
- Finds the "elbow point" where WCSS decreases most sharply
- Adapts to different data sizes and distributions
- Supports variable cluster counts (2-8+ clusters) with appropriate labels

The system prioritizes **ontime submissions** and uses **ILO-aligned assessments** when filtering, providing actionable insights for identifying at-risk students and tracking learning outcomes.

