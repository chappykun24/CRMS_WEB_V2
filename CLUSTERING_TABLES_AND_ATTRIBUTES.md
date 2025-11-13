# Clustering Tables and Attributes Documentation

This document lists all database tables and attributes used in the student clustering system.

## 1. Primary Cache Table: `analytics_clusters`

**Purpose**: Stores cached cluster assignments for students to avoid expensive ML API calls on every request.

### Attributes:

| Column Name | Type | Description | Constraints |
|------------|------|-------------|-------------|
| `cluster_id` | SERIAL | Primary key | PRIMARY KEY |
| `student_id` | INTEGER | Student ID (for student-based clustering) | FOREIGN KEY → `students(student_id)`, NULLABLE |
| `term_id` | INTEGER | School term ID | FOREIGN KEY → `school_terms(term_id)`, NULLABLE |
| `enrollment_id` | INTEGER | Enrollment ID (legacy, kept for backward compatibility) | FOREIGN KEY → `course_enrollments(enrollment_id)`, NULLABLE |
| `cluster_label` | VARCHAR(100) | Human-readable cluster label (e.g., "Excellent Performance", "At Risk") | NULLABLE |
| `cluster_number` | INTEGER | Numeric cluster assignment (0, 1, 2, etc.) | NULLABLE |
| `based_on` | JSONB | JSON object storing metrics used for clustering | NULLABLE |
| `algorithm_used` | VARCHAR(100) | ML algorithm used (e.g., "kmeans", "dbscan") | NULLABLE |
| `model_version` | VARCHAR(50) | Version of the clustering model/algorithm | NULLABLE |
| `generated_at` | TIMESTAMP | Timestamp when cluster was computed | DEFAULT CURRENT_TIMESTAMP |

### Indexes:
- `idx_analytics_clusters_student_term` - Unique index on `(student_id, term_id)` WHERE both are NOT NULL
- `idx_analytics_clusters_student_id` - Index on `student_id` WHERE NOT NULL
- `idx_analytics_clusters_term_id` - Index on `term_id` WHERE NOT NULL
- `idx_analytics_clusters_generated_at` - Index on `generated_at DESC`
- `idx_analytics_clusters_enrollment_id` - Index on `enrollment_id` WHERE NOT NULL

### `based_on` JSONB Structure:
```json
{
  "attendance": 85.5,           // Attendance percentage
  "score": 78.2,                // Average score
  "submission_rate": 0.95,      // Submission rate (0-1)
  "average_days_late": null     // Average days late (legacy, may be null)
}
```

---

## 2. Data Source Tables (Used to Compute Student Metrics)

### 2.1 `students` Table

**Purpose**: Main student information table.

**Attributes Used**:
- `student_id` (PRIMARY KEY)
- `full_name`
- `student_number`
- `contact_email`
- `student_photo` (excluded from analytics query for performance)

---

### 2.2 `course_enrollments` Table

**Purpose**: Links students to courses/sections.

**Attributes Used**:
- `enrollment_id` (PRIMARY KEY)
- `student_id` (FOREIGN KEY → `students`)
- `section_course_id` (FOREIGN KEY → `section_courses`)
- `status` (filtered for `'enrolled'`)

---

### 2.3 `section_courses` Table

**Purpose**: Links courses to sections and terms.

**Attributes Used**:
- `section_course_id` (PRIMARY KEY)
- `section_id` (FOREIGN KEY → `sections`)
- `term_id` (FOREIGN KEY → `school_terms`) - Used for filtering by term

---

### 2.4 `sections` Table

**Purpose**: Section information.

**Attributes Used**:
- `section_id` (PRIMARY KEY)
- `section_code` (e.g., "BA-3302")
- `program_id` (FOREIGN KEY → `programs`)
- `year_level`
- `specialization_id`

---

### 2.5 `programs` Table

**Purpose**: Academic program information.

**Attributes Used**:
- `program_id` (PRIMARY KEY)
- `name` (e.g., "Bachelor of Science in Information Technology")
- `program_abbreviation` (e.g., "BSIT")
- `department_id` (FOREIGN KEY → `departments`)

---

### 2.6 `departments` Table

**Purpose**: Department information.

**Attributes Used**:
- `department_id` (PRIMARY KEY)
- `name` (e.g., "College of Information and Computing Sciences")
- `department_abbreviation` (e.g., "CICS")

---

### 2.7 `attendance_logs` Table

**Purpose**: Student attendance records.

**Attributes Used**:
- `attendance_id` (PRIMARY KEY)
- `enrollment_id` (FOREIGN KEY → `course_enrollments`)
- `status` - Values: `'present'`, `'absent'`, `'late'`

**Metrics Computed**:
- `attendance_percentage` = (COUNT(present) / COUNT(total)) * 100
- `attendance_present_count` = COUNT(status = 'present')
- `attendance_absent_count` = COUNT(status = 'absent')
- `attendance_late_count` = COUNT(status = 'late')
- `attendance_total_sessions` = COUNT(attendance_id)

---

### 2.8 `submissions` Table

**Purpose**: Student assignment submissions.

**Attributes Used**:
- `submission_id` (PRIMARY KEY)
- `enrollment_id` (FOREIGN KEY → `course_enrollments`)
- `assessment_id` (FOREIGN KEY → `assessments`)
- `total_score` - Used for average score calculation
- `submission_status` - Values: `'ontime'`, `'late'`, `'missing'`

**Metrics Computed**:
- `average_score` = AVG(total_score) WHERE total_score IS NOT NULL
- `average_submission_status_score` = AVG(
    CASE 
      WHEN submission_status = 'ontime' THEN 0
      WHEN submission_status = 'late' THEN 1
      WHEN submission_status = 'missing' THEN 2
    END
  )
- `submission_rate` = COUNT(DISTINCT submission_id) / COUNT(DISTINCT assessment_id)
- `submission_ontime_count` = COUNT(DISTINCT submission_id WHERE status = 'ontime')
- `submission_late_count` = COUNT(DISTINCT submission_id WHERE status = 'late')
- `submission_missing_count` = COUNT(DISTINCT assessment_id) - COUNT(DISTINCT submission_id)
- `submission_total_assessments` = COUNT(DISTINCT assessment_id)

---

### 2.9 `assessments` Table

**Purpose**: Assignment/assessment information.

**Attributes Used**:
- `assessment_id` (PRIMARY KEY)
- `section_course_id` (FOREIGN KEY → `section_courses`)

**Used For**:
- Counting total assessments per student
- Calculating submission rates

---

### 2.10 `school_terms` Table

**Purpose**: Academic term information.

**Attributes Used**:
- `term_id` (PRIMARY KEY)
- `school_year`
- `semester`
- `is_active`

**Used For**:
- Filtering data by term
- Storing term_id in `analytics_clusters` for term-specific clustering

---

## 3. Data Flow

### 3.1 Reading Clusters (Cache Lookup)

**Query**: `getCachedClusters(termId, maxAgeHours)`

**Tables Used**:
- `analytics_clusters` (SELECT)

**Attributes Retrieved**:
- `student_id`
- `cluster_label`
- `cluster_number`
- `based_on` (JSONB)
- `algorithm_used`
- `model_version`
- `generated_at`

---

### 3.2 Computing Student Metrics (For Clustering API)

**Query**: `/api/assessments/dean-analytics/sample`

**Tables Used**:
- `students` (main table)
- `course_enrollments` (JOIN)
- `section_courses` (JOIN)
- `sections` (JOIN)
- `programs` (JOIN)
- `departments` (JOIN)
- `attendance_logs` (subquery)
- `submissions` (subquery)
- `assessments` (subquery)

**Attributes Computed**:
- Student info: `student_id`, `full_name`, `student_number`, `contact_email`
- Section/Program/Dept: `section_id`, `section_code`, `program_id`, `program_name`, `program_abbreviation`, `department_id`, `department_name`, `department_abbreviation`
- Attendance metrics: `attendance_percentage`, `attendance_present_count`, `attendance_absent_count`, `attendance_late_count`, `attendance_total_sessions`
- Score metrics: `average_score`, `ilo_weighted_score` (currently NULL)
- Submission metrics: `average_submission_status_score`, `submission_rate`, `submission_ontime_count`, `submission_late_count`, `submission_missing_count`, `submission_total_assessments`

---

### 3.3 Saving Clusters (Cache Storage)

**Function**: `saveClustersToCache(clusters, termId, algorithm, version)`

**Tables Used**:
- `analytics_clusters` (DELETE old, INSERT new)

**Operations**:
1. **DELETE** old clusters:
   - If `termId` specified: `DELETE WHERE term_id = $1 AND student_id IS NOT NULL`
   - If `termId` is NULL: `DELETE WHERE generated_at < $1 AND student_id IS NOT NULL` (48 hours old)
   - If `termId` is NULL: `DELETE WHERE student_id = $1 AND term_id IS NULL` (per student)

2. **INSERT** new clusters:
   - If `termId` specified: `INSERT ... ON CONFLICT (student_id, term_id) DO UPDATE`
   - If `termId` is NULL: `INSERT` (after deleting old NULL term_id clusters)

**Attributes Saved**:
- `student_id`
- `term_id` (can be NULL for "all terms")
- `cluster_label`
- `cluster_number`
- `based_on` (JSONB with attendance, score, submission_rate, average_days_late)
- `algorithm_used`
- `model_version`
- `generated_at` (NOW())

---

## 4. Key Relationships

```
students
  └─→ course_enrollments (student_id)
      └─→ section_courses (section_course_id)
          ├─→ sections (section_id)
          │   └─→ programs (program_id)
          │       └─→ departments (department_id)
          └─→ school_terms (term_id)
      ├─→ attendance_logs (enrollment_id)
      └─→ submissions (enrollment_id)
          └─→ assessments (assessment_id)
              └─→ section_courses (section_course_id)

analytics_clusters
  ├─→ students (student_id)
  └─→ school_terms (term_id)
```

---

## 5. Summary

### Tables Used for Clustering:
1. **`analytics_clusters`** - Cache storage (READ/WRITE)
2. **`students`** - Student data (READ)
3. **`course_enrollments`** - Enrollment links (READ)
4. **`section_courses`** - Course-section links (READ)
5. **`sections`** - Section info (READ)
6. **`programs`** - Program info (READ)
7. **`departments`** - Department info (READ)
8. **`attendance_logs`** - Attendance data (READ)
9. **`submissions`** - Submission data (READ)
10. **`assessments`** - Assessment data (READ)
11. **`school_terms`** - Term info (READ, referenced by term_id)

### Primary Attributes for Clustering Algorithm:
- `attendance_percentage` (from attendance_logs)
- `average_score` (from submissions)
- `submission_rate` (from submissions/assessments)
- `average_submission_status_score` (from submissions)

These 4 metrics are sent to the ML clustering API and stored in the `based_on` JSONB field in `analytics_clusters`.

