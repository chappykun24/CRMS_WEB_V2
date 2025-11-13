# ILO Mapping and Clustering Relationship

## Overview

This document explains how **Intended Learning Outcomes (ILOs)** are integrated into the student clustering system through submission data.

## Data Flow: ILO → Assessment → Submission → Clustering

```
ILOs (Intended Learning Outcomes)
    ↓ (mapped via assessment_ilo_weights)
Assessments (Quizzes, Exams, Projects)
    ↓ (students submit work)
Submissions (with scores: total_score, adjusted_score)
    ↓ (aggregated and weighted)
Student Analytics (ILO-weighted scores)
    ↓ (sent to clustering API)
Clustering Algorithm (groups students by performance patterns)
```

## Key Relationships

### 1. Assessment-ILO Mapping (`assessment_ilo_weights` table)

Each assessment can be mapped to multiple ILOs with weights:

```sql
assessment_ilo_weights:
  - assessment_id → links to assessments table
  - ilo_id → links to ilos table  
  - weight_percentage → importance of this ILO in the assessment (0-100%)
```

**Example:**
- Assessment: "Midterm Exam"
- ILO1: "Apply programming concepts" (weight: 40%)
- ILO2: "Design algorithms" (weight: 30%)
- ILO3: "Debug code" (weight: 30%)

### 2. Submission-ILO Connection

**Path:** `submissions` → `assessments` → `assessment_ilo_weights` → `ilos`

- Each submission belongs to an assessment
- Each assessment maps to ILOs via `assessment_ilo_weights`
- Submission scores reflect performance on ILO-aligned assessments

### 3. ILO-Weighted Score Calculation

The ILO-weighted score is calculated from submissions as follows:

```sql
For each student submission:
  1. Get the assessment's ILO weights
  2. Calculate: (submission_score / assessment_total_points) * sum_of_ILO_weights
  3. Average across all submissions
```

**Formula:**
```
ILO-Weighted Score = AVG(
  (submission_score / assessment_total_points) * 100 * total_ilo_weight
)
```

Where:
- `total_ilo_weight` = Sum of all ILO weight percentages for that assessment (normalized to 0-1)
- Higher ILO weights = assessments covering important learning outcomes get more weight

**Example:**
- Student scores 80/100 on "Midterm Exam"
- Midterm has ILO weights: 40% + 30% + 30% = 100% (total_ilo_weight = 1.0)
- ILO-weighted contribution: (80/100) * 100 * 1.0 = 80 points

- Student scores 90/100 on "Quiz 1"  
- Quiz 1 has no ILO mappings (total_ilo_weight = 0)
- ILO-weighted contribution: (90/100) * 100 * 0 = 0 points (falls back to regular average)

## How It's Used in Clustering

### 1. Data Collection (Backend)

The dean analytics endpoint (`/api/assessments/dean-analytics/sample`) calculates:

- **`average_score`**: Simple average of all submission scores
- **`ilo_weighted_score`**: Average weighted by ILO coverage
  - Prioritizes performance on ILO-aligned assessments
  - Falls back to `average_score` if no ILO mappings exist

### 2. Feature Engineering (Python API)

The clustering algorithm uses `ilo_weighted_score` in the `calculate_score_features()` function:

```python
# Primary score: average_score (from all submissions)
average_score = float(row.get('average_score', 50.0))

# ILO-based score if available (weighted by ILO mappings)
ilo_score = float(row.get('ilo_weighted_score', average_score)) if pd.notna(row.get('ilo_weighted_score')) else average_score

# Use ILO score if available, otherwise fall back to average_score
final_score = ilo_score if pd.notna(row.get('ilo_weighted_score')) else average_score
```

### 3. Clustering Features

The `final_score` (ILO-weighted if available) is used as a clustering feature:

```python
features = [
    'attendance_percentage',
    'attendance_present_rate',
    'attendance_late_rate',
    'final_score',  # ← Uses ILO-weighted score if available
    'submission_rate',
    'submission_ontime_rate',
    'submission_late_rate',
    'submission_missing_rate',
    'submission_status_score',
    'submission_quality_score'
]
```

## Benefits of ILO-Weighted Clustering

1. **Outcome-Focused Grouping**: Students are clustered based on performance on learning outcomes, not just raw scores

2. **Prioritizes Important Assessments**: Assessments aligned with critical ILOs have more influence on clustering

3. **Accreditation Alignment**: Clusters reflect how well students achieve intended learning outcomes

4. **Targeted Interventions**: Can identify students struggling with specific ILOs

## Example Scenario

**Student A:**
- Scores well on ILO-aligned assessments (high `ilo_weighted_score`)
- May have lower `average_score` due to non-ILO assessments
- **Clustering**: Groups with students who excel at learning outcomes

**Student B:**
- Scores well on all assessments (high `average_score`)
- But performs poorly on ILO-aligned assessments (low `ilo_weighted_score`)
- **Clustering**: Groups with students who need support on learning outcomes

## Implementation Details

### Backend Query (`backend/routes/assessments.js`)

The ILO-weighted score calculation:

```sql
WITH ilo_weighted_submissions AS (
  SELECT 
    sub.submission_id,
    sub.total_score,
    a.total_points,
    -- Sum of ILO weights for this assessment
    COALESCE(SUM(aiw.weight_percentage) / 100.0, 0) as total_ilo_weight
  FROM course_enrollments ce_ilo
  INNER JOIN assessments a ON ...
  LEFT JOIN assessment_ilo_weights aiw ON a.assessment_id = aiw.assessment_id
  LEFT JOIN submissions sub ON ...
  GROUP BY sub.submission_id, sub.total_score, a.total_points
)
SELECT AVG(
  CASE 
    WHEN total_ilo_weight > 0
    THEN (total_score / total_points) * 100 * total_ilo_weight
    ELSE (total_score / total_points) * 100
  END
)
FROM ilo_weighted_submissions
```

### Python API (`python-cluster-api/app.py`)

The clustering uses ILO-weighted scores in `calculate_score_features()`:

```python
def calculate_score_features(row):
    average_score = float(row.get('average_score', 50.0))
    ilo_score = float(row.get('ilo_weighted_score', average_score)) if pd.notna(row.get('ilo_weighted_score')) else average_score
    final_score = ilo_score if pd.notna(row.get('ilo_weighted_score')) else average_score
    
    return {
        'average_score': average_score,
        'ilo_weighted_score': ilo_score,
        'final_score': final_score  # Used in clustering
    }
```

## Future Enhancements

1. **Per-ILO Performance**: Track performance on individual ILOs, not just weighted average
2. **ILO-Specific Clustering**: Create clusters based on which ILOs students struggle with
3. **Temporal Analysis**: Track ILO performance over time
4. **Predictive Modeling**: Predict ILO achievement based on submission patterns

## Summary

ILO mapping connects submissions to learning outcomes through assessments. The clustering system uses ILO-weighted scores to group students based on their performance on outcome-aligned assessments, providing more meaningful insights than simple score averages.

