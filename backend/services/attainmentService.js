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
          WHERE a3.section_course_id = $1
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
        WHERE a2.section_course_id = $1
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
    LEFT JOIN ilo_so_mappings ism ON i.ilo_id = ism.ilo_id
    LEFT JOIN student_outcomes so ON ism.so_id = so.so_id
    LEFT JOIN ilo_cdio_mappings icdio ON i.ilo_id = icdio.ilo_id
    LEFT JOIN cdio_skills cdio ON icdio.cdio_id = cdio.cdio_id
    LEFT JOIN ilo_sdg_mappings isdg ON i.ilo_id = isdg.ilo_id
    LEFT JOIN sdg_skills sdg ON isdg.sdg_id = sdg.sdg_id
    LEFT JOIN ilo_iga_mappings iiga ON i.ilo_id = iiga.ilo_id
    LEFT JOIN institutional_graduate_attributes iga ON iiga.iga_id = iga.iga_id
    WHERE i.ilo_id = $1 AND i.is_active = TRUE
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
  const assessmentFilterParams = [sectionCourseId, iloId];
  let assessmentFilterConditions = '';
  
  if (soId) {
    assessmentFilterConditions += ' AND EXISTS (SELECT 1 FROM ilo_so_mappings ism WHERE ism.ilo_id = i.ilo_id AND ism.so_id = $' + assessmentFilterParams.length + ')';
    assessmentFilterParams.push(soId);
  }
  if (sdgId) {
    assessmentFilterConditions += ' AND EXISTS (SELECT 1 FROM ilo_sdg_mappings isdg WHERE isdg.ilo_id = i.ilo_id AND isdg.sdg_id = $' + assessmentFilterParams.length + ')';
    assessmentFilterParams.push(sdgId);
  }
  if (igaId) {
    assessmentFilterConditions += ' AND EXISTS (SELECT 1 FROM ilo_iga_mappings iiga WHERE iiga.ilo_id = i.ilo_id AND iiga.iga_id = $' + assessmentFilterParams.length + ')';
    assessmentFilterParams.push(igaId);
  }
  if (cdioId) {
    assessmentFilterConditions += ' AND EXISTS (SELECT 1 FROM ilo_cdio_mappings icdio WHERE icdio.ilo_id = i.ilo_id AND icdio.cdio_id = $' + assessmentFilterParams.length + ')';
    assessmentFilterParams.push(cdioId);
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
      ${assessmentFilterConditions}
    GROUP BY ast.assessment_id, ast.assessment_title, ast.assessment_type, ast.total_points, ast.weight_percentage, ast.due_date, ast.ilo_weight_percentage, ast.total_students, ast.submissions_count, ast.average_score, ast.total_score
    ORDER BY ast.due_date ASC, ast.assessment_title ASC
  `;
  
  const assessmentsResult = await db.query(assessmentsQuery, assessmentFilterParams);
  
  console.log(`[ATTAINMENT SERVICE] Found ${assessmentsResult.rows.length} assessments for ILO ${iloId} in section_course ${sectionCourseId}`);
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
  // Reuse the same filter params and conditions from above
  // Step 2: Get assessments connected to this ILO (simpler standalone query)
  const connectedAssessmentsQuery = `
    WITH assessment_ilo_connections AS (
      SELECT DISTINCT
        a.assessment_id,
        COALESCE(aiw.ilo_id, r.ilo_id, im.ilo_id) AS ilo_id,
        COALESCE(aiw.weight_percentage, a.weight_percentage, 0) AS ilo_weight_percentage
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
      ${assessmentFilterConditions}
    ORDER BY a.assessment_id
  `;
  
  // Step 3: Get student assessment scores for connected assessments
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
      SELECT DISTINCT
        a2.assessment_id,
        COALESCE(aiw.ilo_id, r.ilo_id, im.ilo_id) AS ilo_id,
        COALESCE(aiw.weight_percentage, a2.weight_percentage, 0) AS ilo_weight_percentage
      FROM assessments a2
      LEFT JOIN assessment_ilo_weights aiw ON a2.assessment_id = aiw.assessment_id
      LEFT JOIN (
        SELECT DISTINCT r.assessment_id, r.ilo_id
        FROM rubrics r
        INNER JOIN assessments a3 ON r.assessment_id = a3.assessment_id
        WHERE a3.section_course_id = $1
      ) r ON a2.assessment_id = r.assessment_id
      LEFT JOIN (
        WITH assessment_codes AS (
          SELECT DISTINCT
            a4.assessment_id,
            COALESCE(
              (SELECT (task->>'code')::text
               FROM jsonb_array_elements(sy.assessment_framework->'components') AS component
               CROSS JOIN LATERAL jsonb_array_elements(component->'sub_assessments') AS task
               WHERE (task->>'title')::text ILIKE '%' || a4.title || '%'
                  OR (task->>'name')::text ILIKE '%' || a4.title || '%'
               LIMIT 1),
              (a4.content_data->>'code')::text,
              (a4.content_data->>'abbreviation')::text,
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
      WHERE a2.section_course_id = $1
        AND (aiw.ilo_id IS NOT NULL OR r.ilo_id IS NOT NULL OR im.ilo_id IS NOT NULL)
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
      AND aic.ilo_id = $2
      AND a.weight_percentage IS NOT NULL
      AND a.weight_percentage > 0
      AND sy.section_course_id = $1
      AND i.is_active = TRUE
      ${assessmentFilterConditions}
  `;
  
  // Execute all queries
  const [enrolledResult, connectedAssessmentsResult, scoresResult] = await Promise.all([
    db.query(allEnrolledStudentsQuery, [sectionCourseId]),
    db.query(connectedAssessmentsQuery, assessmentFilterParams),
    db.query(studentScoresQuery, assessmentFilterParams)
  ]);
  
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

