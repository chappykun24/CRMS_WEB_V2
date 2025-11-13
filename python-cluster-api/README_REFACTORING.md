# Python Analytics Refactoring - Enhanced K-Means Clustering

## Overview

The Python clustering API has been refactored to use detailed student data for more accurate clustering. The system now analyzes:

1. **Detailed Attendance Data**: Present, absent, and late counts
2. **Submission Scores**: Based on Assessment and ILO mapping (when available)
3. **Submission Behavior**: Detailed tracking of ontime, late, and missing submissions
4. **Clustering Quality Metrics**: Silhouette score calculation and explanations

## Features

### 1. Enhanced Attendance Analysis

The system now tracks:
- `attendance_present_count`: Number of times student was present
- `attendance_absent_count`: Number of times student was absent
- `attendance_late_count`: Number of times student was late
- `attendance_total_sessions`: Total attendance sessions
- `attendance_percentage`: Overall attendance percentage

**Fallback**: If detailed counts are not available, the system estimates them from the attendance percentage.

### 2. Submission Behavior Tracking

Tracks detailed submission patterns:
- `submission_ontime_count`: Number of ontime submissions
- `submission_late_count`: Number of late submissions
- `submission_missing_count`: Number of missing submissions
- `submission_total_assessments`: Total number of assessments
- `submission_rate`: Overall submission rate (0-1)
- `submission_status_score`: Weighted score (0=ontime, 1=late, 2=missing)

### 3. ILO-Weighted Scoring

- `average_score`: Average of all submission scores
- `ilo_weighted_score`: Score weighted by ILO mappings (when available)
- `final_score`: Uses ILO-weighted score if available, otherwise falls back to average_score

**Note**: ILO-weighted scoring is prepared for future enhancement. Currently uses `average_score` as the base.

### 4. Silhouette Score

The system calculates and reports the **Silhouette Score** for clustering quality:

- **Range**: -1 to +1
- **Interpretation**:
  - **> 0.5**: Excellent clustering quality (well-separated clusters)
  - **> 0.3**: Good clustering quality
  - **> 0.1**: Fair clustering quality
  - **< 0.1**: Poor clustering quality (clusters may overlap)

The silhouette score is included in the API response for each student record.

### 5. Cluster Explanations

Each cluster receives an automatic explanation describing:
- Attendance patterns (excellent/good/moderate/poor)
- Academic performance (high/satisfactory/below-average/low)
- Submission behavior (consistently ontime/frequently late/often missing)
- Submission rate (high/moderate/low)
- Specific metrics (attendance %, score %, submission rate %)

## Clustering Features

The algorithm uses **8 features** for clustering:

1. `attendance_percentage` - Overall attendance (0-100%)
2. `attendance_present_rate` - Present rate (0-1)
3. `attendance_late_rate` - Late rate (0-1)
4. `final_score` - Academic score (ILO-weighted if available)
5. `submission_rate` - Overall submission rate (0-1)
6. `submission_ontime_rate` - Ontime submission rate (0-1)
7. `submission_late_rate` - Late submission rate (0-1)
8. `submission_status_score` - Submission timeliness score (0-2)

All features are normalized using `StandardScaler` before clustering.

## Cluster Labels

The system assigns behavior-based labels:

- **Excellent Performance**: High in all metrics
- **On Track**: Good performance
- **Needs Improvement**: Moderate performance
- **At Risk**: Low performance across metrics

## API Response Format

Each student record includes:

```json
{
  "student_id": 123,
  "cluster": 0,
  "cluster_label": "Excellent Performance",
  "silhouette_score": 0.4523,
  "clustering_explanation": "This cluster shows excellent attendance, high academic performance, consistently submits on time, high submission rate. Average attendance: 95.2%, Average score: 88.5%, Submission rate: 92.3%"
}
```

## Backend Integration

The backend (`backend/routes/assessments.js`) has been updated to send:

- Detailed attendance counts
- Detailed submission behavior counts
- ILO-weighted scores (prepared for future enhancement)
- All existing metrics

The clustering service (`backend/services/clusteringService.js`) normalizes and sends all fields to the Python API.

## Usage

The API endpoint remains the same:

```
POST /api/cluster
Content-Type: application/json

[
  {
    "student_id": 123,
    "attendance_percentage": 95.5,
    "attendance_present_count": 19,
    "attendance_absent_count": 1,
    "attendance_late_count": 0,
    "attendance_total_sessions": 20,
    "average_score": 88.5,
    "ilo_weighted_score": null,
    "submission_rate": 0.92,
    "submission_ontime_count": 10,
    "submission_late_count": 2,
    "submission_missing_count": 1,
    "submission_total_assessments": 13,
    "average_submission_status_score": 0.23
  }
]
```

## Health Check

The health endpoint now reports enhanced features:

```
GET /

{
  "status": "healthy",
  "service": "Enhanced KMeans Clustering API",
  "version": "2.0",
  "features": [
    "Detailed attendance analysis (present, absent, late)",
    "ILO-weighted scoring",
    "Submission behavior tracking",
    "Silhouette score calculation",
    "Cluster explanations"
  ]
}
```

## Future Enhancements

1. **ILO Weighting**: Implement actual ILO-based score weighting based on ILO mappings
2. **Dynamic Cluster Count**: Automatically determine optimal number of clusters using elbow method
3. **Feature Importance**: Report which features contribute most to cluster separation
4. **Temporal Analysis**: Track student movement between clusters over time

