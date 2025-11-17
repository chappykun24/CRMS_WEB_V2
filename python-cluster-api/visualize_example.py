"""
Quick Example: Visualize Clustering Results
Simple script to visualize clustering results from the API
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
import json

# Set style
plt.style.use('default')
sns.set_palette("husl")

# Example: Load clustering results (replace with your actual API response)
# You can get this from the backend API response or save it to a JSON file

# Sample data structure (what the API returns)
sample_clustering_results = [
    {
        "student_id": 1,
        "final_score": 85.5,
        "attendance_percentage": 92.0,
        "submission_ontime_priority_score": 88.0,
        "submission_quality_score": 1.8,
        "attendance_present_rate": 0.92,
        "submission_rate": 0.95,
        "cluster": 0,
        "cluster_label": "Excellent Performance",
        "silhouette_score": 0.6123
    },
    # ... more students
]

def visualize_clusters_simple(df):
    """
    Simple 2D visualization of clusters.
    """
    # Prepare features
    features = ['final_score', 'attendance_percentage', 'submission_ontime_priority_score',
               'submission_quality_score', 'attendance_present_rate', 'submission_rate']
    features = [f for f in features if f in df.columns]
    
    X = df[features].fillna(df[features].mean())
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # PCA to 2D
    pca = PCA(n_components=2, random_state=42)
    X_2d = pca.fit_transform(X_scaled)
    
    # Create visualization
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    
    # Plot 1: PCA 2D
    ax1 = axes[0]
    if 'cluster' in df.columns:
        clusters = df['cluster'].unique()
        colors = plt.cm.Set3(range(len(clusters)))
        
        for i, cluster_id in enumerate(clusters):
            mask = df['cluster'] == cluster_id
            label = df[mask]['cluster_label'].iloc[0] if 'cluster_label' in df.columns else f'Cluster {cluster_id}'
            ax1.scatter(X_2d[mask, 0], X_2d[mask, 1], 
                       c=[colors[i]], label=label, 
                       alpha=0.6, s=100, edgecolors='black', linewidth=1.5)
        ax1.legend()
    else:
        ax1.scatter(X_2d[:, 0], X_2d[:, 1], alpha=0.6, s=100)
    
    ax1.set_xlabel(f'PC1 ({pca.explained_variance_ratio_[0]:.1%} variance)')
    ax1.set_ylabel(f'PC2 ({pca.explained_variance_ratio_[1]:.1%} variance)')
    ax1.set_title('K-Means Clustering (PCA 2D)')
    ax1.grid(True, alpha=0.3)
    
    # Plot 2: Score vs Attendance
    ax2 = axes[1]
    if 'final_score' in df.columns and 'attendance_percentage' in df.columns:
        if 'cluster' in df.columns:
            clusters = df['cluster'].unique()
            colors = plt.cm.Set3(range(len(clusters)))
            
            for i, cluster_id in enumerate(clusters):
                mask = df['cluster'] == cluster_id
                label = df[mask]['cluster_label'].iloc[0] if 'cluster_label' in df.columns else f'Cluster {cluster_id}'
                ax2.scatter(df[mask]['final_score'], 
                           df[mask]['attendance_percentage'],
                           c=[colors[i]], label=label,
                           alpha=0.6, s=100, edgecolors='black', linewidth=1.5)
            ax2.legend()
        else:
            ax2.scatter(df['final_score'], df['attendance_percentage'], alpha=0.6, s=100)
        
        ax2.set_xlabel('Final Score')
        ax2.set_ylabel('Attendance Percentage')
        ax2.set_title('Score vs Attendance')
        ax2.grid(True, alpha=0.3)
    
    # Show Silhouette score
    if 'silhouette_score' in df.columns:
        silhouette_avg = df['silhouette_score'].dropna().iloc[0] if len(df['silhouette_score'].dropna()) > 0 else None
        if silhouette_avg:
            fig.suptitle(f'Clustering Visualization - Silhouette Score: {silhouette_avg:.4f}', 
                        fontsize=14, fontweight='bold')
    
    plt.tight_layout()
    plt.show()


# Example usage
if __name__ == "__main__":
    # Option 1: Load from JSON file (save API response to clustering_results.json)
    try:
        with open('clustering_results.json', 'r') as f:
            data = json.load(f)
        df = pd.DataFrame(data)
        print(f"✅ Loaded {len(df)} records from clustering_results.json")
    except FileNotFoundError:
        print("⚠️ clustering_results.json not found. Using sample data...")
        # Option 2: Use sample data
        df = pd.DataFrame(sample_clustering_results)
        print(f"📊 Using sample data: {len(df)} records")
    
    # Visualize
    print("\n🎨 Creating visualization...")
    visualize_clusters_simple(df)
    print("✅ Done!")

