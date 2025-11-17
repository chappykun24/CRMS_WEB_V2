"""
Fetch real student data from database and visualize clustering results
"""

import os
import sys
import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from pathlib import Path
import json

# Load environment variables
env_paths = [
    Path(__file__).parent / '.env',
    Path(__file__).parent.parent / '.env',
    Path(__file__).parent.parent / 'backend' / '.env',
]

for env_path in env_paths:
    if env_path.exists():
        load_dotenv(env_path)
        print(f"[*] Loaded environment from: {env_path}")
        break
else:
    load_dotenv()
    print("[*] Loaded environment from system variables")


def get_db_connection():
    """Create a database connection using environment variables."""
    host = os.getenv('VITE_NEON_HOST') or os.getenv('NEON_HOST') or os.getenv('DB_HOST')
    database = os.getenv('VITE_NEON_DATABASE') or os.getenv('NEON_DATABASE') or os.getenv('DB_NAME')
    user = os.getenv('VITE_NEON_USER') or os.getenv('NEON_USER') or os.getenv('DB_USER')
    password = os.getenv('VITE_NEON_PASSWORD') or os.getenv('NEON_PASSWORD') or os.getenv('DB_PASSWORD')
    port = os.getenv('VITE_NEON_PORT') or os.getenv('NEON_PORT') or os.getenv('DB_PORT') or '5432'
    
    if not all([host, database, user, password]):
        raise ValueError(
            "Missing database credentials. Please set:\n"
            "  VITE_NEON_HOST or NEON_HOST\n"
            "  VITE_NEON_DATABASE or NEON_DATABASE\n"
            "  VITE_NEON_USER or NEON_USER\n"
            "  VITE_NEON_PASSWORD or NEON_PASSWORD"
        )
    
    port = int(port)
    connection_string = f"host={host} dbname={database} user={user} password={password} port={port} sslmode=require"
    
    print(f"[*] Connecting to database: {host}:{port}/{database}")
    conn = psycopg2.connect(connection_string)
    return conn


def fetch_student_data_for_clustering(limit=200, term_id=None):
    """
    Fetch student data with all features needed for clustering.
    This matches the query used by the backend API.
    """
    query = """
    SELECT
        s.student_id,
        s.full_name,
        -- Attendance data (detailed counts)
        COALESCE(
            (SELECT COUNT(CASE WHEN al.status = 'present' THEN 1 END)
             FROM course_enrollments ce_att
             LEFT JOIN attendance_logs al ON ce_att.enrollment_id = al.enrollment_id
             WHERE ce_att.student_id = s.student_id
               AND al.status IS NOT NULL
            ), 0
        )::INTEGER AS attendance_present_count,
        COALESCE(
            (SELECT COUNT(CASE WHEN al.status = 'absent' THEN 1 END)
             FROM course_enrollments ce_att
             LEFT JOIN attendance_logs al ON ce_att.enrollment_id = al.enrollment_id
             WHERE ce_att.student_id = s.student_id
            ), 0
        )::INTEGER AS attendance_absent_count,
        COALESCE(
            (SELECT COUNT(CASE WHEN al.status = 'late' THEN 1 END)
             FROM course_enrollments ce_att
             LEFT JOIN attendance_logs al ON ce_att.enrollment_id = al.enrollment_id
             WHERE ce_att.student_id = s.student_id
            ), 0
        )::INTEGER AS attendance_late_count,
        COALESCE(
            (SELECT COUNT(DISTINCT al.attendance_id)
             FROM course_enrollments ce_att
             LEFT JOIN attendance_logs al ON ce_att.enrollment_id = al.enrollment_id
             WHERE ce_att.student_id = s.student_id
               AND al.attendance_id IS NOT NULL
            ), 0
        )::INTEGER AS attendance_total_sessions,
        -- Attendance percentage
        COALESCE(
            (SELECT ROUND(
                (COUNT(CASE WHEN al.status = 'present' THEN 1 END)::NUMERIC / 
                 NULLIF(COUNT(al.attendance_id), 0)::NUMERIC) * 100, 
                2
            )
            FROM course_enrollments ce_att
            LEFT JOIN attendance_logs al ON ce_att.enrollment_id = al.enrollment_id
            WHERE ce_att.student_id = s.student_id
              AND al.attendance_id IS NOT NULL
            ), 75.0
        )::NUMERIC AS attendance_percentage,
        -- Average score (transmuted scores)
        COALESCE(
            (SELECT ROUND(AVG(sub.transmuted_score)::NUMERIC, 2)
             FROM course_enrollments ce_sub
             INNER JOIN submissions sub ON ce_sub.enrollment_id = sub.enrollment_id
             WHERE ce_sub.student_id = s.student_id
               AND sub.transmuted_score IS NOT NULL
            ), 50.0
        )::NUMERIC AS average_score,
        -- Submission counts
        COALESCE(
            (SELECT COUNT(CASE WHEN sub.submission_status = 'ontime' THEN 1 END)
             FROM course_enrollments ce_sub
             INNER JOIN section_courses sc_sub ON ce_sub.section_course_id = sc_sub.section_course_id
             INNER JOIN assessments ass ON sc_sub.section_course_id = ass.section_course_id
             LEFT JOIN submissions sub ON (
               ce_sub.enrollment_id = sub.enrollment_id 
               AND sub.assessment_id = ass.assessment_id
             )
             WHERE ce_sub.student_id = s.student_id
               AND ce_sub.status = 'enrolled'
            ), 0
        )::INTEGER AS submission_ontime_count,
        COALESCE(
            (SELECT COUNT(CASE WHEN sub.submission_status = 'late' THEN 1 END)
             FROM course_enrollments ce_sub
             INNER JOIN section_courses sc_sub ON ce_sub.section_course_id = sc_sub.section_course_id
             INNER JOIN assessments ass ON sc_sub.section_course_id = ass.section_course_id
             LEFT JOIN submissions sub ON (
               ce_sub.enrollment_id = sub.enrollment_id 
               AND sub.assessment_id = ass.assessment_id
             )
             WHERE ce_sub.student_id = s.student_id
               AND ce_sub.status = 'enrolled'
            ), 0
        )::INTEGER AS submission_late_count,
        COALESCE(
            (SELECT COUNT(CASE WHEN sub.submission_id IS NULL THEN 1 END)
             FROM course_enrollments ce_sub
             INNER JOIN section_courses sc_sub ON ce_sub.section_course_id = sc_sub.section_course_id
             INNER JOIN assessments ass ON sc_sub.section_course_id = ass.section_course_id
             LEFT JOIN submissions sub ON (
               ce_sub.enrollment_id = sub.enrollment_id 
               AND sub.assessment_id = ass.assessment_id
             )
             WHERE ce_sub.student_id = s.student_id
               AND ce_sub.status = 'enrolled'
            ), 0
        )::INTEGER AS submission_missing_count,
        COALESCE(
            (SELECT COUNT(DISTINCT ass.assessment_id)
             FROM course_enrollments ce_sub
             INNER JOIN section_courses sc_sub ON ce_sub.section_course_id = sc_sub.section_course_id
             INNER JOIN assessments ass ON sc_sub.section_course_id = ass.section_course_id
             WHERE ce_sub.student_id = s.student_id
               AND ce_sub.status = 'enrolled'
            ), 0
        )::INTEGER AS submission_total_assessments,
        -- Submission rate
        COALESCE(
            (SELECT ROUND(
                (COUNT(DISTINCT sub.submission_id)::NUMERIC / 
                 NULLIF(COUNT(DISTINCT ass.assessment_id), 0)::NUMERIC),
                4
            )
            FROM course_enrollments ce_rate
            INNER JOIN section_courses sc ON ce_rate.section_course_id = sc.section_course_id
            INNER JOIN assessments ass ON sc.section_course_id = ass.section_course_id
            LEFT JOIN submissions sub ON (
              ce_rate.enrollment_id = sub.enrollment_id 
              AND sub.assessment_id = ass.assessment_id
            )
            WHERE ce_rate.student_id = s.student_id
              AND ce_rate.status = 'enrolled'
            ), 0.8
        )::NUMERIC AS submission_rate
    FROM students s
    WHERE EXISTS (
        SELECT 1 FROM course_enrollments ce
        WHERE ce.student_id = s.student_id
          AND ce.status = 'enrolled'
    )
    ORDER BY s.full_name
    LIMIT %s;
    """
    
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, (limit,))
            rows = cur.fetchall()
            result = [dict(row) for row in rows]
        conn.close()
        return result
    except psycopg2.Error as e:
        print(f"[ERROR] Database error: {e}")
        raise
    except Exception as e:
        print(f"[ERROR] Error fetching data: {e}")
        raise


def main():
    """Main function to fetch data, cluster, and visualize."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Fetch real student data and visualize clustering')
    parser.add_argument('--limit', type=int, default=100, help='Maximum number of students to fetch')
    parser.add_argument('--term-id', type=int, help='Filter by term ID')
    parser.add_argument('--save-json', type=str, help='Save fetched data to JSON file')
    parser.add_argument('--load-json', type=str, help='Load data from JSON file instead of database')
    
    args = parser.parse_args()
    
    # Load or fetch data
    if args.load_json:
        print(f"[*] Loading data from {args.load_json}...")
        with open(args.load_json, 'r') as f:
            students = json.load(f)
        print(f"[OK] Loaded {len(students)} students from JSON")
    else:
        print(f"[*] Fetching student data from database (limit: {args.limit})...")
        try:
            students = fetch_student_data_for_clustering(limit=args.limit, term_id=args.term_id)
            print(f"[OK] Fetched {len(students)} students from database")
            
            if args.save_json:
                with open(args.save_json, 'w') as f:
                    json.dump(students, f, indent=2, default=str)
                print(f"[OK] Saved data to {args.save_json}")
        except Exception as e:
            print(f"[ERROR] Failed to fetch data: {e}")
            return 1
    
    if len(students) == 0:
        print("[ERROR] No student data found")
        return 1
    
    # Show sample data
    print("\n[*] Sample student data:")
    for i, student in enumerate(students[:3], 1):
        print(f"  {i}. Student ID: {student.get('student_id')}, Name: {student.get('full_name', 'N/A')}")
        print(f"     Attendance: {student.get('attendance_percentage', 0):.1f}%")
        print(f"     Score: {student.get('average_score', 0):.2f}")
        print(f"     Submissions: OnTime={student.get('submission_ontime_count', 0)}, "
              f"Late={student.get('submission_late_count', 0)}, "
              f"Missing={student.get('submission_missing_count', 0)}")
    
    # Now call the clustering API (or use local clustering)
    print("\n[*] Running clustering...")
    
    # Import the clustering function from app.py
    sys.path.insert(0, os.path.dirname(__file__))
    try:
        from app import cluster_records
        results = cluster_records(students)
        print(f"[OK] Clustering complete! {len(results)} results generated")
        
        # Convert to DataFrame for visualization
        df = pd.DataFrame(results)
        
        # Show clustering summary
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
        
        # Now visualize
        print("\n[*] Creating visualizations...")
        from visualize_clusters import (
            visualize_clusters_2d,
            visualize_silhouette_analysis,
            visualize_cluster_statistics
        )
        
        print("  1. Creating 2D cluster visualization...")
        visualize_clusters_2d(df, cluster_col='cluster', save_path='clusters_2d_real.png')
        
        print("  2. Creating Silhouette analysis...")
        visualize_silhouette_analysis(df, cluster_col='cluster', save_path='silhouette_analysis_real.png')
        
        print("  3. Creating cluster statistics...")
        visualize_cluster_statistics(df, cluster_col='cluster', save_path='cluster_statistics_real.png')
        
        print("\n[OK] All visualizations complete!")
        print("\n[*] Generated files:")
        print("  - clusters_2d_real.png")
        print("  - silhouette_analysis_real.png")
        print("  - cluster_statistics_real.png")
        
    except ImportError as e:
        print(f"[ERROR] Could not import clustering function: {e}")
        print("[*] Make sure app.py is in the same directory")
        return 1
    except Exception as e:
        print(f"[ERROR] Clustering failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())

