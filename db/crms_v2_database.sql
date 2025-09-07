-- ==========================================
-- CRMS V2 Final Database Schema
-- Consolidated version with all features and optimizations
-- Includes: Banner customization, enhanced indexes, and all migrations
-- ==========================================

-- Set search path
SET search_path TO public;

-- ==========================================
-- 1. SCHOOL SETTINGS
-- ==========================================

-- 01. departments
CREATE TABLE departments (
    department_id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    department_abbreviation VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 02. programs
CREATE TABLE programs (
    program_id SERIAL PRIMARY KEY,
    department_id INTEGER,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    program_abbreviation VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE CASCADE
);

-- 03. program_specializations
CREATE TABLE program_specializations (
    specialization_id SERIAL PRIMARY KEY,
    program_id INTEGER,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    abbreviation VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES programs(program_id) ON DELETE CASCADE
);

-- 04. school_terms
CREATE TABLE school_terms (
    term_id SERIAL PRIMARY KEY,
    school_year VARCHAR(50) NOT NULL,
    semester VARCHAR(10) CHECK (semester IN ('1st', '2nd', 'Summer')),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 05. sections
CREATE TABLE sections (
    section_id SERIAL PRIMARY KEY,
    program_id INTEGER,
    specialization_id INTEGER,
    section_code VARCHAR(100) NOT NULL,
    year_level INTEGER CHECK (year_level BETWEEN 1 AND 5),
    term_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES programs(program_id) ON DELETE CASCADE,
    FOREIGN KEY (specialization_id) REFERENCES program_specializations(specialization_id) ON DELETE CASCADE,
    FOREIGN KEY (term_id) REFERENCES school_terms(term_id) ON DELETE CASCADE
);

-- 06. courses
CREATE TABLE courses (
    course_id SERIAL PRIMARY KEY,
    course_code VARCHAR(50) UNIQUE NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    description TEXT,
    units INTEGER CHECK (units > 0),
    prerequisites TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. USER MANAGEMENT
-- ==========================================

-- 07. roles
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 08. user_approvals
CREATE TABLE user_approvals (
    approval_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    status VARCHAR(20) DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INTEGER,
    reviewed_at TIMESTAMP NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 09. users
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    role_id INTEGER,
    department_id INTEGER,
    employee_id VARCHAR(50) UNIQUE,
    phone VARCHAR(20),
    profile_photo TEXT, -- Base64 encoded image
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE SET NULL,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL
);

-- 10. students
CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    student_number VARCHAR(50) UNIQUE NOT NULL,
    program_id INTEGER,
    specialization_id INTEGER,
    year_level INTEGER CHECK (year_level BETWEEN 1 AND 5),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (program_id) REFERENCES programs(program_id) ON DELETE SET NULL,
    FOREIGN KEY (specialization_id) REFERENCES program_specializations(specialization_id) ON DELETE SET NULL
);

-- ==========================================
-- 3. COURSE MANAGEMENT
-- ==========================================

-- 11. section_courses (ENHANCED with banner customization)
CREATE TABLE section_courses (
    section_course_id SERIAL PRIMARY KEY,
    section_id INTEGER,
    course_id INTEGER,
    instructor_id INTEGER,
    term_id INTEGER,
    -- Banner customization columns
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

-- 12. course_enrollments
CREATE TABLE course_enrollments (
    enrollment_id SERIAL PRIMARY KEY,
    section_course_id INTEGER,
    student_id INTEGER,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_course_id) REFERENCES section_courses(section_course_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

-- 13. course_enrollment_requests
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (current_enrollment_id) REFERENCES course_enrollments(enrollment_id) ON DELETE SET NULL,
    FOREIGN KEY (requested_section_course_id) REFERENCES section_courses(section_course_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ==========================================
-- 4. SYLLABI & ILOs (ENHANCED)
-- ==========================================

-- 14. syllabi (ENHANCED)
CREATE TABLE syllabi (
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
    status VARCHAR(20) DEFAULT 'draft', -- draft, submitted, approved, rejected
    section_course_id INTEGER,   -- Link to specific section course
    created_by INTEGER,          -- User who created the syllabus
    reviewed_by INTEGER,         -- User who reviewed the syllabus
    approved_by INTEGER,         -- User who approved the syllabus
    submitted_at TIMESTAMP NULL,
    reviewed_at TIMESTAMP NULL,
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    FOREIGN KEY (term_id) REFERENCES school_terms(term_id) ON DELETE CASCADE,
    FOREIGN KEY (section_course_id) REFERENCES section_courses(section_course_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 15. ilos (ENHANCED)
CREATE TABLE ilos (
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

-- ==========================================
-- 5. ASSESSMENTS & GRADING (ENHANCED)
-- ==========================================

-- 16. assessments (ENHANCED)
CREATE TABLE assessments (
    assessment_id SERIAL PRIMARY KEY,
    section_course_id INTEGER,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assessment_type VARCHAR(50),    -- Quiz, Exam, Project, Assignment, etc.
    total_points FLOAT,
    weight_percentage FLOAT,        -- Weight in final grade
    due_date TIMESTAMP,
    instructions TEXT,
    rubric_id INTEGER,              -- Link to rubric if applicable
    ilo_id INTEGER,                 -- Link to specific ILO
    is_published BOOLEAN DEFAULT FALSE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_course_id) REFERENCES section_courses(section_course_id) ON DELETE CASCADE,
    FOREIGN KEY (rubric_id) REFERENCES rubrics(rubric_id) ON DELETE SET NULL,
    FOREIGN KEY (ilo_id) REFERENCES ilos(ilo_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 17. rubrics (ENHANCED)
CREATE TABLE rubrics (
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

-- 18. grades
CREATE TABLE grades (
    grade_id SERIAL PRIMARY KEY,
    enrollment_id INTEGER,
    assessment_id INTEGER,
    score FLOAT,
    max_score FLOAT,
    percentage FLOAT,
    letter_grade VARCHAR(5),
    feedback TEXT,
    graded_by INTEGER,
    graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(enrollment_id) ON DELETE CASCADE,
    FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 19. final_grades
CREATE TABLE final_grades (
    final_grade_id SERIAL PRIMARY KEY,
    enrollment_id INTEGER,
    term_id INTEGER,
    final_percentage FLOAT,
    letter_grade VARCHAR(5),
    gpa_points FLOAT,
    status VARCHAR(20) DEFAULT 'calculated', -- calculated, approved, disputed
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by INTEGER,
    approved_at TIMESTAMP NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(enrollment_id) ON DELETE CASCADE,
    FOREIGN KEY (term_id) REFERENCES school_terms(term_id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ==========================================
-- 6. ATTENDANCE & SESSIONS
-- ==========================================

-- 20. sessions
CREATE TABLE sessions (
    session_id SERIAL PRIMARY KEY,
    section_course_id INTEGER,
    session_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    session_type VARCHAR(50), -- Lecture, Laboratory, Field Work, etc.
    topic VARCHAR(255),
    description TEXT,
    location VARCHAR(255),
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_course_id) REFERENCES section_courses(section_course_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 21. attendance_logs
CREATE TABLE attendance_logs (
    attendance_id SERIAL PRIMARY KEY,
    enrollment_id INTEGER,
    session_id INTEGER,
    status VARCHAR(20),
    session_date DATE,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(enrollment_id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

-- ==========================================
-- 7. ANALYTICS & REPORTING
-- ==========================================

-- 22. analytics_clusters
CREATE TABLE analytics_clusters (
    cluster_id SERIAL PRIMARY KEY,
    enrollment_id INTEGER,
    cluster_label VARCHAR(100),
    cluster_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(enrollment_id) ON DELETE CASCADE
);

-- ==========================================
-- 8. INDEXES FOR PERFORMANCE OPTIMIZATION
-- ==========================================

-- Primary table indexes
CREATE INDEX idx_departments_name ON departments(name);
CREATE INDEX idx_departments_abbreviation ON departments(department_abbreviation);
CREATE INDEX idx_programs_department ON programs(department_id);
CREATE INDEX idx_programs_abbreviation ON programs(program_abbreviation);
CREATE INDEX idx_program_specializations_program ON program_specializations(program_id);
CREATE INDEX idx_school_terms_active ON school_terms(is_active);
CREATE INDEX idx_school_terms_year_semester ON school_terms(school_year, semester);
CREATE INDEX idx_sections_program ON sections(program_id);
CREATE INDEX idx_sections_term ON sections(term_id);
CREATE INDEX idx_courses_code ON courses(course_code);

-- User management indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_students_user ON students(user_id);
CREATE INDEX idx_students_program ON students(program_id);
CREATE INDEX idx_students_number ON students(student_number);

-- Course management indexes
CREATE INDEX idx_section_courses_section ON section_courses(section_id);
CREATE INDEX idx_section_courses_course ON section_courses(course_id);
CREATE INDEX idx_section_courses_instructor ON section_courses(instructor_id);
CREATE INDEX idx_section_courses_term ON section_courses(term_id);
CREATE INDEX idx_section_courses_banner_type ON section_courses(banner_type);
CREATE INDEX idx_section_courses_banner_color ON section_courses(banner_color);
CREATE INDEX idx_section_courses_created_at ON section_courses(created_at);
CREATE INDEX idx_section_courses_updated_at ON section_courses(updated_at);

-- Composite indexes for common queries
CREATE INDEX idx_section_courses_instructor_term ON section_courses(instructor_id, term_id);
CREATE INDEX idx_section_courses_section_term ON section_courses(section_id, term_id);
CREATE INDEX idx_section_courses_course_term ON section_courses(course_id, term_id);
CREATE INDEX idx_section_courses_section_course_term ON section_courses(section_id, course_id, term_id);

-- Enrollment indexes
CREATE INDEX idx_course_enrollments_section_course ON course_enrollments(section_course_id);
CREATE INDEX idx_course_enrollments_student ON course_enrollments(student_id);
CREATE INDEX idx_course_enrollments_status ON course_enrollments(status);
CREATE INDEX idx_enrollment_requests_student ON course_enrollment_requests(student_id);
CREATE INDEX idx_enrollment_requests_status ON course_enrollment_requests(status);

-- Assessment indexes
CREATE INDEX idx_assessments_section_course ON assessments(section_course_id);
CREATE INDEX idx_assessments_type ON assessments(assessment_type);
CREATE INDEX idx_assessments_due_date ON assessments(due_date);
CREATE INDEX idx_grades_enrollment ON grades(enrollment_id);
CREATE INDEX idx_grades_assessment ON grades(assessment_id);
CREATE INDEX idx_final_grades_enrollment ON final_grades(enrollment_id);
CREATE INDEX idx_final_grades_term ON final_grades(term_id);

-- Attendance indexes
CREATE INDEX idx_sessions_section_course ON sessions(section_course_id);
CREATE INDEX idx_sessions_date ON sessions(session_date);
CREATE INDEX idx_attendance_logs_enrollment ON attendance_logs(enrollment_id);
CREATE INDEX idx_attendance_logs_session ON attendance_logs(session_id);
CREATE INDEX idx_attendance_logs_date ON attendance_logs(session_date);

-- ==========================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ==========================================

-- Banner customization comments
COMMENT ON COLUMN section_courses.banner_color IS 'Hex color code for class banner background (e.g., #3B82F6)';
COMMENT ON COLUMN section_courses.banner_image IS 'Base64 encoded image data for banner image';
COMMENT ON COLUMN section_courses.banner_type IS 'Type of banner: color or image';

-- Assessment framework comments
COMMENT ON COLUMN syllabi.assessment_framework IS 'JSON structure defining assessment categories and weights';
COMMENT ON COLUMN syllabi.grading_policy IS 'JSON structure defining grading rules and scales';
COMMENT ON COLUMN rubrics.performance_levels IS 'JSON structure defining performance level descriptions';

-- ==========================================
-- 10. SAMPLE DATA (OPTIONAL)
-- ==========================================

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'System Administrator', '{"all": true}'),
('dean', 'College Dean', '{"view_all": true, "approve_syllabi": true, "view_analytics": true}'),
('program_chair', 'Program Chair', '{"manage_courses": true, "approve_syllabi": true, "view_reports": true}'),
('faculty', 'Faculty Member', '{"manage_classes": true, "grade_students": true, "create_syllabi": true}'),
('staff', 'Administrative Staff', '{"manage_enrollments": true, "view_reports": true}'),
('student', 'Student', '{"view_grades": true, "enroll_courses": true}');

-- Insert sample department
INSERT INTO departments (name, department_abbreviation) VALUES
('College of Engineering', 'COE'),
('College of Business Administration', 'CBA'),
('College of Arts and Sciences', 'CAS');

-- Insert sample program
INSERT INTO programs (department_id, name, description, program_abbreviation) VALUES
(1, 'Bachelor of Science in Computer Engineering', 'Computer Engineering Program', 'BSCpE'),
(1, 'Bachelor of Science in Civil Engineering', 'Civil Engineering Program', 'BSCE'),
(2, 'Bachelor of Science in Business Administration', 'Business Administration Program', 'BSBA');

-- Insert sample school term
INSERT INTO school_terms (school_year, semester, start_date, end_date, is_active) VALUES
('2024-2025', '1st', '2024-08-01', '2024-12-15', true),
('2024-2025', '2nd', '2025-01-15', '2025-05-30', false);

-- ==========================================
-- END OF SCHEMA
-- ==========================================