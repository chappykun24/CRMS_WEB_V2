import express from 'express';
import db from '../config/database.js';
import clusteringService from '../services/clusteringService.js';

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
        a.syllabus_id,
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
        sy.title as syllabus_title,
        sy.version as syllabus_version,
        sy.approval_status as syllabus_approval_status,
        (SELECT COUNT(*) FROM submissions sub WHERE sub.assessment_id = a.assessment_id) as total_submissions,
        (SELECT COUNT(*) FROM submissions sub WHERE sub.assessment_id = a.assessment_id AND sub.status = 'graded') as graded_submissions
      FROM assessments a
      LEFT JOIN syllabi sy ON a.syllabus_id = sy.syllabus_id
      WHERE a.section_course_id = $1
      ORDER BY a.due_date ASC, a.created_at DESC
    `;
    
    const result = await db.query(query, [sectionCourseId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching class assessments:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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
        sy.title as syllabus_title,
        sy.version as syllabus_version,
        sy.syllabus_id,
        (SELECT COUNT(*) FROM submissions sub WHERE sub.assessment_id = a.assessment_id) as total_submissions,
        (SELECT COUNT(*) FROM submissions sub WHERE sub.assessment_id = a.assessment_id AND sub.status = 'graded') as graded_submissions
      FROM assessments a
      LEFT JOIN section_courses sc ON a.section_course_id = sc.section_course_id
      LEFT JOIN sections s ON sc.section_id = s.section_id
      LEFT JOIN courses c ON sc.course_id = c.course_id
      LEFT JOIN users u ON sc.instructor_id = u.user_id
      LEFT JOIN syllabi sy ON a.syllabus_id = sy.syllabus_id
      WHERE a.assessment_id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching assessment:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// POST /api/assessments - Create a new assessment
router.post('/', async (req, res) => {
  const {
    section_course_id,
    syllabus_id,
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
        section_course_id, syllabus_id, title, description, type, category,
        total_points, weight_percentage, due_date, submission_deadline,
        grading_method, instructions, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING assessment_id, title, type, total_points, weight_percentage, status, syllabus_id
    `;
    
    // Convert empty string to null for syllabus_id
    const normalizedSyllabusId = (syllabus_id === '' || syllabus_id === undefined || syllabus_id === null) ? null : syllabus_id;
    
    const values = [
      section_course_id, normalizedSyllabusId, title, description, type, category,
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
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// PUT /api/assessments/:id - Update an assessment
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    syllabus_id,
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
    // Convert empty string to null for syllabus_id
    const normalizedSyllabusId = (syllabus_id === '' || syllabus_id === undefined || syllabus_id === null) ? null : syllabus_id;
    
    const query = `
      UPDATE assessments SET
        syllabus_id = $1,
        title = $2, description = $3, type = $4, category = $5,
        total_points = $6, weight_percentage = $7, due_date = $8,
        submission_deadline = $9, grading_method = $10, instructions = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE assessment_id = $12
      RETURNING assessment_id, title, type, total_points, weight_percentage, syllabus_id
    `;
    
    const values = [
      normalizedSyllabusId,
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
    res.status(500).json({ error: 'Internal server error', details: error.message });
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
// Memory optimization: Exclude photos by default (photos are large base64 strings)
router.get('/:id/students', async (req, res) => {
  const { id } = req.params;
  const includePhotos = req.query.includePhotos === 'true';
  
  try {
    // Exclude photos by default to save memory
    const photoField = includePhotos ? 's.student_photo' : 'NULL as student_photo';
    
    const query = `
      SELECT 
        ce.enrollment_id,
        s.student_id,
        s.student_number,
        s.full_name,
        s.contact_email,
        ${photoField},
        sub.submission_id,
        sub.total_score,
        sub.raw_score,
        sub.adjusted_score,
        sub.late_penalty,
        sub.status as workflow_status,
        COALESCE(sub.submission_status, 'missing') as submission_status,
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
  console.log('🔍 [Backend] Dean analytics endpoint called');
  const { term_id, section_id, program_id, department_id } = req.query;
  console.log('📋 [Backend] Filters - term_id:', term_id, 'section_id:', section_id, 'program_id:', program_id, 'department_id:', department_id);
  
  // Set a timeout to prevent hanging requests
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('❌ [Backend] Request timeout - taking too long');
      res.status(504).json({ 
        success: false, 
        error: 'Request timeout - the query is taking too long to execute',
        timeout: true
      });
    }
  }, 25000); // 25 second timeout (before proxy timeout)
  
  try {
    // Build WHERE clause for filtering
    const termIdValue = term_id && !isNaN(parseInt(term_id)) ? parseInt(term_id) : null;
    const sectionIdValue = section_id && !isNaN(parseInt(section_id)) ? parseInt(section_id) : null;
    const programIdValue = program_id && !isNaN(parseInt(program_id)) ? parseInt(program_id) : null;
    const departmentIdValue = department_id && !isNaN(parseInt(department_id)) ? parseInt(department_id) : null;
    
    if (termIdValue) console.log('🔍 [Backend] Applying term filter:', termIdValue);
    if (sectionIdValue) console.log('🔍 [Backend] Applying section filter:', sectionIdValue);
    if (programIdValue) console.log('🔍 [Backend] Applying program filter:', programIdValue);
    if (departmentIdValue) console.log('🔍 [Backend] Applying department filter:', departmentIdValue);
    
    // Build additional WHERE conditions for filtering
    let additionalWhereConditions = [];
    if (sectionIdValue) {
      additionalWhereConditions.push(`sec.section_id = ${sectionIdValue}`);
    }
    if (programIdValue) {
      additionalWhereConditions.push(`p.program_id = ${programIdValue}`);
    }
    if (departmentIdValue) {
      additionalWhereConditions.push(`d.department_id = ${departmentIdValue}`);
    }
    const additionalWhereClause = additionalWhereConditions.length > 0 
      ? `AND ${additionalWhereConditions.join(' AND ')}` 
      : '';
    
    // Fetch student analytics: attendance, average score, and submission rate
    // Enhanced with detailed attendance counts and submission behavior
    // Includes section/program/department information for filtering
    const query = `
      SELECT DISTINCT
        s.student_id,
        s.full_name,
        s.student_number,
        -- Exclude student_photo to reduce data transfer (load on-demand via /api/students/:id/photo)
        NULL as student_photo,
        s.contact_email,
        -- Section/Program/Department info (for filtering and display)
        sec.section_id,
        sec.section_code,
        p.program_id,
        p.name AS program_name,
        p.program_abbreviation,
        d.department_id,
        d.name AS department_name,
        d.department_abbreviation,
        -- Attendance percentage: count of present / total attendance sessions
        COALESCE(
          (
            SELECT ROUND(
              (COUNT(CASE WHEN al.status = 'present' THEN 1 END)::NUMERIC / 
               NULLIF(COUNT(al.attendance_id), 0)::NUMERIC) * 100, 
              2
            )
            FROM course_enrollments ce_att
            LEFT JOIN section_courses sc_att ON ce_att.section_course_id = sc_att.section_course_id
            LEFT JOIN attendance_logs al ON ce_att.enrollment_id = al.enrollment_id
            WHERE ce_att.student_id = s.student_id
              AND ce_att.status = 'enrolled'
              ${termIdValue ? `AND sc_att.term_id = ${termIdValue}` : ''}
          ),
          0
        )::NUMERIC AS attendance_percentage,
        -- Detailed attendance counts: present, absent, late, total sessions
        (
          SELECT COUNT(CASE WHEN al.status = 'present' THEN 1 END)::INTEGER
          FROM course_enrollments ce_att
          LEFT JOIN section_courses sc_att ON ce_att.section_course_id = sc_att.section_course_id
          LEFT JOIN attendance_logs al ON ce_att.enrollment_id = al.enrollment_id
          WHERE ce_att.student_id = s.student_id
            AND ce_att.status = 'enrolled'
            ${termIdValue ? `AND sc_att.term_id = ${termIdValue}` : ''}
        )::INTEGER AS attendance_present_count,
        (
          SELECT COUNT(CASE WHEN al.status = 'absent' THEN 1 END)::INTEGER
          FROM course_enrollments ce_att
          LEFT JOIN section_courses sc_att ON ce_att.section_course_id = sc_att.section_course_id
          LEFT JOIN attendance_logs al ON ce_att.enrollment_id = al.enrollment_id
          WHERE ce_att.student_id = s.student_id
            AND ce_att.status = 'enrolled'
            ${termIdValue ? `AND sc_att.term_id = ${termIdValue}` : ''}
        )::INTEGER AS attendance_absent_count,
        (
          SELECT COUNT(CASE WHEN al.status = 'late' THEN 1 END)::INTEGER
          FROM course_enrollments ce_att
          LEFT JOIN section_courses sc_att ON ce_att.section_course_id = sc_att.section_course_id
          LEFT JOIN attendance_logs al ON ce_att.enrollment_id = al.enrollment_id
          WHERE ce_att.student_id = s.student_id
            AND ce_att.status = 'enrolled'
            ${termIdValue ? `AND sc_att.term_id = ${termIdValue}` : ''}
        )::INTEGER AS attendance_late_count,
        (
          SELECT COUNT(al.attendance_id)::INTEGER
          FROM course_enrollments ce_att
          LEFT JOIN section_courses sc_att ON ce_att.section_course_id = sc_att.section_course_id
          LEFT JOIN attendance_logs al ON ce_att.enrollment_id = al.enrollment_id
          WHERE ce_att.student_id = s.student_id
            AND ce_att.status = 'enrolled'
            ${termIdValue ? `AND sc_att.term_id = ${termIdValue}` : ''}
        )::INTEGER AS attendance_total_sessions,
        -- Average score: average of all submission scores for this student
        COALESCE(
          (
            SELECT ROUND(AVG(sub.total_score)::NUMERIC, 2)
            FROM course_enrollments ce_sub
            INNER JOIN section_courses sc_sub ON ce_sub.section_course_id = sc_sub.section_course_id
            INNER JOIN submissions sub ON ce_sub.enrollment_id = sub.enrollment_id
            WHERE ce_sub.student_id = s.student_id
              AND ce_sub.status = 'enrolled'
              AND sub.total_score IS NOT NULL
              ${termIdValue ? `AND sc_sub.term_id = ${termIdValue}` : ''}
          ),
          0
        )::NUMERIC AS average_score,
        -- ILO-weighted score: average score weighted by ILO coverage (if available)
        -- For now, use average_score as base. ILO weighting can be enhanced later.
        -- This field is provided for future enhancement with ILO-based weighting
        NULL::NUMERIC AS ilo_weighted_score,
        -- Average submission status score: converts ontime=0, late=1, missing=2 to numerical average
        COALESCE(
          (
            SELECT ROUND(AVG(
              CASE 
                WHEN COALESCE(sub.submission_status, 'missing') = 'ontime' THEN 0
                WHEN COALESCE(sub.submission_status, 'missing') = 'late' THEN 1
                WHEN COALESCE(sub.submission_status, 'missing') = 'missing' THEN 2
                ELSE 2
              END
            )::NUMERIC, 2)
            FROM course_enrollments ce_status
            INNER JOIN section_courses sc_status ON ce_status.section_course_id = sc_status.section_course_id
            INNER JOIN assessments ass ON sc_status.section_course_id = ass.section_course_id
            LEFT JOIN submissions sub ON (
              ce_status.enrollment_id = sub.enrollment_id 
              AND sub.assessment_id = ass.assessment_id
            )
            WHERE ce_status.student_id = s.student_id
              AND ce_status.status = 'enrolled'
              ${termIdValue ? `AND sc_status.term_id = ${termIdValue}` : ''}
          ),
          2
        )::NUMERIC AS average_submission_status_score,
        -- Submission rate: distinct submissions / distinct assessments for this student
        COALESCE(
          (
            SELECT ROUND(
              (COUNT(DISTINCT sub.submission_id)::NUMERIC / 
               NULLIF(COUNT(DISTINCT ass.assessment_id), 0)::NUMERIC),
              4
            )
            FROM course_enrollments ce_rate
            LEFT JOIN section_courses sc_rate ON ce_rate.section_course_id = sc_rate.section_course_id
            LEFT JOIN assessments ass ON sc_rate.section_course_id = ass.section_course_id
            LEFT JOIN submissions sub ON (
              ce_rate.enrollment_id = sub.enrollment_id 
              AND sub.assessment_id = ass.assessment_id
            )
            WHERE ce_rate.student_id = s.student_id
              AND ce_rate.status = 'enrolled'
              ${termIdValue ? `AND sc_rate.term_id = ${termIdValue}` : ''}
          ),
          0
        )::NUMERIC AS submission_rate,
        -- Detailed submission behavior counts: ontime, late, missing, total assessments
        (
          SELECT COUNT(DISTINCT CASE WHEN COALESCE(sub.submission_status, 'missing') = 'ontime' THEN sub.submission_id END)::INTEGER
          FROM course_enrollments ce_sub
          LEFT JOIN section_courses sc_sub ON ce_sub.section_course_id = sc_sub.section_course_id
          LEFT JOIN assessments ass ON sc_sub.section_course_id = ass.section_course_id
          LEFT JOIN submissions sub ON (
            ce_sub.enrollment_id = sub.enrollment_id 
            AND sub.assessment_id = ass.assessment_id
          )
          WHERE ce_sub.student_id = s.student_id
            AND ce_sub.status = 'enrolled'
            ${termIdValue ? `AND sc_sub.term_id = ${termIdValue}` : ''}
        )::INTEGER AS submission_ontime_count,
        (
          SELECT COUNT(DISTINCT CASE WHEN sub.submission_status = 'late' THEN sub.submission_id END)::INTEGER
          FROM course_enrollments ce_sub
          LEFT JOIN section_courses sc_sub ON ce_sub.section_course_id = sc_sub.section_course_id
          LEFT JOIN assessments ass ON sc_sub.section_course_id = ass.section_course_id
          LEFT JOIN submissions sub ON (
            ce_sub.enrollment_id = sub.enrollment_id 
            AND sub.assessment_id = ass.assessment_id
          )
          WHERE ce_sub.student_id = s.student_id
            AND ce_sub.status = 'enrolled'
            ${termIdValue ? `AND sc_sub.term_id = ${termIdValue}` : ''}
        )::INTEGER AS submission_late_count,
        (
          SELECT COUNT(DISTINCT ass.assessment_id)::INTEGER - 
                 COUNT(DISTINCT CASE WHEN sub.submission_id IS NOT NULL THEN ass.assessment_id END)::INTEGER
          FROM course_enrollments ce_sub
          LEFT JOIN section_courses sc_sub ON ce_sub.section_course_id = sc_sub.section_course_id
          LEFT JOIN assessments ass ON sc_sub.section_course_id = ass.section_course_id
          LEFT JOIN submissions sub ON (
            ce_sub.enrollment_id = sub.enrollment_id 
            AND sub.assessment_id = ass.assessment_id
          )
          WHERE ce_sub.student_id = s.student_id
            AND ce_sub.status = 'enrolled'
            ${termIdValue ? `AND sc_sub.term_id = ${termIdValue}` : ''}
        )::INTEGER AS submission_missing_count,
        (
          SELECT COUNT(DISTINCT ass.assessment_id)::INTEGER
          FROM course_enrollments ce_sub
          LEFT JOIN section_courses sc_sub ON ce_sub.section_course_id = sc_sub.section_course_id
          LEFT JOIN assessments ass ON sc_sub.section_course_id = ass.section_course_id
          WHERE ce_sub.student_id = s.student_id
            AND ce_sub.status = 'enrolled'
            ${termIdValue ? `AND sc_sub.term_id = ${termIdValue}` : ''}
        )::INTEGER AS submission_total_assessments
      FROM students s
      INNER JOIN course_enrollments ce ON s.student_id = ce.student_id
      INNER JOIN section_courses sc ON ce.section_course_id = sc.section_course_id
      INNER JOIN sections sec ON sc.section_id = sec.section_id
      INNER JOIN programs p ON sec.program_id = p.program_id
      INNER JOIN departments d ON p.department_id = d.department_id
      WHERE ce.status = 'enrolled'
        ${termIdValue ? `AND sc.term_id = ${termIdValue}` : ''}
        ${additionalWhereClause}
      GROUP BY s.student_id, s.full_name, s.student_number, s.student_photo, s.contact_email,
               sec.section_id, sec.section_code, p.program_id, p.name, p.program_abbreviation,
               d.department_id, d.name, d.department_abbreviation
      ORDER BY s.full_name
      LIMIT 200;
    `;
    const result = await db.query(query);
    console.log('✅ [Backend] Fetched', result.rows.length, 'students from database');

    const students = result.rows;
    // Detect hosting platform for visibility
    const platform = (
      process.env.VERCEL ? 'Vercel' :
      process.env.RENDER ? 'Render' :
      process.env.RAILWAY_ENVIRONMENT ? 'Railway' :
      'Unknown'
    );

    // Use clustering service for consistent clustering logic
    const clusteringConfig = clusteringService.getClusteringConfig();
    console.log('🔗 [Backend] Clustering configuration:', {
      enabled: clusteringConfig.enabled,
      url: clusteringConfig.url || '(not set)',
      timeoutMs: clusteringConfig.timeoutMs,
      cacheMaxAgeHours: clusteringConfig.cacheMaxAgeHours
    });

    // Get clusters using the centralized service
    const clusteringResult = await clusteringService.getStudentClusters(
      students,
      termIdValue,
      {
        cacheMaxAgeHours: clusteringConfig.cacheMaxAgeHours,
        algorithm: 'kmeans',
        version: '1.0',
        timeoutMs: clusteringConfig.timeoutMs
      }
    );

    // Apply clusters to student data
    let dataWithClusters = clusteringService.applyClustersToStudents(students, clusteringResult.clusters);

    // Log clustering results with detailed diagnostics
    console.log('🔍 [Backend] Clustering result details:', {
      cacheUsed: clusteringResult.cacheUsed,
      apiCalled: clusteringResult.apiCalled,
      error: clusteringResult.error,
      clustersSize: clusteringResult.clusters.size,
      studentsCount: students.length,
      enabled: clusteringConfig.enabled
    });

    if (clusteringResult.cacheUsed) {
      console.log('✅ [Backend] Using cached clusters - clustering is enabled and working');
      const clusterDistribution = clusteringService.getClusterDistribution(dataWithClusters);
      console.log('📊 [Backend] Cluster distribution from cache:', clusterDistribution);
    } else if (clusteringResult.apiCalled) {
      console.log('✅ [Backend] Clusters retrieved from API');
      const clusterDistribution = clusteringService.getClusterDistribution(dataWithClusters);
      console.log('📊 [Backend] Cluster distribution from API:', clusterDistribution);
      
      // Log sample cluster data to verify it's being applied
      if (dataWithClusters.length > 0) {
        const sampleWithCluster = dataWithClusters.find(s => s.cluster_label);
        const sampleWithoutCluster = dataWithClusters.find(s => !s.cluster_label);
        console.log('🔍 [Backend] Sample student WITH cluster:', sampleWithCluster ? {
          student_id: sampleWithCluster.student_id,
          cluster: sampleWithCluster.cluster,
          cluster_label: sampleWithCluster.cluster_label
        } : 'None found');
        console.log('🔍 [Backend] Sample student WITHOUT cluster:', sampleWithoutCluster ? {
          student_id: sampleWithoutCluster.student_id,
          cluster: sampleWithoutCluster.cluster,
          cluster_label: sampleWithoutCluster.cluster_label
        } : 'None found');
      }
    } else if (clusteringResult.error) {
      console.warn(`⚠️ [Backend] Clustering error: ${clusteringResult.error}`);
      if (!clusteringConfig.enabled) {
        console.warn('⚠️ [Backend] Clustering is disabled');
        console.warn('💡 [Backend] Tip: Set CLUSTER_SERVICE_URL environment variable to enable clustering');
      }
    } else {
      console.warn('⚠️ [Backend] Clustering returned no results and no error - this may indicate an issue');
      console.warn('⚠️ [Backend] Clusters map size:', clusteringResult.clusters.size);
      console.warn('⚠️ [Backend] Students count:', students.length);
    }

    // Determine clustering API platform from the URL
    let clusterPlatform = 'Unknown';
    const clusterServiceUrl = clusteringConfig.url;
    if (clusterServiceUrl) {
      if (clusterServiceUrl.includes('railway')) {
        clusterPlatform = 'Railway';
      } else if (clusterServiceUrl.includes('render')) {
        clusterPlatform = 'Render';
      } else if (clusterServiceUrl.includes('fly.io')) {
        clusterPlatform = 'Fly.io';
      } else if (clusterServiceUrl.includes('vercel')) {
        clusterPlatform = 'Vercel';
      } else {
        clusterPlatform = 'Custom';
      }
    }
    
    // Sanitize data to ensure JSON-safe values (handle null, undefined, NaN, Infinity)
    const sanitizeForJSON = (obj) => {
      if (obj === null || obj === undefined) {
        return null;
      }
      if (typeof obj === 'number') {
        if (isNaN(obj) || !isFinite(obj)) {
          return null;
        }
        return obj;
      }
      if (typeof obj === 'string') {
        // Ensure string is valid and doesn't contain problematic characters
        // Remove null bytes and other control characters that can break JSON
        // Also handle very long strings that might cause issues
        let sanitized = obj
          .replace(/\0/g, '') // Remove null bytes
          .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters except \t, \n, \r
          .trim();
        
        // Truncate extremely long strings to prevent JSON parsing issues
        // PostgreSQL TEXT fields can be very large, but we'll limit to 10KB per field
        const MAX_STRING_LENGTH = 10000;
        if (sanitized.length > MAX_STRING_LENGTH) {
          console.warn(`⚠️ [Backend] Truncating long string field (${sanitized.length} chars -> ${MAX_STRING_LENGTH} chars)`);
          sanitized = sanitized.substring(0, MAX_STRING_LENGTH) + '...';
        }
        
        return sanitized;
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitizeForJSON);
      }
      if (typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeForJSON(value);
        }
        return sanitized;
      }
      return obj;
    };
    
    const sanitizedData = sanitizeForJSON(dataWithClusters);
    
    clearTimeout(timeout);
    
    // Ensure response is sent only once
    if (!res.headersSent) {
      try {
        // Set CORS headers explicitly to ensure they're always sent
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        
        // Try to serialize the response to catch any JSON errors early
        const responseData = {
          success: true,
          data: sanitizedData,
          clustering: {
            enabled: clusteringConfig.enabled,
            cached: clusteringResult.cacheUsed,  // Indicates if cached clusters were used
            backendPlatform: platform,  // Where the backend is hosted
            apiPlatform: clusterPlatform,  // Where the clustering API is hosted
            serviceUrl: clusterServiceUrl ? (clusterServiceUrl.substring(0, 50) + '...') : 'not configured'
          },
        };
        
        // Validate JSON serialization before sending
        JSON.stringify(responseData);
        
        res.json(responseData);
      } catch (jsonError) {
        console.error('❌ [Backend] JSON serialization error:', jsonError);
        console.error('❌ [Backend] Error details:', {
          message: jsonError.message,
          name: jsonError.name,
          stack: jsonError.stack?.substring(0, 500)
        });
        
        if (!res.headersSent) {
          // Set CORS headers even on error
          res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
          res.setHeader('Access-Control-Allow-Credentials', 'true');
          
          res.status(500).json({
            success: false,
            error: 'Failed to serialize response data. Data may contain invalid characters.',
            details: process.env.NODE_ENV === 'development' ? jsonError.message : undefined
          });
        }
      }
    }
  } catch (error) {
    clearTimeout(timeout);
    console.error('❌ [Backend] Dean analytics error:', error);
    console.error('❌ [Backend] Error stack:', error.stack);
    
    // Detect specific error types
    let statusCode = 500;
    let errorMessage = error.message || 'Failed to load analytics';
    
    // Database connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      statusCode = 503; // Service Unavailable
      errorMessage = 'Database connection failed. Please try again in a moment.';
    } else if (error.code === '57P01' || error.message?.includes('terminating connection')) {
      statusCode = 503;
      errorMessage = 'Database connection was terminated. Please try again.';
    } else if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
      statusCode = 504; // Gateway Timeout
      errorMessage = 'Database query timeout. The request took too long to execute.';
    }
    
    if (!res.headersSent) {
      // Set CORS headers even on error
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      res.status(statusCode).json({ 
        success: false, 
        error: errorMessage,
        errorCode: error.code,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
});

export default router;
