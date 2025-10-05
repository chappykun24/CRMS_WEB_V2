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

export default router;
