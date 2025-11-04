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
  console.log('🔍 [Backend] Dean analytics endpoint called');
  try {
    // Fetch student analytics: attendance, average score, average days late, and submission rate
    // Using subqueries to ensure accurate calculations per student
    const query = `
      WITH student_metrics AS (
        SELECT
          s.student_id,
          s.full_name,
          -- Attendance percentage: only count sessions where student is enrolled
          COALESCE(
            ROUND(
              (COUNT(CASE WHEN al.status = 'present' THEN 1 END)::FLOAT / 
               NULLIF(COUNT(al.attendance_id), 0)) * 100, 
              2
            ), 
            0
          ) AS attendance_percentage,
          -- Average score: only from submissions that have scores
          COALESCE(
            ROUND(
              AVG(CASE WHEN sub.total_score IS NOT NULL THEN sub.total_score END)::numeric,
              2
            ),
            0
          ) AS average_score,
          -- Average days late: only calculate for submissions that are actually late
          COALESCE(
            ROUND(
              AVG(
                CASE 
                  WHEN sub.submitted_at IS NOT NULL 
                    AND ass.due_date IS NOT NULL 
                    AND sub.submitted_at > ass.due_date
                  THEN DATE_PART('day', sub.submitted_at - ass.due_date)
                  ELSE NULL
                END
              )::numeric,
              2
            ),
            0
          ) AS average_days_late,
          -- Submission rate: distinct submissions / distinct assessments
          COALESCE(
            ROUND(
              (COUNT(DISTINCT sub.submission_id)::FLOAT / 
               NULLIF(COUNT(DISTINCT ass.assessment_id), 0)),
              4
            ),
            0
          ) AS submission_rate
        FROM students s
        LEFT JOIN course_enrollments ce ON s.student_id = ce.student_id
        LEFT JOIN attendance_logs al ON ce.enrollment_id = al.enrollment_id
        LEFT JOIN section_courses sc ON ce.section_course_id = sc.section_course_id
        LEFT JOIN assessments ass ON sc.section_course_id = ass.section_course_id
        LEFT JOIN submissions sub ON (
          ce.enrollment_id = sub.enrollment_id 
          AND sub.assessment_id = ass.assessment_id
        )
        GROUP BY s.student_id, s.full_name
      )
      SELECT 
        student_id,
        full_name,
        attendance_percentage,
        average_score,
        average_days_late,
        submission_rate
      FROM student_metrics
      ORDER BY full_name
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
    const clusterServiceUrl = process.env.VITE_CLUSTER_API_URL ||
                             process.env.CLUSTER_SERVICE_URL || 
                             process.env.CLUSTER_API_URL || 
                             (process.env.NODE_ENV === 'production' ? null : 'http://localhost:10000');
    console.log('🎯 [Backend] Cluster service URL:', clusterServiceUrl);
    console.log('🌍 [Backend] NODE_ENV:', process.env.NODE_ENV, '| Platform:', platform);
    let dataWithClusters = students;

    if (clusterServiceUrl && process.env.DISABLE_CLUSTERING !== '1') {
      console.log('🚀 [Backend] Attempting to call clustering API...');
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
          const clusterResults = await response.json();
          console.log('✅ [Backend] Received', clusterResults.length, 'clustered results');
          
          if (!Array.isArray(clusterResults)) {
            console.error('❌ [Backend] Invalid response format from clustering API. Expected array, got:', typeof clusterResults);
            throw new Error('Invalid response format from clustering API');
          }
          
          if (clusterResults.length === 0) {
            console.warn('⚠️ [Backend] Clustering API returned empty array');
          }
          
          // Create map with proper type handling for student_id (handle both string and number)
          const clusterMap = new Map();
          clusterResults.forEach((item) => {
            // Normalize student_id to number for consistent matching
            const studentId = typeof item.student_id === 'string' ? parseInt(item.student_id, 10) : item.student_id;
            clusterMap.set(studentId, item);
          });
          
          console.log('🔍 [Backend] Cluster map size:', clusterMap.size);
          if (clusterResults.length > 0) {
            console.log('📋 [Backend] Sample cluster result:', {
              student_id: clusterResults[0].student_id,
              cluster: clusterResults[0].cluster,
              cluster_label: clusterResults[0].cluster_label
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
    } else {
      console.warn('⚠️  [Backend] Clustering disabled: CLUSTER_SERVICE_URL not set');
      console.warn('⚠️  [Backend] Environment check:', {
        VITE_CLUSTER_API_URL: process.env.VITE_CLUSTER_API_URL ? 'SET' : 'NOT SET',
        CLUSTER_SERVICE_URL: process.env.CLUSTER_SERVICE_URL ? 'SET' : 'NOT SET',
        CLUSTER_API_URL: process.env.CLUSTER_API_URL ? 'SET' : 'NOT SET',
        NODE_ENV: process.env.NODE_ENV,
        DISABLE_CLUSTERING: process.env.DISABLE_CLUSTERING
      });
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
    
    res.json({
      success: true,
      data: dataWithClusters,
      clustering: {
        enabled: Boolean(clusterServiceUrl) && process.env.DISABLE_CLUSTERING !== '1',
        backendPlatform: platform,  // Where the backend is hosted
        apiPlatform: clusterPlatform,  // Where the clustering API is hosted
        serviceUrl: clusterServiceUrl ? (clusterServiceUrl.substring(0, 50) + '...') : 'not configured'
      },
    });
  } catch (error) {
    console.error('Dean analytics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
