-- Create All Indexes for CRMS Database
-- This script creates all indexes from the original schema using IF NOT EXISTS

SET search_path TO public;

-- Syllabi indexes
CREATE INDEX IF NOT EXISTS idx_syllabi_course_id ON syllabi(course_id);
CREATE INDEX IF NOT EXISTS idx_syllabi_section_course_id ON syllabi(section_course_id);
CREATE INDEX IF NOT EXISTS idx_syllabi_approval_status ON syllabi(approval_status);
CREATE INDEX IF NOT EXISTS idx_syllabi_created_by ON syllabi(created_by);

-- ILOs indexes
CREATE INDEX IF NOT EXISTS idx_ilos_syllabus_id ON ilos(syllabus_id);
CREATE INDEX IF NOT EXISTS idx_ilos_code ON ilos(code);
CREATE INDEX IF NOT EXISTS idx_ilos_category ON ilos(category);

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
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);
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

-- Verify all indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
