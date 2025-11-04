"""Fetch real student data from the database for clustering."""
import os
import sys
from pathlib import Path
from typing import List, Dict, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load environment variables from multiple possible locations
# Try current directory, parent directory (project root), and backend directory
env_paths = [
    Path(__file__).parent / '.env',
    Path(__file__).parent.parent / '.env',
    Path(__file__).parent.parent / 'backend' / '.env',
]

for env_path in env_paths:
    if env_path.exists():
        load_dotenv(env_path)
        print(f"Loaded environment from: {env_path}")
        break
else:
    # Also try loading from current environment
    load_dotenv()
    print("Loaded environment from system variables or default .env")


def get_db_connection():
    """Create a database connection using environment variables."""
    # Support both VITE_ and regular env vars (for compatibility)
    # Priority: VITE_NEON_* > NEON_* > DB_* > defaults
    host = os.getenv('VITE_NEON_HOST') or os.getenv('NEON_HOST') or os.getenv('DB_HOST')
    database = os.getenv('VITE_NEON_DATABASE') or os.getenv('NEON_DATABASE') or os.getenv('DB_NAME')
    user = os.getenv('VITE_NEON_USER') or os.getenv('NEON_USER') or os.getenv('DB_USER')
    password = os.getenv('VITE_NEON_PASSWORD') or os.getenv('NEON_PASSWORD') or os.getenv('DB_PASSWORD')
    port = os.getenv('VITE_NEON_PORT') or os.getenv('NEON_PORT') or os.getenv('DB_PORT') or '5432'
    
    # Check if we have Neon credentials
    if not all([host, database, user, password]):
        raise ValueError(
            "Missing Neon database credentials. Please set:\n"
            "  VITE_NEON_HOST or NEON_HOST\n"
            "  VITE_NEON_DATABASE or NEON_DATABASE\n"
            "  VITE_NEON_USER or NEON_USER\n"
            "  VITE_NEON_PASSWORD or NEON_PASSWORD\n"
            "  VITE_NEON_PORT or NEON_PORT (optional, defaults to 5432)"
        )
    
    port = int(port)
    
    # For Neon, SSL is required - use connection string format with sslmode=require
    # This is the recommended way for Neon
    connection_string = f"host={host} dbname={database} user={user} password={password} port={port} sslmode=require"
    
    print(f"Connecting to Neon database: {host}:{port}/{database}")
    
    conn = psycopg2.connect(connection_string)
    return conn


def fetch_student_data(limit: int = 200) -> List[Dict]:
    """Fetch student analytics data from the database."""
    query = """
      SELECT
        s.student_id,
        s.full_name,
        -- Attendance percentage: count of present / total attendance sessions
        COALESCE(
          (
            SELECT ROUND(
              (COUNT(CASE WHEN al.status = 'present' THEN 1 END)::NUMERIC / 
               NULLIF(COUNT(al.attendance_id), 0)::NUMERIC) * 100, 
              2
            )
            FROM course_enrollments ce_att
            LEFT JOIN attendance_logs al ON ce_att.enrollment_id = al.enrollment_id
            WHERE ce_att.student_id = s.student_id
          ),
          0
        )::NUMERIC AS attendance_percentage,
        -- Average score: average of all submission scores for this student
        COALESCE(
          (
            SELECT ROUND(AVG(sub.total_score)::NUMERIC, 2)
            FROM course_enrollments ce_sub
            INNER JOIN submissions sub ON ce_sub.enrollment_id = sub.enrollment_id
            WHERE ce_sub.student_id = s.student_id
              AND sub.total_score IS NOT NULL
          ),
          0
        )::NUMERIC AS average_score,
        -- Average days late: average of days late for submissions that were actually late
        COALESCE(
          (
            SELECT ROUND(AVG(days_late)::NUMERIC, 2)
            FROM (
              SELECT EXTRACT(DAY FROM (sub.submitted_at - ass.due_date))::NUMERIC AS days_late
              FROM course_enrollments ce_late
              INNER JOIN submissions sub ON ce_late.enrollment_id = sub.enrollment_id
              INNER JOIN assessments ass ON sub.assessment_id = ass.assessment_id
              WHERE ce_late.student_id = s.student_id
                AND sub.submitted_at IS NOT NULL
                AND ass.due_date IS NOT NULL
                AND sub.submitted_at > ass.due_date
            ) late_submissions
          ),
          0
        )::NUMERIC AS average_days_late,
        -- Submission rate: distinct submissions / distinct assessments for this student
        COALESCE(
          (
            SELECT ROUND(
              (COUNT(DISTINCT sub.submission_id)::NUMERIC / 
               NULLIF(COUNT(DISTINCT ass.assessment_id), 0)::NUMERIC),
              4
            )
            FROM course_enrollments ce_rate
            LEFT JOIN section_courses sc ON ce_rate.section_course_id = sc.section_course_id
            LEFT JOIN assessments ass ON sc.section_course_id = ass.section_course_id
            LEFT JOIN submissions sub ON (
              ce_rate.enrollment_id = sub.enrollment_id 
              AND sub.assessment_id = ass.assessment_id
            )
            WHERE ce_rate.student_id = s.student_id
          ),
          0
        )::NUMERIC AS submission_rate
      FROM students s
      ORDER BY s.full_name
      LIMIT %s;
    """
    
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, (limit,))
            rows = cur.fetchall()
            # Convert RealDictRow to regular dict
            result = [dict(row) for row in rows]
        conn.close()
        return result
    except psycopg2.Error as e:
        print(f"Database error: {e}", file=sys.stderr)
        raise
    except Exception as e:
        print(f"Error fetching data: {e}", file=sys.stderr)
        raise


if __name__ == "__main__":
    """Test the database connection and fetch data."""
    try:
        # Debug: Show what environment variables are available (masked)
        print("Checking environment variables...")
        neon_host = os.getenv('VITE_NEON_HOST') or os.getenv('NEON_HOST')
        neon_db = os.getenv('VITE_NEON_DATABASE') or os.getenv('NEON_DATABASE')
        neon_user = os.getenv('VITE_NEON_USER') or os.getenv('NEON_USER')
        neon_pass = os.getenv('VITE_NEON_PASSWORD') or os.getenv('NEON_PASSWORD')
        neon_port = os.getenv('VITE_NEON_PORT') or os.getenv('NEON_PORT')
        
        print(f"  VITE_NEON_HOST/NEON_HOST: {'SET' if neon_host else 'NOT SET'}")
        print(f"  VITE_NEON_DATABASE/NEON_DATABASE: {'SET' if neon_db else 'NOT SET'}")
        print(f"  VITE_NEON_USER/NEON_USER: {'SET' if neon_user else 'NOT SET'}")
        print(f"  VITE_NEON_PASSWORD/NEON_PASSWORD: {'SET' if neon_pass else 'NOT SET'}")
        print(f"  VITE_NEON_PORT/NEON_PORT: {neon_port or 'NOT SET (using default 5432)'}")
        print()
        
        print("Connecting to database...")
        students = fetch_student_data()
        print(f"Successfully fetched {len(students)} students from database")
        
        if students:
            print("\nSample student data:")
            for i, student in enumerate(students[:3], 1):
                print(f"  {i}. {student.get('full_name')} (ID: {student.get('student_id')})")
                print(f"     Attendance: {student.get('attendance_percentage')}%")
                print(f"     Score: {student.get('average_score')}")
                print(f"     Days Late: {student.get('average_days_late')}")
                print(f"     Submission Rate: {student.get('submission_rate')}")
        else:
            print("No student data found in database.")
    except ValueError as e:
        print(f"\nConfiguration Error: {e}", file=sys.stderr)
        print("\nTo set Neon database credentials, you can:", file=sys.stderr)
        print("  1. Set environment variables in your system", file=sys.stderr)
        print("  2. Create a .env file in the project root with:", file=sys.stderr)
        print("     VITE_NEON_HOST=your-neon-host", file=sys.stderr)
        print("     VITE_NEON_DATABASE=your-database-name", file=sys.stderr)
        print("     VITE_NEON_USER=your-username", file=sys.stderr)
        print("     VITE_NEON_PASSWORD=your-password", file=sys.stderr)
        print("     VITE_NEON_PORT=5432", file=sys.stderr)
        print("  3. Or export them in PowerShell before running:", file=sys.stderr)
        print("     $env:VITE_NEON_HOST='your-host'", file=sys.stderr)
        print("     $env:VITE_NEON_DATABASE='your-database'", file=sys.stderr)
        print("     $env:VITE_NEON_USER='your-user'", file=sys.stderr)
        print("     $env:VITE_NEON_PASSWORD='your-password'", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

