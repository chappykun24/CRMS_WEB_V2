# Analytics Clustering: How It Works

## Overview

The analytics clustering system groups students based on their academic performance patterns using machine learning. This document explains the complete flow from raw database data to final cluster assignments.

---

## 🔄 Complete Data Flow: Database to Dashboard

This section documents the actual end-to-end data flow from PostgreSQL database to React dashboard.

### **Data Flow Pipeline**

```
1. User Interaction (Frontend)
   ↓
2. HTTP Request (REST API)
   ↓
3. Backend Route Handler (Express.js)
   ↓
4. SQL Query Execution (PostgreSQL)
   ↓
5. Data Aggregation & Calculation
   ↓
6. Clustering Service (Cache Check)
   ↓
7. Python Clustering API (K-Means + Elbow Method)
   ↓
8. Cache Storage (PostgreSQL)
   ↓
9. JSON Response (Backend)
   ↓
10. Frontend Processing (React)
   ↓
11. Dashboard Display (Charts & Tables)
```

---

### **Step-by-Step Data Flow**

#### **Step 1: Frontend Request** (`frontend/src/pages/dean/Analytics.jsx`)

**Location:** `frontend/src/pages/dean/Analytics.jsx` (line ~753)

**Action:**
```javascript
const url = `${API_BASE_URL}/assessments/dean-analytics/sample?${params}`;
fetch(url, {
  headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
})
```

**Query Parameters:**
- `term_id`: Academic term filter
- `section_id`: Section filter
- `program_id`: Program filter
- `department_id`: Department filter
- `section_course_id`: Class filter (single or array)
- `student_id`: Individual student filter
- `so_id`, `iga_id`, `cdio_id`, `sdg_id`: Standard filters
- `force_refresh`: Bypass cache flag

**Request Example:**
```
GET /api/assessments/dean-analytics/sample?term_id=3&section_id=10&force_refresh=false
```

---

#### **Step 2: Backend Route Handler** (`backend/routes/assessments.js`)

**Location:** `backend/routes/assessments.js` (line ~492)

**Endpoint:** `GET /api/assessments/dean-analytics/sample`

**Processing:**
1. Parse query parameters
2. Build WHERE clause conditions
3. Construct SQL query with filters
4. Execute database query
5. Process results
6. Apply clustering
7. Return JSON response

**Key Functions:**
- Parameter validation
- Filter building
- SQL query construction
- Result sanitization

---

#### **Step 3: SQL Query Execution** (PostgreSQL Database)

**Location:** `backend/routes/assessments.js` (line ~658)

**Complex SQL Query Features:**

1. **Student Basic Info:**
   ```sql
   SELECT s.student_id, s.full_name, s.student_number, ...
   FROM students s
   ```

2. **Attendance Aggregation:**
   ```sql
   -- Attendance percentage
   SELECT ROUND(
     (COUNT(CASE WHEN al.status = 'present' THEN 1 END)::NUMERIC / 
      NULLIF(COUNT(al.attendance_id), 0)::NUMERIC) * 100, 2
   )
   FROM attendance_logs al
   ...
   ```

3. **Score Calculation (Transmuted Scores):**
   ```sql
   -- Final grade: SUM(transmuted_score) per course, averaged
   WITH course_transmuted_scores AS (
     SELECT section_course_id,
       SUM(transmuted_score) as course_final_grade
     FROM submissions sub
     INNER JOIN assessments a ON sub.assessment_id = a.assessment_id
     ...
   )
   SELECT AVG(course_final_grade) as average_score
   FROM course_transmuted_scores
   ```

4. **Submission Rate Calculation:**
   ```sql
   -- Submission counts: ontime, late, missing
   SELECT 
     COUNT(CASE WHEN sub.status = 'ontime' THEN 1 END) as ontime_count,
     COUNT(CASE WHEN sub.status = 'late' THEN 1 END) as late_count,
     COUNT(CASE WHEN sub.status = 'missing' THEN 1 END) as missing_count
   FROM submissions sub
   ...
   ```

**Database Tables Accessed:**
- `students`
- `course_enrollments`
- `section_courses`
- `sections`
- `programs`
- `departments`
- `attendance_logs`
- `assessments`
- `submissions`
- `assessment_ilo_weights`
- `ilo_so_mappings`, `ilo_iga_mappings`, `ilo_cdio_mappings`

**Result:** Array of student objects with aggregated metrics

---

#### **Step 4: Data Normalization** (`backend/services/clusteringService.js`)

**Location:** `backend/services/clusteringService.js` (line ~449)

**Function:** `normalizeStudentData(students)`

**Actions:**
1. Convert values to proper types (numbers)
2. Handle null/undefined values
3. Filter invalid numbers (NaN)
4. Structure data for clustering API

**Input Example:**
```javascript
{
  student_id: "123",
  attendance_percentage: "85.5",
  average_score: "78.3",
  submission_rate: "0.9"
}
```

**Output Example:**
```javascript
{
  student_id: 123,
  attendance_percentage: 85.5,
  average_score: 78.3,
  submission_rate: 0.9,
  attendance_present_count: 34,
  attendance_total_sessions: 40,
  submission_ontime_count: 18,
  submission_total_assessments: 20
}
```

---

#### **Step 5: Cache Check** (`backend/services/clusteringService.js`)

**Location:** `backend/services/clusteringService.js` (line ~758)

**Function:** `getCachedClusters()`

**Process:**
1. Query `analytics_clusters` table
2. Check cache age (default: 24 hours)
3. Match by `term_id`, `section_course_id`, `student_id`
4. Check for Standard/ILO filters in `based_on` JSON

**SQL Query:**
```sql
SELECT student_id, cluster_label, cluster_number, silhouette_score
FROM analytics_clusters
WHERE term_id = $1
  AND section_course_id = $2
  AND generated_at > $3
  AND student_id IS NOT NULL
```

**Result:**
- **Cache Hit:** Return cached clusters immediately (FAST PATH)
- **Cache Miss:** Continue to API call (SLOW PATH)

---

#### **Step 6: Python Clustering API** (`python-cluster-api/app.py`)

**Location:** `python-cluster-api/app.py` (line ~753)

**Endpoint:** `POST /api/cluster`

**Process:**

1. **Receive Data:**
   ```python
   data = request.get_json()  # List of student records
   ```

2. **Feature Engineering:**
   ```python
   # Calculate attendance features
   attendance_features = df.apply(calculate_attendance_features, axis=1)
   
   # Calculate submission features
   submission_features = df.apply(calculate_submission_features, axis=1)
   
   # Calculate score features
   score_features = df.apply(calculate_score_features, axis=1)
   ```

3. **Data Preprocessing:**
   ```python
   # Scale features
   scaler = StandardScaler()
   X_scaled = scaler.fit_transform(df_clean[features])
   ```

4. **Elbow Method (k=3-5):**
   ```python
   optimal_k, wcss_values, k_range = find_optimal_clusters_elbow_method(
     X_scaled, max_clusters=5, min_clusters=3
   )
   ```

5. **K-Means Clustering:**
   ```python
   kmeans = KMeans(n_clusters=optimal_k, random_state=42)
   clusters = kmeans.fit_predict(X_scaled)
   ```

6. **Label Assignment (Switch/Case):**
   ```python
   if n_clusters == 3:
       labels = {sorted_clusters[0][0]: "Excellent Performance", ...}
   elif n_clusters == 4:
       labels = {sorted_clusters[0][0]: "Excellent Performance", ...}
   elif n_clusters == 5:
       labels = {sorted_clusters[0][0]: "Excellent Performance", ...}
   ```

**Response:**
```json
[
  {
    "student_id": 123,
    "cluster": 0,
    "cluster_label": "Excellent Performance",
    "silhouette_score": 0.45
  },
  ...
]
```

---

#### **Step 7: Cache Storage** (`backend/services/clusteringService.js`)

**Location:** `backend/services/clusteringService.js` (line ~206)

**Function:** `saveClustersToCache()`

**Process:**
1. Delete old clusters for same scope
2. Insert new cluster records
3. Store in `analytics_clusters` table

**SQL Insert:**
```sql
INSERT INTO analytics_clusters (
  student_id, term_id, section_course_id,
  cluster_label, cluster_number, based_on,
  algorithm_used, model_version, silhouette_score, generated_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
```

**Cache Key Components:**
- `student_id`
- `term_id`
- `section_course_id`
- `based_on` (JSON with ILO/Standard filters)

---

#### **Step 8: Backend JSON Response** (`backend/routes/assessments.js`)

**Location:** `backend/routes/assessments.js` (line ~1280)

**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "student_id": 123,
      "full_name": "John Doe",
      "attendance_percentage": 85.5,
      "average_score": 78.3,
      "submission_rate": 0.9,
      "cluster": 0,
      "cluster_label": "Excellent Performance",
      "silhouette_score": 0.45,
      ...
    }
  ],
  "clustering": {
    "enabled": true,
    "cacheUsed": false,
    "apiCalled": true,
    "backendPlatform": "Render",
    "apiPlatform": "Railway"
  }
}
```

---

#### **Step 9: Frontend Processing** (`frontend/src/pages/dean/Analytics.jsx`)

**Location:** `frontend/src/pages/dean/Analytics.jsx` (line ~822)

**Actions:**

1. **Parse Response:**
   ```javascript
   const json = await response.json();
   const studentsData = json.data || [];
   ```

2. **Validate Clusters:**
   ```javascript
   const studentsWithClusters = studentsData.filter(s => 
     s.cluster_label && s.cluster_label !== null
   );
   ```

3. **Cache Data:**
   ```javascript
   // Session cache (instant)
   sessionStorage.setItem(`dean_analytics_${filterKey}_session`, json);
   
   // Enhanced cache (10 minutes)
   setCachedData('analytics', cacheKey, json);
   ```

4. **Calculate Cluster Distribution:**
   ```javascript
   const clusterCounts = studentsData.reduce((acc, row) => {
     const cluster = row.cluster_label;
     if (cluster && cluster !== null) {
       acc[cluster] = (acc[cluster] || 0) + 1;
     }
     return acc;
   }, {});
   ```

---

#### **Step 10: Dashboard Display** (`frontend/src/pages/dean/Analytics.jsx`)

**Components:**

1. **Data Table:**
   - Student list with cluster badges
   - Sortable columns
   - Filterable by cluster

2. **Cluster Filter Dropdown:**
   ```javascript
   <select onChange={handleClusterFilterChange}>
     <option value="all">All Clusters</option>
     <option value="Excellent Performance">Excellent Performance</option>
     <option value="Average Performance">Average Performance</option>
     ...
   </select>
   ```

3. **Charts:**
   - Scatter plots (colored by cluster)
   - Pie charts (cluster distribution)
   - Bar charts (performance metrics)

4. **Cluster Badges:**
   - Color-coded by performance level
   - Tooltip with cluster explanation

**Visual Display:**
- Green: "Excellent Performance"
- Blue: "Good Performance" / "Average Performance"
- Yellow: "Needs Improvement"
- Red: "At Risk"

---

### **Data Flow Summary Table**

| Step | Component | Input | Output | Time |
|------|-----------|-------|--------|------|
| 1 | Frontend Request | User clicks "Load Analytics" | HTTP GET request | < 1ms |
| 2 | Backend Route | HTTP request | SQL query parameters | < 5ms |
| 3 | Database Query | SQL query | Raw student data | 100-500ms |
| 4 | Data Normalization | Raw data | Normalized JSON | < 10ms |
| 5 | Cache Check | Student IDs | Cached clusters OR continue | < 50ms |
| 6a | Cache Hit | Cached clusters | Cluster map | < 10ms |
| 6b | API Call | Normalized data | Cluster assignments | 500-2000ms |
| 7 | Cache Storage | Cluster results | Database insert | < 100ms |
| 8 | JSON Response | Complete data | HTTP response | < 10ms |
| 9 | Frontend Processing | JSON response | React state | < 50ms |
| 10 | Dashboard Render | React state | UI display | < 100ms |

**Total Time:**
- **Cache Hit:** ~200-700ms (FAST PATH)
- **Cache Miss:** ~800-3000ms (SLOW PATH with clustering)

---

### **Caching Strategy**

**Three-Level Cache:**

1. **Database Cache:** `analytics_clusters` table (24 hours)
   - Location: PostgreSQL
   - Scope: Per term, section_course, Standard/ILO filter
   - Invalidation: Time-based (24h) or force refresh

2. **Session Cache:** `sessionStorage` (instant)
   - Location: Browser sessionStorage
   - Scope: Current session only
   - Invalidation: Page refresh

3. **Enhanced Cache:** `localStorage` (10 minutes)
   - Location: Browser localStorage
   - Scope: Per filter combination
   - Invalidation: Time-based (10min) or force refresh

**Cache Priority:**
1. Check sessionStorage first (fastest)
2. Check localStorage second
3. Check database cache third
4. Call Python API last (slowest)

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
- At least **6 students** (minimum recommended for k=3 clusters)
- Elbow method tests **k=3 to k=5** (minimum 3, maximum 5 labels)
- Data size determines max_clusters: `max_clusters = min(5, n_students // 2)`
- Minimum 3 clusters, maximum 5 clusters

**Example:**
```
< 6 students  → Uses fallback k (not recommended)
6 students    → Tests k=3 (minimum, max_clusters = 6 // 2 = 3)
10 students   → Tests k=3 to k=5 (max_clusters = 10 // 2 = 5)
16+ students  → Tests k=3 to k=5 (full range: 3-5)
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
submission_quality_score: 1.2      # Moderate quality score (0.0-2.0 scale, ontime=2, late=1, missing=0)
submission_rate: 0.8               # 80% submission rate
submission_late_rate: 0.2          # 20% late
submission_missing_rate: 0.0       # 0% missing
submission_status_score: 1.2       # Moderate status (0.0-2.0 scale, same as quality_score)
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
| < 6 students | ⚠️ Uses fallback k (not recommended) | Limited clustering |
| 6-9 students | ✅ Tests k=3 only | Optimal k=3 determined |
| 10-15 students | ✅ Tests k=3 to k=4 or k=5 | Optimal k determined (range: 3-5) |
| 16+ students | ✅ Tests k=3 to k=5 (full range) | Full elbow method analysis (range: 3-5) |

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
   submission_rate = (ontime_count + late_count) / total_assessments
   
   # Status Score (0.0-2.0, HIGHER IS BETTER)
   # Uses weighted scoring: ontime=2, late=1, missing=0 (same as quality_score for consistency)
   # Formula: (ontime_count × 2 + late_count × 1 + missing_count × 0) / total_assessments
   # - 2.0 = all ontime (BEST)
   # - 1.0 = all late (moderate)
   # - 0.0 = all missing (WORST)
   # NOTE: Same formula as quality_score - both use consistent 0, 1, 2 weights
   submission_status_score = (ontime_count × 2.0 + late_count × 1.0 + missing_count × 0.0) / total_assessments
   
   # Quality Score (0.0-2.0, HIGHER IS BETTER)
   # Uses weighted scoring: ontime=2, late=1, missing=0 (same as status_score for consistency)
   # Formula: (ontime_count × 2 + late_count × 1 + missing_count × 0) / total_assessments
   # - 2.0 = all ontime (BEST)
   # - 1.0 = all late (moderate)
   # - 0.0 = all missing (WORST)
   submission_quality_score = (ontime_count × 2.0 + late_count × 1.0 + missing_count × 0.0) / total_assessments
   
   # Ontime Priority Score (0-100, HIGHER IS BETTER)
   # Direct percentage of ontime submissions
   submission_ontime_priority_score = (ontime_count / total_assessments) × 100
   ```
   
### **Status Score and Quality Score - Same Range, Same Direction**

Both scores now use the **same formula and same direction** for consistency:

| Aspect | Status Score | Quality Score |
|--------|-------------|---------------|
| **Formula** | `(ontime × 2 + late × 1 + missing × 0) / total` | `(ontime × 2 + late × 1 + missing × 0) / total` |
| **Range** | 0.0 - 2.0 | 0.0 - 2.0 |
| **Direction** | **HIGHER IS BETTER** ⬆️ | **HIGHER IS BETTER** ⬆️ |
| **Weighting** | ontime=2, late=1, missing=0 | ontime=2, late=1, missing=0 |
| **Best Value** | 2.0 (all ontime) ✅ | 2.0 (all ontime) ✅ |
| **Worst Value** | 0.0 (all missing) ❌ | 0.0 (all missing) ❌ |

### **Why Both Scores Exist (Same Formula)**

Both `submission_status_score` and `submission_quality_score` now use the **identical formula**:
- **Same weights:** ontime=2, late=1, missing=0
- **Same range:** 0.0-2.0
- **Same direction:** Higher is better

**Reason for Duplication:**
- Provides redundancy in feature set
- Allows clustering algorithm to use multiple features with same information
- StandardScaler normalizes both, so they contribute equally to clustering
- Having multiple similar features can help with feature stability

### **Example Calculation**

**Student with 10 ontime, 5 late, 5 missing (total: 20):**

**Both Status Score and Quality Score:**
```
(10 × 2 + 5 × 1 + 5 × 0) / 20
= (20 + 5 + 0) / 20
= 25 / 20
= 1.25 ✅ (Moderate - 37.5% away from best)
```

**Result:** Both scores = 1.25 (consistent values)

### **Key Insight**

Both scores are now **identical** - they provide the same information with the same scale and direction. This ensures consistency in the clustering features while maintaining redundancy for algorithm stability.

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
7. `submission_quality_score` - **PRIORITY** (high weight, 0.0-2.0, ontime=2, late=1, missing=0)
8. `submission_rate` - Overall submission rate
9. `submission_late_rate` - Late submission rate
10. `submission_missing_rate` - Missing submission rate
11. `submission_status_score` - Status score (0.0-2.0, **HIGHER IS BETTER**)
    - Uses weighted scoring: ontime=2, late=1, missing=0 (same as quality_score)
    - 2.0 = all ontime (BEST)
    - 1.0 = all late (moderate)
    - 0.0 = all missing (WORST)

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
   submission_quality_score: 1.2 (default, 0.0-2.0 scale)
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

3. Assign labels using switch/case structure (k=3, 4, or 5 only):
   - **k=3:** "Excellent Performance" / "Average Performance" / "Needs Improvement"
   - **k=4:** "Excellent Performance" / "Average Performance" / "Needs Improvement" / "At Risk"
   - **k=5:** "Excellent Performance" / "Good Performance" / "Average Performance" / "Needs Improvement" / "At Risk"

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
   - Tests k from 3 to 5 (minimum 3, maximum 5 labels)
   - Adjusted based on data size (needs at least 2 samples per cluster)
   - For each k, calculates WCSS (Within-Cluster Sum of Squares)

2. **Calculate Elbow Point:**
   ```
   WCSS for k=3: 1000  (decrease: 300)
   WCSS for k=4: 700   (decrease: 200) ← Elbow: sharpest change
   WCSS for k=5: 550   (decrease: 150)
   ```

3. **Find Optimal k:**
   - Calculates rate of change (first derivative)
   - Calculates acceleration (second derivative)
   - Selects k where acceleration is maximum (sharpest bend)

### **Example Output**

```
📊 [Python API] Elbow Method: Testing 3 to 5 clusters (min=3, max=5)...
   k=3: WCSS=892.45
   k=4: WCSS=687.12  ← Optimal (sharpest bend)
   k=5: WCSS=543.89

✅ [Python API] Elbow Method: Optimal k=4 (sharpest bend at k=4)
🎯 [Python API] Using optimal k=4 clusters (determined by elbow method, range: 3-5)
```

### **Limitations & Fallbacks**

- **Small Datasets:** If fewer than 6 students, uses fallback k (not recommended, minimum 6 students)
- **No Clear Elbow:** Falls back to middle value (k=4) if elbow is ambiguous
- **Range Constraint:** Always stays within k=3 to k=5 range (minimum 3, maximum 5 labels)
- **Computational Cost:** Tests k=3, 4, 5 (3 values), so takes slightly longer than fixed k

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
- Automatically determines optimal number of clusters (k) instead of fixed k
- Tests k values from 3 to 5 (minimum 3, maximum 5 labels)
- Finds the "elbow point" where WCSS decreases most sharply
- Uses switch/case structure for label assignment (k=3, 4, or 5)
- Adapts to different data sizes (minimum 6 students recommended)
- Constrained range ensures consistent labeling (3-5 clusters only)

The system prioritizes **ontime submissions** and uses **ILO-aligned assessments** when filtering, providing actionable insights for identifying at-risk students and tracking learning outcomes.

