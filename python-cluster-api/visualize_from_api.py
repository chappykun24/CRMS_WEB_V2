"""
Visualize clustering results by calling the clustering API endpoint
This avoids needing direct database access
"""

import requests
import json
import pandas as pd
import sys
import os

# Import visualization functions
sys.path.insert(0, os.path.dirname(__file__))
from visualize_clusters import (
    visualize_clusters_2d,
    visualize_silhouette_analysis,
    visualize_cluster_statistics
)


def get_clustering_from_api(api_url, student_data=None):
    """
    Get clustering results from the API.
    
    Args:
        api_url: URL of the clustering API endpoint
        student_data: Optional student data to send (if None, API should handle fetching)
    
    Returns:
        List of clustering results
    """
    try:
        print(f"[*] Calling clustering API: {api_url}")
        
        if student_data:
            response = requests.post(api_url, json=student_data, timeout=60)
        else:
            # If no data provided, API should fetch from database
            response = requests.post(api_url, json=[], timeout=60)
        
        response.raise_for_status()
        results = response.json()
        
        print(f"[OK] Received {len(results)} clustering results from API")
        return results
        
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] API request failed: {e}")
        raise


def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Visualize clustering from API')
    parser.add_argument('--api-url', type=str, 
                       default='http://localhost:10000/api/cluster',
                       help='Clustering API endpoint URL')
    parser.add_argument('--json-file', type=str,
                       help='Load student data from JSON file to send to API')
    parser.add_argument('--save-json', type=str,
                       help='Save API results to JSON file')
    
    args = parser.parse_args()
    
    # Load student data if provided
    student_data = None
    if args.json_file:
        print(f"[*] Loading student data from {args.json_file}...")
        with open(args.json_file, 'r') as f:
            student_data = json.load(f)
        print(f"[OK] Loaded {len(student_data)} students")
    
    # Get clustering results from API
    try:
        results = get_clustering_from_api(args.api_url, student_data)
    except Exception as e:
        print(f"[ERROR] Failed to get clustering results: {e}")
        print("\n[*] Options:")
        print("  1. Make sure the clustering API is running")
        print("  2. Check the API URL (default: http://localhost:10000/api/cluster)")
        print("  3. Or use fetch_and_visualize.py with database credentials")
        return 1
    
    if len(results) == 0:
        print("[ERROR] No clustering results received")
        return 1
    
    # Save results if requested
    if args.save_json:
        with open(args.save_json, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"[OK] Saved results to {args.save_json}")
    
    # Convert to DataFrame
    df = pd.DataFrame(results)
    
    # Show summary
    print("\n[*] Clustering Summary:")
    if 'cluster_label' in df.columns:
        cluster_counts = df['cluster_label'].value_counts()
        print("\n[*] Cluster distribution:")
        for label, count in cluster_counts.items():
            print(f"  {label}: {count} students")
    
    if 'silhouette_score' in df.columns:
        silhouette_avg = df['silhouette_score'].dropna().iloc[0] if len(df['silhouette_score'].dropna()) > 0 else None
        if silhouette_avg:
            print(f"\n[*] Silhouette Score: {silhouette_avg:.4f}")
            if silhouette_avg >= 0.5:
                print("    Quality: Excellent")
            elif silhouette_avg >= 0.3:
                print("    Quality: Good")
            elif silhouette_avg >= 0.1:
                print("    Quality: Fair")
            else:
                print("    Quality: Poor")
    
    # Visualize
    print("\n[*] Creating visualizations...")
    
    try:
        print("  1. Creating 2D cluster visualization...")
        visualize_clusters_2d(df, cluster_col='cluster', save_path='clusters_2d_api.png')
        
        print("  2. Creating Silhouette analysis...")
        visualize_silhouette_analysis(df, cluster_col='cluster', save_path='silhouette_analysis_api.png')
        
        print("  3. Creating cluster statistics...")
        visualize_cluster_statistics(df, cluster_col='cluster', save_path='cluster_statistics_api.png')
        
        print("\n[OK] All visualizations complete!")
        print("\n[*] Generated files:")
        print("  - clusters_2d_api.png")
        print("  - silhouette_analysis_api.png")
        print("  - cluster_statistics_api.png")
        
    except Exception as e:
        print(f"[ERROR] Visualization failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())

