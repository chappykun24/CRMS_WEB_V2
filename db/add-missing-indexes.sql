-- Add Missing Indexes for CRMS Database
-- This script adds the indexes that were detected as missing during the database test

SET search_path TO public;

-- Students useful indexes
CREATE INDEX IF NOT EXISTS idx_students_full_name_lower ON students (LOWER(full_name));
CREATE INDEX IF NOT EXISTS idx_students_contact_email ON students(contact_email);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at);
CREATE INDEX IF NOT EXISTS idx_students_gender ON students(gender);
CREATE INDEX IF NOT EXISTS idx_students_birth_date ON students(birth_date);

-- Missing Index 1: Submissions enrollment_id index
CREATE INDEX IF NOT EXISTS idx_submissions_enrollment_id ON submissions(enrollment_id);

-- Missing Index 2: Attendance logs enrollment_id index  
CREATE INDEX IF NOT EXISTS idx_attendance_logs_enrollment_id ON attendance_logs(enrollment_id);

-- Verify the indexes were created
SELECT 
    indexname, 
    tablename, 
    indexdef 
FROM pg_indexes 
WHERE indexname IN (
    'idx_submissions_enrollment_id',
    'idx_attendance_logs_enrollment_id'
)
ORDER BY indexname;
