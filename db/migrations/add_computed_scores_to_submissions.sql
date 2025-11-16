-- Migration: Add computed scores (actual_score, transmuted_score) to submissions table
-- Date: 2024
-- Description: Adds columns to store transmuted actual scores and weighted transmuted scores

-- Add actual_score column (transmuted from raw score using non-zero based formula)
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS actual_score DOUBLE PRECISION;

-- Add transmuted_score column (actual_score × weight_percentage)
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS transmuted_score DOUBLE PRECISION;

-- Add comments for documentation
COMMENT ON COLUMN submissions.actual_score IS 'Transmuted score: (adjusted_score / max_score) × 62.5 + 37.5 (non-zero based)';
COMMENT ON COLUMN submissions.transmuted_score IS 'Weighted score: actual_score × (weight_percentage / 100)';

