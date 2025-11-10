-- ==========================================
-- CRMS V2 FINAL DATABASE SCHEMA
-- Complete Schema with ILO Mapping & Syllabus Integration
-- Date: 2025-11-10
-- ==========================================

-- ==========================================
-- 1. SCHOOL SETTINGS
-- ==========================================
-- 01. departments
CREATE TABLE IF NOT EXISTS departments (
    department_id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    department_abbreviation VARCHAR(50) UNIQUE NOT NULL
);

-- 02. programs
CREATE TABLE IF NOT EXISTS programs (
    program_id SERIAL PRIMARY KEY,
    department_id INTEGER,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    program_abbreviation VARCHAR(50) UNIQUE NOT NULL,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE CASCADE
);

-- 03. program_specializations
CREATE TABLE IF NOT EXISTS program_specializations (
    specialization_id SERIAL PRIMARY KEY,
    program_id INTEGER,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    abbreviation VARCHAR(50) UNIQUE NOT NULL,
    FOREIGN KEY (program_id) REFERENCES programs(program_id) ON DELETE CASCADE
);

-- 04. school_terms
CREATE TABLE IF NOT EXISTS school_terms (
    term_id SERIAL PRIMARY KEY,
    school_year VARCHAR(50) NOT NULL,
    semester VARCHAR(10) CHECK (semester IN ('1st', '2nd', 'Summer')),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT FALSE
);

-- 05. sections
CREATE TABLE IF NOT EXISTS sections (
    section_id SERIAL PRIMARY KEY,
    program_id INTEGER,
    specialization_id INTEGER,
    section_code VARCHAR(100) NOT NULL,
    year_level INTEGER CHECK (year_level BETWEEN 1 AND 5),
    term_id INTEGER,
    FOREIGN KEY (program_id) REFERENCES programs(program_id) ON DELETE CASCADE,
    FOREIGN KEY (specialization_id) REFERENCES program_specializations(specialization_id) ON DELETE CASCADE,
    FOREIGN KEY (term_id) REFERENCES school_terms(term_id) ON DELETE CASCADE
);

-- ==========================================
-- 2. USERS & ROLES
-- ==========================================
-- 06. roles
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- 07. users
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role_id INTEGER,
    profile_pic TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE SET NULL
);

-- 08. user_approvals
CREATE TABLE IF NOT EXISTS user_approvals (
    approval_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    approved_by INTEGER,
    approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approval_note TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 09. students
CREATE TABLE IF NOT EXISTS students (
    student_id SERIAL PRIMARY KEY,
    student_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    birth_date DATE,
    contact_email VARCHAR(255),
    student_photo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    user_profile_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE,
    profile_type VARCHAR(50),
    specialization TEXT,
    designation VARCHAR(100),
    office_assigned VARCHAR(255),
    program_id INTEGER,
    department_id INTEGER,
    term_start DATE,
    term_end DATE,
    contact_email VARCHAR(255),
    bio TEXT,
    position TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (program_id) REFERENCES programs(program_id) ON DELETE SET NULL,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL
);

-- ==========================================
-- 3. COURSES & ENROLLMENTS
-- ==========================================
-- 11. courses
CREATE TABLE IF NOT EXISTS courses (
    course_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    course_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    term_id INTEGER,
    specialization_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (term_id) REFERENCES school_terms(term_id) ON DELETE SET NULL,
    FOREIGN KEY (specialization_id) REFERENCES program_specializations(specialization_id) ON DELETE SET NULL
);

-- 12. section_courses
CREATE TABLE IF NOT EXISTS section_courses (
    section_course_id SERIAL PRIMARY KEY,
    section_id INTEGER,
    course_id INTEGER,
    instructor_id INTEGER,
    term_id INTEGER,
    banner_color VARCHAR(7) DEFAULT '#3B82F6',
    banner_image TEXT,
    banner_type VARCHAR(10) DEFAULT 'color' CHECK (banner_type IN ('color', 'image')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES sections(section_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    FOREIGN KEY (instructor_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (term_id) REFERENCES school_terms(term_id) ON DELETE CASCADE
);

-- 13. course_enrollments
CREATE TABLE IF NOT EXISTS course_enrollments (
    enrollment_id SERIAL PRIMARY KEY,
    section_course_id INTEGER,
    student_id INTEGER,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('enrolled', 'dropped', 'completed')),
    FOREIGN KEY (section_course_id) REFERENCES section_courses(section_course_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

-- 14. course_enrollment_requests
CREATE TABLE IF NOT EXISTS course_enrollment_requests (
    enrollment_request_id SERIAL PRIMARY KEY,
    student_id INTEGER,
    current_enrollment_id INTEGER,
    requested_section_course_id INTEGER,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INTEGER,
    reviewed_at TIMESTAMP NULL,
    remarks TEXT,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (current_enrollment_id) REFERENCES course_enrollments(enrollment_id) ON DELETE SET NULL,
    FOREIGN KEY (requested_section_course_id) REFERENCES section_courses(section_course_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ==========================================
-- 4. SYLLABI & ILOs (ENHANCED)
-- ==========================================
-- 15. syllabi (ENHANCED)
CREATE TABLE IF NOT EXISTS syllabi (
    syllabus_id SERIAL PRIMARY KEY,
    course_id INTEGER,
    term_id INTEGER,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assessment_framework JSONB,  -- Predefined assessment structure
    grading_policy JSONB,        -- Grading rules and scales
    course_outline TEXT,         -- Course content outline
    learning_resources TEXT[],   -- Array of resource URLs
    prerequisites TEXT,          -- Course prerequisites
    course_objectives TEXT,      -- Overall course objectives
    version VARCHAR(20) DEFAULT '1.0',  -- Syllabus version
    is_template BOOLEAN DEFAULT FALSE,  -- Whether it's a reusable template
    template_name VARCHAR(100),         -- Template name if applicable
    section_course_id INTEGER,          -- Link to specific section
    created_by INTEGER,
    reviewed_by INTEGER,
    review_status VARCHAR(20) DEFAULT 'pending',
    reviewed_at TIMESTAMP NULL,
    approved_by INTEGER,
    approval_status VARCHAR(20) DEFAULT 'pending',
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    FOREIGN KEY (term_id) REFERENCES school_terms(term_id) ON DELETE CASCADE,
    FOREIGN KEY (section_course_id) REFERENCES section_courses(section_course_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 16. ilos (ENHANCED)
CREATE TABLE IF NOT EXISTS ilos (
    ilo_id SERIAL PRIMARY KEY,
    syllabus_id INTEGER,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    category VARCHAR(50),           -- Knowledge, Skills, Attitudes
    level VARCHAR(20),              -- Basic, Intermediate, Advanced
    weight_percentage FLOAT,        -- Weight in overall assessment
    assessment_methods TEXT[],      -- How this ILO will be assessed
    learning_activities TEXT[],     -- Activities to achieve this ILO
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (syllabus_id) REFERENCES syllabi(syllabus_id) ON DELETE CASCADE
);

-- 17. syllabus_ilos
CREATE TABLE IF NOT EXISTS syllabus_ilos (
    syllabus_id INTEGER,
    ilo_id INTEGER,
    PRIMARY KEY (syllabus_id, ilo_id),
    FOREIGN KEY (syllabus_id) REFERENCES syllabi(syllabus_id) ON DELETE CASCADE,
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE
);

-- ==========================================
-- 5. ILO MAPPING & REFERENCE TABLES (NEW)
-- ==========================================
-- 18. student_outcomes (Reference Table)
CREATE TABLE IF NOT EXISTS student_outcomes (
    so_id SERIAL PRIMARY KEY,
    so_code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 19. institutional_graduate_attributes (Reference Table)
CREATE TABLE IF NOT EXISTS institutional_graduate_attributes (
    iga_id SERIAL PRIMARY KEY,
    iga_code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 20. cdio_skills (Reference Table)
CREATE TABLE IF NOT EXISTS cdio_skills (
    cdio_id SERIAL PRIMARY KEY,
    cdio_code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 21. sdg_skills (Reference Table)
CREATE TABLE IF NOT EXISTS sdg_skills (
    sdg_id SERIAL PRIMARY KEY,
    sdg_code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 22. ilo_so_mappings (Mapping Table)
-- Maps ILOs to Student Outcomes with assessment tasks
CREATE TABLE IF NOT EXISTS ilo_so_mappings (
    mapping_id SERIAL PRIMARY KEY,
    ilo_id INTEGER NOT NULL,
    so_id INTEGER NOT NULL,
    assessment_tasks TEXT[], -- Array of assessment task codes (e.g., ['QZ', 'ME', 'FP'])
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (ilo_id, so_id),
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE,
    FOREIGN KEY (so_id) REFERENCES student_outcomes(so_id) ON DELETE CASCADE
);

-- 23. ilo_iga_mappings (Mapping Table)
-- Maps ILOs to Institutional Graduate Attributes with assessment tasks
CREATE TABLE IF NOT EXISTS ilo_iga_mappings (
    mapping_id SERIAL PRIMARY KEY,
    ilo_id INTEGER NOT NULL,
    iga_id INTEGER NOT NULL,
    assessment_tasks TEXT[], -- Array of assessment task codes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (ilo_id, iga_id),
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE,
    FOREIGN KEY (iga_id) REFERENCES institutional_graduate_attributes(iga_id) ON DELETE CASCADE
);

-- 24. ilo_cdio_mappings (Mapping Table)
-- Maps ILOs to CDIO Skills with assessment tasks
CREATE TABLE IF NOT EXISTS ilo_cdio_mappings (
    mapping_id SERIAL PRIMARY KEY,
    ilo_id INTEGER NOT NULL,
    cdio_id INTEGER NOT NULL,
    assessment_tasks TEXT[], -- Array of assessment task codes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (ilo_id, cdio_id),
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE,
    FOREIGN KEY (cdio_id) REFERENCES cdio_skills(cdio_id) ON DELETE CASCADE
);

-- 25. ilo_sdg_mappings (Mapping Table)
-- Maps ILOs to SDG Skills with assessment tasks
CREATE TABLE IF NOT EXISTS ilo_sdg_mappings (
    mapping_id SERIAL PRIMARY KEY,
    ilo_id INTEGER NOT NULL,
    sdg_id INTEGER NOT NULL,
    assessment_tasks TEXT[], -- Array of assessment task codes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (ilo_id, sdg_id),
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE,
    FOREIGN KEY (sdg_id) REFERENCES sdg_skills(sdg_id) ON DELETE CASCADE
);

-- ==========================================
-- 6. ASSESSMENTS & GRADING (ENHANCED)
-- ==========================================
-- 26. assessment_templates
CREATE TABLE IF NOT EXISTS assessment_templates (
    template_id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) UNIQUE NOT NULL,
    template_type VARCHAR(50),
    description TEXT,
    assessment_structure JSONB,          -- Template structure
    rubric_template JSONB,              -- Default rubric structure
    ilo_coverage TEXT[],                -- ILOs this template covers
    default_weight FLOAT,               -- Default weight percentage
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 27. syllabus_assessment_plans
CREATE TABLE IF NOT EXISTS syllabus_assessment_plans (
    plan_id SERIAL PRIMARY KEY,
    syllabus_id INTEGER NOT NULL,
    assessment_type VARCHAR(50),         -- Quiz, Project, Exam, etc.
    assessment_count INTEGER,            -- Number of assessments of this type
    weight_per_assessment FLOAT,         -- Weight per individual assessment
    total_weight FLOAT,                  -- Total weight for this type
    ilo_coverage TEXT[],                -- ILOs covered by this assessment type
    rubric_template JSONB,              -- Default rubric for this type
    week_distribution INTEGER[],        -- Which weeks these assessments occur
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (syllabus_id) REFERENCES syllabi(syllabus_id) ON DELETE CASCADE
);

-- 28. assessments (ENHANCED - includes syllabus_id)
CREATE TABLE IF NOT EXISTS assessments (
    assessment_id SERIAL PRIMARY KEY,
    syllabus_id INTEGER,                 -- Link to syllabus for reference
    section_course_id INTEGER,
    title VARCHAR(255) NOT NULL,
    description TEXT,                    -- Detailed description
    type VARCHAR(50) NOT NULL,          -- Quiz, Exam, Project, Assignment, Lab, etc.
    category VARCHAR(50),               -- Formative, Summative, Diagnostic
    total_points FLOAT NOT NULL,        -- Maximum possible points
    weight_percentage FLOAT,            -- Weight in final grade (0-100)
    due_date TIMESTAMP,                 -- When assessment is due
    submission_deadline TIMESTAMP,      -- Last submission time
    is_published BOOLEAN DEFAULT FALSE, -- Whether students can see it
    is_graded BOOLEAN DEFAULT FALSE,    -- Whether grading is complete
    grading_method VARCHAR(50),         -- Rubric, Points, Percentage
    instructions TEXT,                  -- Instructions for students
    content_data JSONB,                 -- Actual assessment content
    status VARCHAR(20) DEFAULT 'planned', -- planned, draft, active, submissions_closed, grading, graded, archived
    created_by INTEGER,                 -- Who created the assessment
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (syllabus_id) REFERENCES syllabi(syllabus_id) ON DELETE SET NULL,
    FOREIGN KEY (section_course_id) REFERENCES section_courses(section_course_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 29. rubrics (ENHANCED)
CREATE TABLE IF NOT EXISTS rubrics (
    rubric_id SERIAL PRIMARY KEY,
    syllabus_id INTEGER,                 -- Link to syllabus for reference
    assessment_id INTEGER,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    criterion TEXT NOT NULL,
    max_score FLOAT,
    rubric_type VARCHAR(50),            -- Template, Custom, Standard
    performance_levels JSONB,           -- Excellent, Good, Fair, Poor descriptions
    is_template BOOLEAN DEFAULT FALSE,  -- Whether it's a reusable template
    template_name VARCHAR(100),         -- Template name if applicable
    criteria_order INTEGER,             -- Order of criteria
    ilo_id INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (syllabus_id) REFERENCES syllabi(syllabus_id) ON DELETE CASCADE,
    FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id) ON DELETE CASCADE,
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE SET NULL
);

-- 30. assessment_rubrics
CREATE TABLE IF NOT EXISTS assessment_rubrics (
    assessment_id INTEGER,
    rubric_id INTEGER,
    PRIMARY KEY (assessment_id, rubric_id),
    FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id) ON DELETE CASCADE,
    FOREIGN KEY (rubric_id) REFERENCES rubrics(rubric_id) ON DELETE CASCADE
);

-- 31. submissions (ENHANCED)
CREATE TABLE IF NOT EXISTS submissions (
    submission_id SERIAL PRIMARY KEY,
    enrollment_id INTEGER,
    assessment_id INTEGER,
    submission_type VARCHAR(50) DEFAULT 'file',  -- File, Text, Link, etc.
    submission_data JSONB,              -- Flexible submission content
    file_urls TEXT[],                   -- Array of file URLs
    total_score FLOAT,
    raw_score FLOAT,                    -- Score before any adjustments
    adjusted_score FLOAT,               -- Score after adjustments
    late_penalty FLOAT DEFAULT 0,       -- Penalty for late submission
    graded_at TIMESTAMP,                -- When it was graded
    graded_by INTEGER,                  -- Who graded it
    status VARCHAR(20) DEFAULT 'submitted', -- submitted, graded, late, etc. (workflow status)
    submission_status VARCHAR(20) DEFAULT 'missing' CHECK (submission_status IN ('ontime', 'late', 'missing')), -- Submission timeliness status
    remarks TEXT,
    FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(enrollment_id) ON DELETE CASCADE,
    FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 32. rubric_scores
CREATE TABLE IF NOT EXISTS rubric_scores (
    rubric_score_id SERIAL PRIMARY KEY,
    submission_id INTEGER,
    rubric_id INTEGER,
    score FLOAT CHECK (score >= 0),
    feedback TEXT,
    remarks TEXT,
    FOREIGN KEY (submission_id) REFERENCES submissions(submission_id) ON DELETE CASCADE,
    FOREIGN KEY (rubric_id) REFERENCES rubrics(rubric_id) ON DELETE CASCADE
);

-- 33. grade_adjustments
CREATE TABLE IF NOT EXISTS grade_adjustments (
    adjustment_id SERIAL PRIMARY KEY,
    submission_id INTEGER,
    adjustment_type VARCHAR(50),        -- late_penalty, curve, etc.
    adjustment_amount FLOAT,
    reason TEXT,
    applied_by INTEGER,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES submissions(submission_id) ON DELETE CASCADE,
    FOREIGN KEY (applied_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 34. course_final_grades
CREATE TABLE IF NOT EXISTS course_final_grades (
    final_grade_id SERIAL PRIMARY KEY,
    enrollment_id INTEGER,
    final_score FLOAT,
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(enrollment_id) ON DELETE CASCADE
);

-- ==========================================
-- 7. ATTENDANCE & ANALYTICS
-- ==========================================
-- 35. sessions
CREATE TABLE IF NOT EXISTS sessions (
    session_id SERIAL PRIMARY KEY,
    section_course_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    session_date DATE NOT NULL,
    session_type VARCHAR(50),   -- e.g., Lecture, Laboratory, etc.
    meeting_type VARCHAR(50),   -- e.g., Face-to-Face, Online, Hybrid, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_course_id) REFERENCES section_courses(section_course_id) ON DELETE CASCADE
);

-- 36. attendance_logs
CREATE TABLE IF NOT EXISTS attendance_logs (
    attendance_id SERIAL PRIMARY KEY,
    enrollment_id INTEGER,
    session_id INTEGER,
    status VARCHAR(20),
    session_date DATE,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT,
    FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(enrollment_id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

-- 37. analytics_clusters
CREATE TABLE IF NOT EXISTS analytics_clusters (
    cluster_id SERIAL PRIMARY KEY,
    enrollment_id INTEGER,
    cluster_label VARCHAR(100),
    based_on JSONB,
    algorithm_used VARCHAR(100),
    model_version VARCHAR(50),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(enrollment_id) ON DELETE CASCADE
);

-- 38. dashboards_data_cache
CREATE TABLE IF NOT EXISTS dashboards_data_cache (
    cache_id SERIAL PRIMARY KEY,
    type VARCHAR(50),
    course_id INTEGER,
    data_json JSONB,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

-- ==========================================
-- 8. ILO TRACKING
-- ==========================================
-- 39. assessment_ilo_weights
CREATE TABLE IF NOT EXISTS assessment_ilo_weights (
    assessment_ilo_weight_id SERIAL PRIMARY KEY,
    assessment_id INTEGER,
    ilo_id INTEGER,
    weight_percentage FLOAT CHECK (weight_percentage >= 0 AND weight_percentage <= 100),
    FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id) ON DELETE CASCADE,
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE
);

-- 40. student_ilo_scores
CREATE TABLE IF NOT EXISTS student_ilo_scores (
    student_ilo_score_id SERIAL PRIMARY KEY,
    enrollment_id INTEGER,
    ilo_id INTEGER,
    score FLOAT,
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(enrollment_id) ON DELETE CASCADE,
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE
);

-- ==========================================
-- 9. NOTIFICATION & FILES
-- ==========================================
-- 41. notifications
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 42. uploads
CREATE TABLE IF NOT EXISTS uploads (
    upload_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    file_url TEXT,
    file_type VARCHAR(50),
    related_type VARCHAR(50),
    related_id INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Syllabi indexes
CREATE INDEX IF NOT EXISTS idx_syllabi_course_id ON syllabi(course_id);
CREATE INDEX IF NOT EXISTS idx_syllabi_section_course_id ON syllabi(section_course_id);
CREATE INDEX IF NOT EXISTS idx_syllabi_approval_status ON syllabi(approval_status);
CREATE INDEX IF NOT EXISTS idx_syllabi_review_status ON syllabi(review_status);
CREATE INDEX IF NOT EXISTS idx_syllabi_created_by ON syllabi(created_by);

-- ILOs indexes
CREATE INDEX IF NOT EXISTS idx_ilos_syllabus_id ON ilos(syllabus_id);
CREATE INDEX IF NOT EXISTS idx_ilos_code ON ilos(code);
CREATE INDEX IF NOT EXISTS idx_ilos_category ON ilos(category);
CREATE INDEX IF NOT EXISTS idx_ilos_is_active ON ilos(is_active);

-- ILO Mapping indexes
CREATE INDEX IF NOT EXISTS idx_ilo_so_mappings_ilo_id ON ilo_so_mappings(ilo_id);
CREATE INDEX IF NOT EXISTS idx_ilo_so_mappings_so_id ON ilo_so_mappings(so_id);
CREATE INDEX IF NOT EXISTS idx_ilo_iga_mappings_ilo_id ON ilo_iga_mappings(ilo_id);
CREATE INDEX IF NOT EXISTS idx_ilo_iga_mappings_iga_id ON ilo_iga_mappings(iga_id);
CREATE INDEX IF NOT EXISTS idx_ilo_cdio_mappings_ilo_id ON ilo_cdio_mappings(ilo_id);
CREATE INDEX IF NOT EXISTS idx_ilo_cdio_mappings_cdio_id ON ilo_cdio_mappings(cdio_id);
CREATE INDEX IF NOT EXISTS idx_ilo_sdg_mappings_ilo_id ON ilo_sdg_mappings(ilo_id);
CREATE INDEX IF NOT EXISTS idx_ilo_sdg_mappings_sdg_id ON ilo_sdg_mappings(sdg_id);

-- Reference tables indexes
CREATE INDEX IF NOT EXISTS idx_student_outcomes_so_code ON student_outcomes(so_code);
CREATE INDEX IF NOT EXISTS idx_student_outcomes_is_active ON student_outcomes(is_active);
CREATE INDEX IF NOT EXISTS idx_institutional_graduate_attributes_iga_code ON institutional_graduate_attributes(iga_code);
CREATE INDEX IF NOT EXISTS idx_institutional_graduate_attributes_is_active ON institutional_graduate_attributes(is_active);
CREATE INDEX IF NOT EXISTS idx_cdio_skills_cdio_code ON cdio_skills(cdio_code);
CREATE INDEX IF NOT EXISTS idx_cdio_skills_is_active ON cdio_skills(is_active);
CREATE INDEX IF NOT EXISTS idx_sdg_skills_sdg_code ON sdg_skills(sdg_code);
CREATE INDEX IF NOT EXISTS idx_sdg_skills_is_active ON sdg_skills(is_active);

-- Assessment templates indexes
CREATE INDEX IF NOT EXISTS idx_assessment_templates_type ON assessment_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_assessment_templates_active ON assessment_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_assessment_templates_created_by ON assessment_templates(created_by);

-- Syllabus assessment plans indexes
CREATE INDEX IF NOT EXISTS idx_syllabus_assessment_plans_syllabus ON syllabus_assessment_plans(syllabus_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_assessment_plans_type ON syllabus_assessment_plans(assessment_type);

-- Assessments indexes
CREATE INDEX IF NOT EXISTS idx_assessments_syllabus_id ON assessments(syllabus_id);
CREATE INDEX IF NOT EXISTS idx_assessments_section_course_id ON assessments(section_course_id);
CREATE INDEX IF NOT EXISTS idx_assessments_type ON assessments(type);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_due_date ON assessments(due_date);
CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON assessments(created_by);

-- Rubrics indexes
CREATE INDEX IF NOT EXISTS idx_rubrics_syllabus_id ON rubrics(syllabus_id);
CREATE INDEX IF NOT EXISTS idx_rubrics_assessment_id ON rubrics(assessment_id);
CREATE INDEX IF NOT EXISTS idx_rubrics_ilo_id ON rubrics(ilo_id);
CREATE INDEX IF NOT EXISTS idx_rubrics_type ON rubrics(rubric_type);

-- Submissions indexes
CREATE INDEX IF NOT EXISTS idx_submissions_enrollment_id ON submissions(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assessment_id ON submissions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_submission_status ON submissions(submission_status);
CREATE INDEX IF NOT EXISTS idx_submissions_graded_by ON submissions(graded_by);

-- Rubric scores indexes
CREATE INDEX IF NOT EXISTS idx_rubric_scores_submission_id ON rubric_scores(submission_id);
CREATE INDEX IF NOT EXISTS idx_rubric_scores_rubric_id ON rubric_scores(rubric_id);

-- Grade adjustments indexes
CREATE INDEX IF NOT EXISTS idx_grade_adjustments_submission_id ON grade_adjustments(submission_id);
CREATE INDEX IF NOT EXISTS idx_grade_adjustments_type ON grade_adjustments(adjustment_type);

-- Course final grades indexes
CREATE INDEX IF NOT EXISTS idx_course_final_grades_enrollment_id ON course_final_grades(enrollment_id);

-- Assessment ILO weights indexes
CREATE INDEX IF NOT EXISTS idx_assessment_ilo_weights_assessment_id ON assessment_ilo_weights(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_ilo_weights_ilo_id ON assessment_ilo_weights(ilo_id);

-- Student ILO scores indexes
CREATE INDEX IF NOT EXISTS idx_student_ilo_scores_enrollment_id ON student_ilo_scores(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_student_ilo_scores_ilo_id ON student_ilo_scores(ilo_id);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_section_course_id ON sessions(section_course_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(session_date);

-- Attendance logs indexes
CREATE INDEX IF NOT EXISTS idx_attendance_logs_enrollment_id ON attendance_logs(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_session_id ON attendance_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_date ON attendance_logs(session_date);

-- Analytics clusters indexes
CREATE INDEX IF NOT EXISTS idx_analytics_clusters_enrollment_id ON analytics_clusters(enrollment_id);

-- Dashboards data cache indexes
CREATE INDEX IF NOT EXISTS idx_dashboards_data_cache_type ON dashboards_data_cache(type);
CREATE INDEX IF NOT EXISTS idx_dashboards_data_cache_course_id ON dashboards_data_cache(course_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Uploads indexes
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_related_type ON uploads(related_type);
CREATE INDEX IF NOT EXISTS idx_uploads_related_id ON uploads(related_id);

-- Students indexes
CREATE INDEX IF NOT EXISTS idx_students_full_name_lower ON students (LOWER(full_name));
CREATE INDEX IF NOT EXISTS idx_students_contact_email ON students(contact_email);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at);
CREATE INDEX IF NOT EXISTS idx_students_gender ON students(gender);
CREATE INDEX IF NOT EXISTS idx_students_birth_date ON students(birth_date);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved);

-- Courses indexes
CREATE INDEX IF NOT EXISTS idx_courses_course_code ON courses(course_code);
CREATE INDEX IF NOT EXISTS idx_courses_term_id ON courses(term_id);
CREATE INDEX IF NOT EXISTS idx_courses_specialization_id ON courses(specialization_id);

-- Section courses indexes
CREATE INDEX IF NOT EXISTS idx_section_courses_section_id ON section_courses(section_id);
CREATE INDEX IF NOT EXISTS idx_section_courses_course_id ON section_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_section_courses_instructor_id ON section_courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_section_courses_term_id ON section_courses(term_id);

-- Enrollments indexes
CREATE INDEX IF NOT EXISTS idx_course_enrollments_section_course_id ON course_enrollments(section_course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student_id ON course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON course_enrollments(status);

-- ==========================================
-- DEFAULT REFERENCE DATA
-- ==========================================

-- Student Outcomes
INSERT INTO student_outcomes (so_code, description) VALUES
    ('SO1', 'Student Outcome 1'),
    ('SO2', 'Student Outcome 2'),
    ('SO6', 'Student Outcome 6')
ON CONFLICT (so_code) DO NOTHING;

-- Institutional Graduate Attributes
INSERT INTO institutional_graduate_attributes (iga_code, description) VALUES
    ('IGA1', 'Institutional Graduate Attribute 1'),
    ('IGA3', 'Institutional Graduate Attribute 3')
ON CONFLICT (iga_code) DO NOTHING;

-- CDIO Skills
INSERT INTO cdio_skills (cdio_code, description) VALUES
    ('CDIO1', 'CDIO Skill 1'),
    ('CDIO2', 'CDIO Skill 2')
ON CONFLICT (cdio_code) DO NOTHING;

-- SDG Skills
INSERT INTO sdg_skills (sdg_code, description) VALUES
    ('SDG1', 'SDG Skill 1'),
    ('SDG3', 'SDG Skill 3')
ON CONFLICT (sdg_code) DO NOTHING;

-- ==========================================
-- END OF SCHEMA
-- ==========================================

