-- =============================================
-- Migration: Add ILO Mapping & Assessment Link
-- Date: 2025-11-10
-- =============================================

BEGIN;

-- 1. Reference tables -------------------------------------------------

CREATE TABLE IF NOT EXISTS student_outcomes (
    so_id SERIAL PRIMARY KEY,
    so_code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS institutional_graduate_attributes (
    iga_id SERIAL PRIMARY KEY,
    iga_code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cdio_skills (
    cdio_id SERIAL PRIMARY KEY,
    cdio_code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sdg_skills (
    sdg_id SERIAL PRIMARY KEY,
    sdg_code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Mapping tables ----------------------------------------------------

CREATE TABLE IF NOT EXISTS ilo_so_mappings (
    mapping_id SERIAL PRIMARY KEY,
    ilo_id INTEGER NOT NULL,
    so_id INTEGER NOT NULL,
    assessment_tasks TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (ilo_id, so_id),
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE,
    FOREIGN KEY (so_id) REFERENCES student_outcomes(so_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ilo_iga_mappings (
    mapping_id SERIAL PRIMARY KEY,
    ilo_id INTEGER NOT NULL,
    iga_id INTEGER NOT NULL,
    assessment_tasks TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (ilo_id, iga_id),
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE,
    FOREIGN KEY (iga_id) REFERENCES institutional_graduate_attributes(iga_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ilo_cdio_mappings (
    mapping_id SERIAL PRIMARY KEY,
    ilo_id INTEGER NOT NULL,
    cdio_id INTEGER NOT NULL,
    assessment_tasks TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (ilo_id, cdio_id),
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE,
    FOREIGN KEY (cdio_id) REFERENCES cdio_skills(cdio_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ilo_sdg_mappings (
    mapping_id SERIAL PRIMARY KEY,
    ilo_id INTEGER NOT NULL,
    sdg_id INTEGER NOT NULL,
    assessment_tasks TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (ilo_id, sdg_id),
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE,
    FOREIGN KEY (sdg_id) REFERENCES sdg_skills(sdg_id) ON DELETE CASCADE
);

-- 3. Indexes -----------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_ilo_so_mappings_ilo_id ON ilo_so_mappings(ilo_id);
CREATE INDEX IF NOT EXISTS idx_ilo_so_mappings_so_id ON ilo_so_mappings(so_id);
CREATE INDEX IF NOT EXISTS idx_ilo_iga_mappings_ilo_id ON ilo_iga_mappings(ilo_id);
CREATE INDEX IF NOT EXISTS idx_ilo_iga_mappings_iga_id ON ilo_iga_mappings(iga_id);
CREATE INDEX IF NOT EXISTS idx_ilo_cdio_mappings_ilo_id ON ilo_cdio_mappings(ilo_id);
CREATE INDEX IF NOT EXISTS idx_ilo_cdio_mappings_cdio_id ON ilo_cdio_mappings(cdio_id);
CREATE INDEX IF NOT EXISTS idx_ilo_sdg_mappings_ilo_id ON ilo_sdg_mappings(ilo_id);
CREATE INDEX IF NOT EXISTS idx_ilo_sdg_mappings_sdg_id ON ilo_sdg_mappings(sdg_id);

-- 4. Default reference data -------------------------------------------

INSERT INTO student_outcomes (so_code, description)
VALUES
    ('SO1', 'Student Outcome 1'),
    ('SO2', 'Student Outcome 2'),
    ('SO6', 'Student Outcome 6')
ON CONFLICT (so_code) DO NOTHING;

INSERT INTO institutional_graduate_attributes (iga_code, description)
VALUES
    ('IGA1', 'Institutional Graduate Attribute 1'),
    ('IGA3', 'Institutional Graduate Attribute 3')
ON CONFLICT (iga_code) DO NOTHING;

INSERT INTO cdio_skills (cdio_code, description)
VALUES
    ('CDIO1', 'CDIO Skill 1'),
    ('CDIO2', 'CDIO Skill 2')
ON CONFLICT (cdio_code) DO NOTHING;

INSERT INTO sdg_skills (sdg_code, description)
VALUES
    ('SDG1', 'SDG Skill 1'),
    ('SDG3', 'SDG Skill 3')
ON CONFLICT (sdg_code) DO NOTHING;

-- 5. Link assessments to syllabi --------------------------------------

-- Add syllabus_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessments' 
        AND column_name = 'syllabus_id'
    ) THEN
        ALTER TABLE assessments ADD COLUMN syllabus_id INTEGER;
    END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_assessments_syllabus'
        AND table_name = 'assessments'
    ) THEN
        ALTER TABLE assessments
        ADD CONSTRAINT fk_assessments_syllabus
        FOREIGN KEY (syllabus_id) REFERENCES syllabi(syllabus_id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_assessments_syllabus_id
  ON assessments(syllabus_id);

COMMIT;
