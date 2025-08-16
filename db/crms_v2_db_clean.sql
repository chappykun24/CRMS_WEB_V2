SET search_path TO public;

CREATE TABLE departments (
    department_id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    department_abbreviation VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE programs (
    program_id SERIAL PRIMARY KEY,
    department_id INTEGER,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    program_abbreviation VARCHAR(50) UNIQUE NOT NULL,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE CASCADE
);

CREATE TABLE program_specializations (
    specialization_id SERIAL PRIMARY KEY,
    program_id INTEGER,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    abbreviation VARCHAR(50) UNIQUE NOT NULL,
    FOREIGN KEY (program_id) REFERENCES programs(program_id) ON DELETE CASCADE
);

CREATE TABLE school_terms (
    term_id SERIAL PRIMARY KEY,
    school_year VARCHAR(50) NOT NULL,
    semester VARCHAR(10) CHECK (semester IN ('1st', '2nd', 'Summer')),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT FALSE
);

CREATE TABLE sections (
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

CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE users (
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

CREATE TABLE user_approvals (
    approval_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    approved_by INTEGER,
    approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approval_note TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE students (
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

CREATE TABLE user_profiles (
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

CREATE TABLE courses (
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

CREATE TABLE section_courses (
    section_course_id SERIAL PRIMARY KEY,
    section_id INTEGER,
    course_id INTEGER,
    instructor_id INTEGER,
    term_id INTEGER,
    FOREIGN KEY (section_id) REFERENCES sections(section_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    FOREIGN KEY (instructor_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (term_id) REFERENCES school_terms(term_id) ON DELETE CASCADE
);

CREATE TABLE course_enrollments (
    enrollment_id SERIAL PRIMARY KEY,
    section_course_id INTEGER,
    student_id INTEGER,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('enrolled', 'dropped', 'completed')),
    FOREIGN KEY (section_course_id) REFERENCES section_courses(section_course_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

CREATE TABLE course_enrollment_requests (
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

CREATE TABLE syllabi (
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

CREATE TABLE ilos (
    ilo_id SERIAL PRIMARY KEY,
    syllabus_id INTEGER,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    level VARCHAR(20),
    weight_percentage FLOAT,
    assessment_methods TEXT[],
    learning_activities TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (syllabus_id) REFERENCES syllabi(syllabus_id) ON DELETE CASCADE
);

CREATE TABLE syllabus_ilos (
    syllabus_id INTEGER,
    ilo_id INTEGER,
    PRIMARY KEY (syllabus_id, ilo_id),
    FOREIGN KEY (syllabus_id) REFERENCES syllabi(syllabus_id) ON DELETE CASCADE,
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE
);

CREATE TABLE assessment_templates (
    template_id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) UNIQUE NOT NULL,
    template_type VARCHAR(50),
    description TEXT,
    assessment_structure JSONB,
    rubric_template JSONB,
    ilo_coverage TEXT[],
    default_weight FLOAT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE syllabus_assessment_plans (
    plan_id SERIAL PRIMARY KEY,
    syllabus_id INTEGER NOT NULL,
    assessment_type VARCHAR(50),
    assessment_count INTEGER,
    weight_per_assessment FLOAT,
    total_weight FLOAT,
    ilo_coverage TEXT[],
    rubric_template JSONB,
    week_distribution INTEGER[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (syllabus_id) REFERENCES syllabi(syllabus_id) ON DELETE CASCADE
);

CREATE TABLE assessments (
    assessment_id SERIAL PRIMARY KEY,
    syllabus_id INTEGER,
    section_course_id INTEGER,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    total_points FLOAT NOT NULL,
    weight_percentage FLOAT,
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
    FOREIGN KEY (syllabus_id) REFERENCES syllabi(syllabus_id) ON DELETE SET NULL,
    FOREIGN KEY (section_course_id) REFERENCES section_courses(section_course_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE rubrics (
    rubric_id SERIAL PRIMARY KEY,
    syllabus_id INTEGER,
    assessment_id INTEGER,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    criterion TEXT NOT NULL,
    max_score FLOAT,
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
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE SET NULL
);

CREATE TABLE assessment_rubrics (
    assessment_id INTEGER,
    rubric_id INTEGER,
    PRIMARY KEY (assessment_id, rubric_id),
    FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id) ON DELETE CASCADE,
    FOREIGN KEY (rubric_id) REFERENCES rubrics(rubric_id) ON DELETE CASCADE
);

CREATE TABLE submissions (
    submission_id SERIAL PRIMARY KEY,
    enrollment_id INTEGER,
    assessment_id INTEGER,
    submission_type VARCHAR(50) DEFAULT 'file',
    submission_data JSONB,
    file_urls TEXT[],
    total_score FLOAT,
    raw_score FLOAT,
    adjusted_score FLOAT,
    late_penalty FLOAT DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    graded_at TIMESTAMP,
    graded_by INTEGER,
    status VARCHAR(20) DEFAULT 'submitted',
    remarks TEXT,
    FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(enrollment_id) ON DELETE CASCADE,
    FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE rubric_scores (
    rubric_score_id SERIAL PRIMARY KEY,
    submission_id INTEGER,
    rubric_id INTEGER,
    score FLOAT CHECK (score >= 0),
    feedback TEXT,
    remarks TEXT,
    FOREIGN KEY (submission_id) REFERENCES submissions(submission_id) ON DELETE CASCADE,
    FOREIGN KEY (rubric_id) REFERENCES rubrics(rubric_id) ON DELETE CASCADE
);

CREATE TABLE grade_adjustments (
    adjustment_id SERIAL PRIMARY KEY,
    submission_id INTEGER,
    adjustment_type VARCHAR(50),
    adjustment_amount FLOAT,
    reason TEXT,
    applied_by INTEGER,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES submissions(submission_id) ON DELETE CASCADE,
    FOREIGN KEY (applied_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE course_final_grades (
    final_grade_id SERIAL PRIMARY KEY,
    enrollment_id INTEGER,
    final_score FLOAT,
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(enrollment_id) ON DELETE CASCADE
);

CREATE TABLE sessions (
    session_id SERIAL PRIMARY KEY,
    section_course_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    session_date DATE NOT NULL,
    session_type VARCHAR(50),
    meeting_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_course_id) REFERENCES section_courses(section_course_id) ON DELETE CASCADE
);

CREATE TABLE attendance_logs (
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

CREATE TABLE analytics_clusters (
    cluster_id SERIAL PRIMARY KEY,
    enrollment_id INTEGER,
    cluster_label VARCHAR(100),
    based_on JSONB,
    algorithm_used VARCHAR(100),
    model_version VARCHAR(50),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(enrollment_id) ON DELETE CASCADE
);

CREATE TABLE dashboards_data_cache (
    cache_id SERIAL PRIMARY KEY,
    type VARCHAR(50),
    course_id INTEGER,
    data_json JSONB,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE TABLE assessment_ilo_weights (
    assessment_ilo_weight_id SERIAL PRIMARY KEY,
    assessment_id INTEGER,
    ilo_id INTEGER,
    weight_percentage FLOAT CHECK (weight_percentage >= 0 AND weight_percentage <= 100),
    FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id) ON DELETE CASCADE,
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE
);

CREATE TABLE student_ilo_scores (
    student_ilo_score_id SERIAL PRIMARY KEY,
    enrollment_id INTEGER,
    ilo_id INTEGER,
    score FLOAT,
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(enrollment_id) ON DELETE CASCADE,
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE CASCADE
);

CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE uploads (
    upload_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    file_url TEXT,
    file_type VARCHAR(50),
    related_type VARCHAR(50),
    related_id INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_syllabi_course_id ON syllabi(course_id);
CREATE INDEX idx_syllabi_section_course_id ON syllabi(section_course_id);
CREATE INDEX idx_syllabi_approval_status ON syllabi(approval_status);
CREATE INDEX idx_syllabi_created_by ON syllabi(created_by);
CREATE INDEX idx_ilos_syllabus_id ON ilos(syllabus_id);
CREATE INDEX idx_ilos_code ON ilos(code);
CREATE INDEX idx_ilos_category ON ilos(category);
CREATE INDEX idx_assessment_templates_type ON assessment_templates(template_type);
CREATE INDEX idx_assessment_templates_active ON assessment_templates(is_active);
CREATE INDEX idx_assessment_templates_created_by ON assessment_templates(created_by);
CREATE INDEX idx_syllabus_assessment_plans_syllabus ON syllabus_assessment_plans(syllabus_id);
CREATE INDEX idx_syllabus_assessment_plans_type ON syllabus_assessment_plans(assessment_type);
CREATE INDEX idx_assessments_syllabus_id ON assessments(syllabus_id);
CREATE INDEX idx_assessments_section_course_id ON assessments(section_course_id);
CREATE INDEX idx_assessments_type ON assessments(type);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessments_due_date ON assessments(due_date);
CREATE INDEX idx_assessments_created_by ON assessments(created_by);
CREATE INDEX idx_rubrics_syllabus_id ON rubrics(syllabus_id);
CREATE INDEX idx_rubrics_assessment_id ON rubrics(assessment_id);
CREATE INDEX idx_rubrics_ilo_id ON rubrics(ilo_id);
CREATE INDEX idx_rubrics_type ON rubrics(rubric_type);
CREATE INDEX idx_submissions_enrollment_id ON submissions(enrollment_id);
CREATE INDEX idx_submissions_assessment_id ON submissions(assessment_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at);
CREATE INDEX idx_submissions_graded_by ON submissions(graded_by);
CREATE INDEX idx_rubric_scores_submission_id ON rubric_scores(submission_id);
CREATE INDEX idx_rubric_scores_rubric_id ON rubric_scores(rubric_id);
CREATE INDEX idx_grade_adjustments_submission_id ON grade_adjustments(submission_id);
CREATE INDEX idx_grade_adjustments_type ON grade_adjustments(adjustment_type);
CREATE INDEX idx_course_final_grades_enrollment_id ON course_final_grades(enrollment_id);
CREATE INDEX idx_assessment_ilo_weights_assessment_id ON assessment_ilo_weights(assessment_id);
CREATE INDEX idx_assessment_ilo_weights_ilo_id ON assessment_ilo_weights(ilo_id);
CREATE INDEX idx_student_ilo_scores_enrollment_id ON student_ilo_scores(enrollment_id);
CREATE INDEX idx_student_ilo_scores_ilo_id ON student_ilo_scores(ilo_id);
CREATE INDEX idx_sessions_section_course_id ON sessions(section_course_id);
CREATE INDEX idx_sessions_date ON sessions(session_date);
CREATE INDEX idx_attendance_logs_enrollment_id ON attendance_logs(enrollment_id);
CREATE INDEX idx_attendance_logs_session_id ON attendance_logs(session_id);
CREATE INDEX idx_attendance_logs_date ON attendance_logs(session_date);
CREATE INDEX idx_analytics_clusters_enrollment_id ON analytics_clusters(enrollment_id);
CREATE INDEX idx_dashboards_data_cache_type ON dashboards_data_cache(type);
CREATE INDEX idx_dashboards_data_cache_course_id ON dashboards_data_cache(course_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_uploads_user_id ON uploads(user_id);
CREATE INDEX idx_uploads_related_type ON uploads(related_type);
CREATE INDEX idx_uploads_related_id ON uploads(related_id);
