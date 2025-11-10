# CRMS V2 Final Database Schema Documentation

## Overview
Complete database schema for the Course Registration and Management System (CRMS) V2, including ILO mapping, syllabus management, and assessment tracking.

## Database Structure

### Total Tables: 42

---

## 1. School Settings (5 tables)

### 1.1 departments
- **Purpose**: Stores academic departments
- **Key Fields**: department_id, name, department_abbreviation
- **Relationships**: Referenced by programs

### 1.2 programs
- **Purpose**: Stores academic programs
- **Key Fields**: program_id, department_id, name, program_abbreviation
- **Relationships**: 
  - Belongs to department
  - Has many specializations

### 1.3 program_specializations
- **Purpose**: Stores program specializations/tracks
- **Key Fields**: specialization_id, program_id, name, abbreviation
- **Relationships**: Belongs to program

### 1.4 school_terms
- **Purpose**: Stores academic terms/semesters
- **Key Fields**: term_id, school_year, semester, start_date, end_date, is_active
- **Relationships**: Referenced by sections, courses, section_courses, syllabi

### 1.5 sections
- **Purpose**: Stores class sections
- **Key Fields**: section_id, program_id, specialization_id, section_code, year_level, term_id
- **Relationships**: 
  - Belongs to program and specialization
  - Has many section_courses

---

## 2. Users & Roles (5 tables)

### 2.1 roles
- **Purpose**: User roles (Admin, Faculty, Student, etc.)
- **Key Fields**: role_id, name

### 2.2 users
- **Purpose**: System users
- **Key Fields**: user_id, name, email, password_hash, role_id, is_approved
- **Relationships**: Has one profile, has many approvals

### 2.3 user_approvals
- **Purpose**: Tracks user approval workflow
- **Key Fields**: approval_id, user_id, approved_by, approved_at
- **Relationships**: Belongs to user (approver and approvee)

### 2.4 students
- **Purpose**: Student information
- **Key Fields**: student_id, student_number, full_name, gender, birth_date, contact_email
- **Relationships**: Has many enrollments

### 2.5 user_profiles
- **Purpose**: Extended user profile information
- **Key Fields**: user_profile_id, user_id, profile_type, program_id, department_id
- **Relationships**: Belongs to user, program, department

---

## 3. Courses & Enrollments (4 tables)

### 3.1 courses
- **Purpose**: Course catalog
- **Key Fields**: course_id, title, course_code, description, term_id, specialization_id
- **Relationships**: Has many section_courses, has many syllabi

### 3.2 section_courses
- **Purpose**: Course instances (classes)
- **Key Fields**: section_course_id, section_id, course_id, instructor_id, term_id
- **Relationships**: 
  - Belongs to section, course, instructor
  - Has many enrollments, assessments, sessions

### 3.3 course_enrollments
- **Purpose**: Student enrollments in classes
- **Key Fields**: enrollment_id, section_course_id, student_id, status
- **Relationships**: 
  - Belongs to section_course, student
  - Has many submissions, attendance_logs

### 3.4 course_enrollment_requests
- **Purpose**: Enrollment change requests
- **Key Fields**: enrollment_request_id, student_id, requested_section_course_id, status
- **Relationships**: Belongs to student, section_course

---

## 4. Syllabi & ILOs (3 tables)

### 4.1 syllabi ⭐ ENHANCED
- **Purpose**: Course syllabi with assessment framework
- **Key Fields**: 
  - syllabus_id, course_id, term_id, title, description
  - assessment_framework (JSONB), grading_policy (JSONB)
  - course_outline, learning_resources (TEXT[]), prerequisites, course_objectives
  - version, is_template, template_name
  - section_course_id, created_by
  - review_status, reviewed_by, reviewed_at
  - approval_status, approved_by, approved_at
- **Relationships**: 
  - Belongs to course, term, section_course
  - Has many ilos, assessments, rubrics
  - Created/reviewed/approved by users

### 4.2 ilos ⭐ ENHANCED
- **Purpose**: Intended Learning Outcomes
- **Key Fields**: 
  - ilo_id, syllabus_id, code, description
  - category, level, weight_percentage
  - assessment_methods (TEXT[]), learning_activities (TEXT[])
  - is_active
- **Relationships**: 
  - Belongs to syllabus
  - Has many mappings (SO, IGA, CDIO, SDG)
  - Referenced by rubrics, assessment_ilo_weights

### 4.3 syllabus_ilos
- **Purpose**: Junction table for syllabus-ILO relationships
- **Key Fields**: syllabus_id, ilo_id
- **Relationships**: Many-to-many between syllabi and ilos

---

## 5. ILO Mapping & Reference Tables (8 tables) ⭐ NEW

### 5.1 student_outcomes (Reference Table)
- **Purpose**: Student outcome codes and descriptions
- **Key Fields**: so_id, so_code, description, is_active
- **Relationships**: Has many ilo_so_mappings

### 5.2 institutional_graduate_attributes (Reference Table)
- **Purpose**: Institutional graduate attribute codes
- **Key Fields**: iga_id, iga_code, description, is_active
- **Relationships**: Has many ilo_iga_mappings

### 5.3 cdio_skills (Reference Table)
- **Purpose**: CDIO framework skills
- **Key Fields**: cdio_id, cdio_code, description, is_active
- **Relationships**: Has many ilo_cdio_mappings

### 5.4 sdg_skills (Reference Table)
- **Purpose**: Sustainable Development Goals skills
- **Key Fields**: sdg_id, sdg_code, description, is_active
- **Relationships**: Has many ilo_sdg_mappings

### 5.5 ilo_so_mappings (Mapping Table)
- **Purpose**: Maps ILOs to Student Outcomes
- **Key Fields**: mapping_id, ilo_id, so_id, assessment_tasks (TEXT[])
- **Relationships**: Many-to-many between ilos and student_outcomes

### 5.6 ilo_iga_mappings (Mapping Table)
- **Purpose**: Maps ILOs to Institutional Graduate Attributes
- **Key Fields**: mapping_id, ilo_id, iga_id, assessment_tasks (TEXT[])
- **Relationships**: Many-to-many between ilos and institutional_graduate_attributes

### 5.7 ilo_cdio_mappings (Mapping Table)
- **Purpose**: Maps ILOs to CDIO Skills
- **Key Fields**: mapping_id, ilo_id, cdio_id, assessment_tasks (TEXT[])
- **Relationships**: Many-to-many between ilos and cdio_skills

### 5.8 ilo_sdg_mappings (Mapping Table)
- **Purpose**: Maps ILOs to SDG Skills
- **Key Fields**: mapping_id, ilo_id, sdg_id, assessment_tasks (TEXT[])
- **Relationships**: Many-to-many between ilos and sdg_skills

---

## 6. Assessments & Grading (9 tables)

### 6.1 assessment_templates
- **Purpose**: Reusable assessment templates
- **Key Fields**: template_id, template_name, template_type, assessment_structure (JSONB), rubric_template (JSONB)
- **Relationships**: Created by user

### 6.2 syllabus_assessment_plans
- **Purpose**: Assessment plans in syllabi
- **Key Fields**: plan_id, syllabus_id, assessment_type, assessment_count, weight_per_assessment, total_weight
- **Relationships**: Belongs to syllabus

### 6.3 assessments ⭐ ENHANCED (includes syllabus_id)
- **Purpose**: Course assessments (quizzes, exams, projects, etc.)
- **Key Fields**: 
  - assessment_id, syllabus_id, section_course_id
  - title, description, type, category
  - total_points, weight_percentage
  - due_date, submission_deadline
  - is_published, is_graded, grading_method
  - instructions, content_data (JSONB), status
  - created_by
- **Relationships**: 
  - Belongs to syllabus (NEW), section_course
  - Has many submissions, rubrics, assessment_ilo_weights

### 6.4 rubrics
- **Purpose**: Grading rubrics
- **Key Fields**: rubric_id, syllabus_id, assessment_id, title, criterion, max_score, performance_levels (JSONB), ilo_id
- **Relationships**: Belongs to syllabus, assessment, ilo

### 6.5 assessment_rubrics
- **Purpose**: Junction table for assessment-rubric relationships
- **Key Fields**: assessment_id, rubric_id

### 6.6 submissions
- **Purpose**: Student assessment submissions
- **Key Fields**: submission_id, enrollment_id, assessment_id, submission_data (JSONB), file_urls (TEXT[]), total_score, status
- **Relationships**: Belongs to enrollment, assessment

### 6.7 rubric_scores
- **Purpose**: Rubric scores for submissions
- **Key Fields**: rubric_score_id, submission_id, rubric_id, score, feedback
- **Relationships**: Belongs to submission, rubric

### 6.8 grade_adjustments
- **Purpose**: Grade adjustments (late penalties, curves, etc.)
- **Key Fields**: adjustment_id, submission_id, adjustment_type, adjustment_amount, reason
- **Relationships**: Belongs to submission

### 6.9 course_final_grades
- **Purpose**: Final course grades
- **Key Fields**: final_grade_id, enrollment_id, final_score
- **Relationships**: Belongs to enrollment

---

## 7. Attendance & Analytics (4 tables)

### 7.1 sessions
- **Purpose**: Class sessions
- **Key Fields**: session_id, section_course_id, title, session_date, session_type, meeting_type
- **Relationships**: Belongs to section_course, has many attendance_logs

### 7.2 attendance_logs
- **Purpose**: Student attendance records
- **Key Fields**: attendance_id, enrollment_id, session_id, status, session_date
- **Relationships**: Belongs to enrollment, session

### 7.3 analytics_clusters
- **Purpose**: Student performance analytics clusters
- **Key Fields**: cluster_id, enrollment_id, cluster_label, based_on (JSONB), algorithm_used
- **Relationships**: Belongs to enrollment

### 7.4 dashboards_data_cache
- **Purpose**: Cached dashboard data
- **Key Fields**: cache_id, type, course_id, data_json (JSONB)
- **Relationships**: Belongs to course

---

## 8. ILO Tracking (2 tables)

### 8.1 assessment_ilo_weights
- **Purpose**: ILO weight distribution in assessments
- **Key Fields**: assessment_ilo_weight_id, assessment_id, ilo_id, weight_percentage
- **Relationships**: Belongs to assessment, ilo

### 8.2 student_ilo_scores
- **Purpose**: Student scores per ILO
- **Key Fields**: student_ilo_score_id, enrollment_id, ilo_id, score
- **Relationships**: Belongs to enrollment, ilo

---

## 9. Notifications & Files (2 tables)

### 9.1 notifications
- **Purpose**: System notifications
- **Key Fields**: notification_id, user_id, message, is_read
- **Relationships**: Belongs to user

### 9.2 uploads
- **Purpose**: File uploads
- **Key Fields**: upload_id, user_id, file_url, file_type, related_type, related_id
- **Relationships**: Belongs to user

---

## Key Features

### 1. Syllabus-Assessment Connection
- Assessments are linked to syllabi via `syllabus_id`
- Enables tracking which assessments belong to which syllabus
- Supports the workflow: Faculty creates syllabus → Chair reviews → Dean approves → Assessments appear

### 2. ILO Mapping System
- ILOs can be mapped to:
  - Student Outcomes (SO)
  - Institutional Graduate Attributes (IGA)
  - CDIO Skills
  - SDG Skills
- Assessment tasks can be specified for each mapping
- Supports outcome-based education tracking

### 3. Syllabus Workflow
- Review workflow: pending → reviewed → approved
- Tracks who created, reviewed, and approved each syllabus
- Version control support
- Template support for reusable syllabi

### 4. Assessment Framework
- JSONB fields for flexible assessment structure
- Grading policy stored as JSONB
- Supports complex assessment configurations
- Links assessments to ILOs and syllabi

### 5. Performance Optimization
- Comprehensive indexes on all foreign keys
- Indexes on frequently queried fields
- Supports efficient joins and searches

---

## Default Reference Data

The schema includes default data for:
- Student Outcomes: SO1, SO2, SO6
- Institutional Graduate Attributes: IGA1, IGA3
- CDIO Skills: CDIO1, CDIO2
- SDG Skills: SDG1, SDG3

---

## Usage

### To create the database:
```sql
-- Run the complete schema file
\i db/crms_v2_final_database.sql
```

### To run migrations:
```sql
-- Run the migration file (if updating existing database)
\i db/migrations/20251110_add_ilo_mapping.sql
```

---

## Relationships Diagram

```
departments → programs → program_specializations
                        ↓
                    sections → section_courses → course_enrollments
                                              ↓
                                          assessments ← syllabi
                                              ↓
                                          submissions
                                              
syllabi → ilos → ilo_so_mappings → student_outcomes
       ↓      → ilo_iga_mappings → institutional_graduate_attributes
  assessments → ilo_cdio_mappings → cdio_skills
              → ilo_sdg_mappings → sdg_skills
```

---

## Notes

1. **JSONB Fields**: Used for flexible data structures (assessment_framework, grading_policy, content_data)
2. **TEXT[] Arrays**: Used for arrays of strings (learning_resources, assessment_tasks, file_urls)
3. **Cascade Deletes**: Most relationships use CASCADE for data consistency
4. **Soft Deletes**: Some tables use `is_active` flags instead of hard deletes
5. **Audit Trail**: Created_at, updated_at, and user tracking fields for audit purposes

---

## Version History

- **2025-11-10**: Added ILO mapping tables and syllabus-assessment connection
- **Initial**: Base CRMS V2 schema with enhanced assessment framework

