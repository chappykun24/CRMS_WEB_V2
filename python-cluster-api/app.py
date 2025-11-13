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
    # Score range: 0.0 (all ontime) to 2.0 (all missing)
    # Formula: (ontime * 0.0 + late * 1.0 + missing * 2.0) / total
    # This gives a weighted average where:
    # - ontime = 0 (best)
    # - late = 1 (moderate)
    # - missing = 2 (worst)
    if total_assessments > 0:
        submission_status_score = (ontime_count * 0.0 + late_count * 1.0 + missing_count * 2.0) / total_assessments
    else:
        submission_status_score = 2.0  # Worst case if no data
    
    # Calculate submission quality score (0-100 scale, higher is better)
    # PRIORITIZES ONTIME SUBMISSIONS: ontime gets much higher weight than late
    # Formula gives strong preference to students who submit on time
    if total_assessments > 0:
        # Prioritized quality score: ontime=100%, late=20%, missing=0%
        # This heavily weights ontime submissions (5x more valuable than late)
        quality_score = ((ontime_count * 100.0) + (late_count * 20.0) + (missing_count * 0.0)) / total_assessments
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
        'submission_status_score': submission_status_score,  # 0.0-2.0, lower is better
        'submission_quality_score': quality_score,  # 0.0-100.0, higher is better (prioritizes ontime)
        'submission_ontime_priority_score': ontime_priority_score  # 0.0-100.0, direct ontime percentage
    }


def calculate_score_features(row):
    """
    Calculate score features based on syllabus weights and ILO coverage.
    Prioritizes ILO-weighted score which combines:
    1. Syllabus assessment weights (weight_percentage from assessments)
    2. ILO coverage (assessment_ilo_weights)
    3. Submission scores (adjusted_score or total_score)
    """
    # Syllabus-weighted score: based on assessment weights from syllabus
    # Formula: SUM((submission_score / total_points) * weight_percentage)
    syllabus_weighted_score = float(row.get('average_score', 50.0))
    
    # ILO-weighted score: combines syllabus weights with ILO coverage boost
    # Formula: SUM((submission_score / total_points) * weight_percentage * ILO_boost)
    # This is the primary score as it respects both syllabus structure and ILO alignment
    ilo_score = float(row.get('ilo_weighted_score', syllabus_weighted_score)) if pd.notna(row.get('ilo_weighted_score')) else syllabus_weighted_score
    
    # Use ILO-weighted score as final_score (includes syllabus weights + ILO boost)
    # Falls back to syllabus-weighted score if ILO data unavailable
    final_score = ilo_score if pd.notna(row.get('ilo_weighted_score')) else syllabus_weighted_score
    
    return {
        'average_score': syllabus_weighted_score,  # Syllabus-weighted (without ILO boost)
        'ilo_weighted_score': ilo_score,  # Syllabus-weighted + ILO boost
        'final_score': final_score  # Primary score for clustering (syllabus + ILO)
    }


def cluster_records(records):
    """
    Enhanced clustering function using detailed student data:
    - Attendance: present, absent, late counts
    - Submission scores: based on Assessment and ILO mapping
    - Submission behavior: late, ontime, missing counts
    """
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
    
    # Define features for clustering (using status-based numerical values)
    # PRIORITIZES ONTIME SUBMISSIONS: ontime_rate and ontime_priority_score have higher influence
    features = [
        'attendance_percentage',           # Overall attendance percentage
        'attendance_present_rate',         # Present rate (0-1)
        'attendance_late_rate',            # Late rate (0-1)
        'final_score',                     # Score (ILO-weighted if available)
        # Submission features - ONTIME PRIORITIZED (listed first for higher weight)
        'submission_ontime_rate',          # PRIORITY: Ontime submission rate (0-1) - highest weight
        'submission_ontime_priority_score', # PRIORITY: Direct ontime percentage (0-100) - high weight
        'submission_quality_score',        # Quality score (0-100, prioritizes ontime) - high weight
        'submission_rate',                 # Overall submission rate (ontime + late) / total
        'submission_late_rate',            # Late submission rate (0-1) - lower weight
        'submission_missing_rate',         # Missing submission rate (0-1)
        'submission_status_score'          # Status score (0.0-2.0, lower is better)
    ]
    
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
    df_clean['submission_quality_score'] = df_clean['submission_quality_score'].fillna(68.0)  # Weighted: 60% ontime * 100 + 20% late * 20
    df_clean['submission_rate'] = df_clean['submission_rate'].fillna(0.8)
    df_clean['submission_late_rate'] = df_clean['submission_late_rate'].fillna(0.2)
    df_clean['submission_missing_rate'] = df_clean['submission_missing_rate'].fillna(0.0)
    df_clean['submission_status_score'] = df_clean['submission_status_score'].fillna(0.5)  # Moderate score
    
    if len(df_clean) == 0:
        output = df.copy()
        output['cluster'] = None
        output['cluster_label'] = None
        output['silhouette_score'] = None
        output['clustering_explanation'] = None
        return output.to_dict(orient='records')
    
    # Check data variation
    print(f'\n📊 [Python API] Data variation check:')
    for feature in features:
        if feature in df_clean.columns:
            feature_range = df_clean[feature].max() - df_clean[feature].min()
            feature_mean = df_clean[feature].mean()
            print(f'  {feature}: range={feature_range:.3f}, mean={feature_mean:.3f}')
            if feature_range < 0.01:
                print(f'    ⚠️ WARNING: Very low variation in {feature}. Clustering may not distinguish students well.')
    
    # Determine optimal number of clusters
    n_clusters_requested = 4
    n_clusters = min(n_clusters_requested, len(df_clean))
    if n_clusters < 2:
        n_clusters = 1
    
    # Scale features for clustering
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(df_clean[features])
    
    # Perform KMeans clustering
    if n_clusters > 1:
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto')
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
            (100 - stats['avg_status_score'] * 50) * 0.05  # Lower status score = better
        )
        cluster_scores[cluster_id] = score
    
    # Sort clusters by score and assign labels
    sorted_clusters = sorted(cluster_scores.items(), key=lambda x: x[1], reverse=True)
    
    # Define behavior-based labels
    if n_clusters >= 4:
        labels = {
            sorted_clusters[0][0]: "Excellent Performance",
            sorted_clusters[1][0]: "On Track",
            sorted_clusters[2][0]: "Needs Improvement",
            sorted_clusters[3][0]: "At Risk"
        }
    elif n_clusters == 3:
        labels = {
            sorted_clusters[0][0]: "Excellent Performance",
            sorted_clusters[1][0]: "On Track",
            sorted_clusters[2][0]: "Needs Guidance"
        }
    elif n_clusters == 2:
        labels = {
            sorted_clusters[0][0]: "Performing Well",
            sorted_clusters[1][0]: "Needs Support"
        }
    else:
        # When only 1 cluster, assign label based on performance metrics
        # Calculate average performance to determine appropriate label
        if len(cluster_stats) > 0:
            stats = cluster_stats[0]
            avg_score = stats.get('avg_score', 0)
            avg_attendance = stats.get('avg_attendance_percentage', 0)
            avg_submission_rate = stats.get('avg_submission_rate', 0) * 100
            
            # Determine label based on performance
            if avg_score >= 85 and avg_attendance >= 85 and avg_submission_rate >= 90:
                labels = {0: "Excellent Performance"}
            elif avg_score >= 70 and avg_attendance >= 75 and avg_submission_rate >= 80:
                labels = {0: "On Track"}
            elif avg_score >= 60 and avg_attendance >= 60 and avg_submission_rate >= 70:
                labels = {0: "Needs Improvement"}
            else:
                labels = {0: "At Risk"}
        else:
            labels = {0: "On Track"}  # Default fallback
    
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
    
    # Validate cluster distribution
    max_cluster_ratio = cluster_counts.max() / total_students if total_students > 0 else 0
    if max_cluster_ratio > 0.8:
        print(f'⚠️ WARNING: One cluster contains {max_cluster_ratio*100:.1f}% of students.')
    if len(cluster_counts) == 1:
        print(f'⚠️ WARNING: All students are in the same cluster.')
    
    # Merge results back to original dataframe
    df['student_id'] = pd.to_numeric(df['student_id'], errors='coerce').astype('Int64')
    df_clean['student_id'] = pd.to_numeric(df_clean['student_id'], errors='coerce').astype('Int64')
    
    output = df.merge(
        df_clean[['student_id', 'cluster', 'cluster_label', 'silhouette_score', 'clustering_explanation']],
        on='student_id',
        how='left'
    )
    
    # Convert NaN to None for JSON serialization
    result = output.to_dict(orient='records')
    for record in result:
        for key, value in record.items():
            if pd.isna(value):
                record[key] = None
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
        print(f'   Score: {sample.get("average_score")} '
              f'(ILO-weighted: {sample.get("ilo_weighted_score")})')
        print(f'   Submissions: Rate={sample.get("submission_rate")}, '
              f'Ontime={sample.get("submission_ontime_count")}, '
              f'Late={sample.get("submission_late_count")}, '
              f'Missing={sample.get("submission_missing_count")}')
    
    results = cluster_records(data)
    
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
        elif isinstance(obj, list):
            return [clean_for_json(item) for item in obj]
        elif isinstance(obj, float):
            if math.isnan(obj) or math.isinf(obj):
                return None
            return obj
        elif pd.isna(obj):
            return None
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
