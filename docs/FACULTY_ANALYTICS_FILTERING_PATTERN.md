# Faculty Analytics Filtering Pattern

## Data Flow Hierarchy

```
Faculty (user_id)
    ↓
Section Courses (section_course_id) - Classes taught by faculty
    ↓
Course Enrollments (enrollment_id) - Students enrolled in those classes
    ↓
Student Analytics Data (attendance, scores, submissions, clusters)
```

## Database Relationships

### 1. Faculty → Section Courses
**Table**: `section_courses`
- `instructor_id` = Faculty's `user_id`
- `section_course_id` = Unique class identifier
- `section_id` = Section identifier
- `course_id` = Course identifier
- `term_id` = Academic term

**Query Pattern**:
```sql
SELECT section_course_id, section_id, course_id, term_id
FROM section_courses
WHERE instructor_id = {faculty_user_id}
  AND term_id = {selected_term_id}
```

### 2. Section Courses → Course Enrollments
**Table**: `course_enrollments`
- `enrollment_id` = Unique enrollment identifier
- `section_course_id` = Links to faculty's class
- `student_id` = Student identifier
- `status` = Enrollment status (enrolled, dropped, completed)

**Query Pattern**:
```sql
SELECT enrollment_id, student_id, section_course_id, status
FROM course_enrollments
WHERE section_course_id IN ({faculty_section_course_ids})
  AND status = 'enrolled'
```

### 3. Course Enrollments → Student Analytics Data
**Tables**: Multiple (attendance, assessments, grades, submissions)
- All analytics queries filter by `section_course_id`
- Data aggregated per student per `section_course_id`

**Query Pattern**:
```sql
SELECT 
  s.student_id,
  s.full_name,
  ce.section_course_id,
  -- Attendance data
  AVG(att.attendance_percentage) as attendance_percentage,
  -- Grade data
  AVG(g.score) as average_score,
  -- Submission data
  COUNT(sub.submission_id) as submission_count,
  -- Cluster data
  cluster.cluster_label
FROM students s
JOIN course_enrollments ce ON s.student_id = ce.student_id
LEFT JOIN attendance att ON ce.enrollment_id = att.enrollment_id
LEFT JOIN assessment_grades g ON ce.enrollment_id = g.enrollment_id
LEFT JOIN submissions sub ON ce.enrollment_id = sub.enrollment_id
WHERE ce.section_course_id IN ({faculty_section_course_ids})
GROUP BY s.student_id, ce.section_course_id
```

## Frontend Filtering Implementation

### Step 1: Fetch Faculty Classes
```javascript
// Get all section_courses where faculty is instructor
GET /api/section-courses/faculty/{faculty_id}
Response: [
  {
    section_course_id: 1,
    section_id: 10,
    course_id: 5,
    term_id: 3,
    instructor_id: {faculty_id}
  },
  ...
]
```

### Step 2: Filter Analytics by Section Course IDs
```javascript
// Build filter parameters
const sectionCourseIds = facultyClasses.map(cls => cls.section_course_id);
// [1, 2, 3, ...]

// API call with section_course_id filters
GET /api/assessments/dean-analytics/sample?
  term_id={term_id}&
  section_course_id=1&
  section_course_id=2&
  section_course_id=3
```

### Step 3: Backend Filters Data
```javascript
// Backend SQL WHERE clause
WHERE sc.section_course_id IN (1, 2, 3, ...)
  AND ce_att.section_course_id IN (1, 2, 3, ...)
  AND ce_grade.section_course_id IN (1, 2, 3, ...)
  -- etc for all subqueries
```

### Step 4: Client-Side Additional Filtering
```javascript
// Double-check filtering on frontend
filteredData = data.filter(row => {
  const rowSectionCourseId = row.section_course_id;
  return facultySectionCourseIds.has(parseInt(rowSectionCourseId));
});
```

## Complete Filtering Chain

```
1. Faculty Login
   └─> user_id = {faculty_id}

2. Fetch Faculty Classes
   └─> GET /section-courses/faculty/{faculty_id}
   └─> Returns: [{section_course_id: 1}, {section_course_id: 2}, ...]

3. Extract Section Course IDs
   └─> [1, 2, 3, ...]

4. Fetch Analytics with Section Course Filter
   └─> GET /assessments/dean-analytics/sample?section_course_id=1&section_course_id=2&...
   └─> Backend filters: WHERE section_course_id IN (1, 2, 3, ...)

5. Backend Query Flow
   └─> section_courses (instructor_id = faculty_id)
       └─> course_enrollments (section_course_id IN faculty_classes)
           └─> students (student_id IN enrolled_students)
               └─> attendance, grades, submissions (enrollment_id)

6. Return Filtered Data
   └─> Only students enrolled in faculty's section_courses

7. Client-Side Validation
   └─> Additional filter by section_course_id (defense in depth)
```

## Key Points

1. **Primary Filter**: `section_course_id` - This is the most accurate filter
   - Students are enrolled in specific `section_course_id` classes
   - Each `section_course_id` has one `instructor_id` (faculty)

2. **Secondary Filter**: `section_id` - Fallback if `section_course_id` not available
   - Less accurate (one section can have multiple courses)

3. **Enrollment ID**: Used internally for joining attendance, grades, submissions
   - Links `student_id` + `section_course_id` together
   - Not used for filtering, only for data aggregation

4. **Data Structure**:
   ```
   Faculty (user_id: 5)
   ├─ Section Course 1 (section_course_id: 10, instructor_id: 5)
   │  ├─ Enrollment 1 (enrollment_id: 100, student_id: 1, section_course_id: 10)
   │  │  ├─ Attendance Data
   │  │  ├─ Grade Data
   │  │  └─ Submission Data
   │  └─ Enrollment 2 (enrollment_id: 101, student_id: 2, section_course_id: 10)
   │     └─ ...
   └─ Section Course 2 (section_course_id: 11, instructor_id: 5)
      └─ ...
   ```

## Security Considerations

1. **API-Level Filtering**: Primary security - filters at database level
2. **Client-Side Filtering**: Defense in depth - validates data on frontend
3. **No Bypass**: Faculty can only see data for their assigned classes
4. **Empty Classes**: If faculty has classes but no enrollments, returns empty data

