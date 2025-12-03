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

      // Fetch assessment grading configuration (needed for non-zero based computation)
      const assessmentConfigResult = await client.query(
        'SELECT total_points, weight_percentage FROM assessments WHERE assessment_id = $1',
        [assessment_id]
      );

      if (assessmentConfigResult.rows.length === 0) {
        throw new Error('Assessment not found for grading computation');
      }

      const {
        total_points: assessmentTotalPoints,
        weight_percentage: assessmentWeightPercentage
      } = assessmentConfigResult.rows[0];
      
      for (const grade of grades) {
        const { 
          enrollment_id, 
          raw_score, 
          late_penalty = 0, 
          feedback = '', 
          graded_by, 
          submission_status = 'missing',
          // Allow adjusted_score override but always recompute actual/transmuted using backend formula
          adjusted_score: providedAdjustedScore
        } = grade;
        
        // Validate submission_status
        const validStatuses = ['ontime', 'late', 'missing'];
        const finalStatus = validStatuses.includes(submission_status) ? submission_status : 'missing';
        
        // Validate and convert raw_score to number (handle null, empty string, etc.)
        const numericRawScore = raw_score !== null && raw_score !== '' && !isNaN(raw_score) 
          ? parseFloat(raw_score) 
          : null;
        
        // Calculate adjusted score (only if raw_score is valid)
        // If missing submission, adjusted_score should be null, not 0
        const adjusted_score = providedAdjustedScore !== undefined 
          ? (providedAdjustedScore !== null ? parseFloat(providedAdjustedScore) : null)
          : ((finalStatus === 'missing' || numericRawScore === null) 
            ? null 
            : Math.max(0, numericRawScore - (late_penalty || 0)));

        // Non-zero based grading computation:
        // Step 1: Raw/Adjusted → Actual Score (non-zero based, min 37.5)
        //   Actual Score = (Adjusted Score / Max Score) × 62.5 + 37.5
        // Step 2: Actual Score → Transmuted Score (weighted)
        //   Transmuted Score = Actual Score × (Weight Percentage / 100)
        let actual_score = null;
        let transmuted_score = null;

        const totalPoints =
          assessmentTotalPoints !== null && assessmentTotalPoints !== undefined
            ? parseFloat(assessmentTotalPoints)
            : null;
        const weightPercentage =
          assessmentWeightPercentage !== null && assessmentWeightPercentage !== undefined
            ? parseFloat(assessmentWeightPercentage)
            : 0;

        if (
          finalStatus !== 'missing' &&
          adjusted_score !== null &&
          totalPoints !== null &&
          !Number.isNaN(totalPoints) &&
          totalPoints > 0
        ) {
          const computedActual = (adjusted_score / totalPoints) * 62.5 + 37.5;
          actual_score = computedActual;

          // If weight is defined, compute transmuted score, otherwise leave as null
          if (!Number.isNaN(weightPercentage) && weightPercentage > 0) {
            transmuted_score = (computedActual * weightPercentage) / 100;
          }
        }
        
        // Check if submission already exists
        const existingSubmission = await client.query(
          'SELECT submission_id FROM submissions WHERE enrollment_id = $1 AND assessment_id = $2',
          [enrollment_id, assessment_id]
        );
        
        if (existingSubmission.rows.length > 0) {
          // Update existing submission
          // Use adjusted_score for total_score (they should be the same)
          // Explicitly cast null values to proper types for PostgreSQL
          const updateQuery = `
            UPDATE submissions SET
              total_score = $1::NUMERIC,
              raw_score = $2::NUMERIC,
              adjusted_score = $3::NUMERIC,
              actual_score = $4::NUMERIC,
              transmuted_score = $5::NUMERIC,
              late_penalty = $6::NUMERIC,
              graded_at = CURRENT_TIMESTAMP,
              graded_by = $7,
              status = CASE WHEN $3 IS NULL THEN 'pending' ELSE 'graded' END,
              submission_status = $8,
              remarks = $9
            WHERE enrollment_id = $10 AND assessment_id = $11
            RETURNING submission_id, total_score, adjusted_score, actual_score, transmuted_score, submission_status
          `;
          
          const updateResult = await client.query(updateQuery, [
            adjusted_score, numericRawScore, adjusted_score, actual_score, transmuted_score,
            late_penalty || 0, graded_by, finalStatus, feedback, enrollment_id, assessment_id
          ]);
          
          results.push({
            enrollment_id,
            submission_id: updateResult.rows[0].submission_id,
            total_score: updateResult.rows[0].total_score,
            adjusted_score: updateResult.rows[0].adjusted_score,
            submission_status: updateResult.rows[0].submission_status,
            action: 'updated'
          });
        } else {
          // Create new submission
          // Use adjusted_score for total_score (they should be the same)
          // Only set status to 'graded' if there's an actual score
          // Explicitly cast null values to proper types for PostgreSQL
          const insertQuery = `
            INSERT INTO submissions (
              enrollment_id, assessment_id, total_score, raw_score, 
              adjusted_score, actual_score, transmuted_score, late_penalty, graded_by, status, submission_status, remarks
            ) VALUES ($1, $2, $3::NUMERIC, $4::NUMERIC, $5::NUMERIC, $6::NUMERIC, $7::NUMERIC, $8::NUMERIC, $9, CASE WHEN $3 IS NULL THEN 'pending' ELSE 'graded' END, $10, $11)
            RETURNING submission_id, total_score, adjusted_score, actual_score, transmuted_score, submission_status
          `;
          
          const insertResult = await client.query(insertQuery, [
            enrollment_id, assessment_id, adjusted_score, numericRawScore, 
            adjusted_score, actual_score, transmuted_score,
            late_penalty || 0, graded_by, finalStatus, feedback
          ]);
          
          results.push({
            enrollment_id,
            submission_id: insertResult.rows[0].submission_id,
            total_score: insertResult.rows[0].total_score,
            adjusted_score: insertResult.rows[0].adjusted_score,
            actual_score: insertResult.rows[0].actual_score,
            transmuted_score: insertResult.rows[0].transmuted_score,
            submission_status: insertResult.rows[0].submission_status,
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
// Memory optimization: Exclude photos by default (photos are large base64 strings)
router.get('/assessment/:id/grades', async (req, res) => {
  const { id } = req.params;
  const includePhotos = req.query.includePhotos === 'true';
  
  try {
    // Exclude photos by default to save memory
    const photoField = includePhotos ? 's.student_photo' : 'NULL as student_photo';
    
    const query = `
      SELECT 
        s.student_id,
        s.student_number,
        s.full_name,
        s.contact_email,
        ${photoField},
        ce.enrollment_id,
        sub.submission_id,
        sub.total_score,
        sub.raw_score,
        sub.adjusted_score,
        sub.late_penalty,
        sub.status as workflow_status,
        COALESCE(sub.submission_status, 'missing') as submission_status,
        sub.graded_at,
        sub.remarks as feedback,
        u.name as graded_by_name,
        a.due_date
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
  const { raw_score, late_penalty = 0, feedback = '', graded_by, submission_status = 'missing' } = req.body;
  
  try {
    // Validate submission_status
    const validStatuses = ['ontime', 'late', 'missing'];
    const finalStatus = validStatuses.includes(submission_status) ? submission_status : 'missing';
    
    // Validate and convert raw_score to number (handle null, empty string, etc.)
    const numericRawScore = raw_score !== null && raw_score !== '' && !isNaN(raw_score) 
      ? parseFloat(raw_score) 
      : null;
    
    // Calculate adjusted score (only if raw_score is valid)
    // If missing submission, adjusted_score should be null, not 0
    const adjusted_score = (finalStatus === 'missing' || numericRawScore === null) 
      ? null 
      : Math.max(0, numericRawScore - (late_penalty || 0));

    // Fetch assessment config for this submission to apply non-zero based grading formula
    const assessmentConfigResult = await db.query(
      `
        SELECT a.total_points, a.weight_percentage
        FROM submissions s
        JOIN assessments a ON s.assessment_id = a.assessment_id
        WHERE s.submission_id = $1
      `,
      [submissionId]
    );

    if (assessmentConfigResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission or assessment not found for grading computation' });
    }

    const {
      total_points: assessmentTotalPoints,
      weight_percentage: assessmentWeightPercentage
    } = assessmentConfigResult.rows[0];

    let actual_score = null;
    let transmuted_score = null;

    const totalPoints =
      assessmentTotalPoints !== null && assessmentTotalPoints !== undefined
        ? parseFloat(assessmentTotalPoints)
        : null;
    const weightPercentage =
      assessmentWeightPercentage !== null && assessmentWeightPercentage !== undefined
        ? parseFloat(assessmentWeightPercentage)
        : 0;

    if (
      finalStatus !== 'missing' &&
      adjusted_score !== null &&
      totalPoints !== null &&
      !Number.isNaN(totalPoints) &&
      totalPoints > 0
    ) {
      const computedActual = (adjusted_score / totalPoints) * 62.5 + 37.5;
      actual_score = computedActual;

      if (!Number.isNaN(weightPercentage) && weightPercentage > 0) {
        transmuted_score = (computedActual * weightPercentage) / 100;
      }
    }
    
    // Explicitly cast null values to proper types for PostgreSQL
    const query = `
      UPDATE submissions SET
        total_score = $1::NUMERIC,
        raw_score = $2::NUMERIC,
        adjusted_score = $3::NUMERIC,
        actual_score = $4::NUMERIC,
        transmuted_score = $5::NUMERIC,
        late_penalty = $6::NUMERIC,
        graded_at = CURRENT_TIMESTAMP,
        graded_by = $7,
        status = CASE WHEN $3 IS NULL THEN 'pending' ELSE 'graded' END,
        submission_status = $8,
        remarks = $9
      WHERE submission_id = $10
      RETURNING submission_id, total_score, adjusted_score, raw_score, late_penalty, submission_status, actual_score, transmuted_score
    `;
    
    const result = await db.query(query, [
      adjusted_score, numericRawScore, adjusted_score, actual_score, transmuted_score,
      late_penalty || 0, graded_by, finalStatus, feedback, submissionId
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
        a.description,
        a.total_points,
        a.weight_percentage,
        a.due_date,
        sub.submission_id,
        sub.total_score,
        sub.raw_score,
        sub.adjusted_score,
        sub.late_penalty,
        sub.status as workflow_status,
        COALESCE(sub.submission_status, 'missing') as submission_status,
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
        AVG(sub.adjusted_score) as average_score,
        MIN(sub.adjusted_score) as lowest_score,
        MAX(sub.adjusted_score) as highest_score
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
// Memory optimization: Exclude photos by default (photos are large base64 strings)
router.get('/class/:sectionCourseId/student-grades', async (req, res) => {
  const { sectionCourseId } = req.params;
  const includePhotos = req.query.includePhotos === 'true';
  
  try {
    // Exclude photos by default to save memory
    const photoField = includePhotos ? 's.student_photo' : 'NULL as student_photo';
    
    const query = `
      WITH student_assessments AS (
        SELECT 
          ce.enrollment_id,
          ce.student_id,
          s.student_number,
          s.full_name,
          ${photoField},
          a.assessment_id,
          a.title as assessment_title,
          a.total_points,
          a.weight_percentage,
          COALESCE(sub.adjusted_score, 0) as score,
          CASE 
            WHEN sub.adjusted_score IS NOT NULL AND a.total_points > 0 
            THEN (sub.adjusted_score / a.total_points) * COALESCE(a.weight_percentage, 0)
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

// GET /api/grading/class/:sectionCourseId/assessment-scores - Get all students with their scores for each assessment
// Memory optimization: Exclude photos by default (photos are large base64 strings)
// Use ?includePhotos=true to include photos, or fetch photos separately
router.get('/class/:sectionCourseId/assessment-scores', async (req, res) => {
  const { sectionCourseId } = req.params;
  const includePhotos = req.query.includePhotos === 'true';
  
  try {
    // Exclude photos by default to save memory
    const photoField = includePhotos ? 's.student_photo' : 'NULL as student_photo';
    
    const query = `
      SELECT 
        ce.enrollment_id,
        ce.student_id,
        s.student_number,
        s.full_name,
        ${photoField},
        a.assessment_id,
        a.title as assessment_title,
        a.type as assessment_type,
        a.total_points,
        a.weight_percentage,
        a.due_date,
        sub.submission_id,
        sub.total_score,
        sub.raw_score,
        -- Use adjusted_score as the primary score (accounts for late penalties)
        -- adjusted_score is the score that should be used for calculations and display
        sub.adjusted_score,
        sub.late_penalty,
        sub.status as workflow_status,
        COALESCE(sub.submission_status, 'missing') as submission_status,
        sub.graded_at
      FROM course_enrollments ce
      JOIN students s ON ce.student_id = s.student_id
      JOIN section_courses sc ON ce.section_course_id = sc.section_course_id
      LEFT JOIN assessments a ON sc.section_course_id = a.section_course_id
      LEFT JOIN submissions sub ON (ce.enrollment_id = sub.enrollment_id AND sub.assessment_id = a.assessment_id)
      WHERE ce.section_course_id = $1 AND ce.status = 'enrolled'
      ORDER BY s.full_name, a.due_date ASC
    `;
    
    const result = await db.query(query, [sectionCourseId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching assessment scores for class:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
