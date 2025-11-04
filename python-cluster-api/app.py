from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

app = Flask(__name__)
CORS(app)

def cluster_records(records):
    df = pd.DataFrame(records)
    
    # Define features based on student behavior: grades, submissions, attendance
    # If submission_rate is not provided, calculate it or use a default
    if 'submission_rate' not in df.columns:
        # Try to calculate from available data or set default based on average_days_late
        # Students with low days_late likely have high submission rate
        df['submission_rate'] = df.get('average_days_late', pd.Series([0] * len(df)))
        df['submission_rate'] = (1 - (df['submission_rate'] / 10).clip(0, 1)).fillna(0.8)
    else:
        # Convert percentage to decimal if needed (e.g., 95 -> 0.95)
        df['submission_rate'] = pd.to_numeric(df['submission_rate'], errors='coerce')
        # If values are > 1, assume they're percentages and convert
        if df['submission_rate'].max() > 1:
            df['submission_rate'] = df['submission_rate'] / 100
    
    # Core behavior features: attendance, grades, submission timeliness, submission rate
    features = ['attendance_percentage', 'average_score', 'average_days_late', 'submission_rate']
    
    # Ensure numeric types
    for col in features:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    # Fill missing submission_rate with reasonable defaults based on other behavior
    if df['submission_rate'].isna().any():
        mask = df['submission_rate'].isna()
        # Estimate submission rate: high attendance + low days late = high submission rate
        df.loc[mask, 'submission_rate'] = (
            (df.loc[mask, 'attendance_percentage'] / 100) * 0.9 + 
            (1 - (df.loc[mask, 'average_days_late'] / 10).clip(0, 1)) * 0.1
        ).clip(0, 1).fillna(0.8)

    df_clean = df.dropna(subset=['attendance_percentage', 'average_score', 'average_days_late']).copy()
    
    # Fill any remaining NaN in submission_rate
    df_clean['submission_rate'] = df_clean['submission_rate'].fillna(0.8)
    
    if len(df_clean) == 0:
        output = df.copy()
        output['cluster'] = None
        output['cluster_label'] = None
        return output.to_dict(orient='records')

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

    output = df.merge(df_clean[['student_id', 'cluster', 'cluster_label']], on='student_id', how='left')
    
    # Convert NaN to None (null in JSON) for proper serialization
    result = output.to_dict(orient='records')
    for record in result:
        # Handle NaN values in cluster_label
        if pd.isna(record.get('cluster_label')):
            record['cluster_label'] = None
        # Ensure cluster_label is a string if it exists
        elif record.get('cluster_label') is not None:
            record['cluster_label'] = str(record['cluster_label'])
    
    return result


@app.route("/api/cluster", methods=["POST"])
def cluster_students():
    print('🔍 [Python API] Received clustering request')
    data = request.get_json()
    print(f'📦 [Python API] Received {len(data)} students')
    results = cluster_records(data)

    # Log cluster distribution for visibility
    df_results = pd.DataFrame(results)
    if 'cluster_label' in df_results.columns:
        cluster_counts = df_results['cluster_label'].fillna('Not Clustered').value_counts().to_dict()
        print(f'📈 [Python API] Cluster distribution: {cluster_counts}')
    print(f'🚀 [Python API] Returning {len(results)} results')
    return jsonify(results)

@app.route("/", methods=["GET"])
def health():
    return "KMeans Clustering API is running!"

if __name__ == "__main__":
    import os
    port = int(os.environ.get('PORT', 10000))
    app.run(host="0.0.0.0", port=port, debug=True)
