from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import os
import sys

app = Flask(__name__)
CORS(app)

# Log startup
print("🚀 [Python API] Starting KMeans Clustering API...")
print(f"📦 [Python API] Python version: {sys.version}")
print(f"🌐 [Python API] Port: {os.environ.get('PORT', '10000')}")

def cluster_records(records):
    df = pd.DataFrame(records)
    
    # Ensure student_id is integer for consistent merging
    if 'student_id' in df.columns:
        df['student_id'] = pd.to_numeric(df['student_id'], errors='coerce').astype('Int64')
    
    # Define features based on student behavior: grades, submissions, attendance
    # If submission_rate is not provided, calculate it or use a default
    if 'submission_rate' not in df.columns:
        # Calculate from average_days_late: lower days late = higher submission rate
        df['submission_rate'] = (1 - (df['average_days_late'].fillna(3) / 10).clip(0, 1)).fillna(0.8)
    else:
        # Convert percentage to decimal if needed (e.g., 95 -> 0.95)
        df['submission_rate'] = pd.to_numeric(df['submission_rate'], errors='coerce')
        # Check if values are percentages (0-100) or decimals (0-1)
        max_rate = df['submission_rate'].max()
        if not pd.isna(max_rate):
            if max_rate > 1 and max_rate <= 100:
               
           
            elif max_rate > 100:
                # Invalid values, recalculate from days late
                print('⚠️ WARNING: Invalid submission_rate values detected. Recalculating from average_days_late.')
                df['submission_rate'] = (1 - (df['average_days_late'].fillna(3) / 10).clip(0, 1)).fillna(0.8)
        # If max_rate <= 1, values are already in decimal form (0-1), use as-is
    
    # Core behavior features: attendance, grades, submission timeliness, submission rate
    features = ['attendance_percentage', 'average_score', 'average_days_late', 'submission_rate']
    
    # Ensure numeric types
    for col in features:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    # Fill missing submission_rate with reasonable defaults based on other behavior
    if df['submission_rate'].isna().any():
        mask = df['submission_rate'].isna()
        # Estimate submission rate from attendance and days late
        # Higher attendance + lower days late = higher submission rate
        estimated_rate = (
            (df.loc[mask, 'attendance_percentage'].fillna(75) / 100) * 0.7 +  # 70% weight on attendance
            (1 - (df.loc[mask, 'average_days_late'].fillna(3) / 10).clip(0, 1)) * 0.3  # 30% weight on timeliness
        ).clip(0.5, 1.0)  # Ensure between 50% and 100%
        df.loc[mask, 'submission_rate'] = estimated_rate.fillna(0.8)

    # Fill missing values with defaults instead of dropping students
    # This ensures all students get clustered, even with incomplete data
    df_clean = df.copy()
    
    # Ensure all values are numeric first (handle any remaining edge cases)
    for col in features:
        df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')
    
    # Fill null values with reasonable defaults based on typical student behavior
    # These defaults are more realistic and prevent all students from clustering together
    df_clean['attendance_percentage'] = df_clean['attendance_percentage'].fillna(75.0)  # Default to 75% (typical attendance)
    df_clean['average_score'] = df_clean['average_score'].fillna(50.0)  # Default to 50 (average score, NOT 0!)
    df_clean['average_days_late'] = df_clean['average_days_late'].fillna(3.0)  # Default to 3 days (typical delay)
    df_clean['submission_rate'] = df_clean['submission_rate'].fillna(0.8)  # Default to 80% (typical submission rate)
    
    if len(df_clean) == 0:
        output = df.copy()
        output['cluster'] = None
        output['cluster_label'] = None
        return output.to_dict(orient='records')

    # Check data variation to detect potential issues before clustering
    attendance_range = df_clean['attendance_percentage'].max() - df_clean['attendance_percentage'].min()
    score_range = df_clean['average_score'].max() - df_clean['average_score'].min()
    days_late_range = df_clean['average_days_late'].max() - df_clean['average_days_late'].min()
    submission_range = df_clean['submission_rate'].max() - df_clean['submission_rate'].min()
    
    print(f'📊 [Python API] Data variation check:')
    print(f'  Attendance range: {attendance_range:.2f}%')
    print(f'  Score range: {score_range:.2f}')
    print(f'  Days late range: {days_late_range:.2f}')
    print(f'  Submission rate range: {submission_range:.2f}')
    
    # Warn if variation is too low (may cause clustering issues)
    if attendance_range < 10:
        print(f'⚠️ WARNING: Low attendance variation ({attendance_range:.2f}%). Clustering may not distinguish students well.')
    if score_range < 10:
        print(f'⚠️ WARNING: Low score variation ({score_range:.2f}). Clustering may not distinguish students well.')
    if days_late_range < 1:
        print(f'⚠️ WARNING: Low days late variation ({days_late_range:.2f}). Clustering may not distinguish students well.')

    n_clusters_requested = 4  # More clusters for better behavior differentiation
    n_clusters = min(n_clusters_requested, len(df_clean))
    if n_clusters < 1:
        n_clusters = 1

    # Scale features for clustering
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(df_clean[features])
    
    # Perform KMeans clustering
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto')
    clusters = kmeans.fit_predict(X_scaled)
    df_clean.loc[:, 'cluster'] = clusters
    
    # Calculate cluster centroids to determine behavior patterns
    cluster_stats = {}
    for cluster_id in range(n_clusters):
        cluster_data = df_clean[df_clean['cluster'] == cluster_id]
        cluster_stats[cluster_id] = {
            'avg_attendance': cluster_data['attendance_percentage'].mean(),
            'avg_score': cluster_data['average_score'].mean(),
            'avg_days_late': cluster_data['average_days_late'].mean(),
            'avg_submission_rate': cluster_data['submission_rate'].mean()
        }
    
    # Assign labels based on behavior patterns
    # Sort clusters by overall performance (weighted combination)
    cluster_scores = {}
    for cluster_id, stats in cluster_stats.items():
        # Weighted score: attendance (30%), grades (30%), submission rate (25%), timeliness (15%)
        score = (
            stats['avg_attendance'] * 0.30 +
            stats['avg_score'] * 0.30 +
            stats['avg_submission_rate'] * 100 * 0.25 +
            (100 - stats['avg_days_late'] * 10) * 0.15  # Lower days late = higher score
        )
        cluster_scores[cluster_id] = score
    
    # Sort clusters by score and assign labels
    sorted_clusters = sorted(cluster_scores.items(), key=lambda x: x[1], reverse=True)
    
    # Define behavior-based labels
    if n_clusters >= 4:
        labels = {
            sorted_clusters[0][0]: "Excellent Performance",  # High in all metrics
            sorted_clusters[1][0]: "On Track",  # Good performance
            sorted_clusters[2][0]: "Needs Improvement",  # Moderate performance
            sorted_clusters[3][0]: "At Risk"  # Low performance across metrics
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
    
    # Validate cluster distribution to detect issues
    cluster_counts = df_clean['cluster_label'].value_counts()
    total_students = len(df_clean)
    max_cluster_ratio = cluster_counts.max() / total_students if total_students > 0 else 0
    
    print(f'📈 [Python API] Cluster distribution:')
    for label, count in cluster_counts.items():
        percentage = (count / total_students) * 100
        print(f'  {label}: {count} students ({percentage:.1f}%)')
    
    # Check for clustering issues
    if max_cluster_ratio > 0.8:
        print(f'⚠️ WARNING: One cluster contains {max_cluster_ratio*100:.1f}% of students. This may indicate a clustering issue.')
    if len(cluster_counts) == 1:
        print(f'⚠️ WARNING: All students are in the same cluster ({cluster_counts.index[0]}). This suggests a data quality issue.')
        print('  Possible causes:')
        print('    - All students have similar metrics')
        print('    - Missing data replaced with same default values')
        print('    - Data not properly normalized')

    # Ensure student_id types match for merge (both should be Int64)
    df['student_id'] = pd.to_numeric(df['student_id'], errors='coerce').astype('Int64')
    df_clean['student_id'] = pd.to_numeric(df_clean['student_id'], errors='coerce').astype('Int64')
    
    output = df.merge(df_clean[['student_id', 'cluster', 'cluster_label']], on='student_id', how='left')
    
    # Convert NaN to None (null in JSON) for proper serialization
    result = output.to_dict(orient='records')
    
    clustered_count = 0
    for record in result:
        # Handle NaN values in ALL fields (pandas may leave NaN in numeric fields)
        for key, value in record.items():
            if pd.isna(value):
                record[key] = None
        
        # Ensure cluster_label is a string if it exists
        if record.get('cluster_label') is not None:
            record['cluster_label'] = str(record['cluster_label'])
            clustered_count += 1
    
    print(f'📊 [Python API] Clustering summary: {clustered_count} students with cluster_label, {len(result) - clustered_count} without')
    
    return result


@app.route("/api/cluster", methods=["POST", "OPTIONS"])
def cluster_students():
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
        print(f'📋 [Python API] Sample input: student_id={sample.get("student_id")}, '
              f'attendance={sample.get("attendance_percentage")}, '
              f'score={sample.get("average_score")}, '
              f'days_late={sample.get("average_days_late")}, '
              f'submission_rate={sample.get("submission_rate")}')
    
    results = cluster_records(data)
    
    # Log how many got clustered
    clustered_count = sum(1 for r in results if r.get('cluster_label') and r.get('cluster_label') != 'Not Clustered')
    print(f'✅ [Python API] Successfully clustered {clustered_count} out of {len(results)} students')

    # Log cluster distribution for visibility
    df_results = pd.DataFrame(results)
    if 'cluster_label' in df_results.columns:
        cluster_counts = df_results['cluster_label'].fillna('Not Clustered').value_counts().to_dict()
        print(f'📈 [Python API] Cluster distribution: {cluster_counts}')
    
    # Log sample result for debugging
    if len(results) > 0:
        sample = results[0]
        print(f'📋 [Python API] Sample result: student_id={sample.get("student_id")}, cluster_label={sample.get("cluster_label")}')
    
    print(f'🚀 [Python API] Returning {len(results)} results')
    
    # Final pass: ensure no NaN values remain (JSON doesn't support NaN)
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
        "service": "KMeans Clustering API",
        "version": "1.0"
    }), 200

@app.route("/health", methods=["GET"])
def health_check():
    """Alternative healthcheck endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "KMeans Clustering API",
        "version": "1.0"
    }), 200

if __name__ == "__main__":
    import os
    port = int(os.environ.get('PORT', 10000))
    app.run(host="0.0.0.0", port=port, debug=True)
