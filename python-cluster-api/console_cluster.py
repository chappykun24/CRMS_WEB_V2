import argparse
import json
import sys
from typing import List, Dict

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
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description="Run clustering and print results to console")
    group = parser.add_mutually_exclusive_group(required=False)
    group.add_argument("--input", "-i", help="Path to JSON array of student records (or '-' for stdin)")
    group.add_argument("--demo", action="store_true", help="Use built-in demo data")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output")
    args = parser.parse_args()

    records = demo_data() if args.demo or args.input is None else load_input(args.input)
    results = cluster_records(records)

    if args.pretty:
        print(json.dumps(results, indent=2, ensure_ascii=False))
    else:
        print(json.dumps(results, separators=(",", ":"), ensure_ascii=False))

    # Also print a compact summary to stderr
    try:
        from collections import Counter
        labels = [r.get("cluster_label") or "Not Clustered" for r in results]
        counts = Counter(labels)
        sys.stderr.write(f"Cluster distribution: {dict(counts)}\n")
    except Exception:
        pass

    return 0


if __name__ == "__main__":
    raise SystemExit(main())


