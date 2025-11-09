-- Complete Migration: Remove submitted_at and use submission_status instead
-- This migration:
-- 1. Ensures submission_status column exists (runs add_submission_status.sql first)
-- 2. Removes submitted_at column and its index
-- 3. Updates all existing records to use submission_status
--
-- IMPORTANT: Backup your database before running this migration!

-- ============================================================================
-- STEP 1: Add submission_status if it doesn't exist
-- ============================================================================

-- Add submission_status column to submissions table (if not exists)
ALTER TABLE submissions 
  ADD COLUMN IF NOT EXISTS submission_status VARCHAR(20) DEFAULT 'missing' CHECK (submission_status IN ('ontime', 'late', 'missing'));

-- Create index for fast lookups by submission_status (if not exists)
CREATE INDEX IF NOT EXISTS idx_submissions_submission_status 
  ON submissions(submission_status);

-- Add comment to column
COMMENT ON COLUMN submissions.submission_status IS 'Submission status: ontime, late, or missing. Used for analytics and clustering.';

-- ============================================================================
-- STEP 2: Migrate existing data from submitted_at to submission_status
-- ============================================================================

-- Update existing records: convert submitted_at timestamps to submission_status
-- This migration uses due_date from assessments to determine status
UPDATE submissions s
SET submission_status = CASE
  -- If submitted_at is NULL, mark as missing
  WHEN s.submitted_at IS NULL THEN 'missing'
  -- If submitted_at exists, check against due_date
  WHEN EXISTS (
    SELECT 1 FROM assessments a 
    WHERE a.assessment_id = s.assessment_id 
    AND a.due_date IS NOT NULL
    AND s.submitted_at <= a.due_date
  ) THEN 'ontime'
  -- If submitted_at is after due_date, mark as late
  WHEN EXISTS (
    SELECT 1 FROM assessments a 
    WHERE a.assessment_id = s.assessment_id 
    AND a.due_date IS NOT NULL
    AND s.submitted_at > a.due_date
  ) THEN 'late'
  -- If no due_date exists, mark as ontime (can't determine if late)
  WHEN EXISTS (
    SELECT 1 FROM assessments a 
    WHERE a.assessment_id = s.assessment_id 
    AND a.due_date IS NULL
  ) THEN 'ontime'
  -- Default to missing if assessment not found
  ELSE 'missing'
END
WHERE submission_status IS NULL OR submission_status = 'missing';

-- ============================================================================
-- STEP 3: Remove submitted_at column and its index
-- ============================================================================

-- Drop the index on submitted_at (if it exists)
DROP INDEX IF EXISTS idx_submissions_submitted_at;

-- Remove the submitted_at column from submissions table
ALTER TABLE submissions 
  DROP COLUMN IF EXISTS submitted_at;

-- ============================================================================
-- STEP 4: Update table comment
-- ============================================================================

COMMENT ON TABLE submissions IS 'Submission records. Uses submission_status (ontime/late/missing) instead of submitted_at timestamp for tracking submission timeliness. graded_at timestamp is still used to track when submissions were graded.';

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify the migration)
-- ============================================================================

-- Check that submitted_at column is removed
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'submissions' AND column_name = 'submitted_at';
-- (Should return 0 rows)

-- Check that submission_status column exists
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'submissions' AND column_name = 'submission_status';
-- (Should return 1 row with submission_status)

-- Check submission_status distribution
-- SELECT submission_status, COUNT(*) as count 
-- FROM submissions 
-- GROUP BY submission_status 
-- ORDER BY submission_status;
-- (Should show distribution of ontime, late, missing)

-- Check that index exists
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename = 'submissions' 
-- AND indexname = 'idx_submissions_submission_status';
-- (Should return 1 row)

-- ============================================================================
-- ROLLBACK (if needed - run this to undo the migration)
-- ============================================================================

-- WARNING: This will restore submitted_at but data will be lost!
-- ALTER TABLE submissions ADD COLUMN submitted_at TIMESTAMP;
-- CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at);
-- UPDATE submissions SET submitted_at = graded_at WHERE graded_at IS NOT NULL;
-- (Note: This is a basic rollback - actual submitted_at data cannot be recovered)

