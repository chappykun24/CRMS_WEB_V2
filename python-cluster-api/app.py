from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

app = Flask(__name__)
CORS(app)

@app.route("/api/cluster", methods=["POST"])
def cluster_students():
    data = request.get_json()
    df = pd.DataFrame(data)
    features = ['attendance_percentage', 'average_score', 'average_days_late']
    df_clean = df.dropna(subset=features)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(df_clean[features])
    n_clusters = 3
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    clusters = kmeans.fit_predict(X_scaled)
    df_clean['cluster'] = clusters
    cluster_labels = {0: "Needs Guidance", 1: "On Track", 2: "Excellent"}
    df_clean['cluster_label'] = df_clean['cluster'].map(cluster_labels).fillna(df_clean['cluster'].astype(str))
    output = df.merge(df_clean[['student_id', 'cluster', 'cluster_label']], on='student_id', how='left')
    return jsonify(output.to_dict(orient='records'))

@app.route("/", methods=["GET"])
def health():
    return "KMeans Clustering API is running!"

if __name__ == "__main__":
    import os
    port = int(os.environ.get('PORT', 10000))
    app.run(host="0.0.0.0", port=port, debug=True)
