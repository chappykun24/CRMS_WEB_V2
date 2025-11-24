# ILO-Based Clustering Metrics Documentation

## Overview

This document defines the **student metrics** used for clustering analysis based on Intended Learning Outcomes (ILO) performance. The clustering is performed on students' performance data filtered by specific ILO, SO (Student Outcomes), IGA (Institutional Graduate Attributes), SDG, or CDIO criteria.

---

## Metrics Definition

### 1. Overall Performance Metrics

These metrics provide a high-level view of student performance on the selected ILO.

#### `ilo_score`
- **Type**: Continuous (0-100+)
- **Description**: Total transmuted score across all assessments mapped to the ILO
- **Calculation**: Sum of all transmuted scores for assessments connected to the ILO
- **Formula**: 
  ```
  ilo_score = Σ(transmuted_score) for all assessments in ILO
  ```
- **Interpretation**: Higher values indicate better overall performance across all ILO assessments

#### `ilo_percentage`
- **Type**: Continuous (0-100)
- **Description**: Overall attainment rate (weighted average percentage)
- **Calculation**: Weighted average of assessment percentages based on ILO weights
- **Formula**:
  ```
  ilo_percentage = Σ(assessment_percentage × ilo_weight) / Σ(ilo_weight)
  ```
- **Interpretation**: Represents the student's mastery level of the ILO as a percentage

---

### 2. Engagement Metrics

These metrics measure student participation and completion.

#### `assessments_completed`
- **Type**: Integer (0-N)
- **Description**: Number of assessments the student has completed/submitted for this ILO
- **Interpretation**: Higher values indicate more engagement with ILO assessments

#### `total_assessments`
- **Type**: Integer (N)
- **Description**: Total number of assessments mapped to this ILO
- **Interpretation**: Provides context for completion rate calculation

#### `completion_rate`
- **Type**: Continuous (0-100)
- **Description**: Percentage of assessments completed
- **Formula**:
  ```
  completion_rate = (assessments_completed / total_assessments) × 100
  ```
- **Interpretation**: Higher values indicate better engagement/completion

---

### 3. Performance Distribution Metrics

These metrics describe how performance varies across different assessments.

#### `score_std` (Standard Deviation)
- **Type**: Continuous (≥0)
- **Description**: Standard deviation of assessment percentages
- **Interpretation**: 
  - **Low values**: Consistent performance across assessments
  - **High values**: Variable performance (some assessments high, others low)

#### `score_variance`
- **Type**: Continuous (≥0)
- **Description**: Variance in performance across assessments
- **Interpretation**: 
  - **Low values**: Stable performance
  - **High values**: Unstable/erratic performance

#### `max_score`
- **Type**: Continuous (0-100)
- **Description**: Highest assessment percentage achieved
- **Interpretation**: Best performance indicator

#### `min_score`
- **Type**: Continuous (0-100)
- **Description**: Lowest assessment percentage achieved
- **Interpretation**: Weakest performance indicator

#### `score_range`
- **Type**: Continuous (0-100)
- **Description**: Range between highest and lowest assessment scores
- **Formula**:
  ```
  score_range = max_score - min_score
  ```
- **Interpretation**: 
  - **Low range**: Consistent performance
  - **High range**: Inconsistent performance

---

### 4. Assessment-Specific Metrics

These metrics provide detailed performance data for each individual assessment under the ILO.

#### `assessment_{id}_percentage`
- **Type**: Continuous (0-100)
- **Description**: Student's percentage score on a specific assessment
- **Dynamic**: One column per assessment mapped to the ILO
- **Formula**:
  ```
  assessment_percentage = (raw_score / total_points) × 100
  ```
- **Interpretation**: Direct measure of performance on a specific assessment

---

## Derived Metrics (Calculated for Clustering)

### `score_spread`
- **Description**: Alternative calculation of score range (redundant but kept for compatibility)
- **Same as**: `score_range`

### `performance_consistency`
- **Type**: Continuous (0-1)
- **Description**: Normalized inverse of variance for easier interpretation
- **Formula**:
  ```
  performance_consistency = 1 / (1 + score_variance)
  ```
- **Interpretation**: 
  - **Close to 1**: Very consistent performance
  - **Close to 0**: Very inconsistent performance

---

## Clustering Features

The following metrics are used as **features** for K-Means clustering:

1. **Core Features** (Always included):
   - `ilo_score`
   - `ilo_percentage`
   - `assessments_completed`
   - `completion_rate`
   - `score_std`
   - `score_variance`
   - `score_range`

2. **Assessment-Specific Features** (Dynamically included):
   - One column per assessment: `assessment_{assessment_id}_percentage`

3. **Derived Features** (If calculated):
   - `performance_consistency`
   - `score_spread`

---

## Data Preprocessing

Before clustering, all features undergo:

1. **Missing Value Handling**: 
   - Missing assessment scores filled with 0
   - Missing calculated metrics filled with 0

2. **Standardization**: 
   - All features standardized using `StandardScaler`
   - Formula: `(x - mean) / std`
   - Ensures all features have equal weight in clustering

---

## Clustering Methods

### 1. Elbow Method
- **Purpose**: Determine optimal number of clusters (k) by finding the "elbow" in the inertia curve
- **Metric**: Within-Cluster Sum of Squares (WSS/Inertia)
- **Interpretation**: Look for the point where adding more clusters doesn't significantly reduce inertia

### 2. Silhouette Analysis
- **Purpose**: Evaluate cluster quality and determine optimal k
- **Metric**: Silhouette Score (-1 to 1)
- **Interpretation**:
  - **+1**: Well-separated clusters
  - **0**: Overlapping clusters
  - **-1**: Incorrectly assigned points
- **Selection**: Choose k with highest silhouette score

### 3. K-Means Clustering
- **Algorithm**: K-Means clustering with k-means++ initialization
- **Features**: Standardized feature matrix
- **Output**: Cluster labels for each student

---

## Example Use Cases

### Use Case 1: Identify Performance Groups
- **Goal**: Group students by overall ILO performance
- **Key Metrics**: `ilo_percentage`, `ilo_score`
- **Expected Clusters**: High performers, Medium performers, Low performers

### Use Case 2: Identify Consistency Patterns
- **Goal**: Group students by performance consistency
- **Key Metrics**: `score_std`, `score_variance`, `score_range`
- **Expected Clusters**: Consistent performers, Inconsistent performers, Improving students

### Use Case 3: Identify Engagement Patterns
- **Goal**: Group students by completion and engagement
- **Key Metrics**: `completion_rate`, `assessments_completed`
- **Expected Clusters**: Highly engaged, Moderately engaged, Low engagement

### Use Case 4: Comprehensive Clustering
- **Goal**: Multi-dimensional student grouping
- **Key Metrics**: All metrics combined
- **Expected Clusters**: Complex performance profiles combining multiple dimensions

---

## Output Files

### 1. CSV Results (`ilo_clustering_results_{timestamp}.csv`)
- Contains all student data with cluster assignments
- Includes all metrics and silhouette scores per student

### 2. JSON Summary (`ilo_clustering_summary_{timestamp}.json`)
- Summary statistics
- Optimal k value
- Cluster summaries (count, averages)
- Elbow method and silhouette score data

### 3. Visualizations
- **Elbow Method Plot**: Shows inertia vs. k
- **Silhouette Scores Plot**: Shows silhouette score vs. k
- **Cluster Visualization**: PCA-reduced 2D plot of clusters

---

## Interpretation Guidelines

### High Silhouette Score (>0.5)
- Clusters are well-separated
- Students within clusters are similar
- Clustering is meaningful and reliable

### Medium Silhouette Score (0.25-0.5)
- Some cluster separation
- Moderate clustering quality
- May need to refine features or adjust k

### Low Silhouette Score (<0.25)
- Poor cluster separation
- Students are too similar or features don't capture meaningful differences
- Consider:
  - Different feature combinations
  - Different clustering algorithms
  - More granular data

---

## Notes

1. **Dynamic Assessment Columns**: The number of assessment-specific features varies based on how many assessments are mapped to the selected ILO.

2. **Filtering**: When filtering by SO/IGA/SDG/CDIO, only assessments mapped to those outcomes/attributes are included.

3. **Missing Data**: Students with no completed assessments are excluded from clustering.

4. **Feature Selection**: Features with all NaN values are automatically excluded.

5. **Scalability**: The script handles varying numbers of assessments and students dynamically.

