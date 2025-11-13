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
    Calculate submission features from detailed submission behavior data.
    """
    # If detailed submission behavior data is available
    if pd.notna(row.get('submission_ontime_count')) and pd.notna(row.get('submission_total_assessments')):
        ontime = float(row.get('submission_ontime_count', 0))
        late = float(row.get('submission_late_count', 0))
        missing = float(row.get('submission_missing_count', 0))
        total = float(row.get('submission_total_assessments', 1))
        
        if total > 0:
            ontime_rate = ontime / total
            late_rate = late / total
            missing_rate = missing / total
            submission_rate = (ontime + late) / total  # Both ontime and late count as submitted
            # Submission status score: 0=ontime, 1=late, 2=missing (weighted average)
            submission_status_score = (late * 1.0 + missing * 2.0) / total if total > 0 else 2.0
        else:
            ontime_rate = 0.0
            late_rate = 0.0
            missing_rate = 1.0
            submission_rate = 0.0
            submission_status_score = 2.0
    else:
        # Fallback to existing metrics
        submission_rate = float(row.get('submission_rate', 0.8))
        submission_status_score = float(row.get('average_submission_status_score', 1.0))
        
        # Estimate behavior counts from rate and status score
        if submission_status_score <= 0.5:
            # Mostly ontime
            ontime_rate = submission_rate * 0.8
            late_rate = submission_rate * 0.2
            missing_rate = 1.0 - submission_rate
        elif submission_status_score <= 1.5:
            # Mix of ontime and late
            ontime_rate = submission_rate * 0.5
            late_rate = submission_rate * 0.5
            missing_rate = 1.0 - submission_rate
        else:
            # Mostly late or missing
            ontime_rate = submission_rate * 0.2
            late_rate = submission_rate * 0.3
            missing_rate = 1.0 - submission_rate
    
    return {
        'submission_rate': submission_rate,
        'submission_ontime_rate': ontime_rate,
        'submission_late_rate': late_rate,
        'submission_missing_rate': missing_rate,
        'submission_status_score': submission_status_score
    }


def calculate_score_features(row):
    """
    Calculate score features, including ILO-based scores if available.
    """
    # Primary score: average_score (from all submissions)
    average_score = float(row.get('average_score', 50.0))
    
    # ILO-based score if available (weighted by ILO mappings)
    ilo_score = float(row.get('ilo_weighted_score', average_score)) if pd.notna(row.get('ilo_weighted_score')) else average_score
    
    # Use ILO score if available, otherwise fall back to average_score
    final_score = ilo_score if pd.notna(row.get('ilo_weighted_score')) else average_score
    
    return {
        'average_score': average_score,
        'ilo_weighted_score': ilo_score,
        'final_score': final_score
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
    
    # Define features for clustering (using enhanced metrics)
    features = [
        'attendance_percentage',           # Overall attendance
        'attendance_present_rate',         # Present rate (0-1)
        'attendance_late_rate',            # Late rate (0-1)
        'final_score',                     # Score (ILO-weighted if available)
        'submission_rate',                 # Overall submission rate
        'submission_ontime_rate',          # Ontime submission rate
        'submission_late_rate',            # Late submission rate
        'submission_status_score'          # Submission timeliness score (0-2)
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
    df_clean['submission_rate'] = df_clean['submission_rate'].fillna(0.8)
    df_clean['submission_ontime_rate'] = df_clean['submission_ontime_rate'].fillna(0.6)
    df_clean['submission_late_rate'] = df_clean['submission_late_rate'].fillna(0.2)
    df_clean['submission_status_score'] = df_clean['submission_status_score'].fillna(1.0)
    
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
            'avg_submission_rate': cluster_data['submission_rate'].mean(),
            'avg_ontime_rate': cluster_data['submission_ontime_rate'].mean(),
            'avg_late_submission_rate': cluster_data['submission_late_rate'].mean(),
            'avg_status_score': cluster_data['submission_status_score'].mean()
        }
    
    # Assign labels based on behavior patterns
    cluster_scores = {}
    for cluster_id, stats in cluster_stats.items():
        # Weighted performance score
        score = (
            stats['avg_attendance_percentage'] * 0.25 +
            stats['avg_score'] * 0.30 +
            stats['avg_submission_rate'] * 100 * 0.25 +
            stats['avg_ontime_rate'] * 100 * 0.15 +
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
        labels = {0: "Students"}
    
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
        
        # Submission behavior analysis
        if stats['avg_ontime_rate'] >= 0.8:
            explanation_parts.append("consistently submits on time")
        elif stats['avg_ontime_rate'] >= 0.5:
            explanation_parts.append("frequently submits late")
        else:
            explanation_parts.append("often misses submissions")
        
        if stats['avg_submission_rate'] >= 0.9:
            explanation_parts.append("high submission rate")
        elif stats['avg_submission_rate'] >= 0.7:
            explanation_parts.append("moderate submission rate")
        else:
            explanation_parts.append("low submission rate")
        
        explanation = f"This cluster shows {', '.join(explanation_parts)}. "
        explanation += f"Average attendance: {stats['avg_attendance_percentage']:.1f}%, "
        explanation += f"Average score: {stats['avg_score']:.1f}%, "
        explanation += f"Submission rate: {stats['avg_submission_rate']*100:.1f}%"
        
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
