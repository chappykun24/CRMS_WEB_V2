import express from 'express';
import db from '../config/database.js';
import clusteringService from '../services/clusteringService.js';
import { calculateILOAttainment } from '../services/attainmentService.js';

const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Assessments router is working!' });
});

// Clustering health check endpoint
router.get('/clustering/health', async (req, res) => {
  try {
    const config = clusteringService.getClusteringConfig();
    
    // Test if clustering service is accessible
    let serviceStatus = 'unknown';
    let serviceError = null;
    let responseTime = null;
    
    if (config.enabled && config.endpoint) {
      try {
        const startTime = Date.now();
        const healthEndpoint = config.endpoint.replace('/api/cluster', '/health');
        const response = await fetch(healthEndpoint, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        responseTime = Date.now() - startTime;
        
        if (response.ok) {
          const healthData = await response.json();
          serviceStatus = 'healthy';
          return res.json({
            success: true,
            clustering: {
              enabled: config.enabled,
              serviceUrl: config.url,
              endpoint: config.endpoint,
              healthEndpoint: healthEndpoint,
              status: serviceStatus,
              responseTime: `${responseTime}ms`,
              healthData: healthData,
              configured: true
            }
          });
        } else {
          serviceStatus = 'unhealthy';
          serviceError = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (error) {
        serviceStatus = 'unreachable';
        serviceError = error.message;
        responseTime = null;
      }
    } else {
      serviceStatus = 'not_configured';
      serviceError = 'CLUSTER_SERVICE_URL is not set';
    }
    
    res.json({
      success: false,
      clustering: {
        enabled: config.enabled,
        serviceUrl: config.url || '(not set)',
        endpoint: config.endpoint || '(not set)',
        status: serviceStatus,
        error: serviceError,
        responseTime: responseTime ? `${responseTime}ms` : null,
        configured: !!config.url,
        environmentVariables: {
          CLUSTER_SERVICE_URL: process.env.CLUSTER_SERVICE_URL ? '(set)' : '(not set)',
          CLUSTER_API_URL: process.env.CLUSTER_API_URL ? '(set)' : '(not set)',
          VITE_CLUSTER_API_URL: process.env.VITE_CLUSTER_API_URL ? '(set)' : '(not set)',
          DISABLE_CLUSTERING: process.env.DISABLE_CLUSTERING || '(not set)'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
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

// GET /api/assessments/syllabus/:syllabusId - Get all assessments for a specific syllabus
router.get('/syllabus/:syllabusId', async (req, res) => {
  const { syllabusId } = req.params;
  
  try {
    const query = `
      SELECT 
        a.assessment_id,
        a.syllabus_id,
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
        a.updated_at
      FROM assessments a
      WHERE a.syllabus_id = $1
      ORDER BY a.created_at DESC
    `;
    
    const result = await db.query(query, [syllabusId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching syllabus assessments:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/assessments/ilo-attainment - Get ILO attainment analytics for a specific class
// IMPORTANT: This route must come BEFORE /:id to avoid route conflicts
// GET /api/assessments/ilo-attainment/filters/:sectionCourseId - Get available filter options for a section course
router.get('/ilo-attainment/filters/:sectionCourseId', async (req, res) => {
  try {
    const { sectionCourseId } = req.params;
    const { so_id, sdg_id, iga_id, cdio_id } = req.query;
    const sectionCourseIdInt = parseInt(sectionCourseId);

    if (!sectionCourseIdInt) {
      return res.status(400).json({
        success: false,
        error: 'Invalid section_course_id'
      });
    }

    // Get SOs mapped to ILOs in this section course
    const soQuery = `
      SELECT DISTINCT
        so.so_id,
        so.so_code,
        so.description
      FROM student_outcomes so
      INNER JOIN ilo_so_mappings ism ON so.so_id = ism.so_id
      INNER JOIN ilos i ON ism.ilo_id = i.ilo_id
      INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
      WHERE sy.section_course_id = $1
        AND so.is_active = TRUE
        AND i.is_active = TRUE
      ORDER BY so.so_code
    `;

    // Get SDGs mapped to ILOs in this section course
    const sdgQuery = `
      SELECT DISTINCT
        sdg.sdg_id,
        sdg.sdg_code,
        sdg.description
      FROM sdg_skills sdg
      INNER JOIN ilo_sdg_mappings isdg ON sdg.sdg_id = isdg.sdg_id
      INNER JOIN ilos i ON isdg.ilo_id = i.ilo_id
      INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
      WHERE sy.section_course_id = $1
        AND sdg.is_active = TRUE
        AND i.is_active = TRUE
      ORDER BY sdg.sdg_code
    `;

    // Get IGAs mapped to ILOs in this section course
    const igaQuery = `
      SELECT DISTINCT
        iga.iga_id,
        iga.iga_code,
        iga.description
      FROM institutional_graduate_attributes iga
      INNER JOIN ilo_iga_mappings iiga ON iga.iga_id = iiga.iga_id
      INNER JOIN ilos i ON iiga.ilo_id = i.ilo_id
      INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
      WHERE sy.section_course_id = $1
        AND iga.is_active = TRUE
        AND i.is_active = TRUE
      ORDER BY iga.iga_code
    `;

    // Get CDIOs mapped to ILOs in this section course
    const cdioQuery = `
      SELECT DISTINCT
        cdio.cdio_id,
        cdio.cdio_code,
        cdio.description
      FROM cdio_skills cdio
      INNER JOIN ilo_cdio_mappings icdio ON cdio.cdio_id = icdio.cdio_id
      INNER JOIN ilos i ON icdio.ilo_id = i.ilo_id
      INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
      WHERE sy.section_course_id = $1
        AND cdio.is_active = TRUE
        AND i.is_active = TRUE
      ORDER BY cdio.cdio_code
    `;

    // Get ILO combinations based on selected filters
    let iloCombinationsQuery = `
      SELECT DISTINCT
        i.ilo_id,
        i.code AS ilo_code,
        i.description AS ilo_description,
        ARRAY_AGG(DISTINCT so.so_code ORDER BY so.so_code) FILTER (WHERE so.so_code IS NOT NULL) AS so_codes,
        ARRAY_AGG(DISTINCT sdg.sdg_code ORDER BY sdg.sdg_code) FILTER (WHERE sdg.sdg_code IS NOT NULL) AS sdg_codes,
        ARRAY_AGG(DISTINCT iga.iga_code ORDER BY iga.iga_code) FILTER (WHERE iga.iga_code IS NOT NULL) AS iga_codes,
        ARRAY_AGG(DISTINCT cdio.cdio_code ORDER BY cdio.cdio_code) FILTER (WHERE cdio.cdio_code IS NOT NULL) AS cdio_codes
      FROM ilos i
      INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
      LEFT JOIN ilo_so_mappings ism ON i.ilo_id = ism.ilo_id
      LEFT JOIN student_outcomes so ON ism.so_id = so.so_id
      LEFT JOIN ilo_sdg_mappings isdg ON i.ilo_id = isdg.ilo_id
      LEFT JOIN sdg_skills sdg ON isdg.sdg_id = sdg.sdg_id
      LEFT JOIN ilo_iga_mappings iiga ON i.ilo_id = iiga.ilo_id
      LEFT JOIN institutional_graduate_attributes iga ON iiga.iga_id = iga.iga_id
      LEFT JOIN ilo_cdio_mappings icdio ON i.ilo_id = icdio.ilo_id
      LEFT JOIN cdio_skills cdio ON icdio.cdio_id = cdio.cdio_id
      WHERE sy.section_course_id = $1
        AND i.is_active = TRUE
    `;

    const iloParams = [sectionCourseIdInt];
    let paramIndex = 2;

    if (so_id) {
      iloCombinationsQuery += ` AND EXISTS (SELECT 1 FROM ilo_so_mappings ism_filter WHERE ism_filter.ilo_id = i.ilo_id AND ism_filter.so_id = $${paramIndex})`;
      iloParams.push(parseInt(so_id));
      paramIndex++;
    }
    if (sdg_id) {
      iloCombinationsQuery += ` AND EXISTS (SELECT 1 FROM ilo_sdg_mappings isdg_filter WHERE isdg_filter.ilo_id = i.ilo_id AND isdg_filter.sdg_id = $${paramIndex})`;
      iloParams.push(parseInt(sdg_id));
      paramIndex++;
    }
    if (iga_id) {
      iloCombinationsQuery += ` AND EXISTS (SELECT 1 FROM ilo_iga_mappings iiga_filter WHERE iiga_filter.ilo_id = i.ilo_id AND iiga_filter.iga_id = $${paramIndex})`;
      iloParams.push(parseInt(iga_id));
      paramIndex++;
    }
    if (cdio_id) {
      iloCombinationsQuery += ` AND EXISTS (SELECT 1 FROM ilo_cdio_mappings icdio_filter WHERE icdio_filter.ilo_id = i.ilo_id AND icdio_filter.cdio_id = $${paramIndex})`;
      iloParams.push(parseInt(cdio_id));
      paramIndex++;
    }

    iloCombinationsQuery += ` GROUP BY i.ilo_id, i.code, i.description ORDER BY i.code`;

    const [soResult, sdgResult, igaResult, cdioResult, iloCombinationsResult] = await Promise.all([
      db.query(soQuery, [sectionCourseIdInt]),
      db.query(sdgQuery, [sectionCourseIdInt]),
      db.query(igaQuery, [sectionCourseIdInt]),
      db.query(cdioQuery, [sectionCourseIdInt]),
      db.query(iloCombinationsQuery, iloParams)
    ]);

    // Format ILO combinations with readable combination strings
    const iloCombinations = iloCombinationsResult.rows.map(row => {
      const mappings = [];
      if (row.so_codes && row.so_codes.length > 0) {
        mappings.push(...row.so_codes.map(code => `SO:${code}`));
      }
      if (row.sdg_codes && row.sdg_codes.length > 0) {
        mappings.push(...row.sdg_codes.map(code => `SDG:${code}`));
      }
      if (row.iga_codes && row.iga_codes.length > 0) {
        mappings.push(...row.iga_codes.map(code => `IGA:${code}`));
      }
      if (row.cdio_codes && row.cdio_codes.length > 0) {
        mappings.push(...row.cdio_codes.map(code => `CDIO:${code}`));
      }
      
      return {
        ilo_id: row.ilo_id,
        ilo_code: row.ilo_code,
        description: row.ilo_description,
        combination: mappings.length > 0 ? mappings.join(', ') : 'No mappings',
        so_codes: row.so_codes || [],
        sdg_codes: row.sdg_codes || [],
        iga_codes: row.iga_codes || [],
        cdio_codes: row.cdio_codes || []
      };
    });

    res.json({
      success: true,
      data: {
        so: soResult.rows,
        sdg: sdgResult.rows,
        iga: igaResult.rows,
        cdio: cdioResult.rows,
        ilo_combinations: iloCombinations
      }
    });
  } catch (error) {
    console.error('[ILO ATTAINMENT FILTERS] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch filter options'
    });
  }
});

// GET /api/assessments/ilo-attainment/combinations - Get ILO combinations with assessments and statistics
router.get('/ilo-attainment/combinations', async (req, res) => {
  try {
    const { 
      section_course_id,
      so_id,
      sdg_id,
      iga_id,
      cdio_id
    } = req.query;

    if (!section_course_id) {
      return res.status(400).json({
        success: false,
        error: 'section_course_id is required'
      });
    }

    const sectionCourseId = parseInt(section_course_id);
    const soId = so_id ? parseInt(so_id) : null;
    const sdgId = sdg_id ? parseInt(sdg_id) : null;
    const igaId = iga_id ? parseInt(iga_id) : null;
    const cdioId = cdio_id ? parseInt(cdio_id) : null;

    // Get ILO combinations with their assessments and statistics
    const query = `
      WITH ilo_combinations AS (
        SELECT DISTINCT
          i.ilo_id,
          i.code AS ilo_code,
          i.description AS ilo_description,
          ARRAY_AGG(DISTINCT so.so_code ORDER BY so.so_code) FILTER (WHERE so.so_code IS NOT NULL) AS so_codes,
          ARRAY_AGG(DISTINCT sdg.sdg_code ORDER BY sdg.sdg_code) FILTER (WHERE sdg.sdg_code IS NOT NULL) AS sdg_codes,
          ARRAY_AGG(DISTINCT iga.iga_code ORDER BY iga.iga_code) FILTER (WHERE iga.iga_code IS NOT NULL) AS iga_codes,
          ARRAY_AGG(DISTINCT cdio.cdio_code ORDER BY cdio.cdio_code) FILTER (WHERE cdio.cdio_code IS NOT NULL) AS cdio_codes
        FROM ilos i
        INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
        LEFT JOIN ilo_so_mappings ism ON i.ilo_id = ism.ilo_id
        LEFT JOIN student_outcomes so ON ism.so_id = so.so_id
        LEFT JOIN ilo_sdg_mappings isdg ON i.ilo_id = isdg.ilo_id
        LEFT JOIN sdg_skills sdg ON isdg.sdg_id = sdg.sdg_id
        LEFT JOIN ilo_iga_mappings iiga ON i.ilo_id = iiga.ilo_id
        LEFT JOIN institutional_graduate_attributes iga ON iiga.iga_id = iga.iga_id
        LEFT JOIN ilo_cdio_mappings icdio ON i.ilo_id = icdio.ilo_id
        LEFT JOIN cdio_skills cdio ON icdio.cdio_id = cdio.cdio_id
        WHERE sy.section_course_id = $1
          AND i.is_active = TRUE
          ${soId ? `AND EXISTS (SELECT 1 FROM ilo_so_mappings ism_filter WHERE ism_filter.ilo_id = i.ilo_id AND ism_filter.so_id = ${soId})` : ''}
          ${sdgId ? `AND EXISTS (SELECT 1 FROM ilo_sdg_mappings isdg_filter WHERE isdg_filter.ilo_id = i.ilo_id AND isdg_filter.sdg_id = ${sdgId})` : ''}
          ${igaId ? `AND EXISTS (SELECT 1 FROM ilo_iga_mappings iiga_filter WHERE iiga_filter.ilo_id = i.ilo_id AND iiga_filter.iga_id = ${igaId})` : ''}
          ${cdioId ? `AND EXISTS (SELECT 1 FROM ilo_cdio_mappings icdio_filter WHERE icdio_filter.ilo_id = i.ilo_id AND icdio_filter.cdio_id = ${cdioId})` : ''}
        GROUP BY i.ilo_id, i.code, i.description
      ),
      -- Dynamically extract assessment codes from syllabus assessment_framework or assessment titles
      assessment_codes AS (
        SELECT DISTINCT
          a.assessment_id,
          a.title,
          COALESCE(
            -- Try to get code from syllabus assessment_framework JSON
            (
              SELECT (task->>'code')::text
              FROM jsonb_array_elements(sy.assessment_framework->'components') AS component
              CROSS JOIN LATERAL jsonb_array_elements(component->'sub_assessments') AS task
              WHERE (task->>'title')::text ILIKE '%' || a.title || '%'
                 OR (task->>'name')::text ILIKE '%' || a.title || '%'
              LIMIT 1
            ),
            -- Try to get code from assessment content_data
            (a.content_data->>'code')::text,
            (a.content_data->>'abbreviation')::text,
            -- Extract code dynamically from title using pattern matching
            -- Look for patterns like "WA1", "ME1", "FE1", "LA1" etc. in title
            (
              SELECT UPPER(
                SUBSTRING(
                  a.title FROM '([A-Z]{2,4}\s*\d+)'
                )
              )
              WHERE a.title ~* '[A-Z]{2,4}\s*\d+'
            ),
            -- Extract abbreviation from first letters of words + number
            (
              SELECT UPPER(
                REGEXP_REPLACE(
                  REGEXP_REPLACE(a.title, '^([A-Z])[a-z]*\\s+([A-Z])[a-z]*\\s*(\\d+)', '\\\\1\\\\2\\\\3'),
                  '[^A-Z0-9]', '', 'g'
                )
              )
              WHERE a.title ~* '^[A-Z][a-z]+\\s+[A-Z][a-z]+\\s+\\d+'
            ),
            NULL
          ) AS assessment_code
        FROM assessments a
        INNER JOIN syllabi sy ON a.syllabus_id = sy.syllabus_id
        WHERE a.section_course_id = $1
      ),
      -- Get ILOs from rubrics if assessment_ilo_weights doesn't have connections
      ilo_from_rubrics AS (
        SELECT DISTINCT
          r.assessment_id,
          r.ilo_id
        FROM rubrics r
        INNER JOIN assessments a ON r.assessment_id = a.assessment_id
        WHERE a.section_course_id = $1
      ),
      -- Get ILOs from mapping tables using assessment_tasks arrays (dynamic matching)
      ilo_from_mappings AS (
        SELECT DISTINCT
          ac.assessment_id,
          COALESCE(ism.ilo_id, isdg.ilo_id, iiga.ilo_id, icdio.ilo_id) AS ilo_id,
          -- Use assessment weight_percentage as ILO weight, or default to 0
          COALESCE(a.weight_percentage, 0) AS ilo_weight_percentage
        FROM assessment_codes ac
        INNER JOIN assessments a ON ac.assessment_id = a.assessment_id
        LEFT JOIN ilo_so_mappings ism ON ism.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL
        LEFT JOIN ilo_sdg_mappings isdg ON isdg.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL
        LEFT JOIN ilo_iga_mappings iiga ON iiga.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL
        LEFT JOIN ilo_cdio_mappings icdio ON icdio.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL
        WHERE ac.assessment_code IS NOT NULL
          AND (ism.ilo_id IS NOT NULL OR isdg.ilo_id IS NOT NULL OR iiga.ilo_id IS NOT NULL OR icdio.ilo_id IS NOT NULL)
      ),
      -- Combine ILO connections from assessment_ilo_weights, rubrics, and mapping tables
      assessment_ilo_connections AS (
        SELECT DISTINCT
          a.assessment_id,
          COALESCE(aiw.ilo_id, r.ilo_id, im.ilo_id) AS ilo_id,
          COALESCE(aiw.weight_percentage, im.ilo_weight_percentage, 0) AS ilo_weight_percentage
        FROM assessments a
        LEFT JOIN assessment_ilo_weights aiw ON a.assessment_id = aiw.assessment_id
        LEFT JOIN ilo_from_rubrics r ON a.assessment_id = r.assessment_id
        LEFT JOIN ilo_from_mappings im ON a.assessment_id = im.assessment_id
        WHERE a.section_course_id = $1
          AND (aiw.ilo_id IS NOT NULL OR r.ilo_id IS NOT NULL OR im.ilo_id IS NOT NULL)
      ),
      assessment_stats AS (
        SELECT
          a.assessment_id,
          a.title AS assessment_title,
          a.type AS assessment_type,
          a.total_points,
          a.weight_percentage,
          a.due_date,
          aic.ilo_id,
          aic.ilo_weight_percentage,
          COUNT(DISTINCT ce.student_id) AS total_students,
          COUNT(DISTINCT sub.submission_id) AS submissions_count,
          COALESCE(AVG(
            CASE 
              WHEN sub.transmuted_score IS NOT NULL THEN sub.transmuted_score
              WHEN sub.adjusted_score IS NOT NULL AND a.total_points > 0 AND a.weight_percentage IS NOT NULL
              THEN ((sub.adjusted_score / a.total_points) * 62.5 + 37.5) * (a.weight_percentage / 100)
              WHEN sub.total_score IS NOT NULL AND a.total_points > 0 AND a.weight_percentage IS NOT NULL
              THEN ((sub.total_score / a.total_points) * 62.5 + 37.5) * (a.weight_percentage / 100)
              ELSE NULL
            END
          ), 0) AS average_score,
          COALESCE(SUM(
            CASE 
              WHEN sub.transmuted_score IS NOT NULL THEN sub.transmuted_score
              WHEN sub.adjusted_score IS NOT NULL AND a.total_points > 0 AND a.weight_percentage IS NOT NULL
              THEN ((sub.adjusted_score / a.total_points) * 62.5 + 37.5) * (a.weight_percentage / 100)
              WHEN sub.total_score IS NOT NULL AND a.total_points > 0 AND a.weight_percentage IS NOT NULL
              THEN ((sub.total_score / a.total_points) * 62.5 + 37.5) * (a.weight_percentage / 100)
              ELSE 0
            END
          ), 0) AS total_score
        FROM assessments a
        INNER JOIN assessment_ilo_connections aic ON a.assessment_id = aic.assessment_id
        INNER JOIN ilo_combinations ic ON aic.ilo_id = ic.ilo_id
        INNER JOIN ilos i ON aic.ilo_id = i.ilo_id
        INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
        INNER JOIN course_enrollments ce ON a.section_course_id = ce.section_course_id AND ce.status = 'enrolled'
        LEFT JOIN submissions sub ON (
          ce.enrollment_id = sub.enrollment_id 
          AND sub.assessment_id = a.assessment_id
          AND (sub.transmuted_score IS NOT NULL OR sub.adjusted_score IS NOT NULL OR sub.total_score IS NOT NULL)
        )
        WHERE a.section_course_id = $1
          AND sy.section_course_id = $1
          AND a.weight_percentage IS NOT NULL
          AND a.weight_percentage > 0
        GROUP BY a.assessment_id, a.title, a.type, a.total_points, a.weight_percentage, a.due_date, aic.ilo_id, aic.ilo_weight_percentage
      ),
      assessment_mappings AS (
        -- Get ALL mappings for ALL ILOs connected to each assessment (from assessment_ilo_connections)
        SELECT DISTINCT
          aic.assessment_id,
          aic.ilo_id,
          so.so_code,
          sdg.sdg_code,
          iga.iga_code,
          cdio.cdio_code
        FROM assessment_ilo_connections aic
        INNER JOIN ilos i ON aic.ilo_id = i.ilo_id
        INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
        LEFT JOIN ilo_so_mappings ism ON i.ilo_id = ism.ilo_id
        LEFT JOIN student_outcomes so ON ism.so_id = so.so_id
        LEFT JOIN ilo_sdg_mappings isdg ON i.ilo_id = isdg.ilo_id
        LEFT JOIN sdg_skills sdg ON isdg.sdg_id = sdg.sdg_id
        LEFT JOIN ilo_iga_mappings iiga ON i.ilo_id = iiga.ilo_id
        LEFT JOIN institutional_graduate_attributes iga ON iiga.iga_id = iga.iga_id
        LEFT JOIN ilo_cdio_mappings icdio ON i.ilo_id = icdio.ilo_id
        LEFT JOIN cdio_skills cdio ON icdio.cdio_id = cdio.cdio_id
        WHERE sy.section_course_id = $1
          AND i.is_active = TRUE
      )
      SELECT
        ic.ilo_id,
        ic.ilo_code,
        ic.ilo_description,
        ic.so_codes,
        ic.sdg_codes,
        ic.iga_codes,
        ic.cdio_codes,
        COALESCE(
          json_agg(
            json_build_object(
              'assessment_id', ast.assessment_id,
              'title', ast.assessment_title,
              'type', ast.assessment_type,
              'total_points', ast.total_points,
              'weight_percentage', ast.weight_percentage,
              'ilo_weight_percentage', ast.ilo_weight_percentage,
              'due_date', ast.due_date,
              'total_students', ast.total_students,
              'submissions_count', ast.submissions_count,
              'average_score', ROUND(ast.average_score::NUMERIC, 2),
              'total_score', ROUND(ast.total_score::NUMERIC, 2),
              'average_percentage', CASE 
                WHEN ast.total_points > 0 AND ast.weight_percentage > 0 AND ast.average_score > 0 THEN 
                  ROUND((((ast.average_score / (ast.weight_percentage / 100.0) - 37.5) / 62.5) * 100)::NUMERIC, 2)
                ELSE 0
              END,
              'mappings', (
                SELECT COALESCE(json_agg(
                  json_build_object('type', mapping_type, 'code', mapping_code)
                ) FILTER (WHERE mapping_code IS NOT NULL), '[]'::json)
                FROM (
                  SELECT DISTINCT 'SO' as mapping_type, am.so_code as mapping_code
                  FROM assessment_mappings am
                  WHERE am.assessment_id = ast.assessment_id AND am.so_code IS NOT NULL
                  UNION
                  SELECT DISTINCT 'SDG' as mapping_type, am.sdg_code as mapping_code
                  FROM assessment_mappings am
                  WHERE am.assessment_id = ast.assessment_id AND am.sdg_code IS NOT NULL
                  UNION
                  SELECT DISTINCT 'IGA' as mapping_type, am.iga_code as mapping_code
                  FROM assessment_mappings am
                  WHERE am.assessment_id = ast.assessment_id AND am.iga_code IS NOT NULL
                  UNION
                  SELECT DISTINCT 'CDIO' as mapping_type, am.cdio_code as mapping_code
                  FROM assessment_mappings am
                  WHERE am.assessment_id = ast.assessment_id AND am.cdio_code IS NOT NULL
                ) mappings
              )
            ) ORDER BY ast.due_date ASC, ast.assessment_title ASC
          ) FILTER (WHERE ast.assessment_id IS NOT NULL),
          '[]'::json
        ) AS assessments
      FROM ilo_combinations ic
      LEFT JOIN assessment_stats ast ON ic.ilo_id = ast.ilo_id
      GROUP BY ic.ilo_id, ic.ilo_code, ic.ilo_description, ic.so_codes, ic.sdg_codes, ic.iga_codes, ic.cdio_codes
      ORDER BY ic.ilo_code
    `;

    const result = await db.query(query, [sectionCourseId]);

    // Format the response
    const iloCombinations = result.rows.map(row => {
      const mappings = [];
      if (row.so_codes && row.so_codes.length > 0) {
        mappings.push(...row.so_codes.map(code => ({ type: 'SO', code })));
      }
      if (row.sdg_codes && row.sdg_codes.length > 0) {
        mappings.push(...row.sdg_codes.map(code => ({ type: 'SDG', code })));
      }
      if (row.iga_codes && row.iga_codes.length > 0) {
        mappings.push(...row.iga_codes.map(code => ({ type: 'IGA', code })));
      }
      if (row.cdio_codes && row.cdio_codes.length > 0) {
        mappings.push(...row.cdio_codes.map(code => ({ type: 'CDIO', code })));
      }

      return {
        ilo_id: row.ilo_id,
        ilo_code: row.ilo_code,
        description: row.ilo_description,
        mappings: mappings,
        combination: mappings.length > 0 ? mappings.map(m => `${m.type}:${m.code}`).join(', ') : 'No mappings',
        assessments: row.assessments || []
      };
    });

    res.json({
      success: true,
      data: iloCombinations
    });
  } catch (error) {
    console.error('[ILO ATTAINMENT COMBINATIONS] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch ILO combinations with assessments'
    });
  }
});

router.get('/ilo-attainment', async (req, res) => {
  try {
    const { 
      section_course_id, 
      pass_threshold = 75, 
      ilo_id,
      performance_filter = 'all',
      high_threshold = 80,
      low_threshold = 75,
      so_id,
      sdg_id,
      iga_id,
      cdio_id
    } = req.query;

    // Validate required parameters
    if (!section_course_id) {
      return res.status(400).json({
        success: false,
        error: 'section_course_id is required'
      });
    }

    const sectionCourseId = parseInt(section_course_id);
    const passThreshold = parseFloat(pass_threshold);
    const iloId = ilo_id ? parseInt(ilo_id) : null;
    const highThreshold = parseFloat(high_threshold);
    const lowThreshold = parseFloat(low_threshold);
    const soId = so_id ? parseInt(so_id) : null;
    const sdgId = sdg_id ? parseInt(sdg_id) : null;
    const igaId = iga_id ? parseInt(iga_id) : null;
    const cdioId = cdio_id ? parseInt(cdio_id) : null;

    // Validate performance filter
    if (!['all', 'high', 'low'].includes(performance_filter)) {
      return res.status(400).json({
        success: false,
        error: 'performance_filter must be "all", "high", or "low"'
      });
    }

    console.log(`[ILO ATTAINMENT] Fetching attainment data for section_course_id: ${sectionCourseId}, ilo_id: ${iloId || 'all'}`);

    const result = await calculateILOAttainment(
      sectionCourseId,
      passThreshold,
      iloId,
      performance_filter,
      highThreshold,
      lowThreshold,
      soId,
      sdgId,
      igaId,
      cdioId
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[ILO ATTAINMENT] Error:', error);
    console.error('[ILO ATTAINMENT] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch ILO attainment data',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
  const { term_id, section_id, program_id, department_id, student_id, section_course_id, force_refresh, so_id, iga_id, cdio_id, sdg_id } = req.query;
  const forceRefresh = force_refresh === 'true' || force_refresh === '1';
  console.log('📋 [Backend] Filters - term_id:', term_id, 'section_id:', section_id, 'program_id:', program_id, 'department_id:', department_id, 'student_id:', student_id, 'section_course_id:', section_course_id, 'so_id:', so_id, 'iga_id:', iga_id, 'cdio_id:', cdio_id, 'sdg_id:', sdg_id, 'force_refresh:', forceRefresh);
  
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
    const studentIdValue = student_id && !isNaN(parseInt(student_id)) ? parseInt(student_id) : null;
    
    // Handle section_course_id as single value or array (for faculty filtering)
    let sectionCourseIdValue = null;
    let sectionCourseIdArray = [];
    if (section_course_id) {
      if (Array.isArray(section_course_id)) {
        // Multiple section_course_ids provided (faculty filtering)
        sectionCourseIdArray = section_course_id
          .map(id => parseInt(id))
          .filter(id => !isNaN(id));
        console.log('📋 [Backend] Multiple section_course_ids provided:', sectionCourseIdArray);
      } else {
        // Single section_course_id
        sectionCourseIdValue = !isNaN(parseInt(section_course_id)) ? parseInt(section_course_id) : null;
      }
    }
    const soIdValue = so_id && !isNaN(parseInt(so_id)) ? parseInt(so_id) : null;
    const igaIdValue = iga_id && !isNaN(parseInt(iga_id)) ? parseInt(iga_id) : null;
    const cdioIdValue = cdio_id && !isNaN(parseInt(cdio_id)) ? parseInt(cdio_id) : null;
    const sdgIdValue = sdg_id && !isNaN(parseInt(sdg_id)) ? parseInt(sdg_id) : null;
    
    if (termIdValue) console.log('🔍 [Backend] Applying term filter:', termIdValue);
    if (sectionIdValue) console.log('🔍 [Backend] Applying section filter:', sectionIdValue);
    if (programIdValue) console.log('🔍 [Backend] Applying program filter:', programIdValue);
    if (departmentIdValue) console.log('🔍 [Backend] Applying department filter:', departmentIdValue);
    if (studentIdValue) console.log('🔍 [Backend] Applying student filter:', studentIdValue);
    if (sectionCourseIdValue) console.log('🔍 [Backend] Applying section_course filter:', sectionCourseIdValue);
    if (soIdValue) console.log('🔍 [Backend] Applying SO filter:', soIdValue);
    
    // Build additional WHERE conditions for filtering
    // NOTE: When filtering by section_course_id, we need ALL students in that class for clustering
    // So we don't filter by student_id in the WHERE clause if section_course_id is provided
    // We'll filter the results after clustering instead
    let additionalWhereConditions = [];
    let filterStudentsAfterClustering = false;
    
    if (sectionIdValue) {
      additionalWhereConditions.push(`sec.section_id = ${sectionIdValue}`);
    }
    if (programIdValue) {
      additionalWhereConditions.push(`p.program_id = ${programIdValue}`);
    }
    if (departmentIdValue) {
      additionalWhereConditions.push(`d.department_id = ${departmentIdValue}`);
    }
    
    // If filtering by section_course_id(s), get ALL students in those classes for clustering
    // Don't filter by student_id yet - we'll filter results after clustering
    if (sectionCourseIdArray.length > 0) {
      // Multiple section_course_ids (faculty filtering)
      const idsString = sectionCourseIdArray.join(', ');
      additionalWhereConditions.push(`sc.section_course_id IN (${idsString})`);
      console.log(`🔍 [Backend] Applying multiple section_course_id filter: IN (${idsString})`);
      if (studentIdValue) {
        // Mark that we need to filter by student_id after clustering
        filterStudentsAfterClustering = true;
      }
    } else if (sectionCourseIdValue) {
      // Single section_course_id
      additionalWhereConditions.push(`sc.section_course_id = ${sectionCourseIdValue}`);
      if (studentIdValue) {
        // Mark that we need to filter by student_id after clustering
        filterStudentsAfterClustering = true;
      }
    } else if (studentIdValue) {
      // Only filter by student_id if NOT filtering by section_course_id
      additionalWhereConditions.push(`s.student_id = ${studentIdValue}`);
    }
    
    const additionalWhereClause = additionalWhereConditions.length > 0 
      ? `AND ${additionalWhereConditions.join(' AND ')}` 
      : '';
    
    // Build section_course filter for subqueries (when filtering by specific class)
    // Each filter uses the correct alias for its subquery
    // Support both single value and array of section_course_ids
    const buildSectionCourseFilter = (alias) => {
      if (sectionCourseIdArray.length > 0) {
        const idsString = sectionCourseIdArray.join(', ');
        return `AND ${alias}.section_course_id IN (${idsString})`;
      } else if (sectionCourseIdValue) {
        return `AND ${alias}.section_course_id = ${sectionCourseIdValue}`;
      }
      return '';
    };
    
    const sectionCourseFilter = buildSectionCourseFilter('ce_att');
    const sectionCourseFilterGrade = buildSectionCourseFilter('ce_grade');
    const sectionCourseFilterWeighted = buildSectionCourseFilter('ce_weighted');
    const sectionCourseFilterSub = buildSectionCourseFilter('ce_sub');
    const sectionCourseFilterStatus = buildSectionCourseFilter('ce_status');
    const sectionCourseFilterRate = buildSectionCourseFilter('ce_rate');
    const sectionCourseFilterIlo = buildSectionCourseFilter('ce_ilo');
    const sectionCourseFilterIloDetail = buildSectionCourseFilter('ce_ilo_detail');
    const sectionCourseFilterActual = buildSectionCourseFilter('ce_actual');
    const sectionCourseFilterFallback = buildSectionCourseFilter('ce_fallback');
    
    // Build Standard filter for assessment alignment
    // When filtering by Standard: find ILOs mapped to that standard, then assessments mapped to those ILOs
    let standardAssessmentFilter = '';
    if (soIdValue) {
      // Filter to assessments mapped to ILOs that map to this SO via ilo_so_mappings
      standardAssessmentFilter = `AND EXISTS (
        SELECT 1 FROM assessment_ilo_weights aiw_filter
        INNER JOIN ilo_so_mappings ism ON aiw_filter.ilo_id = ism.ilo_id
        WHERE aiw_filter.assessment_id = COALESCE(a.assessment_id, ass.assessment_id)
        AND ism.so_id = ${soIdValue}
      )`;
    } else if (igaIdValue) {
      // Filter to assessments mapped to ILOs that map to this IGA via ilo_iga_mappings
      standardAssessmentFilter = `AND EXISTS (
        SELECT 1 FROM assessment_ilo_weights aiw_filter
        INNER JOIN ilo_iga_mappings iiga ON aiw_filter.ilo_id = iiga.ilo_id
        WHERE aiw_filter.assessment_id = COALESCE(a.assessment_id, ass.assessment_id)
        AND iiga.iga_id = ${igaIdValue}
      )`;
    } else if (cdioIdValue) {
      // Filter to assessments mapped to ILOs that map to this CDIO via ilo_cdio_mappings
      standardAssessmentFilter = `AND EXISTS (
        SELECT 1 FROM assessment_ilo_weights aiw_filter
        INNER JOIN ilo_cdio_mappings icdio ON aiw_filter.ilo_id = icdio.ilo_id
        WHERE aiw_filter.assessment_id = COALESCE(a.assessment_id, ass.assessment_id)
        AND icdio.cdio_id = ${cdioIdValue}
      )`;
    } else if (sdgIdValue) {
      // Filter to assessments mapped to ILOs that map to this SDG via ilo_sdg_mappings
      standardAssessmentFilter = `AND EXISTS (
        SELECT 1 FROM assessment_ilo_weights aiw_filter
        INNER JOIN ilo_sdg_mappings isdg ON aiw_filter.ilo_id = isdg.ilo_id
        WHERE aiw_filter.assessment_id = COALESCE(a.assessment_id, ass.assessment_id)
        AND isdg.sdg_id = ${sdgIdValue}
      )`;
    }
    
    // Fetch student analytics for clustering
    // Clustering is based on THREE primary data sources:
    // 1. TRANSMUTED SCORES: Pre-calculated transmuted scores (average_score, assessment_scores_by_ilo)
    // 2. SUBMISSION DATA: Submission behavior (ontime, late, missing counts and rates)
    // 3. ATTENDANCE DATA: Attendance patterns (present, absent, late counts and percentages)
    // Enhanced with detailed attendance counts and submission behavior
    // Includes section/program/department information for filtering
    const query = `
      SELECT
        s.student_id,
        s.full_name,
        s.student_number,
        -- Exclude student_photo to reduce data transfer (load on-demand via /api/students/:id/photo)
        NULL as student_photo,
        s.contact_email,
        -- Section/Program/Department info (for filtering and display)
        sec.section_id,
        sec.section_code,
        sec.year_level,
        p.program_id,
        p.name AS program_name,
        p.program_abbreviation,
        d.department_id,
        d.name AS department_name,
        d.department_abbreviation,
        -- Student's grade level: determined by enrolled sections' year_level
        -- Uses the highest year_level the student is enrolled in (most advanced level)
        -- This indicates the student's current academic standing
        (
          SELECT MAX(sec_grade.year_level)
          FROM course_enrollments ce_grade
          INNER JOIN section_courses sc_grade ON ce_grade.section_course_id = sc_grade.section_course_id
          INNER JOIN sections sec_grade ON sc_grade.section_id = sec_grade.section_id
          WHERE ce_grade.student_id = s.student_id
            AND ce_grade.status = 'enrolled'
            AND sec_grade.year_level IS NOT NULL
            ${termIdValue ? `AND sc_grade.term_id = ${termIdValue}` : ''}
            ${sectionCourseFilterGrade}
        )::INTEGER AS grade_level,
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
              ${sectionCourseFilter}
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
            ${sectionCourseFilter}
        )::INTEGER AS attendance_present_count,
        (
          SELECT COUNT(CASE WHEN al.status = 'absent' THEN 1 END)::INTEGER
          FROM course_enrollments ce_att
          LEFT JOIN section_courses sc_att ON ce_att.section_course_id = sc_att.section_course_id
          LEFT JOIN attendance_logs al ON ce_att.enrollment_id = al.enrollment_id
          WHERE ce_att.student_id = s.student_id
            AND ce_att.status = 'enrolled'
            ${termIdValue ? `AND sc_att.term_id = ${termIdValue}` : ''}
            ${sectionCourseFilter}
        )::INTEGER AS attendance_absent_count,
        (
          SELECT COUNT(CASE WHEN al.status = 'late' THEN 1 END)::INTEGER
          FROM course_enrollments ce_att
          LEFT JOIN section_courses sc_att ON ce_att.section_course_id = sc_att.section_course_id
          LEFT JOIN attendance_logs al ON ce_att.enrollment_id = al.enrollment_id
          WHERE ce_att.student_id = s.student_id
            AND ce_att.status = 'enrolled'
            ${termIdValue ? `AND sc_att.term_id = ${termIdValue}` : ''}
            ${sectionCourseFilter}
        )::INTEGER AS attendance_late_count,
        (
          SELECT COUNT(al.attendance_id)::INTEGER
          FROM course_enrollments ce_att
          LEFT JOIN section_courses sc_att ON ce_att.section_course_id = sc_att.section_course_id
          LEFT JOIN attendance_logs al ON ce_att.enrollment_id = al.enrollment_id
          WHERE ce_att.student_id = s.student_id
            AND ce_att.status = 'enrolled'
            ${termIdValue ? `AND sc_att.term_id = ${termIdValue}` : ''}
            ${sectionCourseFilter}
        )::INTEGER AS attendance_total_sessions,
        -- Final grade using new grading computation: Raw → Adjusted → Actual (×62.5+37.5) → Transmuted (×weight/100)
        -- Formula per course: SUM(transmuted_score) where transmuted_score = actual_score × (weight_percentage / 100)
        -- actual_score = (adjusted_score / total_points) × 62.5 + 37.5 (non-zero based, min 37.5)
        -- When filtering by ILO/SO: only include assessments aligned with selected ILO/SO
        -- Then average across all courses to get overall score (0-100 scale)
        COALESCE(
          (
            WITH course_transmuted_scores AS (
              SELECT 
                sc_weighted.section_course_id,
                -- Use pre-calculated transmuted_score if available, otherwise calculate it
                SUM(
                  CASE 
                    -- Use stored transmuted_score if available (already calculated)
                    WHEN sub.transmuted_score IS NOT NULL
                    THEN sub.transmuted_score
                    -- Calculate transmuted_score: actual_score × (weight_percentage / 100)
                    -- where actual_score = (adjusted_score / total_points) × 62.5 + 37.5
                    WHEN sub.adjusted_score IS NOT NULL AND a.total_points > 0 AND a.weight_percentage IS NOT NULL
                    THEN ((sub.adjusted_score / a.total_points) * 62.5 + 37.5) * (a.weight_percentage / 100)
                    -- Fallback: use total_score if adjusted_score not available
                    WHEN sub.total_score IS NOT NULL AND a.total_points > 0 AND a.weight_percentage IS NOT NULL
                    THEN ((sub.total_score / a.total_points) * 62.5 + 37.5) * (a.weight_percentage / 100)
                    ELSE 0
                  END
                ) as course_final_grade
              FROM course_enrollments ce_weighted
              INNER JOIN section_courses sc_weighted ON ce_weighted.section_course_id = sc_weighted.section_course_id
              INNER JOIN assessments a ON sc_weighted.section_course_id = a.section_course_id
              LEFT JOIN submissions sub ON (
                ce_weighted.enrollment_id = sub.enrollment_id 
                AND sub.assessment_id = a.assessment_id
                AND (sub.transmuted_score IS NOT NULL OR sub.adjusted_score IS NOT NULL OR sub.total_score IS NOT NULL)
              )
              WHERE ce_weighted.student_id = s.student_id
                AND ce_weighted.status = 'enrolled'
                AND a.weight_percentage IS NOT NULL
                AND a.weight_percentage > 0
                ${termIdValue ? `AND sc_weighted.term_id = ${termIdValue}` : ''}
                ${sectionCourseFilterWeighted}
                ${standardAssessmentFilter}
              GROUP BY sc_weighted.section_course_id
            )
            -- Average across all courses (normalizes to 0-100 scale)
            -- When filtering by section_course_id, just return the single course score
            SELECT ROUND(${sectionCourseIdValue ? 'MAX' : 'AVG'}(course_final_grade)::NUMERIC, 2)
            FROM course_transmuted_scores
            WHERE course_final_grade > 0
          ),
          -- Fallback: calculate from actual_score if available
          (
            WITH course_from_actual AS (
              SELECT 
                sc_actual.section_course_id,
                SUM(
                  CASE 
                    WHEN sub.actual_score IS NOT NULL AND a.weight_percentage IS NOT NULL
                    THEN sub.actual_score * (a.weight_percentage / 100)
                    ELSE 0
                  END
                ) as course_final_grade
              FROM course_enrollments ce_actual
              INNER JOIN section_courses sc_actual ON ce_actual.section_course_id = sc_actual.section_course_id
              INNER JOIN assessments a ON sc_actual.section_course_id = a.section_course_id
              LEFT JOIN submissions sub ON (
                ce_actual.enrollment_id = sub.enrollment_id 
                AND sub.assessment_id = a.assessment_id
                AND sub.actual_score IS NOT NULL
              )
              WHERE ce_actual.student_id = s.student_id
                AND ce_actual.status = 'enrolled'
                AND a.weight_percentage IS NOT NULL
                AND a.weight_percentage > 0
                ${termIdValue ? `AND sc_actual.term_id = ${termIdValue}` : ''}
                ${sectionCourseFilterActual}
                ${standardAssessmentFilter}
              GROUP BY sc_actual.section_course_id
            )
            SELECT ROUND(${sectionCourseIdValue ? 'MAX' : 'AVG'}(course_final_grade)::NUMERIC, 2)
            FROM course_from_actual
            WHERE course_final_grade > 0
          )
        )::NUMERIC AS average_score,
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
              ${sectionCourseFilterStatus}
              ${standardAssessmentFilter}
          ),
          2
        )::NUMERIC AS average_submission_status_score,
        -- Submission rate: calculated from ontime + late counts / total assessments
        -- Formula: (ontime_count + late_count) / total_assessments
        -- This accurately reflects submission completion rate, accounting for missing submissions
        COALESCE(
          (
            SELECT ROUND(
              (
                COUNT(DISTINCT CASE 
                  WHEN COALESCE(sub.submission_status, 'missing') IN ('ontime', 'late') 
                  THEN ass.assessment_id 
                END)::NUMERIC
                /
                NULLIF(COUNT(DISTINCT ass.assessment_id), 0)::NUMERIC
              ),
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
              ${sectionCourseFilterRate}
              ${standardAssessmentFilter}
          ),
          0
        )::NUMERIC AS submission_rate,
        -- Detailed submission behavior counts: ontime, late, missing, total assessments
        -- Uses submission_status field: 'ontime', 'late', or 'missing' (defaults to 'missing' if no submission)
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
            ${sectionCourseFilterSub}
            ${standardAssessmentFilter}
        )::INTEGER AS submission_ontime_count,
        (
          SELECT COUNT(DISTINCT CASE WHEN COALESCE(sub.submission_status, 'missing') = 'late' THEN sub.submission_id END)::INTEGER
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
            ${sectionCourseFilterSub}
            ${standardAssessmentFilter}
        )::INTEGER AS submission_late_count,
        (
          SELECT COUNT(DISTINCT ass.assessment_id)::INTEGER
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
            ${sectionCourseFilterSub}
            ${standardAssessmentFilter}
            AND COALESCE(sub.submission_status, 'missing') = 'missing'
        )::INTEGER AS submission_missing_count,
        (
          SELECT COUNT(DISTINCT ass.assessment_id)::INTEGER
          FROM course_enrollments ce_sub
          LEFT JOIN section_courses sc_sub ON ce_sub.section_course_id = sc_sub.section_course_id
          LEFT JOIN assessments ass ON sc_sub.section_course_id = ass.section_course_id
          WHERE ce_sub.student_id = s.student_id
            AND ce_sub.status = 'enrolled'
            ${termIdValue ? `AND sc_sub.term_id = ${termIdValue}` : ''}
            ${sectionCourseFilterSub}
            ${standardAssessmentFilter}
        )::INTEGER AS submission_total_assessments,
        -- Assessment-level transmuted scores grouped by ILO (NEW)
        -- Returns JSON array of {ilo_id, ilo_code, assessments: [{assessment_id, transmuted_score, weight_percentage}]}
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'ilo_id', ilo_data.ilo_id,
                'ilo_code', ilo_data.ilo_code,
                'ilo_description', ilo_data.ilo_description,
                'total_weight', ilo_data.total_weight,
                'assessments', ilo_data.assessments
              )
            ),
            '[]'::json
          )
          FROM (
            SELECT
              assessment_scores.ilo_id,
              assessment_scores.ilo_code,
              assessment_scores.ilo_description,
              assessment_scores.total_weight,
              json_agg(
                json_build_object(
                  'assessment_id', assessment_scores.assessment_id,
                  'assessment_title', assessment_scores.assessment_title,
                  'transmuted_score', assessment_scores.transmuted_score,
                  'raw_score', assessment_scores.raw_score,
                  'adjusted_score', assessment_scores.adjusted_score,
                  'weight_percentage', assessment_scores.weight_percentage,
                  'ilo_weight_percentage', assessment_scores.ilo_weight_percentage
                )
                ORDER BY assessment_scores.assessment_id
              ) as assessments
            FROM (
              SELECT
              i.ilo_id,
              i.code as ilo_code,
              i.description as ilo_description,
              SUM(aiw.weight_percentage) OVER (PARTITION BY i.ilo_id) as total_weight,
              a.assessment_id,
              a.title as assessment_title,
              a.total_points,
              a.weight_percentage,
              aiw.weight_percentage as ilo_weight_percentage,
              CASE 
                WHEN MAX(sub.transmuted_score) IS NOT NULL
                THEN MAX(sub.transmuted_score)
                WHEN MAX(sub.adjusted_score) IS NOT NULL AND a.total_points > 0 AND a.weight_percentage IS NOT NULL
                THEN ((MAX(sub.adjusted_score) / a.total_points) * 62.5 + 37.5) * (a.weight_percentage / 100)
                WHEN MAX(sub.total_score) IS NOT NULL AND a.total_points > 0 AND a.weight_percentage IS NOT NULL
                THEN ((MAX(sub.total_score) / a.total_points) * 62.5 + 37.5) * (a.weight_percentage / 100)
                ELSE NULL
              END as transmuted_score,
              MAX(sub.total_score) as raw_score,
              MAX(sub.adjusted_score) as adjusted_score
            FROM course_enrollments ce_ilo_detail
            INNER JOIN section_courses sc_ilo_detail ON ce_ilo_detail.section_course_id = sc_ilo_detail.section_course_id
            INNER JOIN assessments a ON sc_ilo_detail.section_course_id = a.section_course_id
            INNER JOIN assessment_ilo_weights aiw ON a.assessment_id = aiw.assessment_id
            INNER JOIN ilos i ON aiw.ilo_id = i.ilo_id
            LEFT JOIN submissions sub ON (
              ce_ilo_detail.enrollment_id = sub.enrollment_id 
              AND sub.assessment_id = a.assessment_id
              AND (sub.transmuted_score IS NOT NULL OR sub.adjusted_score IS NOT NULL OR sub.total_score IS NOT NULL)
            )
            WHERE ce_ilo_detail.student_id = s.student_id
              AND ce_ilo_detail.status = 'enrolled'
              AND a.weight_percentage IS NOT NULL
              AND a.weight_percentage > 0
              ${termIdValue ? `AND sc_ilo_detail.term_id = ${termIdValue}` : ''}
              ${sectionCourseFilterIloDetail || ''}
              ${standardAssessmentFilter || ''}
            GROUP BY i.ilo_id, i.code, i.description, aiw.weight_percentage, a.assessment_id, a.title, a.total_points, a.weight_percentage
            HAVING COUNT(sub.submission_id) > 0 OR COUNT(CASE WHEN sub.transmuted_score IS NOT NULL THEN 1 END) > 0
            ) assessment_scores
            GROUP BY assessment_scores.ilo_id, assessment_scores.ilo_code, assessment_scores.ilo_description, assessment_scores.total_weight
          ) ilo_data
        )::JSONB AS assessment_scores_by_ilo,
        -- Specializations: array of specialization_ids from courses the student is enrolled in
        -- This allows filtering by specialization (Business Analytics, Networking, Service Management)
        -- Note: We don't filter by section_course_id here because we want ALL specializations
        -- the student is enrolled in, not just for a specific class
        (
          SELECT ARRAY_AGG(DISTINCT c.specialization_id)
          FROM course_enrollments ce_spec
          INNER JOIN section_courses sc_spec ON ce_spec.section_course_id = sc_spec.section_course_id
          INNER JOIN courses c ON sc_spec.course_id = c.course_id
          WHERE ce_spec.student_id = s.student_id
            AND ce_spec.status = 'enrolled'
            AND c.specialization_id IS NOT NULL
            ${termIdValue ? `AND sc_spec.term_id = ${termIdValue}` : ''}
        )::INTEGER[] AS enrolled_specializations
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
    
    // Log query results for debugging
    if (sectionCourseIdValue) {
      console.log(`📊 [Backend] Fetched ${students.length} students for class ${sectionCourseIdValue} (for clustering)`);
      if (studentIdValue) {
        console.log(`🔍 [Backend] Will filter to student_id ${studentIdValue} after clustering`);
      }
    }
    
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
    // REFRESH FLOW FOR FACULTY FILTERING:
    // 1. When force_refresh=true: cacheMaxAgeHours=0 bypasses cache
    // 2. All students from faculty's section_course_ids are sent to clustering API
    // 3. Clustering API computes clusters for all students together (better clustering quality)
    // 4. Clusters are saved to cache for EACH section_course_id (saves automatically clear old cache)
    // 5. This ensures fresh clusters are computed and cached for all faculty's classes
    //
    // If sectionCourseId is provided, perform per-class clustering (identify at-risk students within that class)
    // If standard filters are provided, perform standard-filtered clustering (only assessments mapped to ILOs that map to that standard)
    // For faculty filtering: pass all section_course_ids for clustering
    // This ensures clustering is recalculated for all students in faculty's classes
    const clusteringSectionCourseId = sectionCourseIdArray.length > 0 
      ? sectionCourseIdArray[0] // Use first one for cache key (clustering is per-class)
      : sectionCourseIdValue;
    
    // Log clustering parameters for faculty filtering
    if (sectionCourseIdArray.length > 0) {
      console.log(`🎯 [Backend] Clustering for ${sectionCourseIdArray.length} faculty classes:`, sectionCourseIdArray);
      console.log(`🎯 [Backend] Students to cluster: ${students.length} (from ${sectionCourseIdArray.length} classes)`);
      if (forceRefresh) {
        console.log(`🔄 [Backend] FORCE REFRESH: Recomputing clusters for all ${students.length} students in faculty's classes`);
      }
      console.log(`🎯 [Backend] Using section_course_id ${clusteringSectionCourseId} for clustering cache key`);
    }
    
    const clusteringResult = await clusteringService.getStudentClusters(
      students,
      termIdValue,
      {
        cacheMaxAgeHours: forceRefresh ? 0 : clusteringConfig.cacheMaxAgeHours,
        algorithm: 'kmeans',
        version: '1.0',
        timeoutMs: clusteringConfig.timeoutMs,
        forceRefresh: forceRefresh,
        sectionCourseId: clusteringSectionCourseId, // Pass section_course_id for per-class clustering
        sectionCourseIds: sectionCourseIdArray.length > 0 ? sectionCourseIdArray : null, // Pass all IDs for faculty filtering
        standardType: soIdValue ? 'SO' : (igaIdValue ? 'IGA' : (cdioIdValue ? 'CDIO' : (sdgIdValue ? 'SDG' : null))),
        standardId: soIdValue || igaIdValue || cdioIdValue || sdgIdValue // Pass standard ID for standard-filtered clustering
      }
    );

    // Apply clusters to student data
    let dataWithClusters = clusteringService.applyClustersToStudents(students, clusteringResult.clusters);

    // If filtering by both student_id and section_course_id, filter results to only return requested student(s)
    // This ensures clustering happens with all students in the class, but we only return the specific student
    if (filterStudentsAfterClustering && studentIdValue) {
      console.log(`🔍 [Backend] Filtering results to student_id: ${studentIdValue} after clustering`);
      const beforeFilter = dataWithClusters.length;
      dataWithClusters = dataWithClusters.filter(student => {
        const studentId = typeof student.student_id === 'string' ? parseInt(student.student_id, 10) : student.student_id;
        return studentId === studentIdValue;
      });
      console.log(`✅ [Backend] Filtered from ${beforeFilter} to ${dataWithClusters.length} student(s) after clustering`);
      
      // Log cluster label for the filtered student
      if (dataWithClusters.length > 0) {
        const filteredStudent = dataWithClusters[0];
        console.log(`🎯 [Backend] Filtered student cluster info:`, {
          student_id: filteredStudent.student_id,
          cluster: filteredStudent.cluster,
          cluster_label: filteredStudent.cluster_label,
          section_course_id: sectionCourseIdValue
        });
      }
    }

    // Log clustering results with detailed diagnostics
    console.log('🔍 [Backend] Clustering result details:', {
      cacheUsed: clusteringResult.cacheUsed,
      apiCalled: clusteringResult.apiCalled,
      error: clusteringResult.error,
      clustersSize: clusteringResult.clusters.size,
      studentsCount: students.length,
      enabled: clusteringConfig.enabled,
      silhouetteScore: clusteringResult.silhouetteScore
    });

    if (clusteringResult.cacheUsed) {
      console.log('✅ [Backend] Using cached clusters - clustering is enabled and working');
      const clusterDistribution = clusteringService.getClusterDistribution(dataWithClusters);
      console.log('📊 [Backend] Cluster distribution from cache:', clusterDistribution);
    } else if (clusteringResult.apiCalled) {
      console.log('✅ [Backend] Clusters retrieved from API');
      const clusterDistribution = clusteringService.getClusterDistribution(dataWithClusters);
      console.log('📊 [Backend] Cluster distribution from API:', clusterDistribution);
      
      // Log cluster data verification
      if (dataWithClusters.length > 0) {
        const studentsWithClusters = dataWithClusters.filter(s => s.cluster_label);
        const studentsWithoutClusters = dataWithClusters.filter(s => !s.cluster_label);
        console.log(`🔍 [Backend] Cluster verification: ${studentsWithClusters.length} with clusters, ${studentsWithoutClusters.length} without clusters`);
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
      console.warn('⚠️ [Backend] Clustering enabled:', clusteringConfig.enabled);
      console.warn('⚠️ [Backend] Clustering error:', clusteringResult.error);
      console.warn('⚠️ [Backend] API called:', clusteringResult.apiCalled);
      console.warn('⚠️ [Backend] Cache used:', clusteringResult.cacheUsed);
      
      // If clustering is enabled but failed, log detailed error
      if (clusteringConfig.enabled && !clusteringResult.cacheUsed && !clusteringResult.apiCalled && !clusteringResult.error) {
        console.error('❌ [Backend] CRITICAL: Clustering is enabled but neither cache nor API was used!');
        console.error('❌ [Backend] This suggests clustering service is not working correctly.');
      }
    }
    
    // Check if all students have null cluster labels (clustering failed)
    const studentsWithClusters = dataWithClusters.filter(s => s.cluster_label && s.cluster_label !== null);
    const studentsWithoutClusters = dataWithClusters.filter(s => !s.cluster_label || s.cluster_label === null);
    
    if (studentsWithoutClusters.length === dataWithClusters.length && clusteringConfig.enabled) {
      console.error('❌ [Backend] CRITICAL: All students have null cluster labels despite clustering being enabled!');
      console.error('❌ [Backend] Clustering has failed. Check Python API logs and connectivity.');
      console.error('❌ [Backend] Cluster map size:', clusteringResult.clusters.size);
      console.error('❌ [Backend] Sample cluster map entries:', Array.from(clusteringResult.clusters.entries()).slice(0, 3));
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
            serviceUrl: clusterServiceUrl ? (clusterServiceUrl.substring(0, 50) + '...') : 'not configured',
            silhouetteScore: clusteringResult.silhouetteScore ?? null  // Clustering accuracy metric (-1 to 1)
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
