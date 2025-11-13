-- Migration: Add section_course_id support to analytics_clusters table
-- This enables per-class clustering to identify at-risk students within specific classes

-- Add section_course_id column
ALTER TABLE analytics_clusters 
  ADD COLUMN IF NOT EXISTS section_course_id INTEGER REFERENCES section_courses(section_course_id) ON DELETE CASCADE;

-- Add comment
COMMENT ON COLUMN analytics_clusters.section_course_id IS 'Section course ID for per-class clustering. When set, cluster assignment is specific to this class. NULL means cluster is for all classes.';

-- Create index for fast lookups by section_course_id
CREATE INDEX IF NOT EXISTS idx_analytics_clusters_section_course_id 
  ON analytics_clusters(section_course_id) 
  WHERE section_course_id IS NOT NULL;

-- Create composite unique index for student + term + section_course
-- This allows same student to have different clusters for different classes in same term
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_clusters_student_term_section_course 
  ON analytics_clusters(student_id, term_id, section_course_id) 
  WHERE student_id IS NOT NULL AND term_id IS NOT NULL AND section_course_id IS NOT NULL;

-- Update existing unique constraint to allow NULL section_course_id
-- Drop old constraint if it exists
DROP INDEX IF EXISTS idx_analytics_clusters_student_term;

-- Recreate with NULL section_course_id support
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_clusters_student_term 
  ON analytics_clusters(student_id, term_id) 
  WHERE student_id IS NOT NULL AND term_id IS NOT NULL AND section_course_id IS NULL;

