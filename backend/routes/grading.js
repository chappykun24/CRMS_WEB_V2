import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Grading router is working!' });
});

// POST /api/grading/submit-grades - Submit grades for an assessment
router.post('/submit-grades', async (req, res) => {
  const { assessment_id, grades } = req.body;
  
  try {
    // Validate input
    if (!assessment_id || !Array.isArray(grades)) {
      return res.status(400).json({ error: 'Assessment ID and grades array are required' });
    }
    
    // Use transaction to ensure data consistency
    const result = await db.transaction(async (client) => {
      const results = [];
      
      for (const grade of grades) {
        const { enrollment_id, raw_score, late_penalty = 0, feedback = '', graded_by } = grade;
        
        // Calculate adjusted score
        const adjusted_score = Math.max(0, raw_score - late_penalty);
        
        // Check if submission already exists
        const existingSubmission = await client.query(
          'SELECT submission_id FROM submissions WHERE enrollment_id = $1 AND assessment_id = $2',
          [enrollment_id, assessment_id]
        );
        
        if (existingSubmission.rows.length > 0) {
          // Update existing submission
          const updateQuery = `
            UPDATE submissions SET
              total_score = $1,
              raw_score = $2,
              adjusted_score = $3,
              late_penalty = $4,
              graded_at = CURRENT_TIMESTAMP,
              graded_by = $5,
              status = 'graded',
              remarks = $6
            WHERE enrollment_id = $7 AND assessment_id = $8
            RETURNING submission_id, total_score, adjusted_score
          `;
          
          const updateResult = await client.query(updateQuery, [
            adjusted_score, raw_score, adjusted_score, late_penalty, 
            graded_by, feedback, enrollment_id, assessment_id
          ]);
          
          results.push({
            enrollment_id,
            submission_id: updateResult.rows[0].submission_id,
            total_score: updateResult.rows[0].total_score,
            adjusted_score: updateResult.rows[0].adjusted_score,
            action: 'updated'
          });
        } else {
          // Create new submission
          const insertQuery = `
            INSERT INTO submissions (
              enrollment_id, assessment_id, total_score, raw_score, 
              adjusted_score, late_penalty, graded_by, status, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'graded', $8)
            RETURNING submission_id, total_score, adjusted_score
          `;
          
          const insertResult = await client.query(insertQuery, [
            enrollment_id, assessment_id, adjusted_score, raw_score, 
            adjusted_score, late_penalty, graded_by, feedback
          ]);
          
          results.push({
            enrollment_id,
            submission_id: insertResult.rows[0].submission_id,
            total_score: insertResult.rows[0].total_score,
            adjusted_score: insertResult.rows[0].adjusted_score,
            action: 'created'
          });
        }
      }
      
      return results;
    });
    
    res.json({
      message: 'Grades submitted successfully',
      results: result,
      total_graded: result.length
    });
    
  } catch (error) {
    console.error('Error submitting grades:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/grading/assessment/:id/grades - Get all grades for an assessment
router.get('/assessment/:id/grades', async (req, res) => {
  const { id } = req.params;
  
  try {
    const query = `
      SELECT 
        s.student_id,
        s.student_number,
        s.full_name,
        s.contact_email,
        s.student_photo,
        ce.enrollment_id,
        sub.submission_id,
        sub.total_score,
        sub.raw_score,
        sub.adjusted_score,
        sub.late_penalty,
        sub.status as submission_status,
        sub.submitted_at,
        sub.graded_at,
        sub.remarks as feedback,
        u.name as graded_by_name
      FROM assessments a
      JOIN section_courses sc ON a.section_course_id = sc.section_course_id
      JOIN course_enrollments ce ON sc.section_course_id = ce.section_course_id
      JOIN students s ON ce.student_id = s.student_id
      LEFT JOIN submissions sub ON (ce.enrollment_id = sub.enrollment_id AND sub.assessment_id = a.assessment_id)
      LEFT JOIN users u ON sub.graded_by = u.user_id
      WHERE a.assessment_id = $1 AND ce.status = 'enrolled'
      ORDER BY s.full_name
    `;
    
    const result = await db.query(query, [id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching assessment grades:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/grading/grade/:submissionId - Update a specific grade
router.put('/grade/:submissionId', async (req, res) => {
  const { submissionId } = req.params;
  const { raw_score, late_penalty = 0, feedback = '', graded_by } = req.body;
  
  try {
    // Calculate adjusted score
    const adjusted_score = Math.max(0, raw_score - late_penalty);
    
    const query = `
      UPDATE submissions SET
        total_score = $1,
        raw_score = $2,
        adjusted_score = $3,
        late_penalty = $4,
        graded_at = CURRENT_TIMESTAMP,
        graded_by = $5,
        status = 'graded',
        remarks = $6
      WHERE submission_id = $7
      RETURNING submission_id, total_score, adjusted_score, raw_score, late_penalty
    `;
    
    const result = await db.query(query, [
      adjusted_score, raw_score, adjusted_score, late_penalty, 
      graded_by, feedback, submissionId
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    res.json({
      message: 'Grade updated successfully',
      grade: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating grade:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/grading/student/:enrollmentId/grades - Get all grades for a student
router.get('/student/:enrollmentId/grades', async (req, res) => {
  const { enrollmentId } = req.params;
  
  try {
    const query = `
      SELECT 
        a.assessment_id,
        a.title as assessment_title,
        a.type as assessment_type,
        a.total_points,
        a.weight_percentage,
        a.due_date,
        sub.submission_id,
        sub.total_score,
        sub.raw_score,
        sub.adjusted_score,
        sub.late_penalty,
        sub.status as submission_status,
        sub.submitted_at,
        sub.graded_at,
        sub.remarks as feedback,
        u.name as graded_by_name
      FROM course_enrollments ce
      JOIN section_courses sc ON ce.section_course_id = sc.section_course_id
      JOIN assessments a ON sc.section_course_id = a.section_course_id
      LEFT JOIN submissions sub ON (ce.enrollment_id = sub.enrollment_id AND sub.assessment_id = a.assessment_id)
      LEFT JOIN users u ON sub.graded_by = u.user_id
      WHERE ce.enrollment_id = $1
      ORDER BY a.due_date ASC
    `;
    
    const result = await db.query(query, [enrollmentId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching student grades:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/grading/class/:sectionCourseId/summary - Get grade summary for a class
router.get('/class/:sectionCourseId/summary', async (req, res) => {
  const { sectionCourseId } = req.params;
  
  try {
    const query = `
      SELECT 
        a.assessment_id,
        a.title as assessment_title,
        a.type as assessment_type,
        a.total_points,
        a.weight_percentage,
        a.due_date,
        COUNT(sub.submission_id) as total_submissions,
        COUNT(CASE WHEN sub.status = 'graded' THEN 1 END) as graded_submissions,
        AVG(sub.total_score) as average_score,
        MIN(sub.total_score) as lowest_score,
        MAX(sub.total_score) as highest_score
      FROM assessments a
      LEFT JOIN submissions sub ON a.assessment_id = sub.assessment_id
      WHERE a.section_course_id = $1
      GROUP BY a.assessment_id, a.title, a.type, a.total_points, a.weight_percentage, a.due_date
      ORDER BY a.due_date ASC
    `;
    
    const result = await db.query(query, [sectionCourseId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching class grade summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/grading/class/:sectionCourseId/student-grades - Get all students with their total grades for a class
router.get('/class/:sectionCourseId/student-grades', async (req, res) => {
  const { sectionCourseId } = req.params;
  
  try {
    const query = `
      WITH student_assessments AS (
        SELECT 
          ce.enrollment_id,
          ce.student_id,
          s.student_number,
          s.full_name,
          s.student_photo,
          a.assessment_id,
          a.title as assessment_title,
          a.total_points,
          a.weight_percentage,
          COALESCE(sub.total_score, 0) as score,
          CASE 
            WHEN sub.total_score IS NOT NULL AND a.total_points > 0 
            THEN (sub.total_score / a.total_points) * COALESCE(a.weight_percentage, 0)
            ELSE 0
          END as weighted_score
        FROM course_enrollments ce
        JOIN students s ON ce.student_id = s.student_id
        JOIN section_courses sc ON ce.section_course_id = sc.section_course_id
        LEFT JOIN assessments a ON sc.section_course_id = a.section_course_id
        LEFT JOIN submissions sub ON (ce.enrollment_id = sub.enrollment_id AND sub.assessment_id = a.assessment_id AND sub.status = 'graded')
        WHERE ce.section_course_id = $1 AND ce.status = 'enrolled'
      )
      SELECT 
        enrollment_id,
        student_id,
        student_number,
        full_name,
        student_photo,
        ROUND(SUM(weighted_score)::NUMERIC, 2) as total_grade,
        COUNT(DISTINCT assessment_id) as total_assessments,
        COUNT(DISTINCT CASE WHEN score > 0 THEN assessment_id END) as graded_assessments
      FROM student_assessments
      GROUP BY enrollment_id, student_id, student_number, full_name, student_photo
      ORDER BY full_name
    `;
    
    const result = await db.query(query, [sectionCourseId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching student grades for class:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
