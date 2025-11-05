-- Migration: Add cluster caching support to analytics_clusters table
-- This migration updates the table to support caching clusters by student_id and term_id
-- for faster retrieval in the dean analytics dashboard

-- Add new columns for student-based clustering
ALTER TABLE analytics_clusters 
  ADD COLUMN IF NOT EXISTS student_id INTEGER,
  ADD COLUMN IF NOT EXISTS term_id INTEGER REFERENCES school_terms(term_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cluster_number INTEGER;

-- Make enrollment_id nullable (since we can store by student_id now)
-- Note: Keep the column for backward compatibility, but make it nullable
-- ALTER TABLE analytics_clusters ALTER COLUMN enrollment_id DROP NOT NULL;
-- Note: We'll keep enrollment_id as is for now since it might be used elsewhere

-- Add foreign key for student_id
ALTER TABLE analytics_clusters 
  ADD CONSTRAINT fk_analytics_clusters_student 
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;

-- Create unique constraint to prevent duplicate entries for same student/term
-- Use a partial unique index to allow multiple entries with different term_ids
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_clusters_student_term 
  ON analytics_clusters(student_id, term_id) 
  WHERE student_id IS NOT NULL AND term_id IS NOT NULL;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_analytics_clusters_student_id 
  ON analytics_clusters(student_id) 
  WHERE student_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_clusters_term_id 
  ON analytics_clusters(term_id) 
  WHERE term_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_clusters_generated_at 
  ON analytics_clusters(generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_clusters_enrollment_id 
  ON analytics_clusters(enrollment_id) 
  WHERE enrollment_id IS NOT NULL;

-- Add comment to table
COMMENT ON TABLE analytics_clusters IS 'Stores cached student cluster assignments for faster analytics loading. Clusters are computed periodically and cached here to avoid expensive ML computations on every request.';

COMMENT ON COLUMN analytics_clusters.student_id IS 'Student ID for student-based clustering (used for analytics dashboard)';
COMMENT ON COLUMN analytics_clusters.term_id IS 'School term ID to filter clusters by term';
COMMENT ON COLUMN analytics_clusters.cluster_number IS 'Numeric cluster assignment (0, 1, 2, etc.)';
COMMENT ON COLUMN analytics_clusters.cluster_label IS 'Human-readable cluster label (e.g., "Excellent Performance", "At Risk")';
COMMENT ON COLUMN analytics_clusters.based_on IS 'JSONB object storing the metrics used for clustering (attendance, score, submission_rate)';
COMMENT ON COLUMN analytics_clusters.algorithm_used IS 'ML algorithm used (e.g., "kmeans", "dbscan")';
COMMENT ON COLUMN analytics_clusters.model_version IS 'Version of the clustering model/algorithm';
COMMENT ON COLUMN analytics_clusters.generated_at IS 'Timestamp when cluster was computed';
