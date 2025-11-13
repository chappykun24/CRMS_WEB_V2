-- Migration: Add silhouette_score column to analytics_clusters table
-- This adds support for storing clustering accuracy metrics

-- Add silhouette_score column
ALTER TABLE analytics_clusters 
  ADD COLUMN IF NOT EXISTS silhouette_score NUMERIC(5, 4);

-- Add comment
COMMENT ON COLUMN analytics_clusters.silhouette_score IS 'Silhouette score for clustering quality (-1 to 1). Higher values indicate better cluster separation. >0.3 = Good, >0.1 = Fair, <0.1 = Poor';

-- Create index for filtering by quality
CREATE INDEX IF NOT EXISTS idx_analytics_clusters_silhouette_score 
  ON analytics_clusters(silhouette_score DESC) 
  WHERE silhouette_score IS NOT NULL;

