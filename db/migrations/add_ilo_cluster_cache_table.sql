-- ==========================================
-- ILO Cluster Cache Table
-- Stores cached ILO-based clustering results
-- ==========================================

CREATE TABLE IF NOT EXISTS ilo_cluster_cache (
    cache_id SERIAL PRIMARY KEY,
    section_course_id INTEGER NOT NULL,
    ilo_id INTEGER NOT NULL,
    so_id INTEGER,
    sdg_id INTEGER,
    iga_id INTEGER,
    cdio_id INTEGER,
    cache_key VARCHAR(255) NOT NULL,
    cluster_data JSONB NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_course_id) REFERENCES section_courses(section_course_id) ON DELETE CASCADE,
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE,
    FOREIGN KEY (so_id) REFERENCES student_outcomes(so_id) ON DELETE CASCADE,
    FOREIGN KEY (sdg_id) REFERENCES sdg_skills(sdg_id) ON DELETE CASCADE,
    FOREIGN KEY (iga_id) REFERENCES institutional_graduate_attributes(iga_id) ON DELETE CASCADE,
    FOREIGN KEY (cdio_id) REFERENCES cdio_skills(cdio_id) ON DELETE CASCADE,
    -- Unique constraint on cache_key to prevent duplicate cache entries
    UNIQUE(cache_key)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ilo_cluster_cache_lookup 
    ON ilo_cluster_cache(section_course_id, ilo_id, so_id, sdg_id, iga_id, cdio_id, generated_at);

-- Index for cleanup of old entries
CREATE INDEX IF NOT EXISTS idx_ilo_cluster_cache_generated_at 
    ON ilo_cluster_cache(generated_at);

-- Add comment
COMMENT ON TABLE ilo_cluster_cache IS 'Caches ILO-based clustering results to avoid repeated Python script calls';
COMMENT ON COLUMN ilo_cluster_cache.cluster_data IS 'JSONB containing cluster assignments and summary data';
COMMENT ON COLUMN ilo_cluster_cache.cache_key IS 'Generated cache key for quick lookups';

