-- Performance optimization indexes for CRMS database
-- Run this script to add indexes that will significantly improve query performance

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Indexes for user_profiles table
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_department_id ON user_profiles(department_id);

-- Indexes for departments table
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE INDEX IF NOT EXISTS idx_departments_abbreviation ON departments(department_abbreviation);

-- Indexes for roles table
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- Indexes for programs table
CREATE INDEX IF NOT EXISTS idx_programs_department_id ON programs(department_id);
CREATE INDEX IF NOT EXISTS idx_programs_name ON programs(name);

-- Indexes for program_specializations table
CREATE INDEX IF NOT EXISTS idx_program_specializations_program_id ON program_specializations(program_id);

-- Indexes for courses table
CREATE INDEX IF NOT EXISTS idx_courses_specialization_id ON courses(specialization_id);
CREATE INDEX IF NOT EXISTS idx_courses_term_id ON courses(term_id);
CREATE INDEX IF NOT EXISTS idx_courses_course_code ON courses(course_code);

-- Indexes for section_courses table
CREATE INDEX IF NOT EXISTS idx_section_courses_course_id ON section_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_section_courses_faculty_id ON section_courses(faculty_id);
CREATE INDEX IF NOT EXISTS idx_section_courses_semester ON section_courses(semester);
CREATE INDEX IF NOT EXISTS idx_section_courses_school_year ON section_courses(school_year);

-- Indexes for students table
CREATE INDEX IF NOT EXISTS idx_students_student_number ON students(student_number);
CREATE INDEX IF NOT EXISTS idx_students_contact_email ON students(contact_email);
CREATE INDEX IF NOT EXISTS idx_students_program_id ON students(program_id);
CREATE INDEX IF NOT EXISTS idx_students_specialization_id ON students(specialization_id);

-- Indexes for student_enrollments table
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_id ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_section_course_id ON student_enrollments(section_course_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_enrollment_date ON student_enrollments(enrollment_date);

-- Indexes for attendance table
CREATE INDEX IF NOT EXISTS idx_attendance_section_course_id ON attendance(section_course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_created_at ON attendance(created_at);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_users_role_approved ON users(role_id, is_approved);
CREATE INDEX IF NOT EXISTS idx_user_profiles_department_user ON user_profiles(department_id, user_id);
CREATE INDEX IF NOT EXISTS idx_section_courses_faculty_semester ON section_courses(faculty_id, semester, school_year);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_section_student ON student_enrollments(section_course_id, student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_section_date ON attendance(section_course_id, date);

-- Partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_users_pending_approval ON users(user_id) WHERE is_approved = false;
CREATE INDEX IF NOT EXISTS idx_users_faculty_approved ON users(user_id) WHERE role_id = 2 AND is_approved = true;

-- Analyze tables to update statistics
ANALYZE users;
ANALYZE user_profiles;
ANALYZE departments;
ANALYZE roles;
ANALYZE programs;
ANALYZE program_specializations;
ANALYZE courses;
ANALYZE section_courses;
ANALYZE students;
ANALYZE student_enrollments;
ANALYZE attendance;
