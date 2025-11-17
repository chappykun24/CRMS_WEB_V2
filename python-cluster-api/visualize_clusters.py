"""
Clustering Visualization Script
Visualizes K-Means clustering results with pandas and matplotlib
Shows cluster separation, Silhouette scores, and feature distributions
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score, silhouette_samples
import json
import sys
import os

# Set style for better visualizations
try:
    plt.style.use('seaborn-v0_8-darkgrid')
except OSError:
    try:
        plt.style.use('seaborn-darkgrid')
    except OSError:
        plt.style.use('default')
sns.set_palette("husl")

def load_clustering_data_from_json(json_file=None, json_data=None):
    """
    Load clustering data from JSON file or JSON string/data.
    
    Args:
        json_file: Path to JSON file with clustering results
        json_data: Direct JSON data (dict or list)
    
    Returns:
        DataFrame with clustering results
    """
    if json_data is not None:
        if isinstance(json_data, str):
            data = json.loads(json_data)
        else:
            data = json_data
    elif json_file:
        with open(json_file, 'r') as f:
            data = json.load(f)
    else:
        raise ValueError("Either json_file or json_data must be provided")
    
    df = pd.DataFrame(data)
    return df


def create_sample_data(n_students=100):
    """
    Create sample student data for demonstration.
    Generates realistic student performance data with clear clusters.
    
    Args:
        n_students: Number of students to generate
    
    Returns:
        DataFrame with sample student data
    """
    np.random.seed(42)
    
    # Create 3 distinct clusters
    n_cluster1 = n_students // 3
    n_cluster2 = n_students // 3
    n_cluster3 = n_students - n_cluster1 - n_cluster2
    
    data = []
    
    # Cluster 1: Excellent Performance
    for i in range(n_cluster1):
        data.append({
            'student_id': i + 1,
            'final_score': np.random.normal(88, 5),
            'attendance_percentage': np.random.normal(95, 3),
            'submission_ontime_priority_score': np.random.normal(90, 5),
            'submission_quality_score': np.random.normal(1.8, 0.2),
            'attendance_present_rate': np.random.normal(0.95, 0.03),
            'submission_rate': np.random.normal(0.95, 0.05),
        })
    
    # Cluster 2: Average Performance
    for i in range(n_cluster2):
        data.append({
            'student_id': n_cluster1 + i + 1,
            'final_score': np.random.normal(72, 5),
            'attendance_percentage': np.random.normal(80, 5),
            'submission_ontime_priority_score': np.random.normal(65, 8),
            'submission_quality_score': np.random.normal(1.3, 0.3),
            'attendance_present_rate': np.random.normal(0.80, 0.05),
            'submission_rate': np.random.normal(0.85, 0.08),
        })
    
    # Cluster 3: Needs Improvement
    for i in range(n_cluster3):
        data.append({
            'student_id': n_cluster1 + n_cluster2 + i + 1,
            'final_score': np.random.normal(58, 6),
            'attendance_percentage': np.random.normal(65, 8),
            'submission_ontime_priority_score': np.random.normal(45, 10),
            'submission_quality_score': np.random.normal(0.9, 0.3),
            'attendance_present_rate': np.random.normal(0.65, 0.08),
            'submission_rate': np.random.normal(0.70, 0.10),
        })
    
    df = pd.DataFrame(data)
    
    # Clip values to valid ranges
    df['final_score'] = df['final_score'].clip(0, 100)
    df['attendance_percentage'] = df['attendance_percentage'].clip(0, 100)
    df['submission_ontime_priority_score'] = df['submission_ontime_priority_score'].clip(0, 100)
    df['submission_quality_score'] = df['submission_quality_score'].clip(0, 2)
    df['attendance_present_rate'] = df['attendance_present_rate'].clip(0, 1)
    df['submission_rate'] = df['submission_rate'].clip(0, 1)
    
    return df


def visualize_clusters_2d(df, features=None, cluster_col='cluster', save_path=None):
    """
    Visualize clusters in 2D using PCA or feature pairs.
    
    Args:
        df: DataFrame with clustering results
        features: List of feature columns to use (if None, uses all numeric features)
        cluster_col: Column name for cluster assignments
        save_path: Path to save the figure (optional)
    """
    if features is None:
        # Use the optimized feature set
        features = [
            'final_score',
            'attendance_percentage',
            'submission_ontime_priority_score',
            'submission_quality_score',
            'attendance_present_rate',
            'submission_rate'
        ]
        # Only use features that exist in dataframe
        features = [f for f in features if f in df.columns]
    
    # Prepare data
    X = df[features].copy()
    X = X.fillna(X.mean())  # Fill missing values
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Apply PCA to reduce to 2D
    pca = PCA(n_components=2, random_state=42)
    X_2d = pca.fit_transform(X_scaled)
    
    # Create figure with subplots
    fig, axes = plt.subplots(1, 2, figsize=(16, 6))
    
    # Plot 1: PCA 2D visualization
    ax1 = axes[0]
    if cluster_col in df.columns:
        clusters = df[cluster_col].values
        unique_clusters = sorted(df[cluster_col].dropna().unique())
        colors = plt.cm.Set3(np.linspace(0, 1, len(unique_clusters)))
        
        for i, cluster_id in enumerate(unique_clusters):
            mask = clusters == cluster_id
            cluster_label = df[df[cluster_col] == cluster_id]['cluster_label'].iloc[0] if 'cluster_label' in df.columns else f'Cluster {cluster_id}'
            ax1.scatter(X_2d[mask, 0], X_2d[mask, 1], 
                       c=[colors[i]], label=cluster_label, 
                       alpha=0.6, s=100, edgecolors='black', linewidth=1.5)
    else:
        ax1.scatter(X_2d[:, 0], X_2d[:, 1], alpha=0.6, s=100)
    
    ax1.set_xlabel(f'First Principal Component (Explained Variance: {pca.explained_variance_ratio_[0]:.2%})', fontsize=11)
    ax1.set_ylabel(f'Second Principal Component (Explained Variance: {pca.explained_variance_ratio_[1]:.2%})', fontsize=11)
    ax1.set_title('K-Means Clustering Visualization (PCA 2D)', fontsize=14, fontweight='bold')
    ax1.legend(loc='best', frameon=True, shadow=True)
    ax1.grid(True, alpha=0.3)
    
    # Plot 2: Feature pair visualization (Score vs Attendance)
    ax2 = axes[1]
    if 'final_score' in df.columns and 'attendance_percentage' in df.columns:
        if cluster_col in df.columns:
            clusters = df[cluster_col].values
            unique_clusters = sorted(df[cluster_col].dropna().unique())
            colors = plt.cm.Set3(np.linspace(0, 1, len(unique_clusters)))
            
            for i, cluster_id in enumerate(unique_clusters):
                mask = clusters == cluster_id
                cluster_label = df[df[cluster_col] == cluster_id]['cluster_label'].iloc[0] if 'cluster_label' in df.columns else f'Cluster {cluster_id}'
                ax2.scatter(df.loc[mask, 'final_score'], 
                           df.loc[mask, 'attendance_percentage'],
                           c=[colors[i]], label=cluster_label,
                           alpha=0.6, s=100, edgecolors='black', linewidth=1.5)
        else:
            ax2.scatter(df['final_score'], df['attendance_percentage'], 
                       alpha=0.6, s=100)
        
        ax2.set_xlabel('Final Score', fontsize=11)
        ax2.set_ylabel('Attendance Percentage', fontsize=11)
        ax2.set_title('Score vs Attendance (Feature Pair)', fontsize=14, fontweight='bold')
        ax2.legend(loc='best', frameon=True, shadow=True)
        ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"[OK] Saved visualization to {save_path}")
    plt.show()


def visualize_silhouette_analysis(df, features=None, cluster_col='cluster', save_path=None):
    """
    Visualize Silhouette analysis for cluster quality assessment.
    
    Args:
        df: DataFrame with clustering results
        features: List of feature columns
        cluster_col: Column name for cluster assignments
        save_path: Path to save the figure (optional)
    """
    if cluster_col not in df.columns:
        print("⚠️ No cluster column found. Skipping Silhouette analysis.")
        return
    
    if features is None:
        features = [
            'final_score',
            'attendance_percentage',
            'submission_ontime_priority_score',
            'submission_quality_score',
            'attendance_present_rate',
            'submission_rate'
        ]
        features = [f for f in features if f in df.columns]
    
    # Prepare data
    X = df[features].copy()
    X = X.fillna(X.mean())
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Get cluster labels
    clusters = df[cluster_col].values
    unique_clusters = sorted(df[cluster_col].dropna().unique())
    n_clusters = len(unique_clusters)
    
    if n_clusters < 2:
        print("⚠️ Need at least 2 clusters for Silhouette analysis.")
        return
    
    # Calculate Silhouette scores
    silhouette_avg = silhouette_score(X_scaled, clusters)
    sample_silhouette_values = silhouette_samples(X_scaled, clusters)
    
    # Get overall Silhouette score from dataframe if available
    if 'silhouette_score' in df.columns:
        df_silhouette = df['silhouette_score'].dropna()
        if len(df_silhouette) > 0:
            silhouette_avg = df_silhouette.iloc[0]
    
    # Create figure
    fig, ax = plt.subplots(figsize=(12, 8))
    
    y_lower = 10
    colors = plt.cm.Set3(np.linspace(0, 1, n_clusters))
    
    for i, cluster_id in enumerate(unique_clusters):
        # Get Silhouette scores for this cluster
        ith_cluster_silhouette_values = sample_silhouette_values[clusters == cluster_id]
        ith_cluster_silhouette_values.sort()
        
        size_cluster_i = ith_cluster_silhouette_values.shape[0]
        y_upper = y_lower + size_cluster_i
        
        cluster_label = df[df[cluster_col] == cluster_id]['cluster_label'].iloc[0] if 'cluster_label' in df.columns else f'Cluster {cluster_id}'
        
        color = colors[i]
        ax.fill_betweenx(np.arange(y_lower, y_upper),
                         0, ith_cluster_silhouette_values,
                         facecolor=color, edgecolor=color, alpha=0.7)
        ax.text(-0.05, y_lower + 0.5 * size_cluster_i, cluster_label)
        
        y_lower = y_upper + 10
    
    ax.set_xlabel('Silhouette Coefficient Values', fontsize=12)
    ax.set_ylabel('Cluster Label', fontsize=12)
    ax.set_title(f'Silhouette Analysis for K-Means Clustering\n(Average Silhouette Score: {silhouette_avg:.4f})', 
                 fontsize=14, fontweight='bold')
    
    # Add vertical line for average score
    ax.axvline(x=silhouette_avg, color="red", linestyle="--", linewidth=2, 
               label=f'Average Score: {silhouette_avg:.4f}')
    
    # Add quality indicators
    if silhouette_avg >= 0.5:
        quality = "Excellent"
        color = "green"
    elif silhouette_avg >= 0.3:
        quality = "Good"
        color = "blue"
    elif silhouette_avg >= 0.1:
        quality = "Fair"
        color = "orange"
    else:
        quality = "Poor"
        color = "red"
    
    ax.text(0.02, 0.95, f'Quality: {quality}', transform=ax.transAxes,
            fontsize=14, fontweight='bold', color=color,
            bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
    
    ax.set_yticks([])
    ax.set_xlim([-0.1, 1])
    ax.legend(loc='upper right')
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"[OK] Saved Silhouette analysis to {save_path}")
    plt.show()


def visualize_cluster_statistics(df, cluster_col='cluster', save_path=None):
    """
    Visualize cluster statistics and distributions.
    
    Args:
        df: DataFrame with clustering results
        cluster_col: Column name for cluster assignments
        save_path: Path to save the figure (optional)
    """
    if cluster_col not in df.columns:
        print("⚠️ No cluster column found.")
        return
    
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    
    # Plot 1: Cluster distribution (bar chart)
    ax1 = axes[0, 0]
    cluster_counts = df[cluster_col].value_counts().sort_index()
    if 'cluster_label' in df.columns:
        labels = [df[df[cluster_col] == cid]['cluster_label'].iloc[0] if len(df[df[cluster_col] == cid]) > 0 else f'Cluster {cid}' 
                 for cid in cluster_counts.index]
    else:
        labels = [f'Cluster {cid}' for cid in cluster_counts.index]
    
    colors = plt.cm.Set3(np.linspace(0, 1, len(cluster_counts)))
    bars = ax1.bar(range(len(cluster_counts)), cluster_counts.values, color=colors, edgecolor='black', linewidth=1.5)
    ax1.set_xticks(range(len(cluster_counts)))
    ax1.set_xticklabels(labels, rotation=45, ha='right')
    ax1.set_ylabel('Number of Students', fontsize=11)
    ax1.set_title('Cluster Distribution', fontsize=14, fontweight='bold')
    ax1.grid(True, alpha=0.3, axis='y')
    
    # Add value labels on bars
    for bar in bars:
        height = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width()/2., height,
                f'{int(height)}',
                ha='center', va='bottom', fontweight='bold')
    
    # Plot 2: Feature comparison by cluster (box plot)
    ax2 = axes[0, 1]
    if 'final_score' in df.columns:
        cluster_data = [df[df[cluster_col] == cid]['final_score'].values 
                       for cid in sorted(df[cluster_col].dropna().unique())]
        bp = ax2.boxplot(cluster_data, labels=labels, patch_artist=True)
        for patch, color in zip(bp['boxes'], colors):
            patch.set_facecolor(color)
            patch.set_alpha(0.7)
        ax2.set_ylabel('Final Score', fontsize=11)
        ax2.set_title('Score Distribution by Cluster', fontsize=14, fontweight='bold')
        ax2.grid(True, alpha=0.3, axis='y')
        ax2.tick_params(axis='x', rotation=45)
    
    # Plot 3: Average metrics by cluster (heatmap)
    ax3 = axes[1, 0]
    numeric_features = ['final_score', 'attendance_percentage', 'submission_ontime_priority_score', 
                       'submission_quality_score', 'attendance_present_rate', 'submission_rate']
    numeric_features = [f for f in numeric_features if f in df.columns]
    
    if numeric_features:
        cluster_stats = df.groupby(cluster_col)[numeric_features].mean()
        if 'cluster_label' in df.columns:
            cluster_stats.index = [df[df[cluster_col] == cid]['cluster_label'].iloc[0] 
                                  if len(df[df[cluster_col] == cid]) > 0 else f'Cluster {cid}'
                                  for cid in cluster_stats.index]
        
        # Normalize for heatmap (0-1 scale)
        cluster_stats_norm = (cluster_stats - cluster_stats.min()) / (cluster_stats.max() - cluster_stats.min())
        
        sns.heatmap(cluster_stats_norm.T, annot=True, fmt='.2f', cmap='YlOrRd', 
                   ax=ax3, cbar_kws={'label': 'Normalized Value'})
        ax3.set_title('Average Metrics by Cluster (Normalized)', fontsize=14, fontweight='bold')
        ax3.set_xlabel('Cluster', fontsize=11)
        ax3.set_ylabel('Feature', fontsize=11)
        ax3.tick_params(axis='x', rotation=45)
    
    # Plot 4: Silhouette score display
    ax4 = axes[1, 1]
    if 'silhouette_score' in df.columns:
        silhouette_avg = df['silhouette_score'].dropna().iloc[0] if len(df['silhouette_score'].dropna()) > 0 else None
    else:
        silhouette_avg = None
    
    if silhouette_avg is not None:
        # Create a visual gauge for Silhouette score
        ax4.axis('off')
        
        # Determine quality and color
        if silhouette_avg >= 0.5:
            quality = "Excellent"
            color = "green"
            percentage = ((silhouette_avg - 0.5) / 0.5) * 100  # 0.5-1.0 range
        elif silhouette_avg >= 0.3:
            quality = "Good"
            color = "blue"
            percentage = ((silhouette_avg - 0.3) / 0.2) * 100  # 0.3-0.5 range
        elif silhouette_avg >= 0.1:
            quality = "Fair"
            color = "orange"
            percentage = ((silhouette_avg - 0.1) / 0.2) * 100  # 0.1-0.3 range
        else:
            quality = "Poor"
            color = "red"
            percentage = (silhouette_avg / 0.1) * 100  # 0.0-0.1 range
        
        # Display score
        ax4.text(0.5, 0.7, f'{silhouette_avg:.4f}', 
                transform=ax4.transAxes, fontsize=36, fontweight='bold',
                ha='center', color=color)
        ax4.text(0.5, 0.5, 'Silhouette Score', 
                transform=ax4.transAxes, fontsize=16, ha='center')
        ax4.text(0.5, 0.35, f'Quality: {quality}', 
                transform=ax4.transAxes, fontsize=18, fontweight='bold',
                ha='center', color=color)
        
        # Add interpretation
        interpretation = ""
        if silhouette_avg >= 0.5:
            interpretation = "Well-separated clusters"
        elif silhouette_avg >= 0.3:
            interpretation = "Reasonably separated"
        elif silhouette_avg >= 0.1:
            interpretation = "Some overlap"
        else:
            interpretation = "Significant overlap"
        
        ax4.text(0.5, 0.2, interpretation, 
                transform=ax4.transAxes, fontsize=12, ha='center', style='italic')
    else:
        ax4.text(0.5, 0.5, 'Silhouette Score\nNot Available', 
                transform=ax4.transAxes, fontsize=16, ha='center', va='center')
    
    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"[OK] Saved cluster statistics to {save_path}")
    plt.show()


def main():
    """
    Main function to run visualizations.
    Can load from JSON file, JSON data, or generate sample data.
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Visualize K-Means clustering results')
    parser.add_argument('--json-file', type=str, help='Path to JSON file with clustering results')
    parser.add_argument('--sample', action='store_true', help='Generate and visualize sample data')
    parser.add_argument('--n-students', type=int, default=100, help='Number of students for sample data')
    parser.add_argument('--save-dir', type=str, default='.', help='Directory to save visualizations')
    
    args = parser.parse_args()
    
    # Load or generate data
    if args.sample:
        print("[*] Generating sample student data...")
        df = create_sample_data(args.n_students)
        
        # Run clustering on sample data (simulate)
        from sklearn.cluster import KMeans
        features = ['final_score', 'attendance_percentage', 'submission_ontime_priority_score',
                   'submission_quality_score', 'attendance_present_rate', 'submission_rate']
        X = df[features].fillna(df[features].mean())
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        kmeans = KMeans(n_clusters=3, init='k-means++', n_init=10, random_state=42)
        df['cluster'] = kmeans.fit_predict(X_scaled)
        
        # Assign labels
        cluster_scores = df.groupby('cluster')[['final_score', 'attendance_percentage']].mean().sum(axis=1)
        sorted_clusters = cluster_scores.sort_values(ascending=False).index
        
        label_map = {
            sorted_clusters[0]: "Excellent Performance",
            sorted_clusters[1]: "Average Performance",
            sorted_clusters[2]: "Needs Improvement"
        }
        df['cluster_label'] = df['cluster'].map(label_map)
        
        # Calculate Silhouette score
        from sklearn.metrics import silhouette_score
        silhouette_avg = silhouette_score(X_scaled, df['cluster'])
        df['silhouette_score'] = silhouette_avg
        
        print(f"[OK] Generated {len(df)} students with {len(df['cluster'].unique())} clusters")
        print(f"[*] Silhouette Score: {silhouette_avg:.4f}")
        
    elif args.json_file:
        print(f"[*] Loading data from {args.json_file}...")
        df = load_clustering_data_from_json(json_file=args.json_file)
        print(f"[OK] Loaded {len(df)} records")
    else:
        print("[!] No data source specified. Use --sample or --json-file")
        print("   Example: python visualize_clusters.py --sample")
        return
    
    # Create visualizations
    print("\n[*] Creating visualizations...")
    
    # 1. 2D Cluster Visualization
    print("  1. Creating 2D cluster visualization...")
    visualize_clusters_2d(df, cluster_col='cluster', 
                        save_path=os.path.join(args.save_dir, 'clusters_2d.png') if args.save_dir else None)
    
    # 2. Silhouette Analysis
    print("  2. Creating Silhouette analysis...")
    visualize_silhouette_analysis(df, cluster_col='cluster',
                                  save_path=os.path.join(args.save_dir, 'silhouette_analysis.png') if args.save_dir else None)
    
    # 3. Cluster Statistics
    print("  3. Creating cluster statistics...")
    visualize_cluster_statistics(df, cluster_col='cluster',
                                save_path=os.path.join(args.save_dir, 'cluster_statistics.png') if args.save_dir else None)
    
    print("\n[OK] All visualizations complete!")


if __name__ == "__main__":
    main()

