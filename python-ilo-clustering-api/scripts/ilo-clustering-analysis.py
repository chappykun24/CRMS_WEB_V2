"""
ILO-Based Student Clustering Analysis
=====================================

This script performs clustering analysis on student metrics related to 
Intended Learning Outcomes (ILO) performance, filtered by:
- Student Outcomes (SO)
- Institutional Graduate Attributes (IGA)
- SDG Skills
- CDIO Skills

Features:
- Extracts student performance metrics from ILO assessments
- Calculates comprehensive metrics for clustering
- Uses Elbow Method to determine optimal number of clusters (k)
- Performs K-Means clustering
- Calculates Silhouette scores for cluster quality assessment

Usage:
    python ilo-clustering-analysis.py --section_course_id <id> [options]
    
    Options:
        --ilo_id <id>              Filter by specific ILO ID
        --so_id <id>               Filter by Student Outcome ID
        --iga_id <id>              Filter by IGA ID
        --sdg_id <id>              Filter by SDG ID
        --cdio_id <id>             Filter by CDIO ID
        --min_k <num>              Minimum k for elbow method (default: 2)
        --max_k <num>              Maximum k for elbow method (default: 10)
        --output_dir <path>        Output directory for results (default: ./clustering_results)
"""

import os
import sys
import argparse
import psycopg2
from psycopg2.extras import RealDictCursor
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score, silhouette_samples
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
load_dotenv('.env')
load_dotenv('../.env')
load_dotenv('../backend/.env')

# ============================================================================
# METRICS DEFINITION
# ============================================================================

"""
STUDENT METRICS FOR ILO-BASED CLUSTERING:

1. Overall Performance Metrics:
   - ilo_score: Total transmuted score across all assessments for the ILO
   - ilo_percentage: Overall attainment rate (weighted average percentage)
   
2. Engagement Metrics:
   - assessments_count: Number of completed assessments
   - assessment_completion_rate: Percentage of assessments completed
   
3. Performance Distribution Metrics:
   - assessment_scores: Individual scores for each assessment under the ILO
   - score_variance: Variance in performance across assessments
   - score_std: Standard deviation of assessment scores
   
4. Consistency Metrics:
   - score_range: Range between highest and lowest assessment scores
   - performance_trend: Trend indicator (improving/declining/stable)
   
5. Assessment-Specific Metrics:
   - Individual assessment percentages for each assessment mapped to the ILO
   - Weighted assessment contributions to overall ILO score
"""

# ============================================================================
# DATABASE CONNECTION
# ============================================================================

def get_db_connection():
    """Create and return database connection"""
    # Try DATABASE_URL first
    if os.getenv('DATABASE_URL'):
        return psycopg2.connect(
            os.getenv('DATABASE_URL'),
            sslmode='require'
        )
    
    # Copy VITE_ environment variables for compatibility
    env_vars = {}
    for key in ['NEON_HOST', 'NEON_DATABASE', 'NEON_USER', 'NEON_PASSWORD', 'NEON_PORT']:
        vite_key = f'VITE_{key}'
        if os.getenv(vite_key):
            env_vars[key] = os.getenv(vite_key)
        else:
            env_vars[key] = os.getenv(key)
    
    # Default credentials (if not set)
    default_config = {
        'host': 'ep-wild-paper-aeedio16-pooler.c-2.us-east-2.aws.neon.tech',
        'database': 'neondb',
        'user': 'neondb_owner',
        'password': 'npg_u7tYTRj2wcED',
        'port': 5432
    }
    
    config = {
        'host': env_vars.get('NEON_HOST') or default_config['host'],
        'database': env_vars.get('NEON_DATABASE') or default_config['database'],
        'user': env_vars.get('NEON_USER') or default_config['user'],
        'password': env_vars.get('NEON_PASSWORD') or default_config['password'],
        'port': int(env_vars.get('NEON_PORT') or default_config['port']),
        'sslmode': 'require'
    }
    
    print(f"📡 Connecting to database: {config['host']}/{config['database']}")
    
    return psycopg2.connect(**config)


# ============================================================================
# DATA EXTRACTION
# ============================================================================

def extract_student_metrics(conn, section_course_id, filters=None):
    """
    Extract student metrics for ILO-based clustering
    
    Returns:
        pandas.DataFrame with student metrics
    """
    if filters is None:
        filters = {}
    
    # Validate and extract filter IDs
    ilo_id = filters.get('ilo_id')
    so_id = filters.get('so_id')
    iga_id = filters.get('iga_id')
    sdg_id = filters.get('sdg_id')
    cdio_id = filters.get('cdio_id')
    
    # Validate all IDs are integers (security check)
    params = [section_course_id]
    param_index = 2  # Start from $2 (since we'll use $1 for section_course_id)
    
    # Build filter conditions with parameterized queries
    ilo_condition = ""
    if ilo_id:
        ilo_condition = f"AND i.ilo_id = ${param_index}"
        params.append(ilo_id)
        param_index += 1
    
    so_condition = ""
    if so_id:
        so_condition = f"""
        AND EXISTS (
            SELECT 1 FROM ilo_so_mappings ism 
            WHERE ism.ilo_id = i.ilo_id AND ism.so_id = ${param_index}
        )
        """
        params.append(so_id)
        param_index += 1
    
    iga_condition = ""
    if iga_id:
        iga_condition = f"""
        AND EXISTS (
            SELECT 1 FROM ilo_iga_mappings iiga 
            WHERE iiga.ilo_id = i.ilo_id AND iiga.iga_id = ${param_index}
        )
        """
        params.append(iga_id)
        param_index += 1
    
    sdg_condition = ""
    if sdg_id:
        sdg_condition = f"""
        AND EXISTS (
            SELECT 1 FROM ilo_sdg_mappings isdg 
            WHERE isdg.ilo_id = i.ilo_id AND isdg.sdg_id = ${param_index}
        )
        """
        params.append(sdg_id)
        param_index += 1
    
    cdio_condition = ""
    if cdio_id:
        cdio_condition = f"""
        AND EXISTS (
            SELECT 1 FROM ilo_cdio_mappings icdio 
            WHERE icdio.ilo_id = i.ilo_id AND icdio.cdio_id = ${param_index}
        )
        """
        params.append(cdio_id)
    
    query = f"""
    WITH assessment_ilo_connections AS (
        SELECT DISTINCT
            a.assessment_id,
            a.title AS assessment_title,
            a.total_points,
            a.weight_percentage,
            COALESCE(aiw.ilo_id, r.ilo_id) AS ilo_id,
            COALESCE(aiw.weight_percentage, a.weight_percentage, 0) AS ilo_weight_percentage
        FROM assessments a
        INNER JOIN section_courses sc ON a.section_course_id = sc.section_course_id
        INNER JOIN syllabi sy ON a.syllabus_id = sy.syllabus_id
        INNER JOIN ilos i ON i.syllabus_id = sy.syllabus_id AND i.is_active = TRUE
        LEFT JOIN assessment_ilo_weights aiw ON a.assessment_id = aiw.assessment_id AND aiw.ilo_id = i.ilo_id
        LEFT JOIN (
            SELECT DISTINCT r.assessment_id, r.ilo_id
            FROM rubrics r
            INNER JOIN assessments a2 ON r.assessment_id = a2.assessment_id
            WHERE a2.section_course_id = $1
        ) r ON a.assessment_id = r.assessment_id AND r.ilo_id = i.ilo_id
        WHERE a.section_course_id = $1
          AND sy.section_course_id = $1
          AND sy.review_status = 'approved'
          AND sy.approval_status = 'approved'
          AND a.weight_percentage IS NOT NULL
          AND a.weight_percentage > 0
          {ilo_condition}
          {so_condition}
          {iga_condition}
          {sdg_condition}
          {cdio_condition}
    ),
    student_assessment_scores AS (
        SELECT
            ce.student_id,
            s.student_number,
            s.full_name,
            aic.ilo_id,
            i.code AS ilo_code,
            i.description AS ilo_description,
            aic.assessment_id,
            aic.assessment_title,
            aic.total_points,
            aic.weight_percentage,
            aic.ilo_weight_percentage,
            CASE 
                WHEN sub.transmuted_score IS NOT NULL THEN sub.transmuted_score
                WHEN sub.adjusted_score IS NOT NULL AND aic.total_points > 0 AND aic.weight_percentage IS NOT NULL
                THEN ((sub.adjusted_score / aic.total_points) * 62.5 + 37.5) * (aic.weight_percentage / 100)
                WHEN sub.total_score IS NOT NULL AND aic.total_points > 0 AND aic.weight_percentage IS NOT NULL
                THEN ((sub.total_score / aic.total_points) * 62.5 + 37.5) * (aic.weight_percentage / 100)
                ELSE NULL
            END AS transmuted_score,
            CASE 
                WHEN sub.transmuted_score IS NOT NULL AND aic.total_points > 0 AND aic.weight_percentage > 0 THEN
                    ((sub.transmuted_score / (aic.weight_percentage / 100.0) - 37.5) / 62.5) * 100
                WHEN sub.adjusted_score IS NOT NULL AND aic.total_points > 0 THEN
                    (sub.adjusted_score / aic.total_points) * 100
                WHEN sub.total_score IS NOT NULL AND aic.total_points > 0 THEN
                    (sub.total_score / aic.total_points) * 100
                ELSE NULL
            END AS assessment_percentage
        FROM course_enrollments ce
        INNER JOIN students s ON ce.student_id = s.student_id
        INNER JOIN assessment_ilo_connections aic ON EXISTS (
            SELECT 1 FROM assessments a 
            WHERE a.assessment_id = aic.assessment_id 
            AND a.section_course_id = ce.section_course_id
        )
        INNER JOIN ilos i ON aic.ilo_id = i.ilo_id
        INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
        LEFT JOIN submissions sub ON (
            ce.enrollment_id = sub.enrollment_id 
            AND sub.assessment_id = aic.assessment_id
            AND (sub.transmuted_score IS NOT NULL OR sub.adjusted_score IS NOT NULL OR sub.total_score IS NOT NULL)
        )
        WHERE ce.section_course_id = $1
          AND ce.status = 'enrolled'
          AND sy.section_course_id = $1
          AND i.is_active = TRUE
    ),
    student_metrics AS (
        SELECT
            student_id,
            student_number,
            full_name,
            ilo_id,
            ilo_code,
            ilo_description,
            -- Overall performance metrics
            COALESCE(SUM(transmuted_score) FILTER (WHERE transmuted_score IS NOT NULL), 0) AS ilo_score,
            COALESCE(
                SUM(assessment_percentage * COALESCE(ilo_weight_percentage, weight_percentage)) 
                    FILTER (WHERE assessment_percentage IS NOT NULL) /
                NULLIF(
                    SUM(COALESCE(ilo_weight_percentage, weight_percentage)) 
                        FILTER (WHERE assessment_percentage IS NOT NULL),
                    0
                ),
                0
            ) AS ilo_percentage,
            -- Engagement metrics
            COUNT(DISTINCT assessment_id) FILTER (
                WHERE transmuted_score IS NOT NULL OR assessment_percentage IS NOT NULL
            ) AS assessments_completed,
            COUNT(DISTINCT assessment_id) AS total_assessments,
            -- Performance distribution metrics
            COALESCE(STDDEV(assessment_percentage) FILTER (WHERE assessment_percentage IS NOT NULL), 0) AS score_std,
            COALESCE(VARIANCE(assessment_percentage) FILTER (WHERE assessment_percentage IS NOT NULL), 0) AS score_variance,
            COALESCE(MAX(assessment_percentage) FILTER (WHERE assessment_percentage IS NOT NULL), 0) AS max_score,
            COALESCE(MIN(assessment_percentage) FILTER (WHERE assessment_percentage IS NOT NULL), 0) AS min_score,
            COALESCE(
                MAX(assessment_percentage) FILTER (WHERE assessment_percentage IS NOT NULL) - 
                MIN(assessment_percentage) FILTER (WHERE assessment_percentage IS NOT NULL),
                0
            ) AS score_range,
            -- Individual assessment scores (as JSON for pivoting)
            json_agg(
                json_build_object(
                    'assessment_id', assessment_id,
                    'assessment_title', assessment_title,
                    'transmuted_score', transmuted_score,
                    'assessment_percentage', assessment_percentage
                ) ORDER BY assessment_id
            ) FILTER (WHERE assessment_percentage IS NOT NULL) AS assessment_scores_json
        FROM student_assessment_scores
        GROUP BY student_id, student_number, full_name, ilo_id, ilo_code, ilo_description
    )
    SELECT 
        student_id,
        student_number,
        full_name,
        ilo_id,
        ilo_code,
        ilo_description,
        ilo_score,
        ilo_percentage,
        assessments_completed,
        total_assessments,
        CASE 
            WHEN total_assessments > 0 
            THEN (assessments_completed::FLOAT / total_assessments::FLOAT) * 100
            ELSE 0
        END AS completion_rate,
        score_std,
        score_variance,
        max_score,
        min_score,
        score_range,
        assessment_scores_json
    FROM student_metrics
    WHERE assessments_completed > 0
    ORDER BY student_number
    """
    
    print("📊 Extracting student metrics from database...")
    df = pd.read_sql_query(query, conn, params=params)
    
    if df.empty:
        print("⚠️  No student data found for the specified filters.")
        return df
    
    print(f"✅ Extracted {len(df)} students with metrics")
    
    # Expand assessment scores into separate columns
    if 'assessment_scores_json' in df.columns and not df['assessment_scores_json'].isna().all():
        df = expand_assessment_scores(df)
    
    return df


def expand_assessment_scores(df):
    """Expand assessment scores JSON into individual columns"""
    print("📈 Expanding assessment scores into columns...")
    
    # Get all unique assessment IDs from all students
    all_assessment_ids = set()
    for idx, row in df.iterrows():
        if pd.notna(row.get('assessment_scores_json')):
            scores = row['assessment_scores_json']
            if isinstance(scores, str):
                scores = json.loads(scores)
            if isinstance(scores, list):
                for score in scores:
                    if score and 'assessment_id' in score:
                        all_assessment_ids.add(score['assessment_id'])
    
    # Create columns for each assessment
    for assessment_id in sorted(all_assessment_ids):
        col_name = f'assessment_{assessment_id}_percentage'
        df[col_name] = 0.0
        
        for idx, row in df.iterrows():
            if pd.notna(row.get('assessment_scores_json')):
                scores = row['assessment_scores_json']
                if isinstance(scores, str):
                    scores = json.loads(scores)
                if isinstance(scores, list):
                    for score in scores:
                        if score and score.get('assessment_id') == assessment_id:
                            df.at[idx, col_name] = score.get('assessment_percentage', 0.0)
                            break
    
    return df


# ============================================================================
# METRICS CALCULATION
# ============================================================================

def calculate_clustering_metrics(df):
    """
    Calculate comprehensive metrics for clustering analysis
    
    Returns:
        pandas.DataFrame with calculated metrics
    """
    print("🧮 Calculating clustering metrics...")
    
    metrics_df = df.copy()
    
    # Core metrics (already calculated)
    core_metrics = [
        'ilo_score',
        'ilo_percentage',
        'assessments_completed',
        'completion_rate',
        'score_std',
        'score_variance',
        'score_range'
    ]
    
    # Assessment-specific metrics
    assessment_cols = [col for col in df.columns if col.startswith('assessment_') and col.endswith('_percentage')]
    
    # Calculate additional derived metrics
    if 'max_score' in df.columns and 'min_score' in df.columns:
        metrics_df['score_spread'] = metrics_df['max_score'] - metrics_df['min_score']
    
    # Performance consistency (inverse of variance for better interpretation)
    if 'score_variance' in df.columns:
        metrics_df['performance_consistency'] = 1 / (1 + metrics_df['score_variance'])
    
    # Select features for clustering
    feature_cols = core_metrics + assessment_cols
    
    # Filter out columns that don't exist
    feature_cols = [col for col in feature_cols if col in metrics_df.columns]
    
    # Remove any columns with all NaN values
    feature_cols = [col for col in feature_cols if not metrics_df[col].isna().all()]
    
    print(f"📋 Selected {len(feature_cols)} features for clustering:")
    for col in feature_cols:
        print(f"   - {col}")
    
    return metrics_df, feature_cols


# ============================================================================
# CLUSTERING ANALYSIS
# ============================================================================

def calculate_elbow_method(data, min_k=2, max_k=10):
    """
    Calculate elbow method metrics (inertia/WSS) for different k values
    
    Returns:
        dict with k values and their corresponding inertias
    """
    print(f"📐 Calculating elbow method metrics (k={min_k} to {max_k})...")
    
    inertias = []
    k_values = range(min_k, max_k + 1)
    
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(data)
    
    for k in k_values:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(scaled_data)
        inertias.append(kmeans.inertia_)
        print(f"   k={k}: Inertia={kmeans.inertia_:.2f}")
    
    return {
        'k_values': list(k_values),
        'inertias': inertias,
        'scaler': scaler
    }


def calculate_silhouette_scores(data, min_k=2, max_k=10):
    """
    Calculate silhouette scores for different k values
    
    Returns:
        dict with k values and their corresponding silhouette scores
    """
    print(f"📊 Calculating silhouette scores (k={min_k} to {max_k})...")
    
    silhouette_scores = []
    k_values = range(min_k, max_k + 1)
    
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(data)
    
    for k in k_values:
        if k >= len(data):
            print(f"   ⚠️  Skipping k={k} (greater than number of samples)")
            continue
        
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(scaled_data)
        score = silhouette_score(scaled_data, labels)
        silhouette_scores.append(score)
        print(f"   k={k}: Silhouette Score={score:.3f}")
    
    return {
        'k_values': list(k_values[:len(silhouette_scores)]),
        'scores': silhouette_scores,
        'scaler': scaler
    }


def perform_kmeans_clustering(data, n_clusters, scaler=None):
    """
    Perform K-Means clustering on the data
    
    Returns:
        dict with cluster labels and model
    """
    print(f"🎯 Performing K-Means clustering with k={n_clusters}...")
    
    if scaler is None:
        scaler = StandardScaler()
        scaled_data = scaler.fit_transform(data)
    else:
        scaled_data = scaler.transform(data)
    
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(scaled_data)
    
    # Calculate silhouette score for this clustering
    silhouette_avg = silhouette_score(scaled_data, labels)
    silhouette_samples_values = silhouette_samples(scaled_data, labels)
    
    print(f"✅ Clustering complete. Average Silhouette Score: {silhouette_avg:.3f}")
    
    return {
        'labels': labels,
        'model': kmeans,
        'scaler': scaler,
        'silhouette_avg': silhouette_avg,
        'silhouette_samples': silhouette_samples_values,
        'centers': kmeans.cluster_centers_
    }


# ============================================================================
# VISUALIZATION
# ============================================================================

def plot_elbow_method(elbow_data, output_path):
    """Plot elbow method graph"""
    print(f"📈 Creating elbow method plot...")
    
    plt.figure(figsize=(10, 6))
    plt.plot(elbow_data['k_values'], elbow_data['inertias'], 'bo-')
    plt.xlabel('Number of Clusters (k)')
    plt.ylabel('Inertia (Within-Cluster Sum of Squares)')
    plt.title('Elbow Method For Optimal k')
    plt.grid(True, alpha=0.3)
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"✅ Saved: {output_path}")


def plot_silhouette_scores(silhouette_data, output_path):
    """Plot silhouette scores graph"""
    print(f"📊 Creating silhouette scores plot...")
    
    plt.figure(figsize=(10, 6))
    plt.plot(silhouette_data['k_values'], silhouette_data['scores'], 'go-')
    plt.xlabel('Number of Clusters (k)')
    plt.ylabel('Silhouette Score')
    plt.title('Silhouette Scores For Optimal k')
    plt.grid(True, alpha=0.3)
    
    # Highlight optimal k (highest score)
    if silhouette_data['scores']:
        optimal_k_idx = np.argmax(silhouette_data['scores'])
        optimal_k = silhouette_data['k_values'][optimal_k_idx]
        optimal_score = silhouette_data['scores'][optimal_k_idx]
        plt.axvline(x=optimal_k, color='r', linestyle='--', alpha=0.5)
        plt.text(optimal_k, optimal_score, f'Optimal k={optimal_k}', 
                verticalalignment='bottom', horizontalalignment='center')
    
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"✅ Saved: {output_path}")


def plot_cluster_results(df, clustering_result, feature_cols, output_path):
    """Plot cluster visualization using PCA for dimensionality reduction"""
    print(f"🎨 Creating cluster visualization...")
    
    try:
        from sklearn.decomposition import PCA
        
        # Use first two principal components for 2D visualization
        if len(feature_cols) < 2:
            print("⚠️  Not enough features for PCA visualization")
            return
        
        scaler = clustering_result['scaler']
        scaled_data = scaler.transform(df[feature_cols].fillna(0))
        
        pca = PCA(n_components=2)
        pca_data = pca.fit_transform(scaled_data)
        
        plt.figure(figsize=(12, 8))
        
        labels = clustering_result['labels']
        unique_labels = np.unique(labels)
        colors = plt.cm.tab10(np.linspace(0, 1, len(unique_labels)))
        
        for label, color in zip(unique_labels, colors):
            mask = labels == label
            plt.scatter(pca_data[mask, 0], pca_data[mask, 1], 
                       c=[color], label=f'Cluster {label}', 
                       alpha=0.6, s=50)
        
        plt.xlabel(f'First Principal Component ({pca.explained_variance_ratio_[0]:.2%} variance)')
        plt.ylabel(f'Second Principal Component ({pca.explained_variance_ratio_[1]:.2%} variance)')
        plt.title('Student Clusters (PCA Visualization)')
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        plt.close()
        print(f"✅ Saved: {output_path}")
    except ImportError:
        print("⚠️  PCA not available, skipping cluster visualization")


# ============================================================================
# RESULTS EXPORT
# ============================================================================

def export_results(df, clustering_result, elbow_data, silhouette_data, 
                   feature_cols, output_dir, section_course_id, filters):
    """Export all results to files"""
    print(f"💾 Exporting results to {output_dir}...")
    
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Add cluster labels to dataframe
    results_df = df.copy()
    results_df['cluster'] = clustering_result['labels']
    results_df['silhouette_score'] = clustering_result['silhouette_samples']
    
    # Export student results with clusters
    csv_path = output_dir / f"ilo_clustering_results_{timestamp}.csv"
    results_df.to_csv(csv_path, index=False)
    print(f"✅ Exported: {csv_path}")
    
    # Export summary statistics
    summary = {
        'timestamp': timestamp,
        'section_course_id': section_course_id,
        'filters': filters,
        'total_students': len(df),
        'optimal_k': silhouette_data['k_values'][np.argmax(silhouette_data['scores'])] if silhouette_data['scores'] else None,
        'silhouette_score': clustering_result['silhouette_avg'],
        'elbow_method': {
            'k_values': elbow_data['k_values'],
            'inertias': [float(x) for x in elbow_data['inertias']]
        },
        'silhouette_method': {
            'k_values': silhouette_data['k_values'],
            'scores': [float(x) for x in silhouette_data['scores']]
        },
        'features_used': feature_cols,
        'cluster_summary': {}
    }
    
    # Cluster summary statistics
    for cluster_id in np.unique(clustering_result['labels']):
        cluster_data = results_df[results_df['cluster'] == cluster_id]
        summary['cluster_summary'][f'cluster_{cluster_id}'] = {
            'student_count': len(cluster_data),
            'avg_ilo_percentage': float(cluster_data['ilo_percentage'].mean()) if 'ilo_percentage' in cluster_data.columns else None,
            'avg_ilo_score': float(cluster_data['ilo_score'].mean()) if 'ilo_score' in cluster_data.columns else None,
            'avg_completion_rate': float(cluster_data['completion_rate'].mean()) if 'completion_rate' in cluster_data.columns else None
        }
    
    json_path = output_dir / f"ilo_clustering_summary_{timestamp}.json"
    with open(json_path, 'w') as f:
        json.dump(summary, f, indent=2)
    print(f"✅ Exported: {json_path}")
    
    # Export plots
    plot_elbow_method(elbow_data, output_dir / f"elbow_method_{timestamp}.png")
    plot_silhouette_scores(silhouette_data, output_dir / f"silhouette_scores_{timestamp}.png")
    plot_cluster_results(df, clustering_result, feature_cols, 
                        output_dir / f"cluster_visualization_{timestamp}.png")
    
    return summary


# ============================================================================
# MAIN FUNCTION
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='ILO-Based Student Clustering Analysis')
    parser.add_argument('--section_course_id', type=int, required=True,
                       help='Section Course ID to analyze')
    parser.add_argument('--ilo_id', type=int, help='Filter by ILO ID')
    parser.add_argument('--so_id', type=int, help='Filter by Student Outcome ID')
    parser.add_argument('--iga_id', type=int, help='Filter by IGA ID')
    parser.add_argument('--sdg_id', type=int, help='Filter by SDG ID')
    parser.add_argument('--cdio_id', type=int, help='Filter by CDIO ID')
    parser.add_argument('--min_k', type=int, default=2, help='Minimum k for elbow method')
    parser.add_argument('--max_k', type=int, default=10, help='Maximum k for elbow method')
    parser.add_argument('--output_dir', type=str, default='./clustering_results',
                       help='Output directory for results')
    
    args = parser.parse_args()
    
    print("=" * 80)
    print("ILO-Based Student Clustering Analysis")
    print("=" * 80)
    
    filters = {
        'ilo_id': args.ilo_id,
        'so_id': args.so_id,
        'iga_id': args.iga_id,
        'sdg_id': args.sdg_id,
        'cdio_id': args.cdio_id
    }
    
    # Remove None values
    filters = {k: v for k, v in filters.items() if v is not None}
    
    print(f"\n📋 Configuration:")
    print(f"   Section Course ID: {args.section_course_id}")
    if filters:
        print(f"   Filters: {filters}")
    print(f"   K range: {args.min_k} to {args.max_k}")
    print(f"   Output directory: {args.output_dir}\n")
    
    # Connect to database
    conn = None
    try:
        conn = get_db_connection()
        
        # Extract student metrics
        df = extract_student_metrics(conn, args.section_course_id, filters)
        
        if df.empty:
            print("❌ No data to analyze. Exiting.")
            return
        
        # Calculate clustering metrics
        metrics_df, feature_cols = calculate_clustering_metrics(df)
        
        if not feature_cols:
            print("❌ No valid features for clustering. Exiting.")
            return
        
        # Prepare data for clustering (remove non-feature columns)
        clustering_data = metrics_df[feature_cols].fillna(0)
        
        # Check if we have enough data points
        if len(clustering_data) < args.min_k:
            print(f"❌ Not enough data points ({len(clustering_data)}) for minimum k ({args.min_k})")
            return
        
        # Calculate elbow method
        elbow_data = calculate_elbow_method(clustering_data, args.min_k, args.max_k)
        
        # Calculate silhouette scores
        silhouette_data = calculate_silhouette_scores(clustering_data, args.min_k, args.max_k)
        
        # Determine optimal k (highest silhouette score)
        if not silhouette_data['scores']:
            print("❌ Could not calculate silhouette scores. Exiting.")
            return
        
        optimal_k_idx = np.argmax(silhouette_data['scores'])
        optimal_k = silhouette_data['k_values'][optimal_k_idx]
        optimal_silhouette = silhouette_data['scores'][optimal_k_idx]
        
        print(f"\n🎯 Optimal k: {optimal_k} (Silhouette Score: {optimal_silhouette:.3f})")
        
        # Perform clustering with optimal k
        clustering_result = perform_kmeans_clustering(
            clustering_data, 
            optimal_k, 
            scaler=silhouette_data['scaler']
        )
        
        # Export results
        summary = export_results(
            metrics_df, 
            clustering_result, 
            elbow_data, 
            silhouette_data,
            feature_cols,
            args.output_dir,
            args.section_course_id,
            filters
        )
        
        print("\n" + "=" * 80)
        print("✅ Analysis Complete!")
        print("=" * 80)
        print(f"\n📊 Summary:")
        print(f"   Total Students: {summary['total_students']}")
        print(f"   Optimal Clusters: {summary['optimal_k']}")
        print(f"   Average Silhouette Score: {summary['silhouette_score']:.3f}")
        print(f"\n📁 Results saved to: {args.output_dir}")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        if conn:
            conn.close()
            print("\n🔌 Database connection closed.")


if __name__ == '__main__':
    main()

