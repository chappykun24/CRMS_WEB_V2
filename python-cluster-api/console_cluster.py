import argparse
import json
import sys
from typing import List, Dict
from collections import Counter, defaultdict

from app import cluster_records

# Try to import database fetching function
try:
    from fetch_from_db import fetch_student_data
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False
    # Warning will be shown in main() if database is needed


def load_input(path: str | None) -> List[Dict]:
    if path is None or path == "-":
        return json.load(sys.stdin)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def print_cluster_statistics(results: List[Dict]) -> None:
    """Print detailed cluster statistics to console."""
    print("\n" + "="*70)
    print("CLUSTERING RESULTS SUMMARY")
    print("="*70)
    
    # Group by cluster label
    clusters = defaultdict(list)
    for record in results:
        label = record.get("cluster_label")
        # Handle None and NaN values
        if label is None or (isinstance(label, float) and str(label) == 'nan'):
            label = "Not Clustered"
        clusters[label].append(record)
    
    # Overall distribution
    labels = []
    for r in results:
        label = r.get("cluster_label")
        if label is None or (isinstance(label, float) and str(label) == 'nan'):
            labels.append("Not Clustered")
        else:
            labels.append(str(label))
    counts = Counter(labels)
    print(f"\nCluster Distribution:")
    for label, count in counts.most_common():
        percentage = (count / len(results)) * 100
        print(f"   {label}: {count} students ({percentage:.1f}%)")
    
    # Statistics per cluster
    print(f"\nDetailed Statistics by Cluster:")
    print("-"*70)
    
    features = ['attendance_percentage', 'average_score', 'average_days_late', 'submission_rate']
    
    # Sort clusters by label, handling None/NaN values
    sorted_labels = sorted(clusters.keys(), key=lambda x: (x is None or (isinstance(x, float) and str(x) == 'nan'), str(x) if x is not None else 'Not Clustered'))
    
    for label in sorted_labels:
        cluster_data = clusters[label]
        label_display = 'Not Clustered' if (label is None or (isinstance(label, float) and str(label) == 'nan')) else label
        print(f"\n{label_display} ({len(cluster_data)} students):")
        
        for feature in features:
            values = [r.get(feature) for r in cluster_data if r.get(feature) is not None]
            if values:
                avg = sum(values) / len(values)
                min_val = min(values)
                max_val = max(values)
                feature_name = feature.replace('_', ' ').title()
                print(f"   {feature_name}:")
                print(f"      Average: {avg:.2f} | Min: {min_val:.2f} | Max: {max_val:.2f}")
    
    # Show individual student assignments
    print(f"\nIndividual Student Assignments:")
    print("-"*70)
    for record in sorted(results, key=lambda x: x.get('student_id', 0)):
        sid = record.get('student_id', 'N/A')
        label = record.get('cluster_label')
        if label is None or (isinstance(label, float) and str(label) == 'nan'):
            label = 'Not Clustered'
        else:
            label = str(label)
        att = record.get('attendance_percentage', 0) or 0
        score = record.get('average_score', 0) or 0
        late = record.get('average_days_late', 0) or 0
        sub_rate = record.get('submission_rate', 0) or 0
        print(f"   Student {sid}: {label} | "
              f"Attendance: {att}% | Score: {score} | Days Late: {late:.1f} | Submission Rate: {sub_rate:.1%}")
    
    print("\n" + "="*70)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run clustering on real student data from database and print results to console",
        epilog="By default, fetches real data from Neon database. Use --input to provide custom JSON data."
    )
    parser.add_argument("--input", "-i", help="Path to JSON array of student records (or '-' for stdin). If not provided, fetches from database.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output")
    parser.add_argument("--json-only", action="store_true", help="Only output JSON (no statistics)")
    parser.add_argument("--limit", type=int, default=200, help="Limit number of students when fetching from database (default: 200)")
    args = parser.parse_args()

    # Determine data source - default to database if available
    if args.input:
        # User provided input file or stdin
        records = load_input(args.input)
    elif DB_AVAILABLE:
        # Default: fetch from database
        print(f"Fetching real data from database (limit: {args.limit})...")
        try:
            records = fetch_student_data(limit=args.limit)
            if not records:
                print("Error: No student data found in database.", file=sys.stderr)
                print("Please ensure your database has student data and check your Neon credentials.", file=sys.stderr)
                return 1
        except Exception as e:
            print(f"Error fetching from database: {e}", file=sys.stderr)
            print("\nTo use database, ensure these environment variables are set:", file=sys.stderr)
            print("  VITE_NEON_HOST or NEON_HOST", file=sys.stderr)
            print("  VITE_NEON_DATABASE or NEON_DATABASE", file=sys.stderr)
            print("  VITE_NEON_USER or NEON_USER", file=sys.stderr)
            print("  VITE_NEON_PASSWORD or NEON_PASSWORD", file=sys.stderr)
            print("\nAlternatively, provide data via --input option.", file=sys.stderr)
            return 1
    else:
        # Database not available and no input provided
        print("Error: Database connection not available and no input file provided.", file=sys.stderr)
        print("Options:", file=sys.stderr)
        print("  1. Install psycopg2-binary and python-dotenv, then set Neon database credentials", file=sys.stderr)
        print("  2. Provide data via --input option: python console_cluster.py --input data.json", file=sys.stderr)
        return 1
    
    print(f"Processing {len(records)} student records...")
    
    results = cluster_records(records)
    print(f"Clustering complete! {len(results)} results generated.\n")

    # Always print statistics unless --json-only is specified
    if not args.json_only:
        print_cluster_statistics(results)
        print("\nJSON Output:")
        print("-"*70)
    
    if args.pretty:
        print(json.dumps(results, indent=2, ensure_ascii=False))
    else:
        print(json.dumps(results, separators=(",", ":"), ensure_ascii=False))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())


