import db from '../config/database.js';

/**
 * Calculate ILO attainment for a specific section course
 * @param {number} sectionCourseId - The section course ID
 * @param {number} passThreshold - Threshold for "attained" status (default: 75)
 * @param {number|null} iloId - Optional ILO ID to filter by
 * @param {string} performanceFilter - "high" | "low" | "all" (default: "all")
 * @param {number} highThreshold - Threshold for "high" performance (default: 80)
 * @param {number} lowThreshold - Threshold for "low" performance (default: 75)
 * @param {number|null} syllabusId - Optional syllabus ID to filter by (default: null, uses active term's syllabus)
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
  cdioId = null,
  syllabusId = null
) {
  try {
    // Get active term
    const activeTermQuery = `
      SELECT term_id
      FROM school_terms
      WHERE is_active = TRUE
      ORDER BY term_id DESC
      LIMIT 1
    `;
    const activeTermResult = await db.query(activeTermQuery);
    const activeTermId = activeTermResult.rows.length > 0 ? activeTermResult.rows[0].term_id : null;

    // Get section course and course info
    const sectionCourseQuery = `
      SELECT 
        sc.section_course_id,
        sc.section_id,
        sc.course_id,
        sc.term_id,
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
    
    // If no syllabus_id provided, get the syllabus for this section course in the active term
    let finalSyllabusId = syllabusId;
    let syllabusInfo = null;
    if (!finalSyllabusId) {
      const syllabusQuery = `
        SELECT 
          syllabus_id,
          section_course_id,
          review_status,
          approval_status,
          created_at
        FROM syllabi
        WHERE section_course_id = $1
          AND review_status = 'approved'
          AND approval_status = 'approved'
        ORDER BY syllabus_id DESC
        LIMIT 1
      `;
      const syllabusResult = await db.query(syllabusQuery, [sectionCourseId]);
      if (syllabusResult.rows.length > 0) {
        finalSyllabusId = syllabusResult.rows[0].syllabus_id;
        syllabusInfo = syllabusResult.rows[0];
      }
    } else {
      // Get syllabus info for debugging
      const syllabusInfoQuery = `
        SELECT 
          syllabus_id,
          section_course_id,
          review_status,
          approval_status,
          created_at
        FROM syllabi
        WHERE syllabus_id = $1
      `;
      const syllabusInfoResult = await db.query(syllabusInfoQuery, [finalSyllabusId]);
      if (syllabusInfoResult.rows.length > 0) {
        syllabusInfo = syllabusInfoResult.rows[0];
      }
    }

    // Debug: Get all ILOs from the selected class's approved syllabus (parameterized)
    const debugILOsParams = [sectionCourseId];
    let debugILOsSyllabusCondition = '';
    if (finalSyllabusId) {
      debugILOsParams.push(finalSyllabusId);
      debugILOsSyllabusCondition = `AND sy.syllabus_id = $2`;
    }
    const debugILOsQuery = `
      SELECT 
        i.ilo_id,
        i.code AS ilo_code,
        i.description,
        i.is_active,
        i.syllabus_id,
        sy.section_course_id,
        sy.review_status,
        sy.approval_status
      FROM ilos i
      INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
      WHERE sy.section_course_id = $1
        AND sy.review_status = 'approved'
        AND sy.approval_status = 'approved'
        ${debugILOsSyllabusCondition}
      ORDER BY i.code
    `;
    const debugILOsResult = await db.query(debugILOsQuery, debugILOsParams);
    
    console.log(`[ATTAINMENT DEBUG] Section Course ID: ${sectionCourseId}`);
    console.log(`[ATTAINMENT DEBUG] Active Term ID: ${activeTermId || 'N/A'}`);
    console.log(`[ATTAINMENT DEBUG] Syllabus ID: ${finalSyllabusId || 'N/A'}`);
    if (syllabusInfo) {
      console.log(`[ATTAINMENT DEBUG] Syllabus Info:`, {
        syllabus_id: syllabusInfo.syllabus_id,
        section_course_id: syllabusInfo.section_course_id,
        review_status: syllabusInfo.review_status,
        approval_status: syllabusInfo.approval_status
      });
    }
    console.log(`[ATTAINMENT DEBUG] Found ${debugILOsResult.rows.length} ILOs in approved syllabus:`);
    debugILOsResult.rows.forEach((ilo, idx) => {
      console.log(`  ${idx + 1}. ILO ID: ${ilo.ilo_id}, Code: ${ilo.ilo_code}, Active: ${ilo.is_active}, Syllabus ID: ${ilo.syllabus_id}`);
    });
    
    // If ILO ID is provided, verify it exists in the approved syllabus
    if (iloId) {
      const iloExists = debugILOsResult.rows.find(ilo => ilo.ilo_id === iloId);
      if (!iloExists) {
        console.error(`[ATTAINMENT DEBUG] ILO ${iloId} not found in approved syllabus for section_course_id ${sectionCourseId}`);
        console.error(`[ATTAINMENT DEBUG] Available ILO IDs: ${debugILOsResult.rows.map(r => r.ilo_id).join(', ') || 'NONE'}`);
      }
    }
    
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
        cdioId,
        activeTermId,
        finalSyllabusId
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
        cdioId,
        activeTermId,
        finalSyllabusId
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
  cdioId = null,
  activeTermId = null,
  syllabusId = null
) {
  // DEBUG: Verify ILOs for this section_course_id before running main query
  const debugQuery = `
    SELECT 
      i.ilo_id,
      i.code AS ilo_code,
      i.syllabus_id,
      sy.section_course_id,
      sy.review_status,
      sy.approval_status
    FROM ilos i
    INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
    WHERE sy.section_course_id = $1
      AND sy.review_status = 'approved'
      AND sy.approval_status = 'approved'
      AND i.is_active = TRUE
    ORDER BY i.code
  `;
  const debugResult = await db.query(debugQuery, [sectionCourseId]);
  console.log(`\n[ATTAINMENT SUMMARY DEBUG] ==========================================`);
  console.log(`[ATTAINMENT SUMMARY DEBUG] Section Course ID: ${sectionCourseId}`);
  console.log(`[ATTAINMENT SUMMARY DEBUG] Active Term ID: ${activeTermId || 'N/A'}`);
  console.log(`[ATTAINMENT SUMMARY DEBUG] Syllabus ID: ${syllabusId || 'AUTO'}`);
  console.log(`[ATTAINMENT SUMMARY DEBUG] Expected ILOs for this section_course_id: ${debugResult.rows.length}`);
  debugResult.rows.forEach((ilo, idx) => {
    console.log(`  ${idx + 1}. ILO ID: ${ilo.ilo_id}, Code: ${ilo.ilo_code}, Syllabus ID: ${ilo.syllabus_id}`);
  });
  console.log(`[ATTAINMENT SUMMARY DEBUG] ==========================================\n`);

  // Build parameterized query with dynamic parameters
  const queryParams = [sectionCourseId, passThreshold, highThreshold, lowThreshold];
  let paramIndex = 5; // Start after the first 4 parameters
  
  // Build WHERE conditions with parameterized placeholders
  let termCondition = '';
  if (activeTermId) {
    queryParams.push(activeTermId);
    termCondition = `AND sc.term_id = $${paramIndex}`;
    paramIndex++;
  }
  
  let syllabusCondition = '';
  let syllabusCondition2 = '';
  let syllabusCondition3 = '';
  let syllabusCondition4 = '';
  let syllabusCondition5 = '';
  if (syllabusId) {
    queryParams.push(syllabusId);
    syllabusCondition = `AND sy.syllabus_id = $${paramIndex}`;
    syllabusCondition2 = `AND sy2.syllabus_id = $${paramIndex}`;
    syllabusCondition3 = `AND sy3.syllabus_id = $${paramIndex}`;
    syllabusCondition4 = `AND sy4.syllabus_id = $${paramIndex}`;
    syllabusCondition5 = `AND sy5.syllabus_id = $${paramIndex}`;
    paramIndex++;
  }
  
  // Add filter parameters
  let soCondition = '';
  let sdgCondition = '';
  let igaCondition = '';
  let cdioCondition = '';
  if (soId) {
    queryParams.push(soId);
    soCondition = `AND EXISTS (SELECT 1 FROM ilo_so_mappings ism WHERE ism.ilo_id = i.ilo_id AND ism.so_id = $${paramIndex})`;
    paramIndex++;
  }
  if (sdgId) {
    queryParams.push(sdgId);
    sdgCondition = `AND EXISTS (SELECT 1 FROM ilo_sdg_mappings isdg WHERE isdg.ilo_id = i.ilo_id AND isdg.sdg_id = $${paramIndex})`;
    paramIndex++;
  }
  if (igaId) {
    queryParams.push(igaId);
    igaCondition = `AND EXISTS (SELECT 1 FROM ilo_iga_mappings iiga WHERE iiga.ilo_id = i.ilo_id AND iiga.iga_id = $${paramIndex})`;
    paramIndex++;
  }
  if (cdioId) {
    queryParams.push(cdioId);
    cdioCondition = `AND EXISTS (SELECT 1 FROM ilo_cdio_mappings icdio WHERE icdio.ilo_id = i.ilo_id AND icdio.cdio_id = $${paramIndex})`;
    paramIndex++;
  }

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
      INNER JOIN section_courses sc ON ce.section_course_id = sc.section_course_id
      INNER JOIN assessments a ON ce.section_course_id = a.section_course_id
      INNER JOIN (
        -- Dynamically extract assessment codes and match to ILO mappings
        SELECT DISTINCT
          a2.assessment_id,
          COALESCE(aiw2.ilo_id, r.ilo_id, im.ilo_id) AS ilo_id
        FROM assessments a2
        INNER JOIN section_courses sc2 ON a2.section_course_id = sc2.section_course_id
        LEFT JOIN assessment_ilo_weights aiw2 ON a2.assessment_id = aiw2.assessment_id
        LEFT JOIN (
          SELECT DISTINCT r.assessment_id, r.ilo_id
        FROM rubrics r
        INNER JOIN assessments a3 ON r.assessment_id = a3.assessment_id
        INNER JOIN syllabi sy3 ON a3.syllabus_id = sy3.syllabus_id
          WHERE a3.section_course_id = $1
            AND sy3.section_course_id = $1
            AND sy3.review_status = 'approved'
            AND sy3.approval_status = 'approved'
            ${syllabusCondition3}
        ) r ON a2.assessment_id = r.assessment_id
        LEFT JOIN (
          WITH assessment_codes AS (
            SELECT DISTINCT
              a4.assessment_id,
              COALESCE(
                -- Try to get code from syllabus assessment_framework JSON
                (
                  SELECT (task->>'code')::text
                  FROM jsonb_array_elements(sy4.assessment_framework->'components') AS component
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
            INNER JOIN syllabi sy4 ON a4.syllabus_id = sy4.syllabus_id
            WHERE a4.section_course_id = $1
              AND sy4.section_course_id = $1
              AND sy4.review_status = 'approved'
              AND sy4.approval_status = 'approved'
              ${syllabusCondition4}
          )
          SELECT DISTINCT
            ac.assessment_id,
            COALESCE(ism.ilo_id, isdg.ilo_id, iiga.ilo_id, icdio.ilo_id) AS ilo_id
          FROM assessment_codes ac
          INNER JOIN assessments a_ac ON ac.assessment_id = a_ac.assessment_id
          INNER JOIN syllabi sy_ac ON a_ac.syllabus_id = sy_ac.syllabus_id
          INNER JOIN ilos i_ac ON i_ac.syllabus_id = sy_ac.syllabus_id AND i_ac.is_active = TRUE
          LEFT JOIN ilo_so_mappings ism ON ism.ilo_id = i_ac.ilo_id AND ism.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL
          LEFT JOIN ilo_sdg_mappings isdg ON isdg.ilo_id = i_ac.ilo_id AND isdg.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL
          LEFT JOIN ilo_iga_mappings iiga ON iiga.ilo_id = i_ac.ilo_id AND iiga.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL
          LEFT JOIN ilo_cdio_mappings icdio ON icdio.ilo_id = i_ac.ilo_id AND icdio.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL
          WHERE ac.assessment_code IS NOT NULL
            AND sy_ac.section_course_id = $1
            AND sy_ac.review_status = 'approved'
            AND sy_ac.approval_status = 'approved'
            ${syllabusCondition4}
            AND (ism.ilo_id IS NOT NULL OR isdg.ilo_id IS NOT NULL OR iiga.ilo_id IS NOT NULL OR icdio.ilo_id IS NOT NULL)
        ) im ON a2.assessment_id = im.assessment_id
        INNER JOIN syllabi sy2 ON a2.syllabus_id = sy2.syllabus_id
        WHERE a2.section_course_id = $1
          AND sy2.section_course_id = $1
          AND sy2.review_status = 'approved'
          AND sy2.approval_status = 'approved'
          ${syllabusCondition2}
          ${termCondition.replace('sc.', 'sc2.')}
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
        AND sy.review_status = 'approved'
        AND sy.approval_status = 'approved'
        ${syllabusCondition}
        AND a.section_course_id = $1
        ${termCondition}
        ${soCondition}
        ${sdgCondition}
        ${igaCondition}
        ${cdioCondition}
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
  
  const result = await db.query(query, queryParams);
  
  // DEBUG: Verify returned ILOs match expected ILOs
  console.log(`[ATTAINMENT SUMMARY DEBUG] Query returned ${result.rows.length} ILOs`);
  result.rows.forEach((row, idx) => {
    const iloInDebug = debugResult.rows.find(d => d.ilo_id === row.ilo_id);
    if (!iloInDebug) {
      console.error(`  ⚠️  WARNING: ILO ${row.ilo_id} (${row.ilo_code}) NOT FOUND in debug query for section_course_id ${sectionCourseId}!`);
    } else {
      console.log(`  ${idx + 1}. ILO ID: ${row.ilo_id}, Code: ${row.ilo_code} ✓ Verified`);
    }
  });
  console.log(`[ATTAINMENT SUMMARY DEBUG] ==========================================\n`);
  
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
  cdioId = null,
  activeTermId = null,
  syllabusId = null
) {
  // Build parameterized query parameters
  const simpleILOParams = [iloId, sectionCourseId];
  let simpleILOParamIndex = 3;
  let syllabusCondition = '';
  
  console.log(`[ATTAINMENT DEBUG] ==========================================`);
  console.log(`[ATTAINMENT DEBUG] getILOStudentList called with:`);
  console.log(`  - sectionCourseId: ${sectionCourseId}`);
  console.log(`  - iloId: ${iloId}`);
  console.log(`  - syllabusId: ${syllabusId || 'null'}`);
  console.log(`  - activeTermId: ${activeTermId || 'null'}`);
  console.log(`  - passThreshold: ${passThreshold}`);
  console.log(`  - performanceFilter: ${performanceFilter}`);
  console.log(`[ATTAINMENT DEBUG] ==========================================`);
  
  if (syllabusId) {
    simpleILOParams.push(syllabusId);
    syllabusCondition = `AND sy.syllabus_id = $${simpleILOParamIndex}`;
    console.log(`[ATTAINMENT DEBUG] Added syllabusId to simpleILOParams: $${simpleILOParamIndex} = ${syllabusId}`);
  }
  
  // First, use a separate simpler query to get ILO from the selected class's approved syllabus
  const simpleILOQuery = `
    SELECT
      i.ilo_id,
      i.code AS ilo_code,
      i.description AS ilo_description,
      i.syllabus_id,
      sy.section_course_id,
      sy.review_status,
      sy.approval_status
    FROM ilos i
    INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
    WHERE i.ilo_id = $1
      AND i.is_active = TRUE
      AND sy.section_course_id = $2
      AND sy.review_status = 'approved'
      AND sy.approval_status = 'approved'
      ${syllabusCondition}
  `;
  
  console.log(`[ATTAINMENT DEBUG] Executing simpleILOQuery with params:`, simpleILOParams);
  console.log(`[ATTAINMENT DEBUG] Query:`, simpleILOQuery);
  
  const simpleILOResult = await db.query(simpleILOQuery, simpleILOParams);
  
  console.log(`[ATTAINMENT DEBUG] simpleILOQuery returned ${simpleILOResult.rows.length} rows`);
  if (simpleILOResult.rows.length > 0) {
    console.log(`[ATTAINMENT DEBUG] ILO found:`, simpleILOResult.rows[0]);
  }
  
  if (simpleILOResult.rows.length === 0) {
    // Debug: Try without syllabus filter to see if ILO exists elsewhere
    const debugILOQuery = `
      SELECT
        i.ilo_id,
        i.code AS ilo_code,
        i.description AS ilo_description,
        i.syllabus_id,
        sy.section_course_id,
        sy.review_status,
        sy.approval_status
      FROM ilos i
      INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
      WHERE i.ilo_id = $1
    `;
    const debugILOResult = await db.query(debugILOQuery, [iloId]);
    
    console.error(`[ATTAINMENT DEBUG] ILO ${iloId} not found in approved syllabus for section_course_id ${sectionCourseId}`);
    if (debugILOResult.rows.length > 0) {
      const iloData = debugILOResult.rows[0];
      console.error(`[ATTAINMENT DEBUG] ILO exists but:`, {
        ilo_id: iloData.ilo_id,
        ilo_code: iloData.ilo_code,
        syllabus_id: iloData.syllabus_id,
        section_course_id: iloData.section_course_id,
        review_status: iloData.review_status,
        approval_status: iloData.approval_status,
        matches_section_course: iloData.section_course_id === sectionCourseId,
        is_approved: iloData.review_status === 'approved' && iloData.approval_status === 'approved'
      });
    } else {
      console.error(`[ATTAINMENT DEBUG] ILO ${iloId} does not exist in database`);
    }
    
    throw new Error(`ILO not found in approved syllabus for this class. ILO ID: ${iloId}, Section Course ID: ${sectionCourseId}`);
  }
  
  // Now get ILO info with mappings
  const iloQueryParams = [iloId, sectionCourseId];
  let iloQueryParamIndex = 3;
  let iloQuerySyllabusCondition = '';
  if (syllabusId) {
    iloQueryParams.push(syllabusId);
    iloQuerySyllabusCondition = `AND sy.syllabus_id = $${iloQueryParamIndex}`;
  }
  
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
    WHERE i.ilo_id = $1 
      AND i.is_active = TRUE 
      AND sy.section_course_id = $2
      AND sy.review_status = 'approved' 
      AND sy.approval_status = 'approved'
      ${iloQuerySyllabusCondition}
    GROUP BY i.ilo_id, i.code, i.description
  `;
  
  const iloResult = await db.query(iloQuery, iloQueryParams);
  
  if (iloResult.rows.length === 0) {
    throw new Error(`ILO not found with mappings. ILO ID: ${iloId}, Section Course ID: ${sectionCourseId}`);
  }
  
  const iloInfo = iloResult.rows[0];
  
  // Get assessments connected to this ILO (with optional SO/SDG/IGA/CDIO filter)
  // Use separate, simpler queries for accuracy
  
  // Build filter conditions safely for assessments query
  // When filters are applied, only include assessments that match the selected mappings
  const assessmentFilterParams = [sectionCourseId, iloId];
  let hasFilters = false;
  let paramIndex = 3;
  
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
  
  // Build filter conditions array for proper OR logic
  const filterConditions = [];
  if (soId) {
    filterConditions.push(`EXISTS (SELECT 1 FROM ilo_so_mappings ism WHERE ism.ilo_id = $2 AND ism.so_id = $${assessmentFilterParams.indexOf(soId) + 1} AND (ism.assessment_tasks IS NULL OR array_length(ism.assessment_tasks, 1) IS NULL OR ism.assessment_tasks @> ARRAY[acf.assessment_code]))`);
  }
  if (sdgId) {
    filterConditions.push(`EXISTS (SELECT 1 FROM ilo_sdg_mappings isdg WHERE isdg.ilo_id = $2 AND isdg.sdg_id = $${assessmentFilterParams.indexOf(sdgId) + 1} AND (isdg.assessment_tasks IS NULL OR array_length(isdg.assessment_tasks, 1) IS NULL OR isdg.assessment_tasks @> ARRAY[acf.assessment_code]))`);
  }
  if (igaId) {
    filterConditions.push(`EXISTS (SELECT 1 FROM ilo_iga_mappings iiga WHERE iiga.ilo_id = $2 AND iiga.iga_id = $${assessmentFilterParams.indexOf(igaId) + 1} AND (iiga.assessment_tasks IS NULL OR array_length(iiga.assessment_tasks, 1) IS NULL OR iiga.assessment_tasks @> ARRAY[acf.assessment_code]))`);
  }
  if (cdioId) {
    filterConditions.push(`EXISTS (SELECT 1 FROM ilo_cdio_mappings icdio WHERE icdio.ilo_id = $2 AND icdio.cdio_id = $${assessmentFilterParams.indexOf(cdioId) + 1} AND (icdio.assessment_tasks IS NULL OR array_length(icdio.assessment_tasks, 1) IS NULL OR icdio.assessment_tasks @> ARRAY[acf.assessment_code]))`);
  }
  const filterConditionSQL = filterConditions.join(' OR ');
  
  // Build parameterized query parameters for assessments query
  const assessmentsQueryParams = [sectionCourseId, iloId];
  let assessmentsParamIndex = 3;
  let assessmentsSyllabusCondition = '';
  let assessmentsTermCondition = '';
  
  console.log(`[ATTAINMENT DEBUG] Building assessments query parameters:`);
  console.log(`  - sectionCourseId: ${sectionCourseId}`);
  console.log(`  - iloId: ${iloId}`);
  console.log(`  - syllabusId: ${syllabusId || 'null'}`);
  console.log(`  - activeTermId: ${activeTermId || 'null'}`);
  
  if (syllabusId) {
    assessmentsQueryParams.push(syllabusId);
    assessmentsSyllabusCondition = `AND sy.syllabus_id = $${assessmentsParamIndex}`;
    console.log(`  - Added syllabusId to params: $${assessmentsParamIndex} = ${syllabusId}`);
    assessmentsParamIndex++;
  }
  
  if (activeTermId) {
    assessmentsQueryParams.push(activeTermId);
    assessmentsTermCondition = `AND sc.term_id = $${assessmentsParamIndex}`;
    console.log(`  - Added activeTermId to params: $${assessmentsParamIndex} = ${activeTermId}`);
    assessmentsParamIndex++;
  }
  
  console.log(`[ATTAINMENT DEBUG] Final query params:`, assessmentsQueryParams);
  console.log(`[ATTAINMENT DEBUG] Syllabus condition: ${assessmentsSyllabusCondition || '(none)'}`);
  console.log(`[ATTAINMENT DEBUG] Term condition: ${assessmentsTermCondition || '(none)'}`);
  
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
        AND sy.section_course_id = $1
        AND sy.review_status = 'approved'
        AND sy.approval_status = 'approved'
        ${assessmentsSyllabusCondition}
    ),
    ilo_from_rubrics AS (
      SELECT DISTINCT
        r.assessment_id,
        r.ilo_id
      FROM rubrics r
      INNER JOIN assessments a ON r.assessment_id = a.assessment_id
      INNER JOIN syllabi sy ON a.syllabus_id = sy.syllabus_id
      WHERE a.section_course_id = $1
        AND sy.section_course_id = $1
        AND sy.review_status = 'approved'
        AND sy.approval_status = 'approved'
        ${assessmentsSyllabusCondition}
    ),
    ilo_from_mappings AS (
      SELECT DISTINCT
        ac.assessment_id,
        COALESCE(ism.ilo_id, isdg.ilo_id, iiga.ilo_id, icdio.ilo_id) AS ilo_id,
        -- Use assessment weight_percentage as ILO weight, or default to 0
        COALESCE(a.weight_percentage, 0) AS ilo_weight_percentage
      FROM assessment_codes ac
      INNER JOIN assessments a ON ac.assessment_id = a.assessment_id
      INNER JOIN syllabi sy ON a.syllabus_id = sy.syllabus_id
      INNER JOIN ilos i ON i.syllabus_id = sy.syllabus_id AND i.is_active = TRUE
      LEFT JOIN ilo_so_mappings ism ON ism.ilo_id = i.ilo_id AND ism.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL
      LEFT JOIN ilo_sdg_mappings isdg ON isdg.ilo_id = i.ilo_id AND isdg.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL
      LEFT JOIN ilo_iga_mappings iiga ON iiga.ilo_id = i.ilo_id AND iiga.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL
      LEFT JOIN ilo_cdio_mappings icdio ON icdio.ilo_id = i.ilo_id AND icdio.assessment_tasks @> ARRAY[ac.assessment_code] AND ac.assessment_code IS NOT NULL
      WHERE ac.assessment_code IS NOT NULL
        AND sy.section_course_id = $1
        AND sy.review_status = 'approved'
        AND sy.approval_status = 'approved'
        ${assessmentsSyllabusCondition}
        AND (ism.ilo_id IS NOT NULL OR isdg.ilo_id IS NOT NULL OR iiga.ilo_id IS NOT NULL OR icdio.ilo_id IS NOT NULL)
    ),
    assessment_ilo_connections AS (
      -- Get the syllabus_id for the target ILO, then get ALL assessments from that syllabus
      -- Since assessments are connected to the syllabus, show ALL assessments from the same syllabus
      WITH target_ilo_syllabus AS (
        SELECT DISTINCT i.syllabus_id
        FROM ilos i
        INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
        WHERE i.ilo_id = $2 
          AND i.is_active = TRUE 
          AND sy.section_course_id = $1
          AND sy.review_status = 'approved' 
          AND sy.approval_status = 'approved'
          ${assessmentsSyllabusCondition}
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
      INNER JOIN section_courses sc ON a.section_course_id = sc.section_course_id
      INNER JOIN syllabi sy ON a.syllabus_id = sy.syllabus_id
      INNER JOIN target_ilo_syllabus tis ON sy.syllabus_id = tis.syllabus_id
      LEFT JOIN assessment_ilo_weights aiw ON a.assessment_id = aiw.assessment_id AND aiw.ilo_id = $2
      LEFT JOIN ilo_from_rubrics r ON a.assessment_id = r.assessment_id AND r.ilo_id = $2
      LEFT JOIN ilo_from_mappings im ON a.assessment_id = im.assessment_id AND im.ilo_id = $2
      WHERE a.section_course_id = $1
        AND sy.section_course_id = $1
        AND sy.review_status = 'approved'
        AND sy.approval_status = 'approved'
        ${assessmentsSyllabusCondition}
        ${assessmentsTermCondition}
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
      INNER JOIN section_courses sc ON a.section_course_id = sc.section_course_id
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
        ${assessmentsSyllabusCondition}
        ${assessmentsTermCondition.replace('sc.', 'sc.')}
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
      ${assessmentsSyllabusCondition}
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
  console.log(`[ATTAINMENT DEBUG] ==========================================`);
  console.log(`[ATTAINMENT DEBUG] Executing assessmentsQuery`);
  console.log(`[ATTAINMENT DEBUG] Query params:`, assessmentsQueryParams);
  console.log(`[ATTAINMENT DEBUG] Filters applied:`, hasFilters ? `SO:${soId || 'none'}, SDG:${sdgId || 'none'}, IGA:${igaId || 'none'}, CDIO:${cdioId || 'none'}` : '(none)');
  console.log(`[ATTAINMENT DEBUG] Syllabus condition: ${assessmentsSyllabusCondition || '(none)'}`);
  console.log(`[ATTAINMENT DEBUG] Term condition: ${assessmentsTermCondition || '(none)'}`);
  console.log(`[ATTAINMENT DEBUG] Query length: ${assessmentsQuery.length} characters`);
  console.log(`[ATTAINMENT DEBUG] Query preview (first 1000 chars):`, assessmentsQuery.substring(0, 1000));
  console.log(`[ATTAINMENT DEBUG] ==========================================`);
  
  let assessmentsResult;
  try {
    assessmentsResult = await db.query(assessmentsQuery, assessmentsQueryParams);
    
    console.log(`[ATTAINMENT SERVICE] ✅ Query executed successfully`);
    console.log(`[ATTAINMENT SERVICE] Found ${assessmentsResult.rows.length} assessments for ILO ${iloId} in section_course ${sectionCourseId}`);
    
    if (assessmentsResult.rows.length > 0) {
      console.log(`[ATTAINMENT SERVICE] Sample assessment:`, {
        id: assessmentsResult.rows[0].assessment_id,
        title: assessmentsResult.rows[0].assessment_title,
        type: assessmentsResult.rows[0].assessment_type,
        total_points: assessmentsResult.rows[0].total_points
      });
    } else {
      console.log(`[ATTAINMENT SERVICE] ⚠️ No assessments found. This might indicate:`);
      console.log(`  - No assessments exist for this ILO`);
      console.log(`  - Assessments are not published`);
      console.log(`  - Assessments don't match the syllabus filter`);
      console.log(`  - Assessments don't match the term filter`);
    }
  } catch (queryError) {
    console.error(`[ATTAINMENT SERVICE] ❌ Query execution failed:`, queryError);
    console.error(`[ATTAINMENT SERVICE] Error message:`, queryError.message);
    console.error(`[ATTAINMENT SERVICE] Error code:`, queryError.code);
    console.error(`[ATTAINMENT SERVICE] Error position:`, queryError.position);
    console.error(`[ATTAINMENT SERVICE] Query params used:`, assessmentsQueryParams);
    console.error(`[ATTAINMENT SERVICE] Query (first 2000 chars):`, assessmentsQuery.substring(0, 2000));
    console.error(`[ATTAINMENT SERVICE] Full query length:`, assessmentsQuery.length);
    
    // Try to identify the problematic part of the query
    if (queryError.position) {
      const errorPos = parseInt(queryError.position);
      const startPos = Math.max(0, errorPos - 200);
      const endPos = Math.min(assessmentsQuery.length, errorPos + 200);
      console.error(`[ATTAINMENT SERVICE] Query around error position ${errorPos}:`);
      console.error(assessmentsQuery.substring(startPos, endPos));
    }
    
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
  
  // Step 2: Get ILO combination mappings first (separate query to get assessment_tasks)
  // Build parameterized query with correct parameter indices
  const iloMappingsParams = [sectionCourseId, iloId];
  let iloMappingsParamIndex = 3;
  let iloMappingsSoCondition = '';
  let iloMappingsSdgCondition = '';
  let iloMappingsIgaCondition = '';
  let iloMappingsCdioCondition = '';
  
  if (soId) {
    iloMappingsParams.push(soId);
    iloMappingsSoCondition = `AND ism.so_id = $${iloMappingsParamIndex}`;
    iloMappingsParamIndex++;
  }
  if (sdgId) {
    iloMappingsParams.push(sdgId);
    iloMappingsSdgCondition = `AND isdg.sdg_id = $${iloMappingsParamIndex}`;
    iloMappingsParamIndex++;
  }
  if (igaId) {
    iloMappingsParams.push(igaId);
    iloMappingsIgaCondition = `AND iiga.iga_id = $${iloMappingsParamIndex}`;
    iloMappingsParamIndex++;
  }
  if (cdioId) {
    iloMappingsParams.push(cdioId);
    iloMappingsCdioCondition = `AND icdio.cdio_id = $${iloMappingsParamIndex}`;
    iloMappingsParamIndex++;
  }
  
  const iloMappingsQuery = `
    SELECT 
      ism.so_id,
      isdg.sdg_id,
      iiga.iga_id,
      icdio.cdio_id,
      ism.assessment_tasks AS so_assessment_tasks,
      isdg.assessment_tasks AS sdg_assessment_tasks,
      iiga.assessment_tasks AS iga_assessment_tasks,
      icdio.assessment_tasks AS cdio_assessment_tasks
    FROM ilos i
    INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
    LEFT JOIN ilo_so_mappings ism ON i.ilo_id = ism.ilo_id ${iloMappingsSoCondition}
    LEFT JOIN ilo_sdg_mappings isdg ON i.ilo_id = isdg.ilo_id ${iloMappingsSdgCondition}
    LEFT JOIN ilo_iga_mappings iiga ON i.ilo_id = iiga.ilo_id ${iloMappingsIgaCondition}
    LEFT JOIN ilo_cdio_mappings icdio ON i.ilo_id = icdio.ilo_id ${iloMappingsCdioCondition}
    WHERE i.ilo_id = $2 
      AND i.is_active = TRUE
      AND sy.section_course_id = $1
      AND sy.review_status = 'approved'
      AND sy.approval_status = 'approved'
  `;

  // Execute ILO mappings query first
  const iloMappingsResult = await db.query(iloMappingsQuery, iloMappingsParams);
  
  // Get the specific assessment_tasks from the selected pair (not all mappings)
  // This is the key: we only want assessments from the specific ILO-mapping pair
  let selectedAssessmentTasks = null;
  let connectAllFromSyllabus = false;
  
  if (iloMappingsResult.rows.length > 0) {
    const row = iloMappingsResult.rows[0];
    
    // Get assessment_tasks from the specific filter that was applied
    if (soId && row.so_assessment_tasks) {
      if (row.so_assessment_tasks.length === 0 || row.so_assessment_tasks[0] === null) {
        connectAllFromSyllabus = true;
      } else {
        selectedAssessmentTasks = row.so_assessment_tasks.map(task => task.toUpperCase().trim());
      }
    } else if (sdgId && row.sdg_assessment_tasks) {
      if (row.sdg_assessment_tasks.length === 0 || row.sdg_assessment_tasks[0] === null) {
        connectAllFromSyllabus = true;
      } else {
        selectedAssessmentTasks = row.sdg_assessment_tasks.map(task => task.toUpperCase().trim());
      }
    } else if (igaId && row.iga_assessment_tasks) {
      if (row.iga_assessment_tasks.length === 0 || row.iga_assessment_tasks[0] === null) {
        connectAllFromSyllabus = true;
      } else {
        selectedAssessmentTasks = row.iga_assessment_tasks.map(task => task.toUpperCase().trim());
      }
    } else if (cdioId && row.cdio_assessment_tasks) {
      if (row.cdio_assessment_tasks.length === 0 || row.cdio_assessment_tasks[0] === null) {
        connectAllFromSyllabus = true;
      } else {
        selectedAssessmentTasks = row.cdio_assessment_tasks.map(task => task.toUpperCase().trim());
      }
    }
  }
  
  console.log(`[ATTAINMENT DEBUG] Selected assessment_tasks from pair:`, selectedAssessmentTasks);
  console.log(`[ATTAINMENT DEBUG] Connect all from syllabus:`, connectAllFromSyllabus);

  // Step 3: Get assessments connected to this ILO combination (separate, simpler query)
  // Build parameters for connectedAssessmentsQuery (needs syllabusId and activeTermId if provided)
  const connectedAssessmentsParams = [sectionCourseId, iloId];
  let connectedAssessmentsParamIndex = 3;
  let connectedAssessmentsSyllabusCondition = '';
  let connectedAssessmentsTermCondition = '';
  
  // Add filter parameters to connectedAssessmentsParams
  if (soId) {
    connectedAssessmentsParams.push(soId);
  }
  if (sdgId) {
    connectedAssessmentsParams.push(sdgId);
  }
  if (igaId) {
    connectedAssessmentsParams.push(igaId);
  }
  if (cdioId) {
    connectedAssessmentsParams.push(cdioId);
  }
  
  // Update param index after filters
  connectedAssessmentsParamIndex = 3 + (soId ? 1 : 0) + (sdgId ? 1 : 0) + (igaId ? 1 : 0) + (cdioId ? 1 : 0);
  
  // Store the starting index for assessment_tasks (will be set after syllabus/term params)
  let assessmentTasksParamStartIndex = connectedAssessmentsParamIndex;
  
  if (syllabusId) {
    connectedAssessmentsParams.push(syllabusId);
    connectedAssessmentsSyllabusCondition = `AND sy.syllabus_id = $${connectedAssessmentsParamIndex}`;
    connectedAssessmentsParamIndex++;
    assessmentTasksParamStartIndex++;
  }
  
  if (activeTermId) {
    connectedAssessmentsParams.push(activeTermId);
    connectedAssessmentsTermCondition = `AND sc.term_id = $${connectedAssessmentsParamIndex}`;
    connectedAssessmentsParamIndex++;
    assessmentTasksParamStartIndex++;
  }
  
  // Build filter conditions for connectedAssessmentsQuery (using 'ac' alias instead of 'acf')
  let connectedAssessmentsFilterCondition = '';
  if (hasFilters && filterConditionSQL) {
    // Replace 'acf' with 'ac' to match the CTE alias
    connectedAssessmentsFilterCondition = filterConditionSQL.replace(/acf\./g, 'ac.');
  }
  
  console.log(`[ATTAINMENT DEBUG] selectedAssessmentTasks:`, selectedAssessmentTasks);
  console.log(`[ATTAINMENT DEBUG] connectAllFromSyllabus:`, connectAllFromSyllabus);
  
  // Step 3a: First, extract assessment codes separately (simpler query)
  const assessmentCodesParams = [sectionCourseId];
  let assessmentCodesParamIndex = 2;
  let assessmentCodesSyllabusCondition = '';
  
  if (syllabusId) {
    assessmentCodesParams.push(syllabusId);
    assessmentCodesSyllabusCondition = `AND sy.syllabus_id = $${assessmentCodesParamIndex}`;
  }
  
  const extractAssessmentCodesQuery = `
    SELECT DISTINCT
      a.assessment_id,
      COALESCE(
        -- Try to get code from syllabus assessment_framework JSON
        (
          SELECT (task->>'code')::text
          FROM jsonb_array_elements(
            CASE 
              WHEN jsonb_typeof(sy.assessment_framework) = 'object' 
              THEN COALESCE(sy.assessment_framework->'components', '[]'::jsonb)
              ELSE '[]'::jsonb
            END
          ) AS component
          CROSS JOIN LATERAL jsonb_array_elements(
            CASE 
              WHEN jsonb_typeof(component->'sub_assessments') = 'array'
              THEN component->'sub_assessments'
              ELSE '[]'::jsonb
            END
          ) AS task
          WHERE (
            (task->>'title')::text ILIKE '%' || a.title || '%'
            OR (task->>'name')::text ILIKE '%' || a.title || '%'
            OR (task->>'code')::text IS NOT NULL
          )
          LIMIT 1
        ),
        -- Try to get code directly from assessment_framework if it's a flat structure
        (
          SELECT key::text
          FROM jsonb_each_text(
            CASE 
              WHEN jsonb_typeof(sy.assessment_framework) = 'object' 
              THEN sy.assessment_framework
              ELSE '{}'::jsonb
            END
          )
          WHERE key ILIKE '%' || a.title || '%'
          LIMIT 1
        ),
        -- Try to get code from assessment content_data
        (a.content_data->>'code')::text,
        (a.content_data->>'abbreviation')::text,
        -- Extract code dynamically from title using pattern matching
        (
          SELECT UPPER(
            REGEXP_REPLACE(
              SUBSTRING(a.title FROM '([A-Z]{2,4}\s*\d+)'),
              '\s+', '', 'g'
            )
          )
          WHERE a.title ~* '[A-Z]{2,4}\s*\d+'
        ),
        -- Extract abbreviation from first letters of words + number
        (
          SELECT UPPER(
            REGEXP_REPLACE(
              REGEXP_REPLACE(a.title, '^([A-Z])[a-z]*\\s+([A-Z])[a-z]*\\s*(\\d+)', '\\1\\2\\3'),
              '[^A-Z0-9]', '', 'g'
            )
          )
          WHERE a.title ~* '^[A-Z][a-z]+\\s+[A-Z][a-z]+\\s+\\d+'
        ),
        -- Try alternative patterns: single word + number
        (
          SELECT UPPER(
            REGEXP_REPLACE(
              SUBSTRING(a.title FROM '^([A-Z])[a-z]*\\s+(\\d+)'),
              '\\s+', '', 'g'
            )
          )
          WHERE a.title ~* '^[A-Z][a-z]+\\s+\\d+'
        ),
        NULL
      ) AS assessment_code
    FROM assessments a
    INNER JOIN syllabi sy ON a.syllabus_id = sy.syllabus_id
    WHERE a.section_course_id = $1
      AND a.is_published = TRUE
      AND sy.review_status = 'approved'
      AND sy.approval_status = 'approved'
      ${assessmentCodesSyllabusCondition}
  `;
  
  // Execute assessment codes extraction query
  const assessmentCodesResult = await db.query(extractAssessmentCodesQuery, assessmentCodesParams);
  const assessmentCodesMap = new Map(assessmentCodesResult.rows.map(row => [row.assessment_id, row.assessment_code]));
  
  console.log(`[ATTAINMENT DEBUG] Extracted ${assessmentCodesResult.rows.length} assessment codes`);
  
  // Filter assessment IDs based on assessment_tasks if needed
  let assessmentIdsToInclude = null;
  let assessmentTasksCondition = 'TRUE';
  
  if (hasFilters && selectedAssessmentTasks && selectedAssessmentTasks.length > 0) {
    assessmentIdsToInclude = new Set();
    const selectedTasksUpper = selectedAssessmentTasks.map(t => t.toUpperCase().trim());
    assessmentCodesResult.rows.forEach(row => {
      if (row.assessment_code && selectedTasksUpper.includes(row.assessment_code.toUpperCase().trim())) {
        assessmentIdsToInclude.add(row.assessment_id);
      }
    });
    console.log(`[ATTAINMENT DEBUG] Filtered to ${assessmentIdsToInclude.size} assessments matching assessment_tasks`);
    
    // Update condition to filter by assessment IDs
    if (assessmentIdsToInclude.size > 0) {
      const assessmentIdList = Array.from(assessmentIdsToInclude);
      connectedAssessmentsParams.push(...assessmentIdList);
      const paramPlaceholders = assessmentIdList.map((_, idx) => `$${assessmentTasksParamStartIndex + idx}`).join(', ');
      assessmentTasksCondition = `a.assessment_id = ANY(ARRAY[${paramPlaceholders}])`;
    } else {
      assessmentTasksCondition = 'FALSE'; // No matching assessments
    }
  } else if (hasFilters && connectAllFromSyllabus) {
    // If assessment_tasks is empty/null, include all from syllabus
    assessmentTasksCondition = 'TRUE';
  } else if (hasFilters && connectedAssessmentsFilterCondition) {
    // Fallback to code matching
    assessmentTasksCondition = `(${connectedAssessmentsFilterCondition})`;
  }
  
  console.log(`[ATTAINMENT DEBUG] connectedAssessmentsQuery params:`, connectedAssessmentsParams);
  console.log(`[ATTAINMENT DEBUG] connectedAssessmentsSyllabusCondition: ${connectedAssessmentsSyllabusCondition || '(none)'}`);
  console.log(`[ATTAINMENT DEBUG] connectedAssessmentsTermCondition: ${connectedAssessmentsTermCondition || '(none)'}`);
  console.log(`[ATTAINMENT DEBUG] assessmentTasksCondition: ${assessmentTasksCondition}`);
  
  // Step 3b: Now build the simpler connected assessments query (no complex code extraction CTE)
  const connectedAssessmentsQuery = `
    WITH ilo_syllabus AS (
      SELECT DISTINCT syllabus_id
      FROM ilos
      WHERE ilo_id = $2 AND is_active = TRUE
    ),
    assessment_ilo_connections AS (
      -- Get assessments from syllabus based on the ILO-mapping pair's assessment_tasks
      -- Assessment codes are already extracted in a separate query
      SELECT DISTINCT
        a.assessment_id,
        $2 AS ilo_id,
        COALESCE(aiw.weight_percentage, a.weight_percentage, 0) AS ilo_weight_percentage
      FROM assessments a
      INNER JOIN syllabi sy ON a.syllabus_id = sy.syllabus_id
      INNER JOIN ilo_syllabus ils ON sy.syllabus_id = ils.syllabus_id
      LEFT JOIN assessment_ilo_weights aiw ON a.assessment_id = aiw.assessment_id AND aiw.ilo_id = $2
      LEFT JOIN rubrics r ON a.assessment_id = r.assessment_id AND r.ilo_id = $2
      WHERE a.section_course_id = $1
        AND a.is_published = TRUE
        AND sy.section_course_id = $1
        AND sy.review_status = 'approved'
        AND sy.approval_status = 'approved'
        ${connectedAssessmentsSyllabusCondition}
        AND a.weight_percentage IS NOT NULL
        AND a.weight_percentage > 0
        AND (
          -- Match assessments from syllabus based on ILO-mapping pair's assessment_tasks
          ${assessmentTasksCondition}
          -- Also include assessments with explicit ILO connections (assessment_ilo_weights or rubrics)
          OR aiw.ilo_id = $2
          OR r.ilo_id = $2
        )
    ),
    assessment_stats AS (
      SELECT
        aic.assessment_id,
        COUNT(DISTINCT ce.student_id) AS total_students,
        COUNT(DISTINCT sub.submission_id) AS submissions_count,
        COALESCE(AVG(
          CASE 
            WHEN sub.transmuted_score IS NOT NULL AND a.total_points > 0 AND a.weight_percentage > 0 THEN
              ((sub.transmuted_score / (a.weight_percentage / 100.0) - 37.5) / 62.5) * 100
            WHEN sub.adjusted_score IS NOT NULL AND a.total_points > 0 THEN
              (sub.adjusted_score / a.total_points) * 100
            WHEN sub.total_score IS NOT NULL AND a.total_points > 0 THEN
              (sub.total_score / a.total_points) * 100
            ELSE NULL
          END
        ), 0) AS average_percentage
      FROM assessment_ilo_connections aic
      INNER JOIN assessments a ON aic.assessment_id = a.assessment_id
      INNER JOIN course_enrollments ce ON a.section_course_id = ce.section_course_id AND ce.status = 'enrolled'
      LEFT JOIN submissions sub ON (
        ce.enrollment_id = sub.enrollment_id 
        AND sub.assessment_id = a.assessment_id
        AND (sub.transmuted_score IS NOT NULL OR sub.adjusted_score IS NOT NULL OR sub.total_score IS NOT NULL)
      )
      WHERE aic.ilo_id = $2
      GROUP BY aic.assessment_id
    )
    SELECT DISTINCT
      a.assessment_id,
      a.title AS assessment_title,
      a.total_points AS max_score,
      a.weight_percentage,
      COALESCE(aic.ilo_weight_percentage, a.weight_percentage, 0) AS ilo_weight_percentage,
      COALESCE(ast.average_percentage, 0) AS average_percentage
    FROM assessments a
    INNER JOIN section_courses sc ON a.section_course_id = sc.section_course_id
    INNER JOIN assessment_ilo_connections aic ON a.assessment_id = aic.assessment_id
    LEFT JOIN assessment_stats ast ON a.assessment_id = ast.assessment_id
    INNER JOIN ilos i ON aic.ilo_id = i.ilo_id
    INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
    WHERE a.section_course_id = $1
      AND aic.ilo_id = $2
      AND a.is_published = TRUE
      AND a.weight_percentage IS NOT NULL
      AND a.weight_percentage > 0
      AND sy.section_course_id = $1
      ${connectedAssessmentsSyllabusCondition}
      ${connectedAssessmentsTermCondition}
      AND i.is_active = TRUE
    ORDER BY a.assessment_id
  `;
  
  // Build parameters for student scores query
  const studentScoresParams = [sectionCourseId, iloId];
  let studentScoresParamIndex = 3;
  
  // Add filter parameters first (in same order as assessmentFilterParams)
  if (soId) {
    studentScoresParams.push(soId);
  }
  if (sdgId) {
    studentScoresParams.push(sdgId);
  }
  if (igaId) {
    studentScoresParams.push(igaId);
  }
  if (cdioId) {
    studentScoresParams.push(cdioId);
  }
  
  // Update param index after filters
  studentScoresParamIndex = 3 + (soId ? 1 : 0) + (sdgId ? 1 : 0) + (igaId ? 1 : 0) + (cdioId ? 1 : 0);
  
  let studentScoresSyllabusCondition = '';
  let studentScoresTermCondition = '';
  
  if (syllabusId) {
    studentScoresParams.push(syllabusId);
    studentScoresSyllabusCondition = `AND sy.syllabus_id = $${studentScoresParamIndex}`;
    studentScoresParamIndex++;
  }
  
  if (activeTermId) {
    studentScoresParams.push(activeTermId);
    studentScoresTermCondition = `AND sc.term_id = $${studentScoresParamIndex}`;
    studentScoresParamIndex++;
  }
  
  // Build filter conditions for studentScoresQuery
  let studentScoresFilterCondition = '';
  if (hasFilters && filterConditionSQL) {
    // Replace 'acf' with 'ac_student' to match the subquery alias
    studentScoresFilterCondition = filterConditionSQL.replace(/acf\./g, 'ac_student.');
  }
  
  console.log(`[ATTAINMENT DEBUG] studentScoresQuery params:`, studentScoresParams);
  console.log(`[ATTAINMENT DEBUG] studentScoresFilterCondition: ${studentScoresFilterCondition || '(none)'}`);
  
  // Step 3: Get student assessment scores for connected assessments (with filters applied)
  // Clean starting point - get student scores for assessments from selected class, published, and selected syllabus
  const studentScoresQuery = `
    WITH ilo_syllabus AS (
      SELECT DISTINCT syllabus_id
      FROM ilos
      WHERE ilo_id = $2 AND is_active = TRUE
    ),
    assessment_ilo_connections AS (
      -- Filter assessments based on the specific ILO-mapping pair's assessment_tasks if filters are provided
      -- Otherwise, include ALL assessments from the same syllabus as the ILO
      SELECT DISTINCT
        a.assessment_id,
        $2 AS ilo_id,
        COALESCE(aiw.weight_percentage, a.weight_percentage, 0) AS ilo_weight_percentage
      FROM assessments a
      INNER JOIN section_courses sc ON a.section_course_id = sc.section_course_id
      INNER JOIN syllabi sy ON a.syllabus_id = sy.syllabus_id
      INNER JOIN ilo_syllabus ils ON sy.syllabus_id = ils.syllabus_id
      -- Assessment codes are already extracted in a separate query, filter by IDs if needed
      LEFT JOIN assessment_ilo_weights aiw ON a.assessment_id = aiw.assessment_id AND aiw.ilo_id = $2
      LEFT JOIN rubrics r ON a.assessment_id = r.assessment_id AND r.ilo_id = $2
      WHERE a.section_course_id = $1
        AND a.is_published = TRUE
        AND sy.section_course_id = $1
        AND sy.review_status = 'approved'
        AND sy.approval_status = 'approved'
        ${studentScoresSyllabusCondition}
        ${studentScoresTermCondition}
        AND a.weight_percentage IS NOT NULL
        AND a.weight_percentage > 0
        AND (
          -- If filters are applied, only include assessments that match the specific mapping's assessment_tasks
          ${studentScoresFilterCondition ? `(${studentScoresFilterCondition})` : 'TRUE'}
          -- Also include assessments with explicit ILO connections (assessment_ilo_weights or rubrics)
          OR aiw.ilo_id = $2
          OR r.ilo_id = $2
        )
    )
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
    INNER JOIN assessment_ilo_connections aic ON a.assessment_id = aic.assessment_id AND aic.ilo_id = $2
    INNER JOIN ilos i ON aic.ilo_id = i.ilo_id
    INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
    LEFT JOIN submissions sub ON (
      ce.enrollment_id = sub.enrollment_id 
      AND sub.assessment_id = a.assessment_id
      AND (sub.transmuted_score IS NOT NULL OR sub.adjusted_score IS NOT NULL OR sub.total_score IS NOT NULL)
    )
    WHERE ce.section_course_id = $1
      AND ce.status = 'enrolled'
      AND a.section_course_id = $1
      AND a.is_published = TRUE
      AND a.weight_percentage IS NOT NULL
      AND a.weight_percentage > 0
      AND sy.section_course_id = $1
      AND sy.review_status = 'approved'
      AND sy.approval_status = 'approved'
      AND i.is_active = TRUE
  `;
  
  // Execute all queries
  // Debug: Log before executing queries
  console.log(`[ATTAINMENT DEBUG] Executing parallel queries for ILO ${iloId}:`);
  console.log(`[ATTAINMENT DEBUG] - enrolledResult query`);
  console.log(`[ATTAINMENT DEBUG] - connectedAssessmentsQuery`);
  console.log(`[ATTAINMENT DEBUG] - studentScoresQuery`);
  
  console.log(`[ATTAINMENT DEBUG] Promise.all parameters:`);
  console.log(`  - enrolledResult: [${sectionCourseId}]`);
  console.log(`  - connectedAssessmentsResult:`, connectedAssessmentsParams);
  console.log(`  - scoresResult:`, studentScoresParams);
  
  const [enrolledResult, connectedAssessmentsResult, scoresResult] = await Promise.all([
    db.query(allEnrolledStudentsQuery, [sectionCourseId]),
    db.query(connectedAssessmentsQuery, connectedAssessmentsParams),
    db.query(studentScoresQuery, studentScoresParams)
  ]);
  
  console.log(`[ATTAINMENT DEBUG] ✅ All parallel queries completed:`);
  console.log(`[ATTAINMENT DEBUG] - enrolledResult: ${enrolledResult.rows.length} students`);
  console.log(`[ATTAINMENT DEBUG] - connectedAssessmentsResult: ${connectedAssessmentsResult.rows.length} assessments`);
  console.log(`[ATTAINMENT DEBUG] - scoresResult: ${scoresResult.rows.length} score records`);
  
  // Verify that scores are only from connected assessments
  if (scoresResult.rows.length > 0 && connectedAssessmentsResult.rows.length > 0) {
    const connectedAssessmentIds = new Set(connectedAssessmentsResult.rows.map(a => a.assessment_id));
    const scoreAssessmentIds = new Set(scoresResult.rows.map(s => s.assessment_id));
    const unmatchedAssessments = Array.from(scoreAssessmentIds).filter(id => !connectedAssessmentIds.has(id));
    if (unmatchedAssessments.length > 0) {
      console.log(`[ATTAINMENT DEBUG] ⚠️ WARNING: Found ${unmatchedAssessments.length} assessments in scores that are NOT in connected assessments:`, unmatchedAssessments);
    } else {
      console.log(`[ATTAINMENT DEBUG] ✅ All score records are from connected assessments (filtered correctly)`);
    }
  }
  
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
    
    // Check how many have actual scores vs null/0
    const withScores = scoresResult.rows.filter(r => (r.raw_score > 0) || (r.transmuted_score_calc && r.transmuted_score_calc > 0));
    const withoutScores = scoresResult.rows.length - withScores.length;
    console.log(`[ATTAINMENT DEBUG] Score breakdown: ${withScores.length} with scores, ${withoutScores} without scores`);
    
    if (withScores.length > 0) {
      console.log(`[ATTAINMENT DEBUG] Sample score record WITH score:`, {
        student_id: withScores[0].student_id,
        assessment_id: withScores[0].assessment_id,
        raw_score: withScores[0].raw_score,
        adjusted_score: withScores[0].adjusted_score,
        total_score: withScores[0].total_score,
        transmuted_score: withScores[0].transmuted_score,
        transmuted_score_calc: withScores[0].transmuted_score_calc,
        assessment_percentage: withScores[0].assessment_percentage,
        max_score: withScores[0].max_score,
        weight_percentage: withScores[0].weight_percentage
      });
    }
    
    if (withoutScores > 0) {
      const sampleWithout = scoresResult.rows.find(r => (!r.raw_score || r.raw_score === 0) && (!r.transmuted_score_calc || r.transmuted_score_calc === 0));
      if (sampleWithout) {
        console.log(`[ATTAINMENT DEBUG] Sample score record WITHOUT score:`, {
          student_id: sampleWithout.student_id,
          assessment_id: sampleWithout.assessment_id,
          raw_score: sampleWithout.raw_score,
          adjusted_score: sampleWithout.adjusted_score,
          total_score: sampleWithout.total_score,
          transmuted_score: sampleWithout.transmuted_score,
          transmuted_score_calc: sampleWithout.transmuted_score_calc,
          has_submission: sampleWithout.raw_score !== undefined || sampleWithout.adjusted_score !== undefined || sampleWithout.total_score !== undefined
        });
      }
    }
  } else {
    console.log(`[ATTAINMENT DEBUG] ⚠️ No student score records found! This is why students show 0.00 scores.`);
    console.log(`[ATTAINMENT DEBUG] Possible reasons:`);
    console.log(`  - No assessments found in assessment_ilo_connections CTE`);
    console.log(`  - No students enrolled in the section course`);
    console.log(`  - Assessments are not published`);
    console.log(`  - No submissions exist for the assessments`);
  }
  
  // Step 4: Process results in JavaScript (simpler and more accurate)
  // Create a set of connected assessment IDs to ensure we only use filtered assessments
  const connectedAssessmentIds = new Set(connectedAssessmentsResult.rows.map(ass => ass.assessment_id));
  
  console.log(`[ATTAINMENT DEBUG] Connected assessment IDs (${connectedAssessmentIds.size}):`, Array.from(connectedAssessmentIds).slice(0, 10));
  
  const assessmentMap = new Map();
  connectedAssessmentsResult.rows.forEach(ass => {
    assessmentMap.set(ass.assessment_id, ass);
  });
  
  // Format assessments for response
  const assessments = connectedAssessmentsResult.rows.map(row => ({
    assessment_id: row.assessment_id,
    title: row.assessment_title,
    total_points: parseFloat(row.max_score || 0),
    weight_percentage: parseFloat(row.weight_percentage || 0),
    ilo_weight_percentage: parseFloat(row.ilo_weight_percentage || 0),
    average_percentage: parseFloat(row.average_percentage || 0)
  }));
  
  // Group scores by student
  // CRITICAL: Only include assessments that are in the connected assessments list (sidebar)
  // This ensures scores are ONLY computed from the assessments shown in the sidebar
  const studentScoresMap = new Map();
  
  // First, initialize all students with empty assessment scores
  enrolledResult.rows.forEach(enrolled => {
    studentScoresMap.set(enrolled.student_id, {
      student_id: enrolled.student_id,
      enrollment_id: enrolled.enrollment_id,
      student_number: enrolled.student_number,
      full_name: enrolled.full_name,
      assessment_scores: []
    });
  });
  
  // Then, only add scores from assessments that are in the connected assessments list (sidebar)
  scoresResult.rows.forEach(row => {
    // STRICT FILTER: Only process assessments that are in the connected assessments list (sidebar)
    if (!connectedAssessmentIds.has(row.assessment_id)) {
      // Skip this assessment - it's not in the sidebar, so it shouldn't contribute to scores
      return;
    }
    
    const student = studentScoresMap.get(row.student_id);
    if (!student) {
      // Student not found in enrolled list, skip
      return;
    }
    
    // Include all assessment records from connected assessments, even if score is 0
    // The transmuted_score_calc might be NULL if there's no submission, but we still want to include the assessment
    const hasScore = row.raw_score > 0 || row.adjusted_score > 0 || row.total_score > 0 || 
                     row.transmuted_score > 0 || (row.transmuted_score_calc && row.transmuted_score_calc > 0);
    
    student.assessment_scores.push({
      assessment_id: row.assessment_id,
      assessment_title: row.assessment_title,
      raw_score: parseFloat(row.raw_score || 0),
      adjusted_score: parseFloat(row.adjusted_score || 0),
      total_score: parseFloat(row.total_score || 0),
      max_score: parseFloat(row.max_score || 0),
      score_percentage: parseFloat(row.assessment_percentage || 0),
      transmuted_score: parseFloat(row.transmuted_score_calc || row.transmuted_score || 0),
      weight_percentage: parseFloat(row.weight_percentage || 0),
      ilo_weight_percentage: parseFloat(row.ilo_weight_percentage || 0),
      has_submission: hasScore
    });
  });
  
  // For each connected assessment, ensure all students have an entry (even if no submission)
  // This ensures the sidebar and score computation are perfectly aligned
  connectedAssessmentsResult.rows.forEach(connectedAss => {
    enrolledResult.rows.forEach(enrolled => {
      const student = studentScoresMap.get(enrolled.student_id);
      if (student) {
        // Check if this student already has a score entry for this assessment
        const hasEntry = student.assessment_scores.some(ass => ass.assessment_id === connectedAss.assessment_id);
        if (!hasEntry) {
          // Add entry with 0 scores (no submission yet)
          student.assessment_scores.push({
            assessment_id: connectedAss.assessment_id,
            assessment_title: connectedAss.assessment_title,
            raw_score: 0,
            adjusted_score: 0,
            total_score: 0,
            max_score: parseFloat(connectedAss.max_score || 0),
            score_percentage: 0,
            transmuted_score: 0,
            weight_percentage: parseFloat(connectedAss.weight_percentage || 0),
            ilo_weight_percentage: parseFloat(connectedAss.ilo_weight_percentage || 0),
            has_submission: false
          });
        }
      }
    });
  });
  
  // Calculate overall scores for each student
  // CRITICAL: Only use assessments from the connected assessments list (sidebar)
  const allStudentRows = enrolledResult.rows.map(enrolled => {
    const studentData = studentScoresMap.get(enrolled.student_id);
    
    if (!studentData) {
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
    
    // FILTER: Only use assessments that are in the connected assessments list (sidebar)
    const connectedAssessments = studentData.assessment_scores.filter(ass => 
      connectedAssessmentIds.has(ass.assessment_id)
    );
    
    if (connectedAssessments.length === 0) {
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
    // Only include assessments that have actual scores AND are in the connected assessments list
    const assessmentsWithScores = connectedAssessments.filter(ass => ass.has_submission);
    const totalScore = assessmentsWithScores.reduce((sum, ass) => sum + (ass.raw_score || ass.total_score || ass.adjusted_score || 0), 0);
    const totalMax = assessmentsWithScores.reduce((sum, ass) => sum + ass.max_score, 0);
    const overallRate = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
    
    // Calculate ILO score (sum of transmuted scores) - ONLY from connected assessments with scores
    const iloScore = assessmentsWithScores.reduce((sum, ass) => sum + (ass.transmuted_score || 0), 0);
    
    // Total ILO weight (only for connected assessments with scores)
    const totalIloWeight = assessmentsWithScores.reduce((sum, ass) => sum + ass.ilo_weight_percentage, 0);
    
    // Count only connected assessments
    const assessmentsCount = connectedAssessments.length;
    
    console.log(`[ATTAINMENT DEBUG] Student ${studentData.student_number} (${studentData.full_name}):`);
    console.log(`  - Total connected assessments: ${connectedAssessments.length}`);
    console.log(`  - Connected assessments with scores: ${assessmentsWithScores.length}`);
    console.log(`  - Total score: ${totalScore}, Total max: ${totalMax}`);
    console.log(`  - Overall rate: ${overallRate}%`);
    console.log(`  - ILO score: ${iloScore} (from connected assessments only)`);
    console.log(`  - Sample connected assessment scores:`, assessmentsWithScores.slice(0, 3).map(a => ({
      title: a.assessment_title,
      raw_score: a.raw_score,
      transmuted_score: a.transmuted_score,
      has_submission: a.has_submission
    })));
    
    return {
      student_id: studentData.student_id,
      enrollment_id: studentData.enrollment_id,
      student_number: studentData.student_number,
      full_name: studentData.full_name,
      ilo_score: Math.round(iloScore * 100) / 100,
      overall_attainment_rate: Math.round(overallRate * 100) / 100,
      assessments_count: assessmentsCount,
      total_ilo_weight: Math.round(totalIloWeight * 100) / 100,
      // Only return assessment scores from connected assessments (sidebar)
      assessment_scores: connectedAssessments
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

