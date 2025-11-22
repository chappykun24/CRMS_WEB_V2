import db from '../config/database.js';

/**
 * Calculate ILO attainment for a specific section course
 * @param {number} sectionCourseId - The section course ID
 * @param {number} passThreshold - Threshold for "attained" status (default: 75)
 * @param {number|null} iloId - Optional ILO ID to filter by
 * @param {string} performanceFilter - "high" | "low" | "all" (default: "all")
 * @param {number} highThreshold - Threshold for "high" performance (default: 80)
 * @param {number} lowThreshold - Threshold for "low" performance (default: 75)
 * @returns {Promise<Object>} Attainment data (summary or student list)
 */
export async function calculateILOAttainment(
  sectionCourseId,
  passThreshold = 75,
  iloId = null,
  performanceFilter = 'all',
  highThreshold = 80,
  lowThreshold = 75,
  soId = null,
  sdgId = null,
  igaId = null,
  cdioId = null
) {
  try {
    // Get section course and course info
    const sectionCourseQuery = `
      SELECT 
        sc.section_course_id,
        sc.section_id,
        sc.course_id,
        c.title AS course_title,
        c.course_code,
        s.section_code,
        s.year_level
      FROM section_courses sc
      INNER JOIN courses c ON sc.course_id = c.course_id
      INNER JOIN sections s ON sc.section_id = s.section_id
      WHERE sc.section_course_id = $1
    `;
    
    const sectionCourseResult = await db.query(sectionCourseQuery, [sectionCourseId]);
    
    if (sectionCourseResult.rows.length === 0) {
      throw new Error('Section course not found');
    }
    
    const sectionCourse = sectionCourseResult.rows[0];
    
    if (iloId) {
      // Return student list for specific ILO with assessments
      return await getILOStudentList(
        sectionCourseId,
        iloId,
        passThreshold,
        performanceFilter,
        highThreshold,
        lowThreshold,
        sectionCourse,
        soId,
        sdgId,
        igaId,
        cdioId
      );
    } else {
      // Return summary for all ILOs (with optional filters)
      return await getILOAttainmentSummary(
        sectionCourseId,
        passThreshold,
        highThreshold,
        lowThreshold,
        sectionCourse,
        soId,
        sdgId,
        igaId,
        cdioId
      );
    }
  } catch (error) {
    console.error('[ATTAINMENT SERVICE] Error calculating ILO attainment:', error);
    console.error('[ATTAINMENT SERVICE] Error details:', {
      sectionCourseId,
      passThreshold,
      iloId,
      performanceFilter,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Get ILO attainment summary for all ILOs in a section course
 */
async function getILOAttainmentSummary(
  sectionCourseId,
  passThreshold,
  highThreshold,
  lowThreshold,
  sectionCourse,
  soId = null,
  sdgId = null,
  igaId = null,
  cdioId = null
) {
  const query = `
    WITH student_ilo_scores AS (
      SELECT
        ce.student_id,
        s.student_number,
        s.full_name,
        i.ilo_id,
        i.code AS ilo_code,
        i.description AS ilo_description,
        -- Calculate average transmuted score for this ILO per student
        COALESCE(
          AVG(
            CASE 
              WHEN sub.transmuted_score IS NOT NULL
              THEN sub.transmuted_score
              WHEN sub.adjusted_score IS NOT NULL AND a.total_points > 0 AND a.weight_percentage IS NOT NULL
              THEN ((sub.adjusted_score / a.total_points) * 62.5 + 37.5) * (a.weight_percentage / 100)
              WHEN sub.total_score IS NOT NULL AND a.total_points > 0 AND a.weight_percentage IS NOT NULL
              THEN ((sub.total_score / a.total_points) * 62.5 + 37.5) * (a.weight_percentage / 100)
              ELSE NULL
            END
          ),
          0
        ) AS ilo_score
      FROM course_enrollments ce
      INNER JOIN students s ON ce.student_id = s.student_id
      INNER JOIN assessments a ON ce.section_course_id = a.section_course_id
      INNER JOIN (
        -- Dynamically extract assessment codes and match to ILO mappings
        SELECT DISTINCT
          a2.assessment_id,
          COALESCE(aiw2.ilo_id, r.ilo_id, im.ilo_id) AS ilo_id
        FROM assessments a2
        LEFT JOIN assessment_ilo_weights aiw2 ON a2.assessment_id = aiw2.assessment_id
        LEFT JOIN (
          SELECT DISTINCT r.assessment_id, r.ilo_id
        FROM rubrics r
        INNER JOIN assessments a3 ON r.assessment_id = a3.assessment_id
        INNER JOIN syllabi sy3 ON a3.syllabus_id = sy3.syllabus_id
          WHERE a3.section_course_id = $1
            AND sy3.approval_status = 'approved'
        ) r ON a2.assessment_id = r.assessment_id
        LEFT JOIN (
          WITH assessment_codes AS (
            SELECT DISTINCT
              a4.assessment_id,
              COALESCE(
                -- Try to get code from syllabus assessment_framework JSON
                (
                  SELECT (task->>'code')::text
                  FROM jsonb_array_elements(sy.assessment_framework->'components') AS component
                  CROSS JOIN LATERAL jsonb_array_elements(component->'sub_assessments') AS task
                  WHERE (task->>'title')::text ILIKE '%' || a4.title || '%'
                     OR (task->>'name')::text ILIKE '%' || a4.title || '%'
                  LIMIT 1
                ),
                -- Try to get code from assessment content_data
                (a4.content_data->>'code')::text,
                (a4.content_data->>'abbreviation')::text,
                -- Extract code dynamically from title using pattern matching
                CASE 
                  WHEN a4.title ~* '[A-Z]{2,4}\s*\d+' 
                  THEN UPPER(SUBSTRING(a4.title FROM '([A-Z]{2,4}\s*\d+)'))
                  ELSE NULL
                END,
                NULL
              ) AS assessment_code
            FROM assessments a4
            INNER JOIN syllabi sy ON a4.syllabus_id = sy.syllabus_id
            WHERE a4.section_course_id = $1
              AND sy.approval_status = 'approved'
          )
          SELECT DISTINCT
            ac.assessment_id,
            COALESCE(ism.ilo_id, isdg.ilo_id, iiga.ilo_id, icdio.ilo_id) AS ilo_id
          FROM assessment_codes ac
          LEFT JOIN ilo_so_mappings ism ON ism.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL
          LEFT JOIN ilo_sdg_mappings isdg ON isdg.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL
          LEFT JOIN ilo_iga_mappings iiga ON iiga.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL
          LEFT JOIN ilo_cdio_mappings icdio ON icdio.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL
          WHERE ac.assessment_code IS NOT NULL
            AND (ism.ilo_id IS NOT NULL OR isdg.ilo_id IS NOT NULL OR iiga.ilo_id IS NOT NULL OR icdio.ilo_id IS NOT NULL)
        ) im ON a2.assessment_id = im.assessment_id
        FROM assessments a2
        INNER JOIN syllabi sy2 ON a2.syllabus_id = sy2.syllabus_id
        WHERE a2.section_course_id = $1
          AND sy2.approval_status = 'approved'
          AND (aiw2.ilo_id IS NOT NULL OR r.ilo_id IS NOT NULL OR im.ilo_id IS NOT NULL)
      ) aic ON a.assessment_id = aic.assessment_id
      INNER JOIN ilos i ON aic.ilo_id = i.ilo_id
      INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
      LEFT JOIN submissions sub ON (
        ce.enrollment_id = sub.enrollment_id 
        AND sub.assessment_id = a.assessment_id
        AND (sub.transmuted_score IS NOT NULL OR sub.adjusted_score IS NOT NULL OR sub.total_score IS NOT NULL)
      )
      WHERE ce.section_course_id = $1
        AND ce.status = 'enrolled'
        AND a.weight_percentage IS NOT NULL
        AND a.weight_percentage > 0
        AND i.is_active = TRUE
        AND sy.section_course_id = $1
        AND sy.approval_status = 'approved'
        AND a.section_course_id = $1
        ${soId ? `AND EXISTS (SELECT 1 FROM ilo_so_mappings ism WHERE ism.ilo_id = i.ilo_id AND ism.so_id = ${soId})` : ''}
        ${sdgId ? `AND EXISTS (SELECT 1 FROM ilo_sdg_mappings isdg WHERE isdg.ilo_id = i.ilo_id AND isdg.sdg_id = ${sdgId})` : ''}
        ${igaId ? `AND EXISTS (SELECT 1 FROM ilo_iga_mappings iiga WHERE iiga.ilo_id = i.ilo_id AND iiga.iga_id = ${igaId})` : ''}
        ${cdioId ? `AND EXISTS (SELECT 1 FROM ilo_cdio_mappings icdio WHERE icdio.ilo_id = i.ilo_id AND icdio.cdio_id = ${cdioId})` : ''}
      GROUP BY ce.student_id, s.student_number, s.full_name, i.ilo_id, i.code, i.description
    ),
    ilo_summary AS (
      SELECT
        ilo_id,
        ilo_code,
        ilo_description,
        COUNT(DISTINCT student_id) AS total_students,
        COUNT(DISTINCT CASE WHEN ilo_score >= $2 THEN student_id END) AS attained_count,
        COUNT(DISTINCT CASE WHEN ilo_score >= $3 THEN student_id END) AS high_performance_count,
        COUNT(DISTINCT CASE WHEN ilo_score < $4 AND ilo_score >= $2 THEN student_id END) AS low_performance_count,
        AVG(ilo_score) AS average_score
      FROM student_ilo_scores
      GROUP BY ilo_id, ilo_code, ilo_description
    ),
    ilo_mappings AS (
      SELECT
        i.ilo_id,
        ARRAY_AGG(DISTINCT so.so_code ORDER BY so.so_code) FILTER (WHERE so.so_code IS NOT NULL) AS so_codes,
        ARRAY_AGG(DISTINCT cdio.cdio_code ORDER BY cdio.cdio_code) FILTER (WHERE cdio.cdio_code IS NOT NULL) AS cdio_codes,
        ARRAY_AGG(DISTINCT sdg.sdg_code ORDER BY sdg.sdg_code) FILTER (WHERE sdg.sdg_code IS NOT NULL) AS sdg_codes,
        ARRAY_AGG(DISTINCT iga.iga_code ORDER BY iga.iga_code) FILTER (WHERE iga.iga_code IS NOT NULL) AS iga_codes
      FROM ilos i
      LEFT JOIN ilo_so_mappings ism ON i.ilo_id = ism.ilo_id
      LEFT JOIN student_outcomes so ON ism.so_id = so.so_id
      LEFT JOIN ilo_cdio_mappings icdio ON i.ilo_id = icdio.ilo_id
      LEFT JOIN cdio_skills cdio ON icdio.cdio_id = cdio.cdio_id
      LEFT JOIN ilo_sdg_mappings isdg ON i.ilo_id = isdg.ilo_id
      LEFT JOIN sdg_skills sdg ON isdg.sdg_id = sdg.sdg_id
      LEFT JOIN ilo_iga_mappings iiga ON i.ilo_id = iiga.ilo_id
      LEFT JOIN institutional_graduate_attributes iga ON iiga.iga_id = iga.iga_id
      WHERE i.ilo_id IN (SELECT DISTINCT ilo_id FROM ilo_summary)
      GROUP BY i.ilo_id
    )
    SELECT
      isum.ilo_id,
      isum.ilo_code,
      isum.ilo_description,
      isum.total_students,
      isum.attained_count,
      ROUND((isum.attained_count::NUMERIC / NULLIF(isum.total_students, 0) * 100), 2) AS attainment_percentage,
      isum.high_performance_count,
      isum.low_performance_count,
      ROUND(isum.average_score::NUMERIC, 2) AS average_score,
      COALESCE(im.so_codes, ARRAY[]::TEXT[]) AS mapped_so_codes,
      COALESCE(im.cdio_codes, ARRAY[]::TEXT[]) AS mapped_cdio_codes,
      COALESCE(im.sdg_codes, ARRAY[]::TEXT[]) AS mapped_sdg_codes,
      COALESCE(im.iga_codes, ARRAY[]::TEXT[]) AS mapped_iga_codes
    FROM ilo_summary isum
    LEFT JOIN ilo_mappings im ON isum.ilo_id = im.ilo_id
    ORDER BY isum.ilo_code
  `;
  
  const result = await db.query(query, [sectionCourseId, passThreshold, highThreshold, lowThreshold]);
  
  // Calculate overall summary
  const totalStudents = result.rows.length > 0 ? result.rows[0].total_students : 0;
  const overallAttainmentRate = result.rows.length > 0
    ? result.rows.reduce((sum, row) => sum + parseFloat(row.attainment_percentage || 0), 0) / result.rows.length
    : 0;
  
  // Format mapped_to array for each ILO
  const iloAttainment = result.rows.map(row => {
    const mappedTo = [];
    if (row.mapped_so_codes && row.mapped_so_codes.length > 0) {
      mappedTo.push(...row.mapped_so_codes.map(code => ({ type: 'SO', code })));
    }
    if (row.mapped_cdio_codes && row.mapped_cdio_codes.length > 0) {
      mappedTo.push(...row.mapped_cdio_codes.map(code => ({ type: 'CDIO', code })));
    }
    if (row.mapped_sdg_codes && row.mapped_sdg_codes.length > 0) {
      mappedTo.push(...row.mapped_sdg_codes.map(code => ({ type: 'SDG', code })));
    }
    if (row.mapped_iga_codes && row.mapped_iga_codes.length > 0) {
      mappedTo.push(...row.mapped_iga_codes.map(code => ({ type: 'IGA', code })));
    }
    
    return {
      ilo_id: row.ilo_id,
      ilo_code: row.ilo_code,
      description: row.ilo_description,
      total_students: row.total_students,
      attained_count: row.attained_count,
      attainment_percentage: parseFloat(row.attainment_percentage || 0),
      high_performance_count: row.high_performance_count,
      low_performance_count: row.low_performance_count,
      average_score: parseFloat(row.average_score || 0),
      mapped_to: mappedTo
    };
  });
  
  return {
    section_course_id: sectionCourse.section_course_id,
    course_title: sectionCourse.course_title,
    course_code: sectionCourse.course_code,
    section_code: sectionCourse.section_code,
    ilo_attainment: iloAttainment,
    summary: {
      total_ilos: iloAttainment.length,
      total_students: totalStudents,
      overall_attainment_rate: Math.round(overallAttainmentRate * 100) / 100
    }
  };
}

/**
 * Get student list for a specific ILO
 */
async function getILOStudentList(
  sectionCourseId,
  iloId,
  passThreshold,
  performanceFilter,
  highThreshold,
  lowThreshold,
  sectionCourse,
  soId = null,
  sdgId = null,
  igaId = null,
  cdioId = null
) {
  // First get ILO info and mappings
  const iloQuery = `
    SELECT
      i.ilo_id,
      i.code AS ilo_code,
      i.description AS ilo_description,
      ARRAY_AGG(DISTINCT so.so_code ORDER BY so.so_code) FILTER (WHERE so.so_code IS NOT NULL) AS so_codes,
      ARRAY_AGG(DISTINCT cdio.cdio_code ORDER BY cdio.cdio_code) FILTER (WHERE cdio.cdio_code IS NOT NULL) AS cdio_codes,
      ARRAY_AGG(DISTINCT sdg.sdg_code ORDER BY sdg.sdg_code) FILTER (WHERE sdg.sdg_code IS NOT NULL) AS sdg_codes,
      ARRAY_AGG(DISTINCT iga.iga_code ORDER BY iga.iga_code) FILTER (WHERE iga.iga_code IS NOT NULL) AS iga_codes
    FROM ilos i
    INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
    LEFT JOIN ilo_so_mappings ism ON i.ilo_id = ism.ilo_id
    LEFT JOIN student_outcomes so ON ism.so_id = so.so_id
    LEFT JOIN ilo_cdio_mappings icdio ON i.ilo_id = icdio.ilo_id
    LEFT JOIN cdio_skills cdio ON icdio.cdio_id = cdio.cdio_id
    LEFT JOIN ilo_sdg_mappings isdg ON i.ilo_id = isdg.ilo_id
    LEFT JOIN sdg_skills sdg ON isdg.sdg_id = sdg.sdg_id
    LEFT JOIN ilo_iga_mappings iiga ON i.ilo_id = iiga.ilo_id
    LEFT JOIN institutional_graduate_attributes iga ON iiga.iga_id = iga.iga_id
    WHERE i.ilo_id = $1 AND i.is_active = TRUE AND sy.approval_status = 'approved'
    GROUP BY i.ilo_id, i.code, i.description
  `;
  
  const iloResult = await db.query(iloQuery, [iloId]);
  
  if (iloResult.rows.length === 0) {
    throw new Error('ILO not found');
  }
  
  const iloInfo = iloResult.rows[0];
  
  // Get assessments connected to this ILO (with optional SO/SDG/IGA/CDIO filter)
  // Use separate, simpler queries for accuracy
  
  // Build filter conditions safely for assessments query
  // When filters are applied, only include assessments that match the selected mappings
  const assessmentFilterParams = [sectionCourseId, iloId];
  let hasFilters = false;
  
  if (soId) {
    assessmentFilterParams.push(soId);
    hasFilters = true;
  }
  if (sdgId) {
    assessmentFilterParams.push(sdgId);
    hasFilters = true;
  }
  if (igaId) {
    assessmentFilterParams.push(igaId);
    hasFilters = true;
  }
  if (cdioId) {
    assessmentFilterParams.push(cdioId);
    hasFilters = true;
  }
  
  // Step 1: Get assessments with stats (simpler query)
  const assessmentsQuery = `
    WITH assessment_codes AS (
      SELECT DISTINCT
        a.assessment_id,
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
          CASE 
            WHEN a.title ~* '[A-Z]{2,4}\s*\d+' 
            THEN UPPER(SUBSTRING(a.title FROM '([A-Z]{2,4}\s*\d+)'))
            ELSE NULL
          END,
          NULL
        ) AS assessment_code
      FROM assessments a
      INNER JOIN syllabi sy ON a.syllabus_id = sy.syllabus_id
      WHERE a.section_course_id = $1
    ),
    ilo_from_rubrics AS (
      SELECT DISTINCT
        r.assessment_id,
        r.ilo_id
      FROM rubrics r
      INNER JOIN assessments a ON r.assessment_id = a.assessment_id
      WHERE a.section_course_id = $1
    ),
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
    assessment_ilo_connections AS (
      -- Get the syllabus_id for the target ILO, then get ALL assessments from that syllabus
      -- Since assessments are connected to the syllabus, show ALL assessments from the same syllabus
      WITH target_ilo_syllabus AS (
        SELECT DISTINCT i.syllabus_id
        FROM ilos i
        INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
        WHERE i.ilo_id = $2 AND i.is_active = TRUE AND sy.approval_status = 'approved'
      )
      SELECT DISTINCT
        a.assessment_id,
        -- Connect all assessments from the same syllabus to the target ILO ($2)
        -- Prefer explicit connections if they match the target ILO, otherwise default to target ILO
        COALESCE(
          CASE WHEN aiw.ilo_id = $2 THEN aiw.ilo_id ELSE NULL END,
          CASE WHEN r.ilo_id = $2 THEN r.ilo_id ELSE NULL END,
          CASE WHEN im.ilo_id = $2 THEN im.ilo_id ELSE NULL END,
          $2  -- Default: connect to target ILO since they're in the same syllabus
        ) AS ilo_id,
        COALESCE(
          CASE WHEN aiw.ilo_id = $2 THEN aiw.weight_percentage ELSE NULL END,
          a.weight_percentage,
          0
        ) AS ilo_weight_percentage
      FROM assessments a
      INNER JOIN syllabi sy ON a.syllabus_id = sy.syllabus_id
      INNER JOIN target_ilo_syllabus tis ON sy.syllabus_id = tis.syllabus_id
      LEFT JOIN assessment_ilo_weights aiw ON a.assessment_id = aiw.assessment_id AND aiw.ilo_id = $2
      LEFT JOIN ilo_from_rubrics r ON a.assessment_id = r.assessment_id AND r.ilo_id = $2
      LEFT JOIN ilo_from_mappings im ON a.assessment_id = im.assessment_id AND im.ilo_id = $2
      WHERE a.section_course_id = $1
        AND sy.section_course_id = $1
        AND sy.approval_status = 'approved'
        AND a.weight_percentage IS NOT NULL
        AND a.weight_percentage > 0
        -- Show ALL assessments from the same syllabus as the target ILO
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
      INNER JOIN ilos i ON aic.ilo_id = i.ilo_id
      INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
      INNER JOIN course_enrollments ce ON a.section_course_id = ce.section_course_id AND ce.status = 'enrolled'
      LEFT JOIN submissions sub ON (
        ce.enrollment_id = sub.enrollment_id 
        AND sub.assessment_id = a.assessment_id
        AND (sub.transmuted_score IS NOT NULL OR sub.adjusted_score IS NOT NULL OR sub.total_score IS NOT NULL)
      )
      WHERE a.section_course_id = $1
        AND aic.ilo_id = $2
        AND sy.section_course_id = $1
        AND a.weight_percentage IS NOT NULL
        AND a.weight_percentage > 0
        AND i.is_active = TRUE
      GROUP BY a.assessment_id, a.title, a.type, a.total_points, a.weight_percentage, a.due_date, aic.ilo_id, aic.ilo_weight_percentage, i.ilo_id, sy.section_course_id
    )
    SELECT DISTINCT
      ast.assessment_id,
      ast.assessment_title,
      ast.assessment_type,
      ast.total_points,
      ast.weight_percentage,
      ast.due_date,
      ast.ilo_weight_percentage,
      ast.total_students,
      ast.submissions_count,
      ROUND(ast.average_score::NUMERIC, 2) AS average_score,
      ROUND(ast.total_score::NUMERIC, 2) AS total_score,
      CASE 
        WHEN ast.total_points > 0 AND ast.weight_percentage > 0 AND ast.average_score > 0 THEN 
          ROUND((((ast.average_score / (ast.weight_percentage / 100.0) - 37.5) / 62.5) * 100)::NUMERIC, 2)
        ELSE 0
      END AS average_percentage,
      -- Get all mappings for this assessment's ILO
      ARRAY_AGG(DISTINCT so.so_code ORDER BY so.so_code) FILTER (WHERE so.so_code IS NOT NULL) AS so_codes,
      ARRAY_AGG(DISTINCT cdio.cdio_code ORDER BY cdio.cdio_code) FILTER (WHERE cdio.cdio_code IS NOT NULL) AS cdio_codes,
      ARRAY_AGG(DISTINCT sdg.sdg_code ORDER BY sdg.sdg_code) FILTER (WHERE sdg.sdg_code IS NOT NULL) AS sdg_codes,
      ARRAY_AGG(DISTINCT iga.iga_code ORDER BY iga.iga_code) FILTER (WHERE iga.iga_code IS NOT NULL) AS iga_codes
    FROM assessment_stats ast
    INNER JOIN ilos i ON ast.ilo_id = i.ilo_id
    INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
    LEFT JOIN ilo_so_mappings ism ON i.ilo_id = ism.ilo_id
    LEFT JOIN student_outcomes so ON ism.so_id = so.so_id
    LEFT JOIN ilo_cdio_mappings icdio ON i.ilo_id = icdio.ilo_id
    LEFT JOIN cdio_skills cdio ON icdio.cdio_id = cdio.cdio_id
    LEFT JOIN ilo_sdg_mappings isdg ON i.ilo_id = isdg.ilo_id
    LEFT JOIN sdg_skills sdg ON isdg.sdg_id = sdg.sdg_id
    LEFT JOIN ilo_iga_mappings iiga ON i.ilo_id = iiga.ilo_id
    LEFT JOIN institutional_graduate_attributes iga ON iiga.iga_id = iga.iga_id
    WHERE sy.section_course_id = $1
      AND i.is_active = TRUE
      AND i.ilo_id = $2
    GROUP BY ast.assessment_id, ast.assessment_title, ast.assessment_type, ast.total_points, ast.weight_percentage, ast.due_date, ast.ilo_weight_percentage, ast.total_students, ast.submissions_count, ast.average_score, ast.total_score
    ORDER BY ast.due_date ASC, ast.assessment_title ASC
  `;
  
  // Debug: First check if there are any assessments in the section course at all
  const debugAssessmentsQuery = `
    SELECT 
      a.assessment_id,
      a.title,
      a.syllabus_id,
      sy.section_course_id as sy_section_course_id,
      a.section_course_id as a_section_course_id,
      a.weight_percentage
    FROM assessments a
    INNER JOIN syllabi sy ON a.syllabus_id = sy.syllabus_id
    WHERE a.section_course_id = $1
      AND sy.section_course_id = $1
    ORDER BY a.assessment_id
    LIMIT 10
  `;
  
  try {
    const debugAssessments = await db.query(debugAssessmentsQuery, [sectionCourseId]);
    console.log(`[ATTAINMENT DEBUG] Total assessments in section_course ${sectionCourseId}: ${debugAssessments.rows.length}`);
    if (debugAssessments.rows.length > 0) {
      console.log(`[ATTAINMENT DEBUG] Sample assessments:`, debugAssessments.rows.map(a => ({
        id: a.assessment_id,
        title: a.title,
        syllabus_id: a.syllabus_id,
        sy_section_course_id: a.sy_section_course_id,
        a_section_course_id: a.a_section_course_id,
        weight: a.weight_percentage
      })));
    }
  } catch (debugError) {
    console.error(`[ATTAINMENT DEBUG] Error checking assessments:`, debugError);
  }
  
  // Debug: Check the ILO's syllabus
  const debugILOSyllabusQuery = `
    SELECT 
      i.ilo_id,
      i.code,
      i.syllabus_id,
      sy.section_course_id
    FROM ilos i
    INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
    WHERE i.ilo_id = $1
      AND i.is_active = TRUE
  `;
  
  try {
    const debugILO = await db.query(debugILOSyllabusQuery, [iloId]);
    console.log(`[ATTAINMENT DEBUG] ILO ${iloId} info:`, debugILO.rows[0] || 'NOT FOUND');
  } catch (debugError) {
    console.error(`[ATTAINMENT DEBUG] Error checking ILO:`, debugError);
  }
  
  // Debug: Check assessment_ilo_connections CTE
  const debugConnectionsQuery = `
    WITH target_ilo_syllabus AS (
      SELECT DISTINCT syllabus_id
      FROM ilos
      WHERE ilo_id = $2 AND is_active = TRUE
    )
    SELECT 
      COUNT(*) as total_assessments_in_syllabus,
      COUNT(*) FILTER (WHERE a.weight_percentage IS NOT NULL AND a.weight_percentage > 0) as valid_assessments
    FROM assessments a
    INNER JOIN syllabi sy ON a.syllabus_id = sy.syllabus_id
    INNER JOIN target_ilo_syllabus tis ON sy.syllabus_id = tis.syllabus_id
    WHERE a.section_course_id = $1
      AND sy.section_course_id = $1
  `;
  
  try {
    const debugConnections = await db.query(debugConnectionsQuery, [sectionCourseId, iloId]);
    console.log(`[ATTAINMENT DEBUG] Assessments in ILO's syllabus:`, debugConnections.rows[0]);
    
    // Also get sample assessments from the same syllabus
    const debugSampleQuery = `
      WITH target_ilo_syllabus AS (
        SELECT DISTINCT syllabus_id
        FROM ilos
        WHERE ilo_id = $2 AND is_active = TRUE
      )
      SELECT 
        a.assessment_id,
        a.title,
        a.weight_percentage,
        sy.syllabus_id,
        sy.section_course_id
      FROM assessments a
      INNER JOIN syllabi sy ON a.syllabus_id = sy.syllabus_id
      INNER JOIN target_ilo_syllabus tis ON sy.syllabus_id = tis.syllabus_id
      WHERE a.section_course_id = $1
        AND sy.section_course_id = $1
        AND a.weight_percentage IS NOT NULL
        AND a.weight_percentage > 0
      LIMIT 5
    `;
    const debugSample = await db.query(debugSampleQuery, [sectionCourseId, iloId]);
    console.log(`[ATTAINMENT DEBUG] Sample assessments from ILO's syllabus:`, debugSample.rows);
  } catch (debugError) {
    console.error(`[ATTAINMENT DEBUG] Error checking connections:`, debugError);
  }
  
  // Debug: Log the actual query being executed
  console.log(`[ATTAINMENT DEBUG] Executing assessmentsQuery with params:`, assessmentFilterParams);
  console.log(`[ATTAINMENT DEBUG] Filters applied:`, hasFilters ? `SO:${soId || 'none'}, SDG:${sdgId || 'none'}, IGA:${igaId || 'none'}, CDIO:${cdioId || 'none'}` : '(none)');
  
  let assessmentsResult;
  try {
    assessmentsResult = await db.query(assessmentsQuery, assessmentFilterParams);
    
    console.log(`[ATTAINMENT SERVICE] ✅ Query executed successfully`);
    console.log(`[ATTAINMENT SERVICE] Found ${assessmentsResult.rows.length} assessments for ILO ${iloId} in section_course ${sectionCourseId}`);
    
    if (assessmentsResult.rows.length > 0) {
      console.log(`[ATTAINMENT SERVICE] Sample assessment:`, {
        id: assessmentsResult.rows[0].assessment_id,
        title: assessmentsResult.rows[0].assessment_title,
        type: assessmentsResult.rows[0].assessment_type,
        total_points: assessmentsResult.rows[0].total_points
      });
    }
  } catch (queryError) {
    console.error(`[ATTAINMENT SERVICE] ❌ Query execution failed:`, queryError);
    console.error(`[ATTAINMENT SERVICE] Query:`, assessmentsQuery.substring(0, 500) + '...');
    throw queryError;
  }
  
  if (assessmentsResult.rows.length === 0) {
    console.log(`[ATTAINMENT SERVICE] No assessments found. Checking assessment_ilo_connections...`);
    // Debug query to see if there are any connections at all
    const debugQuery = `
      WITH assessment_ilo_connections AS (
        SELECT DISTINCT
          a.assessment_id,
          COALESCE(aiw.ilo_id, r.ilo_id, im.ilo_id) AS ilo_id
        FROM assessments a
        LEFT JOIN assessment_ilo_weights aiw ON a.assessment_id = aiw.assessment_id
        LEFT JOIN (
          SELECT DISTINCT r.assessment_id, r.ilo_id
          FROM rubrics r
          INNER JOIN assessments a2 ON r.assessment_id = a2.assessment_id
          WHERE a2.section_course_id = $1
        ) r ON a.assessment_id = r.assessment_id
        LEFT JOIN (
          WITH assessment_codes AS (
            SELECT DISTINCT
              a3.assessment_id,
              COALESCE(
                (SELECT (task->>'code')::text
                 FROM jsonb_array_elements(sy.assessment_framework->'components') AS component
                 CROSS JOIN LATERAL jsonb_array_elements(component->'sub_assessments') AS task
                 WHERE (task->>'title')::text ILIKE '%' || a3.title || '%'
                    OR (task->>'name')::text ILIKE '%' || a3.title || '%'
                 LIMIT 1),
                (a3.content_data->>'code')::text,
                (a3.content_data->>'abbreviation')::text,
                CASE 
                  WHEN a3.title ~* '[A-Z]{2,4}\s*\d+' 
                  THEN UPPER(SUBSTRING(a3.title FROM '([A-Z]{2,4}\s*\d+)'))
                  ELSE NULL
                END,
                NULL
              ) AS assessment_code
            FROM assessments a3
            INNER JOIN syllabi sy ON a3.syllabus_id = sy.syllabus_id
            WHERE a3.section_course_id = $1
          )
          SELECT DISTINCT
            ac.assessment_id,
            COALESCE(ism.ilo_id, isdg.ilo_id, iiga.ilo_id, icdio.ilo_id) AS ilo_id
          FROM assessment_codes ac
          LEFT JOIN ilo_so_mappings ism ON ism.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL
          LEFT JOIN ilo_sdg_mappings isdg ON isdg.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL
          LEFT JOIN ilo_iga_mappings iiga ON iiga.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL
          LEFT JOIN ilo_cdio_mappings icdio ON icdio.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL
          WHERE ac.assessment_code IS NOT NULL
            AND (ism.ilo_id IS NOT NULL OR isdg.ilo_id IS NOT NULL OR iiga.ilo_id IS NOT NULL OR icdio.ilo_id IS NOT NULL)
        ) im ON a.assessment_id = im.assessment_id
        WHERE a.section_course_id = $1
          AND (aiw.ilo_id IS NOT NULL OR r.ilo_id IS NOT NULL OR im.ilo_id IS NOT NULL)
      )
      SELECT 
        COUNT(*) as total_connections,
        COUNT(*) FILTER (WHERE ilo_id = $2) as connections_for_ilo
      FROM assessment_ilo_connections
    `;
    try {
      const debugResult = await db.query(debugQuery, [sectionCourseId, iloId]);
      console.log(`[ATTAINMENT SERVICE] Debug: Total connections: ${debugResult.rows[0]?.total_connections}, For ILO ${iloId}: ${debugResult.rows[0]?.connections_for_ilo}`);
    } catch (debugError) {
      console.error(`[ATTAINMENT SERVICE] Debug query error:`, debugError);
    }
  }
  
  // Format assessments with mappings
  const assessments = assessmentsResult.rows.map(row => {
    const mappings = [];
    if (row.so_codes && row.so_codes.length > 0) {
      mappings.push(...row.so_codes.map(code => ({ type: 'SO', code })));
    }
    if (row.cdio_codes && row.cdio_codes.length > 0) {
      mappings.push(...row.cdio_codes.map(code => ({ type: 'CDIO', code })));
    }
    if (row.sdg_codes && row.sdg_codes.length > 0) {
      mappings.push(...row.sdg_codes.map(code => ({ type: 'SDG', code })));
    }
    if (row.iga_codes && row.iga_codes.length > 0) {
      mappings.push(...row.iga_codes.map(code => ({ type: 'IGA', code })));
    }
    
    return {
      assessment_id: row.assessment_id,
      title: row.assessment_title,
      type: row.assessment_type,
      total_points: parseFloat(row.total_points || 0),
      weight_percentage: parseFloat(row.weight_percentage || 0),
      ilo_weight_percentage: parseFloat(row.ilo_weight_percentage || 0),
      due_date: row.due_date,
      total_students: parseInt(row.total_students || 0),
      submissions_count: parseInt(row.submissions_count || 0),
      average_score: parseFloat(row.average_score || 0),
      total_score: parseFloat(row.total_score || 0),
      average_percentage: parseFloat(row.average_percentage || 0),
      mappings: mappings
    };
  });
  
  // Step 1: Get all enrolled students
  const allEnrolledStudentsQuery = `
    SELECT DISTINCT
      ce.student_id,
      ce.enrollment_id,
      s.student_number,
      s.full_name
    FROM course_enrollments ce
    INNER JOIN students s ON ce.student_id = s.student_id
    WHERE ce.section_course_id = $1
      AND ce.status = 'enrolled'
  `;
  
  // Step 2: Get assessments connected to this ILO (with filters applied)
  // When filters are applied, only include assessments whose codes match the filtered mappings
  const connectedAssessmentsQuery = `
    WITH ilo_syllabus AS (
      SELECT DISTINCT syllabus_id
      FROM ilos
      WHERE ilo_id = $2 AND is_active = TRUE
    ),
    assessment_codes_for_filter AS (
      SELECT DISTINCT
        a.assessment_id,
        COALESCE(
          (SELECT (task->>'code')::text
           FROM jsonb_array_elements(sy.assessment_framework->'components') AS component
           CROSS JOIN LATERAL jsonb_array_elements(component->'sub_assessments') AS task
           WHERE (task->>'title')::text ILIKE '%' || a.title || '%'
              OR (task->>'name')::text ILIKE '%' || a.title || '%'
           LIMIT 1),
          (a.content_data->>'code')::text,
          (a.content_data->>'abbreviation')::text,
          CASE 
            WHEN a.title ~* '[A-Z]{2,4}\s*\d+' 
            THEN UPPER(REGEXP_REPLACE(SUBSTRING(a.title FROM '([A-Z]{2,4}\s*\d+)'), '\s+', '', 'g'))
            ELSE NULL
          END,
          NULL
        ) AS assessment_code
        FROM assessments a
        INNER JOIN syllabi sy ON a.syllabus_id = sy.syllabus_id
        WHERE a.section_course_id = $1
          AND sy.approval_status = 'approved'
      ),
      assessment_ilo_connections AS (
      SELECT DISTINCT
        a.assessment_id,
        -- Connect all assessments from the same syllabus to the target ILO ($2)
        -- Prefer explicit connections if they match the target ILO, otherwise default to target ILO
        COALESCE(
          CASE WHEN aiw.ilo_id = $2 THEN aiw.ilo_id ELSE NULL END,
          CASE WHEN r.ilo_id = $2 THEN r.ilo_id ELSE NULL END,
          CASE WHEN im.ilo_id = $2 THEN im.ilo_id ELSE NULL END,
          $2  -- Default: connect to target ILO since they're in the same syllabus
        ) AS ilo_id,
        COALESCE(
          CASE WHEN aiw.ilo_id = $2 THEN aiw.weight_percentage ELSE NULL END,
          a.weight_percentage,
          0
        ) AS ilo_weight_percentage
      FROM assessments a
      INNER JOIN syllabi sy ON a.syllabus_id = sy.syllabus_id
      INNER JOIN ilo_syllabus ils ON sy.syllabus_id = ils.syllabus_id
      LEFT JOIN assessment_ilo_weights aiw ON a.assessment_id = aiw.assessment_id AND aiw.ilo_id = $2
      LEFT JOIN (
        SELECT DISTINCT r.assessment_id, r.ilo_id
        FROM rubrics r
        INNER JOIN assessments a2 ON r.assessment_id = a2.assessment_id
        WHERE a2.section_course_id = $1 AND r.ilo_id = $2
      ) r ON a.assessment_id = r.assessment_id
      LEFT JOIN (
        WITH assessment_codes AS (
          SELECT DISTINCT
            a3.assessment_id,
            COALESCE(
              (SELECT (task->>'code')::text
               FROM jsonb_array_elements(sy.assessment_framework->'components') AS component
               CROSS JOIN LATERAL jsonb_array_elements(component->'sub_assessments') AS task
               WHERE (task->>'title')::text ILIKE '%' || a3.title || '%'
                  OR (task->>'name')::text ILIKE '%' || a3.title || '%'
               LIMIT 1),
              (a3.content_data->>'code')::text,
              (a3.content_data->>'abbreviation')::text,
              CASE 
                WHEN a3.title ~* '[A-Z]{2,4}\s*\d+' 
                THEN UPPER(SUBSTRING(a3.title FROM '([A-Z]{2,4}\s*\d+)'))
                ELSE NULL
              END,
              NULL
            ) AS assessment_code
          FROM assessments a3
          INNER JOIN syllabi sy ON a3.syllabus_id = sy.syllabus_id
          WHERE a3.section_course_id = $1
            AND sy.approval_status = 'approved'
        )
        SELECT DISTINCT
          ac.assessment_id,
          COALESCE(ism.ilo_id, isdg.ilo_id, iiga.ilo_id, icdio.ilo_id) AS ilo_id
        FROM assessment_codes ac
        LEFT JOIN ilo_so_mappings ism ON ism.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL AND ism.ilo_id = $2
        LEFT JOIN ilo_sdg_mappings isdg ON isdg.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL AND isdg.ilo_id = $2
        LEFT JOIN ilo_iga_mappings iiga ON iiga.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL AND iiga.ilo_id = $2
        LEFT JOIN ilo_cdio_mappings icdio ON icdio.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL AND icdio.ilo_id = $2
        WHERE ac.assessment_code IS NOT NULL
          AND (ism.ilo_id = $2 OR isdg.ilo_id = $2 OR iiga.ilo_id = $2 OR icdio.ilo_id = $2)
      ) im ON a.assessment_id = im.assessment_id
      WHERE a.section_course_id = $1
        AND sy.section_course_id = $1
        AND sy.approval_status = 'approved'
        AND a.weight_percentage IS NOT NULL
        AND a.weight_percentage > 0
        -- Apply filters: only include assessments that match selected mappings
        ${hasFilters ? `AND EXISTS (
          SELECT 1 FROM assessment_codes_for_filter acf
          WHERE acf.assessment_id = a.assessment_id
            AND (
              ${soId ? `EXISTS (SELECT 1 FROM ilo_so_mappings ism WHERE ism.ilo_id = $2 AND ism.so_id = $${assessmentFilterParams.indexOf(soId) + 1} AND (ism.assessment_tasks IS NULL OR array_length(ism.assessment_tasks, 1) IS NULL OR ism.assessment_tasks @> ARRAY[acf.assessment_code]))` : 'FALSE'}
              ${sdgId ? `OR EXISTS (SELECT 1 FROM ilo_sdg_mappings isdg WHERE isdg.ilo_id = $2 AND isdg.sdg_id = $${assessmentFilterParams.indexOf(sdgId) + 1} AND (isdg.assessment_tasks IS NULL OR array_length(isdg.assessment_tasks, 1) IS NULL OR isdg.assessment_tasks @> ARRAY[acf.assessment_code]))` : ''}
              ${igaId ? `OR EXISTS (SELECT 1 FROM ilo_iga_mappings iiga WHERE iiga.ilo_id = $2 AND iiga.iga_id = $${assessmentFilterParams.indexOf(igaId) + 1} AND (iiga.assessment_tasks IS NULL OR array_length(iiga.assessment_tasks, 1) IS NULL OR iiga.assessment_tasks @> ARRAY[acf.assessment_code]))` : ''}
              ${cdioId ? `OR EXISTS (SELECT 1 FROM ilo_cdio_mappings icdio WHERE icdio.ilo_id = $2 AND icdio.cdio_id = $${assessmentFilterParams.indexOf(cdioId) + 1} AND (icdio.assessment_tasks IS NULL OR array_length(icdio.assessment_tasks, 1) IS NULL OR icdio.assessment_tasks @> ARRAY[acf.assessment_code]))` : ''}
            )
        )` : ''}
    )
    SELECT DISTINCT
      a.assessment_id,
      a.title AS assessment_title,
      a.total_points AS max_score,
      a.weight_percentage,
      COALESCE(aic.ilo_weight_percentage, a.weight_percentage, 0) AS ilo_weight_percentage
    FROM assessments a
    INNER JOIN assessment_ilo_connections aic ON a.assessment_id = aic.assessment_id
    INNER JOIN ilos i ON aic.ilo_id = i.ilo_id
    INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
    WHERE a.section_course_id = $1
      AND aic.ilo_id = $2
      AND a.weight_percentage IS NOT NULL
      AND a.weight_percentage > 0
      AND sy.section_course_id = $1
      AND i.is_active = TRUE
    ORDER BY a.assessment_id
  `;
  
  // Step 3: Get student assessment scores for connected assessments (with filters applied)
  const studentScoresQuery = `
    SELECT
      ce.student_id,
      ce.enrollment_id,
      s.student_number,
      s.full_name,
      a.assessment_id,
      a.title AS assessment_title,
      a.total_points AS max_score,
      a.weight_percentage,
      COALESCE(aic.ilo_weight_percentage, a.weight_percentage, 0) AS ilo_weight_percentage,
      COALESCE(sub.total_score, sub.adjusted_score, 0) AS raw_score,
      sub.adjusted_score,
      sub.total_score,
      sub.transmuted_score,
      -- Calculate transmuted score
      CASE 
        WHEN sub.transmuted_score IS NOT NULL THEN sub.transmuted_score
        WHEN sub.adjusted_score IS NOT NULL AND a.total_points > 0 AND a.weight_percentage IS NOT NULL
        THEN ((sub.adjusted_score / a.total_points) * 62.5 + 37.5) * (a.weight_percentage / 100)
        WHEN sub.total_score IS NOT NULL AND a.total_points > 0 AND a.weight_percentage IS NOT NULL
        THEN ((sub.total_score / a.total_points) * 62.5 + 37.5) * (a.weight_percentage / 100)
        ELSE NULL
      END AS transmuted_score_calc,
      -- Calculate assessment percentage
      CASE 
        WHEN sub.transmuted_score IS NOT NULL AND a.total_points > 0 AND a.weight_percentage > 0 THEN
          ((sub.transmuted_score / (a.weight_percentage / 100.0) - 37.5) / 62.5) * 100
        WHEN sub.adjusted_score IS NOT NULL AND a.total_points > 0 THEN
          (sub.adjusted_score / a.total_points) * 100
        WHEN sub.total_score IS NOT NULL AND a.total_points > 0 THEN
          (sub.total_score / a.total_points) * 100
        ELSE NULL
      END AS assessment_percentage
    FROM course_enrollments ce
    INNER JOIN students s ON ce.student_id = s.student_id
    INNER JOIN assessments a ON ce.section_course_id = a.section_course_id
    INNER JOIN (
      -- Use the same assessment connection logic as connectedAssessmentsQuery
      WITH ilo_syllabus AS (
        SELECT DISTINCT syllabus_id
        FROM ilos
        WHERE ilo_id = $2 AND is_active = TRUE
      ),
      assessment_codes_for_filter AS (
        SELECT DISTINCT
          a_code.assessment_id,
          COALESCE(
            (SELECT (task->>'code')::text
             FROM jsonb_array_elements(sy_code.assessment_framework->'components') AS component
             CROSS JOIN LATERAL jsonb_array_elements(component->'sub_assessments') AS task
             WHERE (task->>'title')::text ILIKE '%' || a_code.title || '%'
                OR (task->>'name')::text ILIKE '%' || a_code.title || '%'
             LIMIT 1),
            (a_code.content_data->>'code')::text,
            (a_code.content_data->>'abbreviation')::text,
            CASE 
              WHEN a_code.title ~* '[A-Z]{2,4}\s*\d+' 
              THEN UPPER(REGEXP_REPLACE(SUBSTRING(a_code.title FROM '([A-Z]{2,4}\s*\d+)'), '\s+', '', 'g'))
              ELSE NULL
            END,
            NULL
          ) AS assessment_code
        FROM assessments a_code
        INNER JOIN syllabi sy_code ON a_code.syllabus_id = sy_code.syllabus_id
        WHERE a_code.section_course_id = $1
          AND sy_code.approval_status = 'approved'
      ),
      assessment_ilo_connections AS (
        SELECT DISTINCT
          a2.assessment_id,
          -- Connect all assessments from the same syllabus to the target ILO ($2)
          COALESCE(
            CASE WHEN aiw.ilo_id = $2 THEN aiw.ilo_id ELSE NULL END,
            CASE WHEN r.ilo_id = $2 THEN r.ilo_id ELSE NULL END,
            CASE WHEN im.ilo_id = $2 THEN im.ilo_id ELSE NULL END,
            $2  -- Default: connect to target ILO since they're in the same syllabus
          ) AS ilo_id,
          COALESCE(
            CASE WHEN aiw.ilo_id = $2 THEN aiw.weight_percentage ELSE NULL END,
            a2.weight_percentage,
            0
          ) AS ilo_weight_percentage
        FROM assessments a2
        INNER JOIN syllabi sy2 ON a2.syllabus_id = sy2.syllabus_id
        INNER JOIN ilo_syllabus ils ON sy2.syllabus_id = ils.syllabus_id
        LEFT JOIN assessment_ilo_weights aiw ON a2.assessment_id = aiw.assessment_id AND aiw.ilo_id = $2
        LEFT JOIN (
          SELECT DISTINCT r.assessment_id, r.ilo_id
          FROM rubrics r
          INNER JOIN assessments a3 ON r.assessment_id = a3.assessment_id
          INNER JOIN syllabi sy3 ON a3.syllabus_id = sy3.syllabus_id
          WHERE a3.section_course_id = $1 AND r.ilo_id = $2 AND sy3.approval_status = 'approved'
        ) r ON a2.assessment_id = r.assessment_id
        LEFT JOIN (
          SELECT DISTINCT
            ac.assessment_id,
            COALESCE(ism.ilo_id, isdg.ilo_id, iiga.ilo_id, icdio.ilo_id) AS ilo_id
          FROM assessment_codes_for_filter ac
          LEFT JOIN ilo_so_mappings ism ON ism.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL AND ism.ilo_id = $2
          LEFT JOIN ilo_sdg_mappings isdg ON isdg.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL AND isdg.ilo_id = $2
          LEFT JOIN ilo_iga_mappings iiga ON iiga.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL AND iiga.ilo_id = $2
          LEFT JOIN ilo_cdio_mappings icdio ON icdio.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL AND icdio.ilo_id = $2
          WHERE ac.assessment_code IS NOT NULL
            AND (ism.ilo_id = $2 OR isdg.ilo_id = $2 OR iiga.ilo_id = $2 OR icdio.ilo_id = $2)
        ) im ON a2.assessment_id = im.assessment_id
        WHERE a2.section_course_id = $1
          AND sy2.section_course_id = $1
          AND a2.weight_percentage IS NOT NULL
          AND a2.weight_percentage > 0
          -- Apply filters: only include assessments that match selected mappings
          ${hasFilters ? `AND EXISTS (
            SELECT 1 FROM assessment_codes_for_filter acf
            WHERE acf.assessment_id = a2.assessment_id
              AND (
                ${soId ? `EXISTS (SELECT 1 FROM ilo_so_mappings ism WHERE ism.ilo_id = $2 AND ism.so_id = $${assessmentFilterParams.indexOf(soId) + 1} AND (ism.assessment_tasks IS NULL OR array_length(ism.assessment_tasks, 1) IS NULL OR ism.assessment_tasks @> ARRAY[acf.assessment_code]))` : 'FALSE'}
                ${sdgId ? `OR EXISTS (SELECT 1 FROM ilo_sdg_mappings isdg WHERE isdg.ilo_id = $2 AND isdg.sdg_id = $${assessmentFilterParams.indexOf(sdgId) + 1} AND (isdg.assessment_tasks IS NULL OR array_length(isdg.assessment_tasks, 1) IS NULL OR isdg.assessment_tasks @> ARRAY[acf.assessment_code]))` : ''}
                ${igaId ? `OR EXISTS (SELECT 1 FROM ilo_iga_mappings iiga WHERE iiga.ilo_id = $2 AND iiga.iga_id = $${assessmentFilterParams.indexOf(igaId) + 1} AND (iiga.assessment_tasks IS NULL OR array_length(iiga.assessment_tasks, 1) IS NULL OR iiga.assessment_tasks @> ARRAY[acf.assessment_code]))` : ''}
                ${cdioId ? `OR EXISTS (SELECT 1 FROM ilo_cdio_mappings icdio WHERE icdio.ilo_id = $2 AND icdio.cdio_id = $${assessmentFilterParams.indexOf(cdioId) + 1} AND (icdio.assessment_tasks IS NULL OR array_length(icdio.assessment_tasks, 1) IS NULL OR icdio.assessment_tasks @> ARRAY[acf.assessment_code]))` : ''}
              )
          )` : ''}
      )
      SELECT DISTINCT
        aic.assessment_id,
        aic.ilo_id,
        aic.ilo_weight_percentage
      FROM assessment_ilo_connections aic
      WHERE aic.ilo_id = $2
    ) aic ON a.assessment_id = aic.assessment_id
    INNER JOIN ilos i ON aic.ilo_id = i.ilo_id
    INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
    LEFT JOIN submissions sub ON (
      ce.enrollment_id = sub.enrollment_id 
      AND sub.assessment_id = a.assessment_id
      AND (sub.transmuted_score IS NOT NULL OR sub.adjusted_score IS NOT NULL OR sub.total_score IS NOT NULL)
    )
      WHERE ce.section_course_id = $1
      AND ce.status = 'enrolled'
      AND a.weight_percentage IS NOT NULL
      AND a.weight_percentage > 0
      AND sy.section_course_id = $1
      AND sy.approval_status = 'approved'
      AND i.is_active = TRUE
  `;
  
  // Execute all queries
  // Debug: Log before executing queries
  console.log(`[ATTAINMENT DEBUG] Executing parallel queries for ILO ${iloId}:`);
  console.log(`[ATTAINMENT DEBUG] - enrolledResult query`);
  console.log(`[ATTAINMENT DEBUG] - connectedAssessmentsQuery`);
  console.log(`[ATTAINMENT DEBUG] - studentScoresQuery`);
  
  const [enrolledResult, connectedAssessmentsResult, scoresResult] = await Promise.all([
    db.query(allEnrolledStudentsQuery, [sectionCourseId]),
    db.query(connectedAssessmentsQuery, assessmentFilterParams),
    db.query(studentScoresQuery, assessmentFilterParams)
  ]);
  
  console.log(`[ATTAINMENT DEBUG] ✅ All parallel queries completed:`);
  console.log(`[ATTAINMENT DEBUG] - enrolledResult: ${enrolledResult.rows.length} students`);
  console.log(`[ATTAINMENT DEBUG] - connectedAssessmentsResult: ${connectedAssessmentsResult.rows.length} assessments`);
  console.log(`[ATTAINMENT DEBUG] - scoresResult: ${scoresResult.rows.length} score records`);
  
  if (connectedAssessmentsResult.rows.length > 0) {
    console.log(`[ATTAINMENT DEBUG] Sample connected assessment:`, {
      id: connectedAssessmentsResult.rows[0].assessment_id,
      title: connectedAssessmentsResult.rows[0].assessment_title,
      max_score: connectedAssessmentsResult.rows[0].max_score,
      weight_percentage: connectedAssessmentsResult.rows[0].weight_percentage
    });
  } else {
    console.log(`[ATTAINMENT DEBUG] ⚠️ No connected assessments found! This is likely why assessments aren't showing.`);
  }
  
  // Debug: Check if student scores are being found
  if (scoresResult.rows.length > 0) {
    const uniqueStudents = new Set(scoresResult.rows.map(r => r.student_id));
    const uniqueAssessments = new Set(scoresResult.rows.map(r => r.assessment_id));
    console.log(`[ATTAINMENT DEBUG] Student scores found: ${scoresResult.rows.length} records for ${uniqueStudents.size} students across ${uniqueAssessments.size} assessments`);
    console.log(`[ATTAINMENT DEBUG] Sample score record:`, {
      student_id: scoresResult.rows[0].student_id,
      assessment_id: scoresResult.rows[0].assessment_id,
      raw_score: scoresResult.rows[0].raw_score,
      transmuted_score_calc: scoresResult.rows[0].transmuted_score_calc,
      assessment_percentage: scoresResult.rows[0].assessment_percentage
    });
  } else {
    console.log(`[ATTAINMENT DEBUG] ⚠️ No student score records found! This is why students show 0.00 scores.`);
  }
  
  // Step 4: Process results in JavaScript (simpler and more accurate)
  const assessmentMap = new Map();
  connectedAssessmentsResult.rows.forEach(ass => {
    assessmentMap.set(ass.assessment_id, ass);
  });
  
  // Group scores by student
  const studentScoresMap = new Map();
  scoresResult.rows.forEach(row => {
    if (!studentScoresMap.has(row.student_id)) {
      studentScoresMap.set(row.student_id, {
        student_id: row.student_id,
        enrollment_id: row.enrollment_id,
        student_number: row.student_number,
        full_name: row.full_name,
        assessment_scores: []
      });
    }
    const student = studentScoresMap.get(row.student_id);
    if (row.raw_score > 0 || row.assessment_percentage !== null) {
      student.assessment_scores.push({
        assessment_id: row.assessment_id,
        assessment_title: row.assessment_title,
        raw_score: parseFloat(row.raw_score || 0),
        max_score: parseFloat(row.max_score || 0),
        score_percentage: parseFloat(row.assessment_percentage || 0),
        transmuted_score: parseFloat(row.transmuted_score_calc || 0),
        weight_percentage: parseFloat(row.weight_percentage || 0),
        ilo_weight_percentage: parseFloat(row.ilo_weight_percentage || 0)
      });
    }
  });
  
  // Calculate overall scores for each student
  const allStudentRows = enrolledResult.rows.map(enrolled => {
    const studentData = studentScoresMap.get(enrolled.student_id);
    
    if (!studentData || studentData.assessment_scores.length === 0) {
      return {
        student_id: enrolled.student_id,
        enrollment_id: enrolled.enrollment_id,
        student_number: enrolled.student_number,
        full_name: enrolled.full_name,
        ilo_score: 0,
        overall_attainment_rate: 0,
        assessments_count: 0,
        total_ilo_weight: 0,
        assessment_scores: []
      };
    }
    
    // Calculate: Overall % = (All Scores Combined) / (All Max Scores Combined) × 100
    const totalScore = studentData.assessment_scores.reduce((sum, ass) => sum + ass.raw_score, 0);
    const totalMax = studentData.assessment_scores.reduce((sum, ass) => sum + ass.max_score, 0);
    const overallRate = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
    
    // Calculate ILO score (sum of transmuted scores)
    const iloScore = studentData.assessment_scores.reduce((sum, ass) => sum + ass.transmuted_score, 0);
    
    // Total ILO weight
    const totalIloWeight = studentData.assessment_scores.reduce((sum, ass) => sum + ass.ilo_weight_percentage, 0);
    
    return {
      student_id: studentData.student_id,
      enrollment_id: studentData.enrollment_id,
      student_number: studentData.student_number,
      full_name: studentData.full_name,
      ilo_score: Math.round(iloScore * 100) / 100,
      overall_attainment_rate: Math.round(overallRate * 100) / 100,
      assessments_count: studentData.assessment_scores.length,
      total_ilo_weight: Math.round(totalIloWeight * 100) / 100,
      assessment_scores: studentData.assessment_scores
    };
  });
  
  // Process students and categorize by percentage ranges using overall attainment rate
  const allStudents = allStudentRows.map(row => {
    const overallRate = parseFloat(row.overall_attainment_rate || 0);
    const score = parseFloat(row.ilo_score || 0);
    const attained = overallRate >= passThreshold;
    let performanceLevel = 'low';
    let percentageRange = '0-49';
    
    // Determine percentage range based on overall attainment rate
    if (overallRate >= 90) {
      percentageRange = '90-100';
      performanceLevel = 'high';
    } else if (overallRate >= 80) {
      percentageRange = '80-89';
      performanceLevel = 'high';
    } else if (overallRate >= 70) {
      percentageRange = '70-79';
      performanceLevel = 'medium';
    } else if (overallRate >= 60) {
      percentageRange = '60-69';
      performanceLevel = 'medium';
    } else if (overallRate >= 50) {
      percentageRange = '50-59';
      performanceLevel = 'low';
    } else {
      percentageRange = '0-49';
      performanceLevel = 'low';
    }
    
    return {
      student_id: row.student_id,
      enrollment_id: row.enrollment_id,
      student_number: row.student_number,
      full_name: row.full_name,
      ilo_score: Math.round(score * 100) / 100,
      overall_attainment_rate: Math.round(overallRate * 100) / 100,
      assessments_count: parseInt(row.assessments_count || 0),
      total_ilo_weight: parseFloat(row.total_ilo_weight || 0),
      attainment_status: attained ? 'attained' : 'not_attained',
      performance_level: performanceLevel,
      percentage_range: percentageRange,
      assessment_scores: row.assessment_scores || [] // Individual assessment scores
    };
  });
  
  // Filter by performance level first
  let filteredStudents = allStudents;
  if (performanceFilter === 'high') {
    filteredStudents = allStudents.filter(s => s.performance_level === 'high');
  } else if (performanceFilter === 'low') {
    filteredStudents = allStudents.filter(s => s.performance_level === 'low');
  }
  
  // Group filtered students by percentage range
  const studentsByRange = {
    '90-100': [],
    '80-89': [],
    '70-79': [],
    '60-69': [],
    '50-59': [],
    '0-49': []
  };
  
  filteredStudents.forEach(student => {
    if (studentsByRange[student.percentage_range]) {
      studentsByRange[student.percentage_range].push(student);
    }
  });
  
  // Calculate counts per range (from filtered students)
  const rangeCounts = Object.entries(studentsByRange).map(([range, students]) => ({
    range,
    count: students.length,
    students: students
  })).filter(item => item.count > 0);
  
  // Also group all students (for range distribution stats)
  const allStudentsByRange = {
    '90-100': [],
    '80-89': [],
    '70-79': [],
    '60-69': [],
    '50-59': [],
    '0-49': []
  };
  
  allStudents.forEach(student => {
    if (allStudentsByRange[student.percentage_range]) {
      allStudentsByRange[student.percentage_range].push(student);
    }
  });
  
  const highPerformanceStudents = allStudents.filter(s => s.performance_level === 'high');
  const lowPerformanceStudents = allStudents.filter(s => s.performance_level === 'low');
  
  // Format mapped_to array
  const mappedTo = [];
  if (iloInfo.so_codes && iloInfo.so_codes.length > 0) {
    mappedTo.push(...iloInfo.so_codes.map(code => ({ type: 'SO', code })));
  }
  if (iloInfo.cdio_codes && iloInfo.cdio_codes.length > 0) {
    mappedTo.push(...iloInfo.cdio_codes.map(code => ({ type: 'CDIO', code })));
  }
  if (iloInfo.sdg_codes && iloInfo.sdg_codes.length > 0) {
    mappedTo.push(...iloInfo.sdg_codes.map(code => ({ type: 'SDG', code })));
  }
  if (iloInfo.iga_codes && iloInfo.iga_codes.length > 0) {
    mappedTo.push(...iloInfo.iga_codes.map(code => ({ type: 'IGA', code })));
  }
  
  return {
    ilo_id: iloInfo.ilo_id,
    ilo_code: iloInfo.ilo_code,
    description: iloInfo.ilo_description,
    section_course_id: sectionCourse.section_course_id,
    course_title: sectionCourse.course_title,
    course_code: sectionCourse.course_code,
    section_code: sectionCourse.section_code,
    mapped_to: mappedTo,
    total_students: allStudents.length,
    attained_count: allStudents.filter(s => s.attainment_status === 'attained').length,
    assessments: assessments,
    assessment_count: assessments.length,
    students: filteredStudents,
    high_performance_students: highPerformanceStudents,
    low_performance_students: lowPerformanceStudents,
    students_by_range: rangeCounts,
    range_distribution: {
      '90-100': allStudentsByRange['90-100'].length,
      '80-89': allStudentsByRange['80-89'].length,
      '70-79': allStudentsByRange['70-79'].length,
      '60-69': allStudentsByRange['60-69'].length,
      '50-59': allStudentsByRange['50-59'].length,
      '0-49': allStudentsByRange['0-49'].length
    }
  };
}

export default {
  calculateILOAttainment
};

