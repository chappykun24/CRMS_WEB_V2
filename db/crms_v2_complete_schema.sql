-- ==========================================
-- CRMS V2 Complete Database Schema
-- Includes ALL tables (including empty ones for future reference)
-- Generated from actual Neon database analysis
-- ==========================================

-- ==========================================
-- 1. SCHOOL SETTINGS
-- ==========================================

-- Departments
CREATE TABLE IF NOT EXISTS departments (
    department_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    department_abbreviation VARCHAR(50) NOT NULL UNIQUE
);

-- Programs
CREATE TABLE IF NOT EXISTS programs (
    program_id SERIAL PRIMARY KEY,
    department_id INTEGER,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    program_abbreviation VARCHAR(50) NOT NULL UNIQUE,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE CASCADE
);

-- Program Specializations
CREATE TABLE IF NOT EXISTS program_specializations (
    specialization_id SERIAL PRIMARY KEY,
    program_id INTEGER,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    abbreviation VARCHAR(50) NOT NULL UNIQUE,
    FOREIGN KEY (program_id) REFERENCES programs(program_id) ON DELETE CASCADE
);

-- School Terms
CREATE TABLE IF NOT EXISTS school_terms (
    term_id SERIAL PRIMARY KEY,
    school_year VARCHAR(50) NOT NULL,
    semester VARCHAR(10),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT FALSE
);

-- Sections
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

-- Roles
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- Users (Actual schema from database - uses 'name' and 'is_approved')
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id INTEGER,
    profile_pic TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE SET NULL
);

-- User Approvals
CREATE TABLE IF NOT EXISTS user_approvals (
    approval_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    approved_by INTEGER,
    approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approval_note TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- User Profiles
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

-- Students
CREATE TABLE IF NOT EXISTS students (
    student_id SERIAL PRIMARY KEY,
    student_number VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    birth_date DATE,
    contact_email VARCHAR(255),
    student_photo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. COURSES & ENROLLMENTS
-- ==========================================

-- Courses
CREATE TABLE IF NOT EXISTS courses (
    course_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    course_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    term_id INTEGER,
    specialization_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (term_id) REFERENCES school_terms(term_id) ON DELETE SET NULL,
    FOREIGN KEY (specialization_id) REFERENCES program_specializations(specialization_id) ON DELETE SET NULL
);

-- Section Courses (Classes)
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

-- Course Enrollments
CREATE TABLE IF NOT EXISTS course_enrollments (
    enrollment_id SERIAL PRIMARY KEY,
    section_course_id INTEGER,
    student_id INTEGER,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20),
    FOREIGN KEY (section_course_id) REFERENCES section_courses(section_course_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

-- Course Enrollment Requests (Empty - for future use)
CREATE TABLE IF NOT EXISTS course_enrollment_requests (
    enrollment_request_id SERIAL PRIMARY KEY,
    student_id INTEGER,
    current_enrollment_id INTEGER,
    requested_section_course_id INTEGER,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INTEGER,
    reviewed_at TIMESTAMP,
    remarks TEXT,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (current_enrollment_id) REFERENCES course_enrollments(enrollment_id) ON DELETE CASCADE,
    FOREIGN KEY (requested_section_course_id) REFERENCES section_courses(section_course_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Course Final Grades (Empty - for future use)
CREATE TABLE IF NOT EXISTS course_final_grades (
    final_grade_id SERIAL PRIMARY KEY,
    enrollment_id INTEGER,
    final_score DOUBLE PRECISION,
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(enrollment_id) ON DELETE CASCADE
);

-- ==========================================
-- 4. SYLLABI & ILOS
-- ==========================================

-- Syllabi
CREATE TABLE IF NOT EXISTS syllabi (
    syllabus_id SERIAL PRIMARY KEY,
    course_id INTEGER,
    term_id INTEGER,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assessment_framework JSONB,
    grading_policy JSONB,
    course_outline TEXT,
    learning_resources TEXT[],
    prerequisites TEXT,
    course_objectives TEXT,
    version VARCHAR(20) DEFAULT '1.0',
    is_template BOOLEAN DEFAULT FALSE,
    template_name VARCHAR(100),
    section_course_id INTEGER,
    created_by INTEGER,
    reviewed_by INTEGER,
    review_status VARCHAR(20) DEFAULT 'pending',
    reviewed_at TIMESTAMP,
    approved_by INTEGER,
    approval_status VARCHAR(20) DEFAULT 'pending',
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    FOREIGN KEY (term_id) REFERENCES school_terms(term_id) ON DELETE CASCADE,
    FOREIGN KEY (section_course_id) REFERENCES section_courses(section_course_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Syllabus Edit Requests (Used in code - keep for active feature)
CREATE TABLE IF NOT EXISTS syllabus_edit_requests (
    edit_request_id SERIAL PRIMARY KEY,
    syllabus_id INTEGER NOT NULL,
    requested_by INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    dean_approved BOOLEAN DEFAULT FALSE,
    program_chair_approved BOOLEAN DEFAULT FALSE,
    dean_approved_by INTEGER,
    program_chair_approved_by INTEGER,
    dean_approved_at TIMESTAMP,
    program_chair_approved_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (syllabus_id) REFERENCES syllabi(syllabus_id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (dean_approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (program_chair_approved_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Syllabus ILOs (Junction table - Empty but may be used)
CREATE TABLE IF NOT EXISTS syllabus_ilos (
    syllabus_id INTEGER NOT NULL,
    ilo_id INTEGER NOT NULL,
    PRIMARY KEY (syllabus_id, ilo_id),
    FOREIGN KEY (syllabus_id) REFERENCES syllabi(syllabus_id) ON DELETE CASCADE,
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE
);

-- Syllabus Assessment Plans (Empty - for future use)
CREATE TABLE IF NOT EXISTS syllabus_assessment_plans (
    plan_id SERIAL PRIMARY KEY,
    syllabus_id INTEGER NOT NULL,
    assessment_type VARCHAR(50),
    assessment_count INTEGER,
    weight_per_assessment DOUBLE PRECISION,
    total_weight DOUBLE PRECISION,
    ilo_coverage TEXT[],
    rubric_template JSONB,
    week_distribution TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (syllabus_id) REFERENCES syllabi(syllabus_id) ON DELETE CASCADE
);

-- ILOs (Intended Learning Outcomes)
CREATE TABLE IF NOT EXISTS ilos (
    ilo_id SERIAL PRIMARY KEY,
    syllabus_id INTEGER,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    level VARCHAR(20),
    weight_percentage DOUBLE PRECISION,
    assessment_methods TEXT[],
    learning_activities TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (syllabus_id) REFERENCES syllabi(syllabus_id) ON DELETE CASCADE
);

-- Student Outcomes
CREATE TABLE IF NOT EXISTS student_outcomes (
    so_id SERIAL PRIMARY KEY,
    so_code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Institutional Graduate Attributes
CREATE TABLE IF NOT EXISTS institutional_graduate_attributes (
    iga_id SERIAL PRIMARY KEY,
    iga_code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CDIO Skills
CREATE TABLE IF NOT EXISTS cdio_skills (
    cdio_id SERIAL PRIMARY KEY,
    cdio_code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SDG Skills
CREATE TABLE IF NOT EXISTS sdg_skills (
    sdg_id SERIAL PRIMARY KEY,
    sdg_code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ILO Mappings
CREATE TABLE IF NOT EXISTS ilo_so_mappings (
    mapping_id SERIAL PRIMARY KEY,
    ilo_id INTEGER NOT NULL,
    so_id INTEGER NOT NULL,
    assessment_tasks TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE,
    FOREIGN KEY (so_id) REFERENCES student_outcomes(so_id) ON DELETE CASCADE,
    UNIQUE(ilo_id, so_id)
);

CREATE TABLE IF NOT EXISTS ilo_iga_mappings (
    mapping_id SERIAL PRIMARY KEY,
    ilo_id INTEGER NOT NULL,
    iga_id INTEGER NOT NULL,
    assessment_tasks TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE,
    FOREIGN KEY (iga_id) REFERENCES institutional_graduate_attributes(iga_id) ON DELETE CASCADE,
    UNIQUE(ilo_id, iga_id)
);

CREATE TABLE IF NOT EXISTS ilo_cdio_mappings (
    mapping_id SERIAL PRIMARY KEY,
    ilo_id INTEGER NOT NULL,
    cdio_id INTEGER NOT NULL,
    assessment_tasks TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE,
    FOREIGN KEY (cdio_id) REFERENCES cdio_skills(cdio_id) ON DELETE CASCADE,
    UNIQUE(ilo_id, cdio_id)
);

-- ILO SDG Mappings (Used in code - keep for active feature)
CREATE TABLE IF NOT EXISTS ilo_sdg_mappings (
    mapping_id SERIAL PRIMARY KEY,
    ilo_id INTEGER NOT NULL,
    sdg_id INTEGER NOT NULL,
    assessment_tasks TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE,
    FOREIGN KEY (sdg_id) REFERENCES sdg_skills(sdg_id) ON DELETE CASCADE,
    UNIQUE(ilo_id, sdg_id)
);

-- Student ILO Scores (Empty - for future use)
CREATE TABLE IF NOT EXISTS student_ilo_scores (
    student_ilo_score_id SERIAL PRIMARY KEY,
    enrollment_id INTEGER,
    ilo_id INTEGER,
    score DOUBLE PRECISION,
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(enrollment_id) ON DELETE CASCADE,
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE
);

-- ==========================================
-- 5. ASSESSMENTS & GRADING
-- ==========================================

-- Assessments
CREATE TABLE IF NOT EXISTS assessments (
    assessment_id SERIAL PRIMARY KEY,
    syllabus_id INTEGER,
    section_course_id INTEGER,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    total_points DOUBLE PRECISION NOT NULL,
    weight_percentage DOUBLE PRECISION,
    due_date TIMESTAMP,
    submission_deadline TIMESTAMP,
    is_published BOOLEAN DEFAULT FALSE,
    is_graded BOOLEAN DEFAULT FALSE,
    grading_method VARCHAR(50),
    instructions TEXT,
    content_data JSONB,
    status VARCHAR(20) DEFAULT 'planned',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (syllabus_id) REFERENCES syllabi(syllabus_id) ON DELETE CASCADE,
    FOREIGN KEY (section_course_id) REFERENCES section_courses(section_course_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Assessment Templates (Empty - for future use)
CREATE TABLE IF NOT EXISTS assessment_templates (
    template_id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL UNIQUE,
    template_type VARCHAR(50),
    description TEXT,
    assessment_structure JSONB,
    rubric_template JSONB,
    ilo_coverage TEXT[],
    default_weight DOUBLE PRECISION,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Assessment ILO Weights (Empty - for future use)
CREATE TABLE IF NOT EXISTS assessment_ilo_weights (
    assessment_ilo_weight_id SERIAL PRIMARY KEY,
    assessment_id INTEGER,
    ilo_id INTEGER,
    weight_percentage DOUBLE PRECISION,
    FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id) ON DELETE CASCADE,
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE
);

-- Rubrics (Empty - for future use)
CREATE TABLE IF NOT EXISTS rubrics (
    rubric_id SERIAL PRIMARY KEY,
    syllabus_id INTEGER,
    assessment_id INTEGER,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    criterion TEXT NOT NULL,
    max_score DOUBLE PRECISION,
    rubric_type VARCHAR(50),
    performance_levels JSONB,
    is_template BOOLEAN DEFAULT FALSE,
    template_name VARCHAR(100),
    criteria_order INTEGER,
    ilo_id INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (syllabus_id) REFERENCES syllabi(syllabus_id) ON DELETE CASCADE,
    FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id) ON DELETE CASCADE,
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE
);

-- Assessment Rubrics (Empty - for future use)
CREATE TABLE IF NOT EXISTS assessment_rubrics (
    assessment_id INTEGER NOT NULL,
    rubric_id INTEGER NOT NULL,
    PRIMARY KEY (assessment_id, rubric_id),
    FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id) ON DELETE CASCADE,
    FOREIGN KEY (rubric_id) REFERENCES rubrics(rubric_id) ON DELETE CASCADE
);

-- Rubric Scores (Empty - for future use)
CREATE TABLE IF NOT EXISTS rubric_scores (
    rubric_score_id SERIAL PRIMARY KEY,
    submission_id INTEGER,
    rubric_id INTEGER,
    score DOUBLE PRECISION,
    feedback TEXT,
    remarks TEXT,
    FOREIGN KEY (submission_id) REFERENCES submissions(submission_id) ON DELETE CASCADE,
    FOREIGN KEY (rubric_id) REFERENCES rubrics(rubric_id) ON DELETE CASCADE
);

-- Submissions
CREATE TABLE IF NOT EXISTS submissions (
    submission_id SERIAL PRIMARY KEY,
    enrollment_id INTEGER,
    assessment_id INTEGER,
    submission_type VARCHAR(50) DEFAULT 'file',
    submission_data JSONB,
    file_urls TEXT[],
    total_score DOUBLE PRECISION,
    raw_score DOUBLE PRECISION,
    adjusted_score DOUBLE PRECISION,
    late_penalty DOUBLE PRECISION DEFAULT 0,
    graded_at TIMESTAMP,
    graded_by INTEGER,
    status VARCHAR(20) DEFAULT 'submitted',
    remarks TEXT,
    submission_status VARCHAR(20) DEFAULT 'missing',
    FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(enrollment_id) ON DELETE CASCADE,
    FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Grade Adjustments (Empty - for future use)
CREATE TABLE IF NOT EXISTS grade_adjustments (
    adjustment_id SERIAL PRIMARY KEY,
    submission_id INTEGER,
    adjustment_type VARCHAR(50),
    adjustment_amount DOUBLE PRECISION,
    reason TEXT,
    applied_by INTEGER,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES submissions(submission_id) ON DELETE CASCADE,
    FOREIGN KEY (applied_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ==========================================
-- 6. ATTENDANCE & SESSIONS
-- ==========================================

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
    session_id SERIAL PRIMARY KEY,
    section_course_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    session_date DATE NOT NULL,
    session_type VARCHAR(50),
    meeting_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_course_id) REFERENCES section_courses(section_course_id) ON DELETE CASCADE
);

-- Attendance Logs
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

-- ==========================================
-- 7. ANALYTICS & CLUSTERING
-- ==========================================

-- Analytics Clusters
CREATE TABLE IF NOT EXISTS analytics_clusters (
    cluster_id SERIAL PRIMARY KEY,
    enrollment_id INTEGER,
    student_id INTEGER,
    term_id INTEGER,
    section_course_id INTEGER,
    cluster_label VARCHAR(100),
    cluster_number INTEGER,
    based_on JSONB,
    algorithm_used VARCHAR(100),
    model_version VARCHAR(50),
    silhouette_score NUMERIC,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(enrollment_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (term_id) REFERENCES school_terms(term_id) ON DELETE CASCADE,
    FOREIGN KEY (section_course_id) REFERENCES section_courses(section_course_id) ON DELETE CASCADE
);

-- Dashboards Data Cache (Empty - for future use)
CREATE TABLE IF NOT EXISTS dashboards_data_cache (
    cache_id SERIAL PRIMARY KEY,
    type VARCHAR(50),
    course_id INTEGER,
    data_json JSONB,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

-- ==========================================
-- 8. NOTIFICATIONS & UPLOADS
-- ==========================================

-- Notifications (Empty - for future use)
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Uploads (Empty - for future use)
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

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved);

-- Section Courses indexes
CREATE INDEX IF NOT EXISTS idx_section_courses_instructor_id ON section_courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_section_courses_term_id ON section_courses(term_id);
CREATE INDEX IF NOT EXISTS idx_section_courses_section_id ON section_courses(section_id);
CREATE INDEX IF NOT EXISTS idx_section_courses_course_id ON section_courses(course_id);

-- Enrollments indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_section_course_id ON course_enrollments(section_course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON course_enrollments(student_id);

-- Assessments indexes
CREATE INDEX IF NOT EXISTS idx_assessments_section_course_id ON assessments(section_course_id);
CREATE INDEX IF NOT EXISTS idx_assessments_syllabus_id ON assessments(syllabus_id);
CREATE INDEX IF NOT EXISTS idx_assessments_type ON assessments(type);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_due_date ON assessments(due_date);
CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON assessments(created_by);

-- Submissions indexes
CREATE INDEX IF NOT EXISTS idx_submissions_enrollment_id ON submissions(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assessment_id ON submissions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submission_status ON submissions(submission_status);

-- Syllabi indexes
CREATE INDEX IF NOT EXISTS idx_syllabi_section_course_id ON syllabi(section_course_id);
CREATE INDEX IF NOT EXISTS idx_syllabi_course_id ON syllabi(course_id);
CREATE INDEX IF NOT EXISTS idx_syllabi_approval_status ON syllabi(approval_status);
CREATE INDEX IF NOT EXISTS idx_syllabi_created_by ON syllabi(created_by);

-- Syllabus Edit Requests indexes
CREATE INDEX IF NOT EXISTS idx_syllabus_edit_requests_syllabus_id ON syllabus_edit_requests(syllabus_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_edit_requests_requested_by ON syllabus_edit_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_syllabus_edit_requests_status ON syllabus_edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_syllabus_edit_requests_dean_approved ON syllabus_edit_requests(dean_approved) WHERE dean_approved = FALSE;
CREATE INDEX IF NOT EXISTS idx_syllabus_edit_requests_program_chair_approved ON syllabus_edit_requests(program_chair_approved) WHERE program_chair_approved = FALSE;

-- ILOs indexes
CREATE INDEX IF NOT EXISTS idx_ilos_syllabus_id ON ilos(syllabus_id);
CREATE INDEX IF NOT EXISTS idx_ilos_code ON ilos(code);
CREATE INDEX IF NOT EXISTS idx_ilos_category ON ilos(category);

-- ILO Mappings indexes
CREATE INDEX IF NOT EXISTS idx_ilo_so_mappings_ilo_id ON ilo_so_mappings(ilo_id);
CREATE INDEX IF NOT EXISTS idx_ilo_so_mappings_so_id ON ilo_so_mappings(so_id);
CREATE INDEX IF NOT EXISTS idx_ilo_iga_mappings_ilo_id ON ilo_iga_mappings(ilo_id);
CREATE INDEX IF NOT EXISTS idx_ilo_iga_mappings_iga_id ON ilo_iga_mappings(iga_id);
CREATE INDEX IF NOT EXISTS idx_ilo_cdio_mappings_ilo_id ON ilo_cdio_mappings(ilo_id);
CREATE INDEX IF NOT EXISTS idx_ilo_cdio_mappings_cdio_id ON ilo_cdio_mappings(cdio_id);
CREATE INDEX IF NOT EXISTS idx_ilo_sdg_mappings_ilo_id ON ilo_sdg_mappings(ilo_id);
CREATE INDEX IF NOT EXISTS idx_ilo_sdg_mappings_sdg_id ON ilo_sdg_mappings(sdg_id);

-- Students indexes
CREATE INDEX IF NOT EXISTS idx_students_student_number ON students(student_number);
CREATE INDEX IF NOT EXISTS idx_students_full_name_lower ON students(LOWER(full_name));
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at);
CREATE INDEX IF NOT EXISTS idx_students_gender ON students(gender);
CREATE INDEX IF NOT EXISTS idx_students_birth_date ON students(birth_date);

-- Analytics Clusters indexes
CREATE INDEX IF NOT EXISTS idx_analytics_clusters_student_id ON analytics_clusters(student_id);
CREATE INDEX IF NOT EXISTS idx_analytics_clusters_term_id ON analytics_clusters(term_id);
CREATE INDEX IF NOT EXISTS idx_analytics_clusters_section_course_id ON analytics_clusters(section_course_id) WHERE section_course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_clusters_generated_at ON analytics_clusters(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_clusters_silhouette_score ON analytics_clusters(silhouette_score DESC) WHERE silhouette_score IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_clusters_student_term ON analytics_clusters(student_id, term_id) WHERE student_id IS NOT NULL AND term_id IS NOT NULL AND section_course_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_clusters_student_term_section_course ON analytics_clusters(student_id, term_id, section_course_id) WHERE student_id IS NOT NULL AND term_id IS NOT NULL AND section_course_id IS NOT NULL;

-- Assessment Templates indexes
CREATE INDEX IF NOT EXISTS idx_assessment_templates_active ON assessment_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_assessment_templates_created_by ON assessment_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_assessment_templates_type ON assessment_templates(template_type);

-- Rubrics indexes
CREATE INDEX IF NOT EXISTS idx_rubrics_assessment_id ON rubrics(assessment_id);
CREATE INDEX IF NOT EXISTS idx_rubrics_ilo_id ON rubrics(ilo_id);
CREATE INDEX IF NOT EXISTS idx_rubrics_syllabus_id ON rubrics(syllabus_id);
CREATE INDEX IF NOT EXISTS idx_rubrics_type ON rubrics(rubric_type);

-- ==========================================
-- NOTES
-- ==========================================
-- 
-- This schema includes ALL 43 tables from the database:
-- 
-- ACTIVE TABLES (with data):
-- - analytics_clusters (98 rows)
-- - assessments (55 rows)
-- - attendance_logs (1,072 rows)
-- - cdio_skills (2 rows)
-- - course_enrollments (134 rows)
-- - courses (68 rows)
-- - departments (1 row)
-- - ilo_cdio_mappings (32 rows)
-- - ilo_iga_mappings (40 rows)
-- - ilo_so_mappings (48 rows)
-- - ilos (20 rows)
-- - institutional_graduate_attributes (2 rows)
-- - program_specializations (4 rows)
-- - programs (1 row)
-- - roles (5 rows)
-- - school_terms (3 rows)
-- - sdg_skills (2 rows)
-- - section_courses (5 rows)
-- - sections (3 rows)
-- - sessions (40 rows)
-- - student_outcomes (3 rows)
-- - students (49 rows)
-- - submissions (1,474 rows)
-- - syllabi (5 rows)
-- - user_approvals (19 rows)
-- - user_profiles (17 rows)
-- - users (20 rows)
--
-- EMPTY TABLES (for future reference):
-- - assessment_ilo_weights (0 rows)
-- - assessment_rubrics (0 rows)
-- - assessment_templates (0 rows)
-- - course_enrollment_requests (0 rows)
-- - course_final_grades (0 rows)
-- - dashboards_data_cache (0 rows)
-- - grade_adjustments (0 rows)
-- - ilo_sdg_mappings (0 rows) - BUT USED IN CODE
-- - notifications (0 rows)
-- - rubric_scores (0 rows)
-- - rubrics (0 rows)
-- - student_ilo_scores (0 rows)
-- - syllabus_assessment_plans (0 rows)
-- - syllabus_edit_requests (0 rows) - BUT USED IN CODE
-- - syllabus_ilos (0 rows)
-- - uploads (0 rows)
--
-- IMPORTANT NOTES:
-- 1. Users table uses 'name' (single field) and 'is_approved' (not 'first_name', 'last_name', 'is_active')
-- 2. Department is stored in user_profiles, not directly on users table
-- 3. syllabus_edit_requests and ilo_sdg_mappings are empty but actively used in code
-- 4. All foreign key relationships are preserved
-- 5. Indexes are optimized for common query patterns
-- 6. This schema matches the actual Neon database structure

