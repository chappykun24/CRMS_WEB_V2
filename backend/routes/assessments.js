import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// ==========================================
// CLUSTER CACHING HELPER FUNCTIONS
// ==========================================

/**
 * Get cached clusters from database
 * @param {number|null} termId - School term ID (null for all terms)
 * @param {number} maxAgeHours - Maximum cache age in hours (default: 24)
 * @returns {Promise<Array>} Array of cached cluster records
 */
const getCachedClusters = async (termId, maxAgeHours = 24) => {
  try {
    const maxAge = new Date();
    maxAge.setHours(maxAge.getHours() - maxAgeHours);
    
    let query, params;
    
    if (termId) {
      query = `
        SELECT student_id, cluster_label, cluster_number, based_on, algorithm_used, model_version, generated_at
        FROM analytics_clusters
        WHERE term_id = $1 AND generated_at > $2 AND student_id IS NOT NULL
        ORDER BY student_id
      `;
      params = [termId, maxAge];
    } else {
      // For all terms, get the most recent clusters per student
      query = `
        SELECT DISTINCT ON (student_id) 
          student_id, cluster_label, cluster_number, based_on, algorithm_used, model_version, generated_at
        FROM analytics_clusters
        WHERE generated_at > $1 AND student_id IS NOT NULL
        ORDER BY student_id, generated_at DESC
      `;
      params = [maxAge];
    }
    
    const result = await db.query(query, params);
    console.log(`📦 [Cache] Retrieved ${result.rows.length} cached clusters (term: ${termId || 'all'}, max age: ${maxAgeHours}h)`);
    return result.rows;
  } catch (error) {
    console.error('❌ [Cache] Error fetching cached clusters:', error);
    return [];
  }
};

/**
 * Save clusters to database cache
 * @param {Array} clusters - Array of cluster results from ML API
 * @param {number|null} termId - School term ID
 * @param {string} algorithm - Algorithm name (default: 'kmeans')
 * @param {string} version - Model version (default: '1.0')
 * @returns {Promise<void>}
 */
const saveClusters = async (clusters, termId, algorithm = 'kmeans', version = '1.0') => {
  if (!clusters || clusters.length === 0) {
    console.warn('⚠️ [Cache] No clusters to save');
    return;
  }
  
  try {
    // Delete old clusters for this term (if term specified)
    if (termId) {
      await db.query('DELETE FROM analytics_clusters WHERE term_id = $1 AND student_id IS NOT NULL', [termId]);
    } else {
      // For all terms, delete clusters older than 48 hours
      const twoDaysAgo = new Date();
      twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);
      await db.query('DELETE FROM analytics_clusters WHERE generated_at < $1 AND student_id IS NOT NULL', [twoDaysAgo]);
    }
    
    // Prepare batch insert
    let savedCount = 0;
    for (const cluster of clusters) {
      if (!cluster.student_id) continue;
      
      const studentId = typeof cluster.student_id === 'string' ? parseInt(cluster.student_id, 10) : cluster.student_id;
      
      // Prepare based_on JSONB object with metrics
      const basedOn = {
        attendance: cluster.attendance_percentage || null,
        score: cluster.average_score || null,
        submission_rate: cluster.submission_rate || null,
        average_days_late: cluster.average_days_late || null
      };
      
      // Get cluster number (0, 1, 2, etc.)
      const clusterNumber = cluster.cluster !== undefined && cluster.cluster !== null 
        ? (typeof cluster.cluster === 'string' ? parseInt(cluster.cluster, 10) : cluster.cluster)
        : null;
      
      // Get cluster label (string)
      let clusterLabel = cluster.cluster_label;
      if (clusterLabel === null || clusterLabel === undefined ||
          (typeof clusterLabel === 'number' && isNaN(clusterLabel)) ||
          (typeof clusterLabel === 'string' && (clusterLabel.toLowerCase() === 'nan' || clusterLabel.trim() === ''))) {
        clusterLabel = null;
      } else {
        clusterLabel = String(clusterLabel);
      }
      
      // Use INSERT ... ON CONFLICT to update if exists
      // Note: The unique index is on (student_id, term_id) WHERE both are NOT NULL
      await db.query(`
        INSERT INTO analytics_clusters 
          (student_id, term_id, cluster_label, cluster_number, based_on, algorithm_used, model_version, generated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (student_id, term_id) 
        WHERE student_id IS NOT NULL AND term_id IS NOT NULL
        DO UPDATE SET 
          cluster_label = EXCLUDED.cluster_label,
          cluster_number = EXCLUDED.cluster_number,
          based_on = EXCLUDED.based_on,
          algorithm_used = EXCLUDED.algorithm_used,
          model_version = EXCLUDED.model_version,
          generated_at = NOW()
      `, [
        studentId,
        termId,
        clusterLabel,
        clusterNumber,
        JSON.stringify(basedOn),
        algorithm,
        version
      ]);
      
      savedCount++;
    }
    
    console.log(`💾 [Cache] Saved ${savedCount} clusters to database (term: ${termId || 'all'})`);
  } catch (error) {
    console.error('❌ [Cache] Error saving clusters:', error);
    // Don't throw - clustering should still work even if cache save fails
  }
};

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
  console.log('🔍 [Backend] Dean analytics endpoint called');
  const { term_id } = req.query;
  console.log('📋 [Backend] Filter term_id:', term_id);
  
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
    // Build WHERE clause for term filtering
    const termIdValue = term_id && !isNaN(parseInt(term_id)) ? parseInt(term_id) : null;
    if (termIdValue) {
      console.log('🔍 [Backend] Applying term filter:', termIdValue);
    }
    
    // Fetch student analytics: attendance, average score, and submission rate
    // Only show students enrolled in the selected term (or all enrolled students if no term selected)
    const query = `
      SELECT DISTINCT
        s.student_id,
        s.full_name,
        s.student_number,
        s.student_photo,
        s.contact_email,
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
        -- Average days late: average of days late for submissions that were actually late
        COALESCE(
          (
            SELECT ROUND(AVG(days_late)::NUMERIC, 2)
            FROM (
              SELECT EXTRACT(DAY FROM (sub.submitted_at - ass.due_date))::NUMERIC AS days_late
              FROM course_enrollments ce_late
              INNER JOIN section_courses sc_late ON ce_late.section_course_id = sc_late.section_course_id
              INNER JOIN submissions sub ON ce_late.enrollment_id = sub.enrollment_id
              INNER JOIN assessments ass ON sub.assessment_id = ass.assessment_id
              WHERE ce_late.student_id = s.student_id
                AND ce_late.status = 'enrolled'
                AND sub.submitted_at IS NOT NULL
                AND ass.due_date IS NOT NULL
                AND sub.submitted_at > ass.due_date
                ${termIdValue ? `AND sc_late.term_id = ${termIdValue}` : ''}
            ) late_submissions
          ),
          0
        )::NUMERIC AS average_days_late,
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
        )::NUMERIC AS submission_rate
      FROM students s
      INNER JOIN course_enrollments ce ON s.student_id = ce.student_id
      INNER JOIN section_courses sc ON ce.section_course_id = sc.section_course_id
      WHERE ce.status = 'enrolled'
        ${termIdValue ? `AND sc.term_id = ${termIdValue}` : ''}
      GROUP BY s.student_id, s.full_name, s.student_number, s.student_photo, s.contact_email
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
    // Default to localhost for development if not set
    // Check VITE_ prefixed vars first (for Vercel compatibility), then regular vars
    // Trim and validate the URLs to ensure they're not empty strings
    // Also remove surrounding quotes if present
    const getClusterUrl = (url, varName) => {
      if (!url) {
        console.log(`🔍 [Backend] ${varName}: (falsy or undefined)`);
        return null;
      }
      let trimmed = String(url).trim();
      // Remove surrounding quotes if present (single or double)
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
          (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        trimmed = trimmed.slice(1, -1).trim();
        console.log(`🔍 [Backend] ${varName}: Removed surrounding quotes`);
      }
      const result = trimmed.length > 0 ? trimmed : null;
      console.log(`🔍 [Backend] ${varName}: "${String(url)}" -> "${result}" (length: ${trimmed.length})`);
      return result;
    };
    
    // Debug: Log raw environment variables before processing
    const rawEnvVars = {
      VITE_CLUSTER_API_URL: process.env.VITE_CLUSTER_API_URL,
      CLUSTER_SERVICE_URL: process.env.CLUSTER_SERVICE_URL,
      CLUSTER_API_URL: process.env.CLUSTER_API_URL,
    };
    
    console.log('🔍 [Backend] Raw environment variables:', {
      VITE_CLUSTER_API_URL: rawEnvVars.VITE_CLUSTER_API_URL ? `"${rawEnvVars.VITE_CLUSTER_API_URL}" (type: ${typeof rawEnvVars.VITE_CLUSTER_API_URL}, length: ${String(rawEnvVars.VITE_CLUSTER_API_URL).length})` : '(undefined)',
      CLUSTER_SERVICE_URL: rawEnvVars.CLUSTER_SERVICE_URL ? `"${rawEnvVars.CLUSTER_SERVICE_URL}" (type: ${typeof rawEnvVars.CLUSTER_SERVICE_URL}, length: ${String(rawEnvVars.CLUSTER_SERVICE_URL).length})` : '(undefined)',
      CLUSTER_API_URL: rawEnvVars.CLUSTER_API_URL ? `"${rawEnvVars.CLUSTER_API_URL}" (type: ${typeof rawEnvVars.CLUSTER_API_URL}, length: ${String(rawEnvVars.CLUSTER_API_URL).length})` : '(undefined)',
    });
    
    // IMPORTANT: VITE_ prefixed vars are ONLY available in frontend, not backend!
    // On the backend, we should check CLUSTER_SERVICE_URL first (without VITE_ prefix)
    // Only check VITE_CLUSTER_API_URL as a fallback (won't work in production backend)
    const url1 = getClusterUrl(process.env.CLUSTER_SERVICE_URL, 'CLUSTER_SERVICE_URL');
    const url2 = getClusterUrl(process.env.CLUSTER_API_URL, 'CLUSTER_API_URL');
    const url3 = getClusterUrl(process.env.VITE_CLUSTER_API_URL, 'VITE_CLUSTER_API_URL');
    
    const clusterServiceUrl = url1 || url2 || url3 || 
                             (process.env.NODE_ENV === 'production' ? null : 'http://localhost:10000');
    
    console.log('🔗 [Backend] Final cluster service URL:', clusterServiceUrl || '(not set or empty)');
    console.log('🔗 [Backend] URL1 (CLUSTER_SERVICE_URL):', url1 || '(null)');
    console.log('🔗 [Backend] URL2 (CLUSTER_API_URL):', url2 || '(null)');
    console.log('🔗 [Backend] URL3 (VITE_CLUSTER_API_URL):', url3 || '(null)');
    console.log('🌐 [Backend] NODE_ENV:', process.env.NODE_ENV, '| Platform:', platform);
    
    // Get cache max age from environment (default: 24 hours)
    const cacheMaxAgeHours = parseInt(process.env.CLUSTER_CACHE_MAX_AGE_HOURS || '24', 10);
    
    let dataWithClusters = students;
    let cacheUsed = false;
    let clusterResultsFromAPI = null;

    // Step 1: Try to get cached clusters first (FAST PATH)
    if (clusterServiceUrl && process.env.DISABLE_CLUSTERING !== '1') {
      console.log('📦 [Cache] Checking for cached clusters...');
      const cachedClusters = await getCachedClusters(termIdValue, cacheMaxAgeHours);
      
      if (cachedClusters.length > 0) {
        // Create a map of cached clusters
        const cachedClusterMap = new Map();
        cachedClusters.forEach((cached) => {
          const studentId = typeof cached.student_id === 'string' ? parseInt(cached.student_id, 10) : cached.student_id;
          cachedClusterMap.set(studentId, cached);
        });
        
        // Check if we have clusters for all students (or majority)
        const studentsWithCachedClusters = students.filter(s => {
          const studentId = typeof s.student_id === 'string' ? parseInt(s.student_id, 10) : s.student_id;
          return cachedClusterMap.has(studentId);
        });
        
        // Use cache if we have clusters for at least 80% of students
        const cacheHitRatio = students.length > 0 ? studentsWithCachedClusters.length / students.length : 0;
        
        if (cacheHitRatio >= 0.8) {
          console.log(`✅ [Cache] Cache hit! Found clusters for ${studentsWithCachedClusters.length}/${students.length} students (${Math.round(cacheHitRatio * 100)}%)`);
          
          // Merge cached clusters with student data
          dataWithClusters = students.map((row) => {
            const studentId = typeof row.student_id === 'string' ? parseInt(row.student_id, 10) : row.student_id;
            const cachedCluster = cachedClusterMap.get(studentId);
            
            let clusterLabel = cachedCluster?.cluster_label;
            if (clusterLabel === null || clusterLabel === undefined ||
                (typeof clusterLabel === 'number' && isNaN(clusterLabel)) ||
                (typeof clusterLabel === 'string' && (clusterLabel.toLowerCase() === 'nan' || clusterLabel.trim() === ''))) {
              clusterLabel = null;
            } else {
              clusterLabel = String(clusterLabel);
            }
            
            return {
              ...row,
              cluster: cachedCluster?.cluster_number ?? null,
              cluster_label: clusterLabel,
            };
          });
          
          cacheUsed = true;
          
          // Log cluster distribution from cache
          const clusterCounts = dataWithClusters.reduce((acc, row) => {
            const cluster = row.cluster_label || 'Not Clustered';
            acc[cluster] = (acc[cluster] || 0) + 1;
            return acc;
          }, {});
          console.log('📊 [Cache] Cluster distribution from cache:', clusterCounts);
        } else {
          console.log(`⚠️ [Cache] Cache miss! Only found clusters for ${studentsWithCachedClusters.length}/${students.length} students (${Math.round(cacheHitRatio * 100)}%). Will fetch fresh clusters.`);
        }
      } else {
        console.log('❌ [Cache] No cached clusters found. Will fetch fresh clusters.');
      }
    }

    // Step 2: If cache miss, call clustering API (SLOW PATH)
    if (!cacheUsed && clusterServiceUrl && process.env.DISABLE_CLUSTERING !== '1') {
      console.log('🔄 [Backend] Attempting to call clustering API...');
      const sanitizedPayload = students.map((row) => {
        // Log sample data being sent
        if (students.indexOf(row) === 0) {
          console.log('📤 [Backend] Sample student data being sent:', {
            student_id: row.student_id,
            attendance_percentage: row.attendance_percentage,
            average_score: row.average_score,
            average_days_late: row.average_days_late,
            submission_rate: row.submission_rate
          });
        }
        
        return {
          student_id: row.student_id,
          attendance_percentage: row.attendance_percentage !== null && row.attendance_percentage !== undefined && !isNaN(row.attendance_percentage)
            ? Number(row.attendance_percentage)
            : null,
          average_score: row.average_score !== null && row.average_score !== undefined && !isNaN(row.average_score)
            ? Number(row.average_score)
            : null,
          average_days_late: row.average_days_late !== null && row.average_days_late !== undefined && !isNaN(row.average_days_late)
            ? Number(row.average_days_late)
            : null,
          submission_rate: row.submission_rate !== null && row.submission_rate !== undefined && !isNaN(row.submission_rate)
            ? Number(row.submission_rate)
            : null,
        };
      });
      console.log('📦 [Backend] Sending', sanitizedPayload.length, 'students to clustering API');

      // Declare clusterEndpoint outside try block so it's available in catch
      const normalizedUrl = clusterServiceUrl.endsWith('/')
        ? clusterServiceUrl.slice(0, -1)
        : clusterServiceUrl;
      const clusterEndpoint = `${normalizedUrl}/api/cluster`;
      
      try {
        // Respect configurable timeout to avoid hanging requests in serverless
        // Increased default timeout for Railway/cloud deployments which may be slower
        const timeoutMs = parseInt(process.env.CLUSTER_TIMEOUT_MS || '15000', 10);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        console.log('🌐 [Backend] Calling:', clusterEndpoint);

        const response = await fetch(clusterEndpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(sanitizedPayload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        console.log('📡 [Backend] Clustering API response status:', response.status);

        if (response.ok) {
          clusterResultsFromAPI = await response.json();
          console.log('✅ [Backend] Received', clusterResultsFromAPI.length, 'clustered results');
          
          if (!Array.isArray(clusterResultsFromAPI)) {
            console.error('❌ [Backend] Invalid response format from clustering API. Expected array, got:', typeof clusterResultsFromAPI);
            throw new Error('Invalid response format from clustering API');
          }
          
          if (clusterResultsFromAPI.length === 0) {
            console.warn('⚠️ [Backend] Clustering API returned empty array');
          }
          
          // Create map with proper type handling for student_id (handle both string and number)
          const clusterMap = new Map();
          clusterResultsFromAPI.forEach((item) => {
            // Normalize student_id to number for consistent matching
            const studentId = typeof item.student_id === 'string' ? parseInt(item.student_id, 10) : item.student_id;
            clusterMap.set(studentId, item);
          });
          
          console.log('🔍 [Backend] Cluster map size:', clusterMap.size);
          if (clusterResultsFromAPI.length > 0) {
            console.log('📋 [Backend] Sample cluster result:', {
              student_id: clusterResultsFromAPI[0].student_id,
              cluster: clusterResultsFromAPI[0].cluster,
              cluster_label: clusterResultsFromAPI[0].cluster_label
            });
          }

          dataWithClusters = students.map((row, index) => {
            // Normalize student_id for lookup (handle both string and number)
            const studentId = typeof row.student_id === 'string' ? parseInt(row.student_id, 10) : row.student_id;
            const clusterInfo = clusterMap.get(studentId);
            
            // Debug: Log first few unmatched students
            if (!clusterInfo && index < 3) {
              console.log(`⚠️ [Backend] No cluster found for student_id: ${row.student_id} (normalized: ${studentId}), available IDs in map:`, 
                Array.from(clusterMap.keys()).slice(0, 5));
            }
            
            // Ensure cluster_label is always a string, handle null/NaN/undefined
            let clusterLabel = clusterInfo?.cluster_label;
            if (clusterLabel === null || clusterLabel === undefined || 
                (typeof clusterLabel === 'number' && isNaN(clusterLabel)) ||
                (typeof clusterLabel === 'string' && (clusterLabel.toLowerCase() === 'nan' || clusterLabel.trim() === ''))) {
              clusterLabel = null; // Will be displayed as "Not Clustered" in frontend
            } else {
              // Ensure it's a string
              clusterLabel = String(clusterLabel);
            }
            
            return {
              ...row,
              cluster: clusterInfo?.cluster ?? null,
              cluster_label: clusterLabel,
            };
                      });
            
            // Step 3: Save clusters to cache for next time (non-blocking)
            if (clusterResultsFromAPI && clusterResultsFromAPI.length > 0) {
              // Merge student data with cluster results for saving
              const clustersToSave = clusterResultsFromAPI.map(clusterResult => {
                const studentData = students.find(s => {
                  const studentId = typeof s.student_id === 'string' ? parseInt(s.student_id, 10) : s.student_id;
                  const clusterId = typeof clusterResult.student_id === 'string' ? parseInt(clusterResult.student_id, 10) : clusterResult.student_id;
                  return studentId === clusterId;
                });
                
                return {
                  ...clusterResult,
                  attendance_percentage: studentData?.attendance_percentage || null,
                  average_score: studentData?.average_score || null,
                  submission_rate: studentData?.submission_rate || null,
                  average_days_late: studentData?.average_days_late || null
                };
              });
              
              // Save to cache asynchronously (don't wait for it to complete)
              saveClusters(clustersToSave, termIdValue, 'kmeans', '1.0').catch(err => {
                console.error('⚠️ [Cache] Failed to save clusters (non-blocking):', err.message);
              });
            }
            
            // Log cluster distribution
            const clusterCounts = dataWithClusters.reduce((acc, row) => {
            const cluster = row.cluster_label || 'Not Clustered';
            acc[cluster] = (acc[cluster] || 0) + 1;
            return acc;
          }, {});
          console.log('📈 [Backend] Cluster distribution:', clusterCounts);
          console.log('📊 [Backend] Total students processed:', dataWithClusters.length);
          console.log('📊 [Backend] Students with valid cluster_label:', 
            dataWithClusters.filter(r => r.cluster_label && r.cluster_label !== null && r.cluster_label !== 'Not Clustered').length);
        } else {
          const errorText = await response.text();
          console.error('❌ [Backend] Clustering request failed:', response.status);
          console.error('❌ [Backend] Error response:', errorText.substring(0, 500));
          console.error('❌ [Backend] Cluster endpoint called:', clusterEndpoint);
          // Don't throw - continue without clustering, but log the error
        }
      } catch (clusterError) {
        const errorMessage = clusterError.name === 'AbortError' 
          ? `Timeout after ${timeoutMs}ms - the clustering API may be slow or unreachable` 
          : clusterError.message;
        console.error('❌ [Backend] Clustering error:', errorMessage);
        console.error('❌ [Backend] Cluster endpoint:', clusterEndpoint);
        console.error('❌ [Backend] Error type:', clusterError.name);
        if (clusterError.stack) {
          console.error('Stack:', clusterError.stack);
        }
        // Continue without clustering - students will show "Not Clustered"
      }
    } else if (!cacheUsed) {
      // Only log warning if cache wasn't used AND clustering API wasn't called
      // This means clustering is truly disabled (no URL or DISABLE_CLUSTERING=1)
      // More detailed logging to help debug the issue
      const envVars = {
        VITE_CLUSTER_API_URL: process.env.VITE_CLUSTER_API_URL || '(empty)',
        CLUSTER_SERVICE_URL: process.env.CLUSTER_SERVICE_URL || '(empty)',
        CLUSTER_API_URL: process.env.CLUSTER_API_URL || '(empty)',
        NODE_ENV: process.env.NODE_ENV,
        DISABLE_CLUSTERING: process.env.DISABLE_CLUSTERING || '(not set)'
      };
      
      // Check if any of the variables exist but are empty
      const hasEmptyVar = (
        (process.env.VITE_CLUSTER_API_URL !== undefined && !process.env.VITE_CLUSTER_API_URL?.trim()) ||
        (process.env.CLUSTER_SERVICE_URL !== undefined && !process.env.CLUSTER_SERVICE_URL?.trim()) ||
        (process.env.CLUSTER_API_URL !== undefined && !process.env.CLUSTER_API_URL?.trim())
      );
      
      if (process.env.DISABLE_CLUSTERING === '1') {
        console.warn('⚠️  [Backend] Clustering disabled: DISABLE_CLUSTERING=1');
      } else if (hasEmptyVar) {
        console.warn('⚠️  [Backend] Clustering disabled: One or more cluster URL environment variables are set but empty');
        console.warn('⚠️  [Backend] Environment variables:', envVars);
        console.warn('💡 [Backend] Tip: Make sure your CLUSTER_SERVICE_URL contains a valid URL, not just an empty string');
      } else {
        console.warn('⚠️  [Backend] Clustering disabled: No cluster service URL found in environment variables');
        console.warn('⚠️  [Backend] Environment variables:', envVars);
        console.warn('💡 [Backend] Tip: Set one of these environment variables: VITE_CLUSTER_API_URL, CLUSTER_SERVICE_URL, or CLUSTER_API_URL');
      }
    } else {
      // Cache was used successfully - no need to log warnings
      console.log('✅ [Backend] Using cached clusters - clustering is enabled and working');
    }

    // Log final data sample to verify cluster_label is present
    if (dataWithClusters.length > 0) {
      console.log('📊 [Backend] Final data sample (first student):', {
        student_id: dataWithClusters[0].student_id,
        full_name: dataWithClusters[0].full_name,
        cluster: dataWithClusters[0].cluster,
        cluster_label: dataWithClusters[0].cluster_label,
        attendance_percentage: dataWithClusters[0].attendance_percentage
      });
      
      // Count how many students have cluster_label
      const withCluster = dataWithClusters.filter(row => row.cluster_label && row.cluster_label !== null).length;
      console.log(`📈 [Backend] Students with cluster_label: ${withCluster} / ${dataWithClusters.length}`);
    }

    // Determine clustering API platform from the URL
    let clusterPlatform = 'Unknown';
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
            enabled: Boolean(clusterServiceUrl) && process.env.DISABLE_CLUSTERING !== '1',
            cached: cacheUsed,  // Indicates if cached clusters were used
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
