import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Assessments router is working!' });
});

// GET /api/assessments/faculty/:facultyId - Get all assessments for a faculty member
router.get('/faculty/:facultyId', async (req, res) => {
  const { facultyId } = req.params;
  
  try {
    const query = `
      SELECT 
        a.assessment_id,
        a.section_course_id,
        a.title,
        a.description,
        a.type,
        a.category,
        a.total_points,
        a.weight_percentage,
        a.due_date,
        a.submission_deadline,
        a.is_published,
        a.is_graded,
        a.grading_method,
        a.instructions,
        a.status,
        a.created_at,
        a.updated_at,
        sc.section_id,
        s.section_code,
        c.title as course_title,
        c.course_code,
        u.name as instructor_name
      FROM assessments a
      LEFT JOIN section_courses sc ON a.section_course_id = sc.section_course_id
      LEFT JOIN sections s ON sc.section_id = s.section_id
      LEFT JOIN courses c ON sc.course_id = c.course_id
      LEFT JOIN users u ON sc.instructor_id = u.user_id
      WHERE a.created_by = $1
      ORDER BY a.created_at DESC
    `;
    
    const result = await db.query(query, [facultyId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/assessments/class/:sectionCourseId - Get all assessments for a specific class
router.get('/class/:sectionCourseId', async (req, res) => {
  const { sectionCourseId } = req.params;
  
  try {
    const query = `
      SELECT 
        a.assessment_id,
        a.section_course_id,
        a.title,
        a.description,
        a.type,
        a.category,
        a.total_points,
        a.weight_percentage,
        a.due_date,
        a.submission_deadline,
        a.is_published,
        a.is_graded,
        a.grading_method,
        a.instructions,
        a.status,
        a.created_at,
        a.updated_at,
        (SELECT COUNT(*) FROM submissions s WHERE s.assessment_id = a.assessment_id) as total_submissions,
        (SELECT COUNT(*) FROM submissions s WHERE s.assessment_id = a.assessment_id AND s.status = 'graded') as graded_submissions
      FROM assessments a
      WHERE a.section_course_id = $1
      ORDER BY a.due_date ASC, a.created_at DESC
    `;
    
    const result = await db.query(query, [sectionCourseId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching class assessments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/assessments/:id - Get a specific assessment with details
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const query = `
      SELECT 
        a.*,
        sc.section_id,
        s.section_code,
        c.title as course_title,
        c.course_code,
        u.name as instructor_name,
        (SELECT COUNT(*) FROM submissions s WHERE s.assessment_id = a.assessment_id) as total_submissions,
        (SELECT COUNT(*) FROM submissions s WHERE s.assessment_id = a.assessment_id AND s.status = 'graded') as graded_submissions
      FROM assessments a
      LEFT JOIN section_courses sc ON a.section_course_id = sc.section_course_id
      LEFT JOIN sections s ON sc.section_id = s.section_id
      LEFT JOIN courses c ON sc.course_id = c.course_id
      LEFT JOIN users u ON sc.instructor_id = u.user_id
      WHERE a.assessment_id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching assessment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/assessments - Create a new assessment
router.post('/', async (req, res) => {
  const {
    section_course_id,
    title,
    description,
    type,
    category,
    total_points,
    weight_percentage,
    due_date,
    submission_deadline,
    grading_method,
    instructions,
    created_by
  } = req.body;
  
  try {
    const query = `
      INSERT INTO assessments (
        section_course_id, title, description, type, category,
        total_points, weight_percentage, due_date, submission_deadline,
        grading_method, instructions, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING assessment_id, title, type, total_points, weight_percentage, status
    `;
    
    const values = [
      section_course_id, title, description, type, category,
      total_points, weight_percentage, due_date, submission_deadline,
      grading_method, instructions, created_by
    ];
    
    const result = await db.query(query, values);
    res.status(201).json({ 
      assessment_id: result.rows[0].assessment_id,
      message: 'Assessment created successfully',
      assessment: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating assessment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/assessments/:id - Update an assessment
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    type,
    category,
    total_points,
    weight_percentage,
    due_date,
    submission_deadline,
    grading_method,
    instructions
  } = req.body;
  
  try {
    const query = `
      UPDATE assessments SET
        title = $1, description = $2, type = $3, category = $4,
        total_points = $5, weight_percentage = $6, due_date = $7,
        submission_deadline = $8, grading_method = $9, instructions = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE assessment_id = $11
      RETURNING assessment_id, title, type, total_points, weight_percentage
    `;
    
    const values = [
      title, description, type, category, total_points, weight_percentage,
      due_date, submission_deadline, grading_method, instructions, id
    ];
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    res.json({ 
      message: 'Assessment updated successfully',
      assessment: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating assessment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/assessments/:id/publish - Publish an assessment
router.put('/:id/publish', async (req, res) => {
  const { id } = req.params;
  
  try {
    const query = `
      UPDATE assessments SET
        is_published = true,
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
      WHERE assessment_id = $1
      RETURNING assessment_id, title, status, is_published
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    res.json({ 
      message: 'Assessment published successfully',
      assessment: result.rows[0]
    });
  } catch (error) {
    console.error('Error publishing assessment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/assessments/:id/unpublish - Unpublish an assessment
router.put('/:id/unpublish', async (req, res) => {
  const { id } = req.params;
  
  try {
    const query = `
      UPDATE assessments SET
        is_published = false,
        status = 'draft',
        updated_at = CURRENT_TIMESTAMP
      WHERE assessment_id = $1
      RETURNING assessment_id, title, status, is_published
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    res.json({ 
      message: 'Assessment unpublished successfully',
      assessment: result.rows[0]
    });
  } catch (error) {
    console.error('Error unpublishing assessment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/assessments/:id - Delete an assessment
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // First check if assessment exists
    const checkQuery = 'SELECT assessment_id, title FROM assessments WHERE assessment_id = $1';
    const checkResult = await db.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    // Delete the assessment (cascade will handle related records)
    const deleteQuery = 'DELETE FROM assessments WHERE assessment_id = $1 RETURNING title';
    const result = await db.query(deleteQuery, [id]);
    
    res.json({ 
      message: 'Assessment deleted successfully',
      deleted_assessment: result.rows[0].title
    });
  } catch (error) {
    console.error('Error deleting assessment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/assessments/:id/students - Get students enrolled in the assessment's class
router.get('/:id/students', async (req, res) => {
  const { id } = req.params;
  
  try {
    const query = `
      SELECT 
        ce.enrollment_id,
        s.student_id,
        s.student_number,
        s.full_name,
        s.contact_email,
        s.student_photo,
        sub.submission_id,
        sub.total_score,
        sub.raw_score,
        sub.adjusted_score,
        sub.late_penalty,
        sub.status as submission_status,
        sub.submitted_at,
        sub.graded_at
      FROM assessments a
      JOIN section_courses sc ON a.section_course_id = sc.section_course_id
      JOIN course_enrollments ce ON sc.section_course_id = ce.section_course_id
      JOIN students s ON ce.student_id = s.student_id
      LEFT JOIN submissions sub ON (ce.enrollment_id = sub.enrollment_id AND sub.assessment_id = a.assessment_id)
      WHERE a.assessment_id = $1 AND ce.status = 'enrolled'
      ORDER BY s.full_name
    `;
    
    const result = await db.query(query, [id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching assessment students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dean analytics endpoint (aggregated student analytics)
router.get('/dean-analytics/sample', async (req, res) => {
  try {
    // Sample SQL for demo: fetch attendance rate, average score, average days late by student
    const query = `
      SELECT
        s.student_id,
        s.full_name,
        ROUND(CAST(COALESCE(AVG(sub.total_score), 0) AS numeric), 2) as average_score,
        COUNT(al.attendance_id) as total_sessions,
        COUNT(CASE WHEN al.status = 'present' THEN 1 END) as present_count,
        ROUND(CAST(
          (COUNT(CASE WHEN al.status = 'present' THEN 1 END)::FLOAT / NULLIF(COUNT(al.attendance_id), 0)) * 100
          AS numeric
        ), 2) AS attendance_percentage,
        ROUND(CAST(COALESCE(AVG(
          GREATEST(0, DATE_PART('day', sub.submitted_at - ass.due_date))
        ), 0) AS numeric), 2) as average_days_late
      FROM students s
      LEFT JOIN course_enrollments ce ON s.student_id = ce.student_id
      LEFT JOIN attendance_logs al ON ce.enrollment_id = al.enrollment_id
      LEFT JOIN submissions sub ON ce.enrollment_id = sub.enrollment_id
      LEFT JOIN assessments ass ON sub.assessment_id = ass.assessment_id
      GROUP BY s.student_id, s.full_name
      ORDER BY s.full_name
      LIMIT 200;
    `;
    const result = await db.query(query);

    const students = result.rows;
    // Default to localhost for development if not set
    const clusterServiceUrl = process.env.CLUSTER_SERVICE_URL || 
                               process.env.CLUSTER_API_URL || 
                               (process.env.NODE_ENV === 'production' ? null : 'http://localhost:10000');
    let dataWithClusters = students;

    if (clusterServiceUrl) {
      const sanitizedPayload = students.map((row) => ({
        ...row,
        attendance_percentage: row.attendance_percentage !== null && row.attendance_percentage !== undefined
          ? Number(row.attendance_percentage)
          : null,
        average_score: row.average_score !== null && row.average_score !== undefined
          ? Number(row.average_score)
          : null,
        average_days_late: row.average_days_late !== null && row.average_days_late !== undefined
          ? Number(row.average_days_late)
          : null,
      }));

      try {
        const normalizedUrl = clusterServiceUrl.endsWith('/')
          ? clusterServiceUrl.slice(0, -1)
          : clusterServiceUrl;

        const response = await fetch(`${normalizedUrl}/api/cluster`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sanitizedPayload),
        });

        if (response.ok) {
          const clusterResults = await response.json();
          const clusterMap = new Map(
            clusterResults.map((item) => [item.student_id, item])
          );

          dataWithClusters = students.map((row) => {
            const clusterInfo = clusterMap.get(row.student_id);
            return {
              ...row,
              cluster: clusterInfo?.cluster ?? null,
              cluster_label: clusterInfo?.cluster_label ?? null,
            };
          });
        } else {
          const errorText = await response.text();
          console.error('Dean analytics clustering request failed:', response.status, errorText);
        }
      } catch (clusterError) {
        console.error('Dean analytics clustering error:', clusterError);
      }
    } else if (process.env.NODE_ENV !== 'production') {
      console.warn('Dean analytics clustering disabled: CLUSTER_SERVICE_URL not set');
    }

    res.json({
      success: true,
      data: dataWithClusters,
      clustering: {
        enabled: Boolean(clusterServiceUrl),
      },
    });
  } catch (error) {
    console.error('Dean analytics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
