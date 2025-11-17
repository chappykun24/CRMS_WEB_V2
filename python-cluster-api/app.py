from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
import numpy as np
import os
import sys

app = Flask(__name__)
CORS(app)

# Log startup
print("🚀 [Python API] Starting Enhanced KMeans Clustering API...")
print(f"📦 [Python API] Python version: {sys.version}")
print(f"🌐 [Python API] Port: {os.environ.get('PORT', '10000')}")


def calculate_attendance_features(row):
    """
    Calculate attendance features from detailed attendance data.
    Falls back to percentage if detailed counts are not available.
    """
    # If detailed attendance data is available
    if pd.notna(row.get('attendance_present_count')) and pd.notna(row.get('attendance_total_sessions')):
        present = float(row.get('attendance_present_count', 0))
        absent = float(row.get('attendance_absent_count', 0))
        late = float(row.get('attendance_late_count', 0))
        total = float(row.get('attendance_total_sessions', 1))
        
        if total > 0:
            present_rate = present / total
            absent_rate = absent / total
            late_rate = late / total
            attendance_percentage = (present + late * 0.5) / total * 100  # Late counts as half present
        else:
            present_rate = 0.0
            absent_rate = 0.0
            late_rate = 0.0
            attendance_percentage = 0.0
    else:
        # Fallback to percentage if detailed data not available
        attendance_percentage = float(row.get('attendance_percentage', 75.0))
        # Estimate counts from percentage (rough approximation)
        present_rate = attendance_percentage / 100 * 0.85  # Assume 85% of attendance is present, 15% is late
        absent_rate = (100 - attendance_percentage) / 100
        late_rate = attendance_percentage / 100 * 0.15
    
    return {
        'attendance_percentage': attendance_percentage,
        'attendance_present_rate': present_rate,
        'attendance_absent_rate': absent_rate,
        'attendance_late_rate': late_rate
    }


def calculate_submission_features(row):
    """
    Calculate submission features based on status counts (ontime, late, missing).
    Uses numerical values derived directly from submission status counts.
    No deadline calculations - purely status-based.
    """
    # Get submission status counts (these are the core numerical values)
    ontime_count = float(row.get('submission_ontime_count', 0)) if pd.notna(row.get('submission_ontime_count')) else 0.0
    late_count = float(row.get('submission_late_count', 0)) if pd.notna(row.get('submission_late_count')) else 0.0
    missing_count = float(row.get('submission_missing_count', 0)) if pd.notna(row.get('submission_missing_count')) else 0.0
    total_assessments = float(row.get('submission_total_assessments', 0)) if pd.notna(row.get('submission_total_assessments')) else 0.0
    
    # Calculate total submissions (ontime + late, excluding missing)
    total_submissions = ontime_count + late_count
    
    # Calculate rates (proportions) from status counts
    if total_assessments > 0:
        ontime_rate = ontime_count / total_assessments
        late_rate = late_count / total_assessments
        missing_rate = missing_count / total_assessments
        submission_rate = total_submissions / total_assessments  # Overall submission rate
    else:
        # Default values if no assessments
        ontime_rate = 0.0
        late_rate = 0.0
        missing_rate = 1.0
        submission_rate = 0.0
    
    # Calculate numerical status score based on status distribution
    # Score range: 0.0-2.0, HIGHER IS BETTER (normalized to match quality_score direction)
    # Formula: (ontime × 2 + late × 1 + missing × 0) / total
    # This gives a weighted average where:
    # - ontime = 2 (best)
    # - late = 1 (moderate)
    # - missing = 0 (worst)
    # NOTE: Same as quality_score for consistency - both use 0, 1, 2 weights with higher=better
    if total_assessments > 0:
        submission_status_score = (ontime_count * 2.0 + late_count * 1.0 + missing_count * 0.0) / total_assessments
    else:
        submission_status_score = 0.0  # Worst case if no data
    
    # Calculate submission quality score (0.0-2.0 scale, HIGHER IS BETTER)
    # Uses weighted scoring: ontime=2, late=1, missing=0
    # Formula: (ontime_count × 2 + late_count × 1 + missing_count × 0) / total_assessments
    # - 2.0 = all ontime (BEST)
    # - 1.0 = all late (moderate)
    # - 0.0 = all missing (WORST)
    if total_assessments > 0:
        # Quality score using 0, 1, 2 weights (same as status_score for consistency)
        # Higher value = better (same as status_score)
        quality_score = ((ontime_count * 2.0) + (late_count * 1.0) + (missing_count * 0.0)) / total_assessments
    else:
        quality_score = 0.0
    
    # Calculate ontime priority score (0-100 scale, higher is better)
    # Specifically measures how much of student's work is submitted on time
    # This is a direct measure of timeliness priority
    if total_assessments > 0:
        ontime_priority_score = (ontime_count / total_assessments) * 100.0
    else:
        ontime_priority_score = 0.0
    
    return {
        # Raw counts (numerical values from status)
        'submission_ontime_count': ontime_count,
        'submission_late_count': late_count,
        'submission_missing_count': missing_count,
        'submission_total_assessments': total_assessments,
        # Rates (proportions 0.0-1.0)
        'submission_rate': submission_rate,
        'submission_ontime_rate': ontime_rate,  # PRIORITIZED: Higher weight in clustering
        'submission_late_rate': late_rate,
        'submission_missing_rate': missing_rate,
        # Computed scores
        'submission_status_score': submission_status_score,  # 0.0-2.0, higher is better (ontime=2, late=1, missing=0)
        'submission_quality_score': quality_score,  # 0.0-2.0, higher is better (ontime=2, late=1, missing=0)
        'submission_ontime_priority_score': ontime_priority_score  # 0.0-100.0, direct ontime percentage
    }


def calculate_score_features(row):
    """
    Calculate score features using new grading computation system.
    Uses pre-calculated transmuted scores from database which follow:
    1. Raw Score → Adjusted Score (raw - penalty)
    2. Adjusted Score → Actual Score: (adjusted / max) × 62.5 + 37.5 (non-zero based, min 37.5)
    3. Actual Score → Transmuted Score: actual × (weight_percentage / 100)
    4. Final Grade = SUM(transmuted_score) per course, then averaged across courses
    
    NEW: Also processes assessment-level transmuted scores grouped by ILO mapping.
    This allows for ILO-specific performance analysis.
    """
    # Use pre-calculated average_score from database (sum of transmuted scores per course, averaged)
    # This follows the new grading computation: Raw → Adjusted → Actual → Transmuted
    syllabus_weighted_score = float(row.get('average_score', 50.0)) if pd.notna(row.get('average_score')) else 50.0
    
    # Process assessment-level transmuted scores grouped by ILO (NEW)
    assessment_scores_by_ilo = row.get('assessment_scores_by_ilo')
    ilo_specific_scores = {}
    ilo_average_scores = {}
    
    if assessment_scores_by_ilo and isinstance(assessment_scores_by_ilo, (list, dict)):
        # Handle both JSON array and dict formats
        ilo_data_list = assessment_scores_by_ilo if isinstance(assessment_scores_by_ilo, list) else [assessment_scores_by_ilo]
        
        for ilo_data in ilo_data_list:
            if isinstance(ilo_data, dict):
                ilo_id = ilo_data.get('ilo_id')
                ilo_code = ilo_data.get('ilo_code', f'ILO_{ilo_id}')
                assessments = ilo_data.get('assessments', [])
                
                if ilo_id and assessments:
                    # Calculate average transmuted score for this ILO
                    transmuted_scores = []
                    total_weight = 0.0
                    
                    for assessment in assessments:
                        if isinstance(assessment, dict):
                            transmuted = assessment.get('transmuted_score')
                            weight = assessment.get('weight_percentage', 0) or 0
                            
                            if transmuted is not None and not (isinstance(transmuted, float) and (transmuted != transmuted)):  # Check for NaN
                                try:
                                    transmuted_float = float(transmuted)
                                    if transmuted_float >= 0:
                                        transmuted_scores.append(transmuted_float)
                                        total_weight += float(weight) if weight else 0
                                except (ValueError, TypeError):
                                    pass
                    
                    if transmuted_scores:
                        # Calculate weighted average for this ILO
                        if total_weight > 0:
                            weighted_sum = sum(transmuted_scores)
                            ilo_average = weighted_sum / len(transmuted_scores)  # Simple average for now
                        else:
                            ilo_average = sum(transmuted_scores) / len(transmuted_scores)
                        
                        ilo_specific_scores[f'ilo_{ilo_id}_score'] = ilo_average
                        ilo_average_scores[ilo_id] = {
                            'ilo_code': ilo_code,
                            'average_score': ilo_average,
                            'assessment_count': len(transmuted_scores),
                            'total_weight': total_weight
                        }
    
    # Calculate overall ILO-based score (average of all ILO scores if available)
    ilo_based_final_score = syllabus_weighted_score
    if ilo_specific_scores:
        ilo_scores_list = [score for score in ilo_specific_scores.values() if score > 0]
        if ilo_scores_list:
            # Use weighted average of ILO scores, or simple average
            ilo_based_final_score = sum(ilo_scores_list) / len(ilo_scores_list)
            # Prefer ILO-based score if available
            final_score = ilo_based_final_score
        else:
            final_score = syllabus_weighted_score
    else:
        # Use syllabus-weighted score as final_score
        final_score = syllabus_weighted_score
    
    result = {
        'average_score': syllabus_weighted_score,  # Final grade using new computation (transmuted scores)
        'final_score': final_score,  # Primary score for clustering (syllabus or ILO-based)
        'ilo_based_score': ilo_based_final_score  # Score calculated from ILO-specific assessments
    }
    
    # Add ILO-specific scores to result
    result.update(ilo_specific_scores)
    
    return result


def validate_clustering_data(records):
    """
    Validate data quality before clustering
    Returns list of validation issues (empty if all valid)
    """
    issues = []
    
    if not records or len(records) == 0:
        issues.append("No records provided for clustering")
        return issues
    
    # Check for required fields
    required_fields = ['student_id']
    for idx, record in enumerate(records):
        for field in required_fields:
            if field not in record or record[field] is None:
                issues.append(f"Record {idx}: Missing required field '{field}'")
    
    # Check for duplicate student IDs
    student_ids = [r.get('student_id') for r in records if r.get('student_id') is not None]
    if len(student_ids) != len(set(student_ids)):
        duplicates = [sid for sid in set(student_ids) if student_ids.count(sid) > 1]
        issues.append(f"Duplicate student IDs found: {duplicates[:5]}")
    
    # Check for unrealistic values
    for idx, record in enumerate(records):
        student_id = record.get('student_id', f'Record {idx}')
        
        # Attendance validation
        attendance = record.get('attendance_percentage')
        if attendance is not None:
            try:
                attendance = float(attendance)
                if attendance < 0 or attendance > 100:
                    issues.append(f"Student {student_id}: Invalid attendance_percentage ({attendance})")
            except (ValueError, TypeError):
                pass
        
        # Score validation
        score = record.get('average_score')
        if score is not None:
            try:
                score = float(score)
                if score < 0 or score > 100:
                    issues.append(f"Student {student_id}: Invalid average_score ({score})")
            except (ValueError, TypeError):
                pass
    
    return issues


def find_optimal_k_silhouette(X_scaled, max_clusters=5, min_clusters=3):
    """
    Find optimal number of clusters using Silhouette score (better for achieving 0.5-0.7 scores).
    
    This method tests different k values and selects the one with the highest Silhouette score.
    This is more reliable than elbow method for achieving well-separated clusters.
    
    Args:
        X_scaled: Scaled feature matrix
        max_clusters: Maximum number of clusters to test (default: 5)
        min_clusters: Minimum number of clusters to test (default: 3)
    
    Returns:
        optimal_k: Optimal number of clusters with highest Silhouette score
        best_score: The best Silhouette score achieved
        scores: Dictionary of k -> silhouette_score for all tested k values
    """
    n_samples = len(X_scaled)
    
    # Adjust max_clusters based on data size
    max_clusters = min(max_clusters, n_samples // 2)
    max_clusters = max(max_clusters, min_clusters)
    max_clusters = min(max_clusters, 5)
    max_clusters = max(max_clusters, min_clusters)
    
    if max_clusters < min_clusters:
        return min_clusters, -1, {}
    
    k_range = range(min_clusters, max_clusters + 1)
    scores = {}
    best_k = min_clusters
    best_score = -1
    
    print(f'\n📊 [Python API] Silhouette Method: Testing {min_clusters} to {max_clusters} clusters...')
    
    for k in k_range:
        try:
            # Use k-means++ initialization for better results
            kmeans = KMeans(n_clusters=k, init='k-means++', n_init=10, max_iter=300, random_state=42)
            labels = kmeans.fit_predict(X_scaled)
            
            # Calculate silhouette score
            if len(X_scaled) >= k * 2:  # Need at least 2 samples per cluster
                score = silhouette_score(X_scaled, labels)
                scores[k] = score
                print(f'   k={k}: Silhouette Score={score:.4f}')
                
                if score > best_score:
                    best_score = score
                    best_k = k
            else:
                print(f'   k={k}: Insufficient data (need at least {k*2} samples)')
        except Exception as e:
            print(f'   k={k}: Error - {e}')
            continue
    
    if best_score > 0:
        print(f'\n✅ [Python API] Silhouette Method: Optimal k={best_k} (score={best_score:.4f})')
        if best_score >= 0.5:
            print('   📈 Excellent clustering quality (score >= 0.5)')
        elif best_score >= 0.3:
            print('   ✅ Good clustering quality (score >= 0.3)')
    else:
        print(f'\n⚠️ [Python API] Silhouette Method: Could not find optimal k, using k={best_k}')
    
    return best_k, best_score, scores


def find_optimal_clusters_elbow_method(X_scaled, max_clusters=5, min_clusters=3):
    """
    Determine optimal number of clusters using the elbow method.
    
    The elbow method works by:
    1. Running K-Means for different values of k (number of clusters)
    2. Calculating the within-cluster sum of squares (WCSS) or inertia for each k
    3. Finding the "elbow" point where the rate of decrease sharply changes
    
    Args:
        X_scaled: Scaled feature matrix
        max_clusters: Maximum number of clusters to test (default: 5)
        min_clusters: Minimum number of clusters to test (default: 3)
    
    Returns:
        optimal_k: Optimal number of clusters determined by elbow method (3-5)
        wcss_values: List of WCSS values for each k
        k_range: Range of k values tested
    """
    n_samples = len(X_scaled)
    
    # Adjust max_clusters based on data size
    # Need at least 2 samples per cluster for valid clustering
    max_clusters = min(max_clusters, n_samples // 2)
    max_clusters = max(max_clusters, min_clusters)
    
    # Ensure we stay within 3-5 range
    max_clusters = min(max_clusters, 5)
    max_clusters = max(max_clusters, min_clusters)
    
    if max_clusters < min_clusters:
        return min_clusters, [], []
    
    k_range = range(min_clusters, max_clusters + 1)
    wcss_values = []
    
    print(f'\n📊 [Python API] Elbow Method: Testing {min_clusters} to {max_clusters} clusters (min=3, max=5)...')
    
    for k in k_range:
        kmeans = KMeans(n_clusters=k, init='k-means++', n_init=10, random_state=42, max_iter=300)
        kmeans.fit(X_scaled)
        wcss = kmeans.inertia_  # WCSS = within-cluster sum of squares
        wcss_values.append(wcss)
        print(f'   k={k}: WCSS={wcss:.2f}')
    
    # Find elbow point using the method of finding the maximum rate of change
    # Calculate the rate of decrease (negative derivative)
    if len(wcss_values) > 1:
        # Calculate second derivative to find elbow
        # Elbow is where the rate of change decreases most
        rate_of_change = []
        for i in range(len(wcss_values) - 1):
            change = wcss_values[i] - wcss_values[i + 1]  # Decrease in WCSS
            rate_of_change.append(change)
        
        # Calculate acceleration (second derivative)
        # Elbow is where acceleration is maximum (sharpest bend)
        if len(rate_of_change) > 1:
            acceleration = []
            for i in range(len(rate_of_change) - 1):
                accel = rate_of_change[i] - rate_of_change[i + 1]
                acceleration.append(accel)
            
            # Find k with maximum acceleration (sharpest elbow)
            if len(acceleration) > 0:
                max_accel_idx = np.argmax(acceleration)
                optimal_k = k_range[max_accel_idx + 1]  # +1 because acceleration calculation
                # Ensure optimal_k is within 3-5 range
                optimal_k = max(min(optimal_k, 5), 3)
                print(f'\n✅ [Python API] Elbow Method: Optimal k={optimal_k} (sharpest bend at k={optimal_k})')
                return optimal_k, wcss_values, list(k_range)
    
    # Fallback: use middle value if we can't find a clear elbow
    optimal_k = min_clusters + (max_clusters - min_clusters) // 2
    optimal_k = max(min(optimal_k, 5), 3)  # Ensure 3-5 range
    print(f'\n⚠️ [Python API] Elbow Method: Could not find clear elbow, using k={optimal_k} (middle value)')
    return optimal_k, wcss_values, list(k_range)


def validate_cluster_quality(cluster_stats, labels, total_students, silhouette_score):
    """
    Validate cluster quality after clustering
    Returns list of quality issues
    """
    issues = []
    
    # Check silhouette score
    if silhouette_score is not None:
        if silhouette_score < 0.1:
            issues.append(f"⚠️ Poor clustering quality: Silhouette score {silhouette_score:.4f} < 0.1")
        elif silhouette_score < 0.3:
            issues.append(f"⚠️ Fair clustering quality: Silhouette score {silhouette_score:.4f} < 0.3")
    
    # Check cluster sizes
    min_cluster_size_ratio = 0.05  # At least 5% of students
    min_size = max(2, int(total_students * min_cluster_size_ratio))
    max_size_ratio = 0.8  # No more than 80% in one cluster
    max_size = int(total_students * max_size_ratio)
    
    for cluster_id, stats in cluster_stats.items():
        count = stats.get('count', 0)
        label = labels.get(cluster_id, 'Unknown')
        
        if count < min_size:
            issues.append(f"⚠️ Cluster '{label}' (ID: {cluster_id}) is too small: {count} students (minimum: {min_size})")
        
        if count > max_size:
            issues.append(f"⚠️ Cluster '{label}' (ID: {cluster_id}) is too large: {count} students ({count/total_students*100:.1f}%, maximum: {max_size_ratio*100:.0f}%)")
    
    # Validate cluster labels match performance
    for cluster_id, stats in cluster_stats.items():
        label = labels.get(cluster_id, 'Unknown')
        avg_score = stats.get('avg_score', 0)
        avg_attendance = stats.get('avg_attendance_percentage', 0)
        
        # Check "Excellent Performance" actually has high metrics
        if label == "Excellent Performance":
            if avg_score < 75 or avg_attendance < 80:
                issues.append(f"⚠️ Cluster '{label}' (ID: {cluster_id}) labeled 'Excellent' but metrics are moderate (score: {avg_score:.1f}, attendance: {avg_attendance:.1f}%)")
        
        # Check "At Risk" actually has low metrics
        if label == "At Risk":
            if avg_score > 75 or avg_attendance > 80:
                issues.append(f"⚠️ Cluster '{label}' (ID: {cluster_id}) labeled 'At Risk' but metrics are moderate (score: {avg_score:.1f}, attendance: {avg_attendance:.1f}%)")
    
    return issues


def cluster_records(records):
    """
    Enhanced clustering function with validation.
    
    Clustering is based on THREE primary data sources:
    1. TRANSMUTED SCORES: Pre-calculated transmuted scores from assessments
       - Formula: Raw → Adjusted → Actual → Transmuted
       - Uses: average_score, assessment_scores_by_ilo
    2. SUBMISSION DATA: Submission behavior patterns
       - Counts: ontime, late, missing submissions
       - Rates: submission_rate, submission_ontime_rate, etc.
    3. ATTENDANCE DATA: Attendance patterns
       - Counts: present, absent, late attendance
       - Rates: attendance_percentage, attendance_present_rate, etc.
    
    Features:
    - Data quality validation before clustering
    - Cluster quality validation after clustering
    """
    # Validate input data
    validation_issues = validate_clustering_data(records)
    if validation_issues:
        print(f'\n⚠️ [Python API] Data validation issues found:')
        for issue in validation_issues[:10]:  # Show first 10 issues
            print(f'  {issue}')
        if len(validation_issues) > 10:
            print(f'  ... and {len(validation_issues) - 10} more issues')
        # Continue with clustering but log warnings
    
    df = pd.DataFrame(records)
    
    # Ensure student_id is integer for consistent merging
    if 'student_id' in df.columns:
        df['student_id'] = pd.to_numeric(df['student_id'], errors='coerce').astype('Int64')
    
    print(f'📊 [Python API] Processing {len(df)} students')
    
    # Calculate enhanced features
    attendance_features = df.apply(calculate_attendance_features, axis=1)
    submission_features = df.apply(calculate_submission_features, axis=1)
    score_features = df.apply(calculate_score_features, axis=1)
    
    # Add features to dataframe
    # Convert Series of dicts to DataFrame columns
    if len(attendance_features) > 0:
        attendance_df = pd.DataFrame(attendance_features.tolist())
        for col in attendance_df.columns:
            df[col] = attendance_df[col].values
    
    if len(submission_features) > 0:
        submission_df = pd.DataFrame(submission_features.tolist())
        for col in submission_df.columns:
            df[col] = submission_df[col].values
    
    if len(score_features) > 0:
        score_df = pd.DataFrame(score_features.tolist())
        for col in score_df.columns:
            df[col] = score_df[col].values
    
    # OPTIMIZED FEATURE SET for better Silhouette scores (0.5-0.7)
    # Reduced from 11 to 6-7 features to reduce redundancy and improve cluster separation
    # Features are derived from THREE primary data sources:
    # 1. TRANSMUTED SCORES: final_score (calculated from transmuted scores)
    # 2. SUBMISSION DATA: submission rates and quality scores
    # 3. ATTENDANCE DATA: attendance percentages and rates
    # 
    # PRIORITIZES ONTIME SUBMISSIONS: ontime_rate and ontime_priority_score have higher influence
    # REMOVED REDUNDANT FEATURES: submission_status_score (duplicates quality_score)
    features = [
        # CORE PERFORMANCE METRICS (most discriminative)
        'final_score',                     # Academic performance (0-100) - PRIMARY
        'attendance_percentage',           # Engagement metric (0-100) - PRIMARY
        'submission_ontime_priority_score', # Timeliness (0-100) - PRIMARY
        
        # BEHAVIOR PATTERNS (complementary, high variance)
        'submission_quality_score',        # Submission behavior (0.0-2.0) - HIGH WEIGHT
        'attendance_present_rate',         # Attendance pattern (0-1) - MODERATE WEIGHT
        
        # OVERALL METRICS (if they add unique information)
        'submission_rate',                 # Overall submission rate (0-1) - MODERATE WEIGHT
    ]
    
    # Optional: Add attendance_late_rate only if it has sufficient variance
    # This will be checked later in variance filtering
    
    # Ensure numeric types
    for col in features:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # Fill missing values with reasonable defaults
    df_clean = df.copy()
    df_clean['attendance_percentage'] = df_clean['attendance_percentage'].fillna(75.0)
    df_clean['attendance_present_rate'] = df_clean['attendance_present_rate'].fillna(0.75)
    df_clean['attendance_late_rate'] = df_clean['attendance_late_rate'].fillna(0.10)
    df_clean['final_score'] = df_clean['final_score'].fillna(50.0)
    # Submission defaults - prioritizing ontime submissions
    df_clean['submission_ontime_rate'] = df_clean['submission_ontime_rate'].fillna(0.6)
    df_clean['submission_ontime_priority_score'] = df_clean['submission_ontime_priority_score'].fillna(60.0)
    df_clean['submission_quality_score'] = df_clean['submission_quality_score'].fillna(1.2)  # Moderate: mix of ontime/late (0.0-2.0 scale)
    df_clean['submission_rate'] = df_clean['submission_rate'].fillna(0.8)
    df_clean['submission_late_rate'] = df_clean['submission_late_rate'].fillna(0.2)
    df_clean['submission_missing_rate'] = df_clean['submission_missing_rate'].fillna(0.0)
    df_clean['submission_status_score'] = df_clean['submission_status_score'].fillna(1.2)  # Moderate score (0.0-2.0 scale, same as quality_score)
    
    if len(df_clean) == 0:
        output = df.copy()
        output['cluster'] = None
        output['cluster_label'] = None
        output['silhouette_score'] = None
        output['clustering_explanation'] = None
        return output.to_dict(orient='records')
    
    # Check data variation and filter low-variance features
    print(f'\n📊 [Python API] Data variation check:')
    variance_threshold = 0.01  # Minimum variance required
    valid_features = []
    
    for feature in features:
        if feature in df_clean.columns:
            feature_range = df_clean[feature].max() - df_clean[feature].min()
            feature_mean = df_clean[feature].mean()
            feature_variance = df_clean[feature].var()
            print(f'  {feature}: range={feature_range:.3f}, mean={feature_mean:.3f}, variance={feature_variance:.6f}')
            
            if feature_range < 0.01:
                print(f'    ⚠️ WARNING: Very low variation in {feature}. Clustering may not distinguish students well.')
            
            # Filter out features with very low variance
            if feature_variance >= variance_threshold:
                valid_features.append(feature)
            else:
                print(f'    ⚠️ REMOVED: {feature} has variance {feature_variance:.6f} < {variance_threshold} (too low)')
    
    # Update features list to only include valid features
    if len(valid_features) < 3:
        print(f'\n⚠️ [Python API] Warning: Only {len(valid_features)} features have sufficient variance. Using all features anyway.')
        valid_features = [f for f in features if f in df_clean.columns]
    else:
        features = valid_features
        print(f'\n✅ [Python API] Using {len(features)} features with sufficient variance: {features}')
    
    # Scale features for clustering
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(df_clean[features])
    
    # Determine optimal number of clusters using elbow method
    # Need at least 6 students for clustering (3 clusters * 2 samples per cluster)
    if len(df_clean) < 6:
        # If less than 6 students, use minimum k=3 if possible
        if len(df_clean) >= 6:
            n_clusters = 3
        elif len(df_clean) >= 4:
            n_clusters = 2  # Fallback: use 2 clusters if 4-5 students
        else:
            n_clusters = 1  # Not enough data
        print(f'\n⚠️ [Python API] Insufficient data ({len(df_clean)} students), using k={n_clusters} (minimum 6 students recommended for k=3-5)')
    else:
        # Use elbow method to find optimal k (3-5)
        # Need at least 2 samples per cluster, so max is limited by data size
        max_clusters = min(5, len(df_clean) // 2)  # Maximum 5 clusters
        max_clusters = max(max_clusters, 3)  # Minimum 3 clusters
        
        # Use Silhouette-based method for better cluster separation (target: 0.5-0.7)
        # Falls back to elbow method if Silhouette method fails
        try:
            optimal_k, silhouette_best, silhouette_scores = find_optimal_k_silhouette(
                X_scaled,
                max_clusters=max_clusters,
                min_clusters=3
            )
            
            # Also run elbow method for comparison
            elbow_k, wcss_values, k_range = find_optimal_clusters_elbow_method(
                X_scaled,
                max_clusters=max_clusters,
                min_clusters=3
            )
            
            # Prefer Silhouette-based k if it gives good score (>= 0.3)
            # Otherwise use elbow method
            if silhouette_best >= 0.3:
                n_clusters = optimal_k
                print(f'\n🎯 [Python API] Using Silhouette-optimized k={n_clusters} (score={silhouette_best:.4f})')
            else:
                n_clusters = elbow_k
                print(f'\n🎯 [Python API] Using Elbow-optimized k={n_clusters} (Silhouette score was {silhouette_best:.4f}, too low)')
        except Exception as e:
            print(f'\n⚠️ [Python API] Silhouette method failed: {e}, using elbow method')
            optimal_k, wcss_values, k_range = find_optimal_clusters_elbow_method(
                X_scaled,
                max_clusters=max_clusters,
                min_clusters=3
            )
            n_clusters = optimal_k
        
        # Ensure n_clusters is valid for the data size and within 3-5 range
        n_clusters = min(n_clusters, min(5, len(df_clean) // 2))
        n_clusters = max(n_clusters, 3)
        
        print(f'\n🎯 [Python API] Final k={n_clusters} clusters (range: 3-5)')
    
    # Perform KMeans clustering with optimized settings for better separation
    if n_clusters > 1:
        # Use k-means++ initialization and multiple runs for better results
        kmeans = KMeans(
            n_clusters=n_clusters,
            init='k-means++',      # Better initialization than random
            n_init=10,             # Run 10 times, pick best result
            max_iter=300,
            random_state=42
        )
        clusters = kmeans.fit_predict(X_scaled)
        
        # Calculate silhouette score (only if we have at least 2 clusters and 2 samples per cluster)
        silhouette_avg = None
        try:
            if len(df_clean) >= n_clusters * 2:  # Need at least 2 samples per cluster
                silhouette_avg = silhouette_score(X_scaled, clusters)
                print(f'\n✅ [Python API] Silhouette Score: {silhouette_avg:.4f}')
                if silhouette_avg > 0.5:
                    print('   📈 Excellent clustering quality (score > 0.5)')
                elif silhouette_avg > 0.3:
                    print('   ✅ Good clustering quality (score > 0.3)')
                elif silhouette_avg > 0.1:
                    print('   ⚠️ Fair clustering quality (score > 0.1)')
                else:
                    print('   ⚠️ Poor clustering quality (score < 0.1) - clusters may not be well-separated')
        except Exception as e:
            print(f'⚠️ [Python API] Could not calculate silhouette score: {e}')
            silhouette_avg = None
    else:
        clusters = np.zeros(len(df_clean), dtype=int)
        silhouette_avg = None
        print('⚠️ [Python API] Not enough data for clustering (need at least 2 students)')
    
    df_clean.loc[:, 'cluster'] = clusters
    
    # Calculate cluster centroids and statistics
    cluster_stats = {}
    for cluster_id in range(n_clusters):
        cluster_data = df_clean[df_clean['cluster'] == cluster_id]
        cluster_stats[cluster_id] = {
            'count': len(cluster_data),
            'avg_attendance_percentage': cluster_data['attendance_percentage'].mean(),
            'avg_present_rate': cluster_data['attendance_present_rate'].mean(),
            'avg_late_rate': cluster_data['attendance_late_rate'].mean(),
            'avg_score': cluster_data['final_score'].mean(),
            # Submission statistics - ONTIME PRIORITIZED
            'avg_ontime_rate': cluster_data['submission_ontime_rate'].mean(),
            'avg_ontime_priority_score': cluster_data['submission_ontime_priority_score'].mean(),  # PRIORITY metric
            'avg_quality_score': cluster_data['submission_quality_score'].mean(),  # PRIORITY metric (prioritizes ontime)
            'avg_submission_rate': cluster_data['submission_rate'].mean(),
            'avg_late_submission_rate': cluster_data['submission_late_rate'].mean(),
            'avg_missing_rate': cluster_data['submission_missing_rate'].mean(),
            'avg_status_score': cluster_data['submission_status_score'].mean()
        }
    
    # Assign labels based on behavior patterns
    # PRIORITIZES ONTIME SUBMISSIONS: Higher weight given to ontime performance
    cluster_scores = {}
    for cluster_id, stats in cluster_stats.items():
        # Weighted performance score - ONTIME SUBMISSIONS PRIORITIZED
        # Higher ontime_priority_score and quality_score indicate better performance
        score = (
            stats['avg_attendance_percentage'] * 0.20 +
            stats['avg_score'] * 0.25 +
            # PRIORITY: Ontime submissions get highest weight (35% total)
            stats['avg_ontime_priority_score'] * 0.25 +  # Direct ontime percentage (0-100)
            stats['avg_quality_score'] * 0.15 +  # Quality score (prioritizes ontime, 0-100)
            stats['avg_submission_rate'] * 100 * 0.10 +
            stats['avg_status_score'] * 50 * 0.05  # Higher status score = better (0.0-2.0 scale, normalized to 0-100 for scoring)
        )
        cluster_scores[cluster_id] = score
    
    # Sort clusters by score and assign labels
    sorted_clusters = sorted(cluster_scores.items(), key=lambda x: x[1], reverse=True)
    
    # Define behavior-based labels using switch/case structure (k=3, 4, or 5 only)
    # Label distribution based on performance ranking
    labels = {}
    
    # Switch/case structure for k=3, 4, 5 (minimum 3, maximum 5)
    if n_clusters == 3:
        # Case: 3 clusters
        labels = {
            sorted_clusters[0][0]: "Excellent Performance",    # Highest score
            sorted_clusters[1][0]: "Average Performance",      # Middle score
            sorted_clusters[2][0]: "Needs Improvement"         # Lowest score
        }
    elif n_clusters == 4:
        # Case: 4 clusters
        labels = {
            sorted_clusters[0][0]: "Excellent Performance",    # Highest score
            sorted_clusters[1][0]: "Average Performance",      # Second highest
            sorted_clusters[2][0]: "Needs Improvement",        # Second lowest
            sorted_clusters[3][0]: "At Risk"                   # Lowest score
        }
    elif n_clusters == 5:
        # Case: 5 clusters (maximum)
        labels = {
            sorted_clusters[0][0]: "Excellent Performance",    # Highest score
            sorted_clusters[1][0]: "Good Performance",         # Second highest
            sorted_clusters[2][0]: "Average Performance",      # Middle score
            sorted_clusters[3][0]: "Needs Improvement",        # Second lowest
            sorted_clusters[4][0]: "At Risk"                   # Lowest score
        }
    else:
        # Fallback: for k < 3 or k > 5 (should not happen in normal flow)
        # Use k=3 labels as default
        print(f'\n⚠️ [Python API] Warning: Unexpected cluster count k={n_clusters}, using k=3 labels')
        labels = {
            sorted_clusters[0][0]: "Excellent Performance",
            sorted_clusters[1][0]: "Average Performance",
            sorted_clusters[2][0]: "Needs Improvement"
        } if len(sorted_clusters) >= 3 else {}
    
    df_clean.loc[:, 'cluster_label'] = df_clean['cluster'].map(labels).fillna(df_clean['cluster'].astype(str))
    
    # Generate explanations for each cluster
    explanations = {}
    for cluster_id, stats in cluster_stats.items():
        label = labels.get(cluster_id, f"Cluster {cluster_id}")
        explanation_parts = []
        
        # Attendance analysis
        if stats['avg_attendance_percentage'] >= 90:
            explanation_parts.append("excellent attendance")
        elif stats['avg_attendance_percentage'] >= 75:
            explanation_parts.append("good attendance")
        elif stats['avg_attendance_percentage'] >= 60:
            explanation_parts.append("moderate attendance")
        else:
            explanation_parts.append("poor attendance")
        
        # Score analysis
        if stats['avg_score'] >= 85:
            explanation_parts.append("high academic performance")
        elif stats['avg_score'] >= 70:
            explanation_parts.append("satisfactory academic performance")
        elif stats['avg_score'] >= 60:
            explanation_parts.append("below-average academic performance")
        else:
            explanation_parts.append("low academic performance")
        
        # Submission behavior analysis - PRIORITIZES ONTIME SUBMISSIONS
        # Emphasize ontime performance in explanations
        if stats['avg_ontime_priority_score'] >= 80:
            explanation_parts.append("excellent ontime submission rate")
        elif stats['avg_ontime_priority_score'] >= 60:
            explanation_parts.append("good ontime submission rate")
        elif stats['avg_ontime_priority_score'] >= 40:
            explanation_parts.append("moderate ontime submission rate")
        else:
            explanation_parts.append("frequently submits late")
        
        if stats['avg_missing_rate'] >= 0.3:
            explanation_parts.append("often misses submissions")
        
        if stats['avg_submission_rate'] >= 0.9:
            explanation_parts.append("high submission rate")
        elif stats['avg_submission_rate'] >= 0.7:
            explanation_parts.append("moderate submission rate")
        else:
            explanation_parts.append("low submission rate")
        
        # Include status-based metrics in explanation - HIGHLIGHT ONTIME PRIORITY
        explanation = f"This cluster shows {', '.join(explanation_parts)}. "
        explanation += f"Average attendance: {stats['avg_attendance_percentage']:.1f}%, "
        explanation += f"Average score: {stats['avg_score']:.1f}%, "
        explanation += f"**Ontime submission rate: {stats['avg_ontime_priority_score']:.1f}%** (PRIORITY), "
        explanation += f"Overall submission rate: {stats['avg_submission_rate']*100:.1f}% "
        explanation += f"(Late: {stats['avg_late_submission_rate']*100:.1f}%, Missing: {stats['avg_missing_rate']*100:.1f}%), "
        explanation += f"Quality score: {stats['avg_quality_score']:.1f}/100 (prioritizes ontime)"
        
        explanations[cluster_id] = explanation
    
    df_clean.loc[:, 'clustering_explanation'] = df_clean['cluster'].map(explanations).fillna('No explanation available')
    
    # Add silhouette score to all records
    df_clean.loc[:, 'silhouette_score'] = silhouette_avg
    
    # Print cluster distribution
    print(f'\n📈 [Python API] Cluster distribution:')
    cluster_counts = df_clean['cluster_label'].value_counts()
    total_students = len(df_clean)
    for label, count in cluster_counts.items():
        percentage = (count / total_students) * 100
        print(f'  {label}: {count} students ({percentage:.1f}%)')
        cluster_id = df_clean[df_clean['cluster_label'] == label]['cluster'].iloc[0]
        if cluster_id in explanations:
            print(f'    Explanation: {explanations[cluster_id]}')
    
    # Validate cluster quality
    quality_issues = validate_cluster_quality(cluster_stats, labels, len(df_clean), silhouette_avg)
    if quality_issues:
        print(f'\n⚠️ [Python API] Cluster quality issues:')
        for issue in quality_issues:
            print(f'  {issue}')
    
    # Legacy validation (keep for backward compatibility)
    max_cluster_ratio = cluster_counts.max() / total_students if total_students > 0 else 0
    if max_cluster_ratio > 0.8:
        print(f'⚠️ WARNING: One cluster contains {max_cluster_ratio*100:.1f}% of students.')
    if len(cluster_counts) == 1:
        print(f'⚠️ WARNING: All students are in the same cluster.')
    
    # Merge results back to original dataframe
    df['student_id'] = pd.to_numeric(df['student_id'], errors='coerce').astype('Int64')
    df_clean['student_id'] = pd.to_numeric(df_clean['student_id'], errors='coerce').astype('Int64')
    
    # Log merge diagnostics
    print(f'\n🔍 [Python API] Merge diagnostics:')
    print(f'   Original df student_ids: {df["student_id"].tolist()[:5]}...')
    print(f'   Clean df student_ids: {df_clean["student_id"].tolist()[:5]}...')
    print(f'   Original df shape: {df.shape}')
    print(f'   Clean df shape: {df_clean.shape}')
    print(f'   Clean df has cluster_label: {"cluster_label" in df_clean.columns}')
    
    output = df.merge(
        df_clean[['student_id', 'cluster', 'cluster_label', 'silhouette_score', 'clustering_explanation']],
        on='student_id',
        how='left'
    )
    
    # Log merge results
    print(f'   Output shape after merge: {output.shape}')
    print(f'   Output has cluster_label: {"cluster_label" in output.columns}')
    clustered_after_merge = output['cluster_label'].notna().sum()
    print(f'   Students with cluster_label after merge: {clustered_after_merge}/{len(output)}')
    
    # Convert NaN to None for JSON serialization
    result = output.to_dict(orient='records')
    for record in result:
        for key, value in record.items():
            # Check if value is array-like first (pd.isna can't handle arrays)
            # This must be done BEFORE calling pd.isna() to avoid ValueError
            is_array_like = False
            
            # Check for common array types
            if isinstance(value, (list, tuple, np.ndarray, pd.Series)):
                is_array_like = True
            # Check for array-like objects (has length and is iterable, but not string/bytes)
            elif hasattr(value, '__len__') and hasattr(value, '__iter__'):
                if not isinstance(value, (str, bytes)):
                    # Additional check: try to get size/length to confirm it's array-like
                    try:
                        # Check if it's a numpy array or array-like
                        if hasattr(value, 'size') or hasattr(value, '__array__') or isinstance(value, np.ndarray):
                            is_array_like = True
                        # Check if it's a list/array of complex types
                        elif len(value) > 0:
                            # If first element is array-like, the whole thing is array-like
                            if isinstance(value[0], (list, dict, np.ndarray, tuple)):
                                is_array_like = True
                        # Empty arrays are also array-like
                        elif len(value) == 0:
                            is_array_like = True
                    except (TypeError, IndexError, AttributeError):
                        # Not array-like, continue with scalar check
                        pass
            
            if is_array_like:
                # Arrays are valid data, skip NaN check
                # Convert to list for JSON serialization if needed
                if isinstance(value, (np.ndarray, pd.Series)):
                    try:
                        record[key] = value.tolist() if hasattr(value, 'tolist') else list(value)
                    except (ValueError, TypeError):
                        # If conversion fails, keep original (might be complex array)
                        pass
                elif isinstance(value, tuple):
                    record[key] = list(value)
                # If it's already a list, keep it as-is
                continue
            
            # For scalar values, check if NaN
            # Only call pd.isna() on non-array values
            try:
                if pd.isna(value):
                    record[key] = None
            except (ValueError, TypeError) as e:
                # If pd.isna fails, it might be an array-like object that slipped through
                # In this case, treat it as valid data (don't convert to None)
                error_msg = str(e).lower()
                if 'array' in error_msg or 'ambiguous' in error_msg:
                    # This is an array-like object, keep it as-is
                    pass
                else:
                    # Some other error, log it but don't fail
                    print(f'⚠️ [Python API] Warning: Could not check NaN for key "{key}": {e}')
        if record.get('cluster_label') is not None:
            record['cluster_label'] = str(record['cluster_label'])
        if record.get('silhouette_score') is not None:
            record['silhouette_score'] = float(record['silhouette_score'])
    
    clustered_count = sum(1 for r in result if r.get('cluster_label') is not None)
    print(f'\n📊 [Python API] Clustering summary: {clustered_count} students clustered')
    if silhouette_avg is not None:
        print(f'📊 [Python API] Overall Silhouette Score: {silhouette_avg:.4f}')
    
    return result


@app.route("/api/cluster", methods=["POST", "OPTIONS"])
def cluster_students():
    """Enhanced clustering endpoint with detailed student data."""
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response
    
    print('🔍 [Python API] Received clustering request')
    data = request.get_json()
    
    if not data:
        print('❌ [Python API] No data received in request')
        return jsonify({'error': 'No data provided'}), 400
    
    if not isinstance(data, list):
        print('❌ [Python API] Invalid data format. Expected list, got:', type(data))
        return jsonify({'error': 'Data must be a list of student records'}), 400
    
    print(f'📦 [Python API] Received {len(data)} students')
    
    # Log sample input data
    if len(data) > 0:
        sample = data[0]
        print(f'📋 [Python API] Sample input: student_id={sample.get("student_id")}')
        print(f'   Attendance: {sample.get("attendance_percentage")}% '
              f'(Present: {sample.get("attendance_present_count")}, '
              f'Absent: {sample.get("attendance_absent_count")}, '
              f'Late: {sample.get("attendance_late_count")})')
        print(f'   Score: {sample.get("average_score")}')
        print(f'   Submissions: Rate={sample.get("submission_rate")}, '
              f'Ontime={sample.get("submission_ontime_count")}, '
              f'Late={sample.get("submission_late_count")}, '
              f'Missing={sample.get("submission_missing_count")}')
    
    try:
        results = cluster_records(data)
    except Exception as e:
        print(f'❌ [Python API] Error during clustering: {str(e)}')
        import traceback
        print(f'❌ [Python API] Traceback:')
        traceback.print_exc()
        # Return error response with original student IDs but no clusters
        error_results = []
        for record in data:
            error_results.append({
                'student_id': record.get('student_id'),
                'cluster': None,
                'cluster_label': None,
                'silhouette_score': None,
                'clustering_explanation': f'Error: {str(e)}'
            })
        results = error_results
    
    # Log results
    clustered_count = sum(1 for r in results if r.get('cluster_label') and r.get('cluster_label') != 'Not Clustered')
    print(f'✅ [Python API] Successfully clustered {clustered_count} out of {len(results)} students')
    
    # Extract silhouette score from results (should be same for all)
    silhouette_avg = None
    if results and results[0].get('silhouette_score') is not None:
        silhouette_avg = results[0].get('silhouette_score')
        print(f'📊 [Python API] Silhouette Score: {silhouette_avg:.4f}')
    
    # Log cluster distribution
    df_results = pd.DataFrame(results)
    if 'cluster_label' in df_results.columns:
        cluster_counts = df_results['cluster_label'].fillna('Not Clustered').value_counts().to_dict()
        print(f'📈 [Python API] Cluster distribution: {cluster_counts}')
    
    # Clean NaN values for JSON
    import json
    import math
    
    def clean_for_json(obj):
        """Recursively clean NaN, Infinity values from dict/list for JSON serialization"""
        if isinstance(obj, dict):
            return {k: clean_for_json(v) for k, v in obj.items()}
        elif isinstance(obj, (list, np.ndarray)):
            return [clean_for_json(item) for item in obj]
        elif isinstance(obj, float):
            if math.isnan(obj) or math.isinf(obj):
                return None
            return obj
        elif isinstance(obj, (int, str, bool)) or obj is None:
            return obj
        else:
            # Try pd.isna for pandas types, but catch errors for arrays
            try:
                if pd.isna(obj):
                    return None
            except (ValueError, TypeError):
                # pd.isna failed (likely an array), return as-is
                pass
            return obj
    
    cleaned_results = clean_for_json(results)
    
    response = jsonify(cleaned_results)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response


@app.route("/", methods=["GET"])
def health():
    """Healthcheck endpoint for deployment platforms"""
    return jsonify({
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
    }), 200


@app.route("/health", methods=["GET"])
def health_check():
    """Alternative healthcheck endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "Enhanced KMeans Clustering API",
        "version": "2.0"
    }), 200


if __name__ == "__main__":
    import os
    port = int(os.environ.get('PORT', 10000))
    app.run(host="0.0.0.0", port=port, debug=True)
