from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

app = Flask(__name__)
CORS(app)

@app.route("/api/cluster", methods=["POST"])
def cluster_students():
    print('🔍 [Python API] Received clustering request')
    data = request.get_json()
    print(f'📦 [Python API] Received {len(data)} students')
    
    df = pd.DataFrame(data)
    features = ['attendance_percentage', 'average_score', 'average_days_late']
    # Ensure numeric types
    for col in features:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    df_clean = df.dropna(subset=features).copy()
    print(f'✅ [Python API] {len(df_clean)} students have valid features')

    # Handle small datasets safely
    if len(df_clean) == 0:
        print('⚠️  [Python API] No valid students to cluster; returning original data')
        output = df.copy()
        output['cluster'] = None
        output['cluster_label'] = None
        return jsonify(output.to_dict(orient='records'))

    n_clusters_requested = 3
    n_clusters = min(n_clusters_requested, len(df_clean))
    if n_clusters < 1:
        n_clusters = 1

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(df_clean[features])
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto')
    clusters = kmeans.fit_predict(X_scaled)
    df_clean.loc[:, 'cluster'] = clusters
    cluster_labels = {0: "Needs Guidance", 1: "On Track", 2: "Excellent"}
    df_clean.loc[:, 'cluster_label'] = df_clean['cluster'].map(cluster_labels).fillna(df_clean['cluster'].astype(str))
    
    # Log cluster distribution
    cluster_counts = df_clean['cluster_label'].value_counts().to_dict()
    print(f'📈 [Python API] Cluster distribution: {cluster_counts}')
    
    output = df.merge(df_clean[['student_id', 'cluster', 'cluster_label']], on='student_id', how='left')
    print(f'🚀 [Python API] Returning {len(output)} results')
    return jsonify(output.to_dict(orient='records'))

@app.route("/", methods=["GET"])
def health():
    return "KMeans Clustering API is running!"

if __name__ == "__main__":
    import os
    port = int(os.environ.get('PORT', 10000))
    app.run(host="0.0.0.0", port=port, debug=True)
