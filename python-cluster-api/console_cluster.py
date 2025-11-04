import argparse
import json
import sys
from typing import List, Dict
from collections import Counter, defaultdict

from app import cluster_records


def load_input(path: str | None) -> List[Dict]:
    if path is None or path == "-":
        return json.load(sys.stdin)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def demo_data() -> List[Dict]:
    return [
        {"student_id": 1, "attendance_percentage": 92, "average_score": 88, "average_days_late": 0.5},
        {"student_id": 2, "attendance_percentage": 76, "average_score": 69, "average_days_late": 2.1},
        {"student_id": 3, "attendance_percentage": 84, "average_score": 79, "average_days_late": 1.2},
        {"student_id": 4, "attendance_percentage": 58, "average_score": 55, "average_days_late": 4.0},
        {"student_id": 5, "attendance_percentage": 97, "average_score": 93, "average_days_late": 0.2},
        {"student_id": 6, "attendance_percentage": 95, "average_score": 90, "average_days_late": 0.1},
        {"student_id": 7, "attendance_percentage": 65, "average_score": 62, "average_days_late": 3.5},
        {"student_id": 8, "attendance_percentage": 88, "average_score": 82, "average_days_late": 0.8},
    ]


def print_cluster_statistics(results: List[Dict]) -> None:
    """Print detailed cluster statistics to console."""
    print("\n" + "="*70)
    print("📊 CLUSTERING RESULTS SUMMARY")
    print("="*70)
    
    # Group by cluster label
    clusters = defaultdict(list)
    for record in results:
        label = record.get("cluster_label") or "Not Clustered"
        clusters[label].append(record)
    
    # Overall distribution
    labels = [r.get("cluster_label") or "Not Clustered" for r in results]
    counts = Counter(labels)
    print(f"\n📈 Cluster Distribution:")
    for label, count in counts.most_common():
        percentage = (count / len(results)) * 100
        print(f"   {label}: {count} students ({percentage:.1f}%)")
    
    # Statistics per cluster
    print(f"\n📋 Detailed Statistics by Cluster:")
    print("-"*70)
    
    features = ['attendance_percentage', 'average_score', 'average_days_late']
    
    for label in sorted(clusters.keys()):
        cluster_data = clusters[label]
        print(f"\n🏷️  {label} ({len(cluster_data)} students):")
        
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
    print(f"\n👥 Individual Student Assignments:")
    print("-"*70)
    for record in sorted(results, key=lambda x: x.get('student_id', 0)):
        sid = record.get('student_id', 'N/A')
        label = record.get('cluster_label', 'Not Clustered')
        att = record.get('attendance_percentage', 0)
        score = record.get('average_score', 0)
        late = record.get('average_days_late', 0)
        print(f"   Student {sid}: {label} | "
              f"Attendance: {att}% | Score: {score} | Days Late: {late}")
    
    print("\n" + "="*70)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run clustering and print results to console")
    group = parser.add_mutually_exclusive_group(required=False)
    group.add_argument("--input", "-i", help="Path to JSON array of student records (or '-' for stdin)")
    group.add_argument("--demo", action="store_true", help="Use built-in demo data")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output")
    parser.add_argument("--json-only", action="store_true", help="Only output JSON (no statistics)")
    args = parser.parse_args()

    records = demo_data() if args.demo or args.input is None else load_input(args.input)
    print(f"🔍 Processing {len(records)} student records...")
    
    results = cluster_records(records)
    print(f"✅ Clustering complete! {len(results)} results generated.\n")

    # Always print statistics unless --json-only is specified
    if not args.json_only:
        print_cluster_statistics(results)
        print("\n📄 JSON Output:")
        print("-"*70)
    
    if args.pretty:
        print(json.dumps(results, indent=2, ensure_ascii=False))
    else:
        print(json.dumps(results, separators=(",", ":"), ensure_ascii=False))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())


