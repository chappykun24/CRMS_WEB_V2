import db from '../config/database.js';

/**
 * Clustering Service - Centralized service for student clustering operations
 * Provides consistent clustering logic with caching, error handling, and configuration
 */

// ==========================================
// CONFIGURATION
// ==========================================

/**
 * Get cluster service URL from environment variables
 * Checks multiple environment variable names for compatibility
 * @returns {string|null} Cluster service URL or null if not configured
 */
const getClusterServiceUrl = () => {
  // Priority order: CLUSTER_SERVICE_URL > CLUSTER_API_URL > VITE_CLUSTER_API_URL
  const url = process.env.CLUSTER_SERVICE_URL || 
              process.env.CLUSTER_API_URL || 
              process.env.VITE_CLUSTER_API_URL;
  
  // Return null if URL is empty or just whitespace
  if (!url || !url.trim()) {
    return null;
  }
  
  // Normalize URL (remove trailing slash)
  return url.trim().endsWith('/') ? url.trim().slice(0, -1) : url.trim();
};

/**
 * Check if clustering is enabled
 * @returns {boolean} True if clustering is enabled, false otherwise
 */
const isClusteringEnabled = () => {
  // Clustering is disabled if explicitly set to '1'
  if (process.env.DISABLE_CLUSTERING === '1') {
    return false;
  }
  
  // Clustering is enabled if we have a valid service URL
  return getClusterServiceUrl() !== null;
};

/**
 * Get clustering configuration
 * @returns {Object} Configuration object with url, enabled, timeout, etc.
 */
const getClusteringConfig = () => {
  const url = getClusterServiceUrl();
  const enabled = isClusteringEnabled();
  const timeoutMs = parseInt(process.env.CLUSTER_API_TIMEOUT_MS || '30000', 10);
  const cacheMaxAgeHours = parseInt(process.env.CLUSTER_CACHE_MAX_AGE_HOURS || '24', 10);
  
  return {
    url,
    enabled,
    timeoutMs,
    cacheMaxAgeHours,
    endpoint: url ? `${url}/api/cluster` : null
  };
};

// ==========================================
// CACHE OPERATIONS
// ==========================================

/**
 * Get cached clusters from database
 * @param {number|null} termId - School term ID (null for all terms)
 * @param {number|null} sectionCourseId - Section course ID (null for all classes)
 * @param {number|null} iloId - ILO ID (null for overall clustering, set for ILO-filtered clustering)
 * @param {number} maxAgeHours - Maximum cache age in hours (default: 24)
 * @returns {Promise<Array>} Array of cached cluster records
 */
const getCachedClusters = async (termId, sectionCourseId = null, iloId = null, standardType = null, standardId = null, maxAgeHours = 24) => {
  try {
    const maxAge = new Date();
    maxAge.setHours(maxAge.getHours() - maxAgeHours);
    
    let query, params;
    
    // If filtering by specific class, prioritize class-specific clusters
    if (sectionCourseId) {
      query = `
        SELECT DISTINCT ON (student_id)
          student_id, cluster_label, cluster_number, based_on, algorithm_used, model_version, generated_at, silhouette_score
        FROM analytics_clusters
        WHERE section_course_id = $1
          AND generated_at > $2 
          AND student_id IS NOT NULL
          ${termId ? 'AND (term_id = $3 OR term_id IS NULL)' : ''}
        ORDER BY student_id, term_id DESC NULLS LAST, generated_at DESC
      `;
      params = termId ? [sectionCourseId, maxAge, termId] : [sectionCourseId, maxAge];
    } else if (termId) {
      // For specific term: get clusters for this term OR term_id IS NULL (fallback for "all terms" clusters)
      // Prioritize term-specific clusters by ordering term_id DESC (non-null first)
      // Exclude class-specific clusters (section_course_id IS NULL)
      // Filter by Standard or ILO ID if provided (check based_on JSON field)
      if (standardType && standardId !== null && standardId !== undefined) {
        // Standard-filtered clustering: filter by standard_type and standard_id
        query = `
          SELECT DISTINCT ON (student_id)
            student_id, cluster_label, cluster_number, based_on, algorithm_used, model_version, generated_at, silhouette_score
          FROM analytics_clusters
          WHERE (term_id = $1 OR term_id IS NULL) 
            AND section_course_id IS NULL
            AND generated_at > $2 
            AND student_id IS NOT NULL
            AND (based_on->>'standard_type')::text = $3
            AND (based_on->>'standard_id')::int = $4
            AND cluster_label IS NOT NULL
          ORDER BY student_id, term_id DESC NULLS LAST, generated_at DESC
        `;
        params = [termId, maxAge, standardType, standardId];
      } else if (iloId !== null && iloId !== undefined) {
        // ILO-filtered clustering: filter by ilo_id
        query = `
          SELECT DISTINCT ON (student_id)
            student_id, cluster_label, cluster_number, based_on, algorithm_used, model_version, generated_at, silhouette_score
          FROM analytics_clusters
          WHERE (term_id = $1 OR term_id IS NULL) 
            AND section_course_id IS NULL
            AND generated_at > $2 
            AND student_id IS NOT NULL
            AND (based_on->>'ilo_id')::int = $3
            AND cluster_label IS NOT NULL
          ORDER BY student_id, term_id DESC NULLS LAST, generated_at DESC
        `;
        params = [termId, maxAge, iloId];
      } else {
        // Overall clustering: no standard or ILO filter
        query = `
          SELECT DISTINCT ON (student_id)
            student_id, cluster_label, cluster_number, based_on, algorithm_used, model_version, generated_at, silhouette_score
          FROM analytics_clusters
          WHERE (term_id = $1 OR term_id IS NULL) 
            AND section_course_id IS NULL
            AND generated_at > $2 
            AND student_id IS NOT NULL
            AND ((based_on->>'ilo_id') IS NULL OR (based_on->>'ilo_id')::text = 'null')
            AND ((based_on->>'standard_type') IS NULL OR (based_on->>'standard_type')::text = 'null')
            AND cluster_label IS NOT NULL
          ORDER BY student_id, term_id DESC NULLS LAST, generated_at DESC
        `;
        params = [termId, maxAge];
      }
    } else {
      // For all terms, get the most recent clusters per student from any term
      // Exclude class-specific clusters (section_course_id IS NULL)
      query = `
        SELECT DISTINCT ON (student_id) 
          student_id, cluster_label, cluster_number, based_on, algorithm_used, model_version, generated_at, silhouette_score
        FROM analytics_clusters
        WHERE generated_at > $1 
          AND student_id IS NOT NULL
          AND section_course_id IS NULL
        ORDER BY student_id, generated_at DESC
      `;
      params = [maxAge];
    }
    
    const result = await db.query(query, params);
    const scope = sectionCourseId ? `class: ${sectionCourseId}` : (termId ? `term: ${termId}` : 'all');
    let filterScope = ', Overall';
    if (standardType && standardId) {
      filterScope = `, ${standardType}: ${standardId}`;
    } else if (iloId) {
      filterScope = `, ILO: ${iloId}`;
    }
    console.log(`📦 [Clustering] Retrieved ${result.rows.length} cached clusters (${scope}${filterScope}, max age: ${maxAgeHours}h)`);
    
    // Log sample cluster data for debugging
    if (result.rows.length > 0) {
      const sampleCluster = result.rows[0];
      console.log(`🔍 [Clustering] Sample cached cluster:`, {
        student_id: sampleCluster.student_id,
        cluster_label: sampleCluster.cluster_label,
        cluster_number: sampleCluster.cluster_number,
        scope,
        generated_at: sampleCluster.generated_at
      });
    } else {
      console.warn(`⚠️ [Clustering] No cached clusters found (${scope}, max age: ${maxAgeHours}h)`);
    }
    
    return result.rows;
  } catch (error) {
    console.error('❌ [Clustering] Error fetching cached clusters:', error);
    return [];
  }
};

/**
 * Save clusters to database cache
 * @param {Array} clusters - Array of cluster results from ML API
 * @param {number|null} termId - School term ID
 * @param {number|null} sectionCourseId - Section course ID (null for all classes)
 * @param {number|null} iloId - ILO ID (null for overall clustering, set for ILO-filtered clustering)
 * @param {string} algorithm - Algorithm name (default: 'kmeans')
 * @param {string} version - Model version (default: '1.0')
 * @returns {Promise<void>}
 */
const saveClustersToCache = async (clusters, termId, sectionCourseId = null, iloId = null, standardType = null, standardId = null, algorithm = 'kmeans', version = '1.0') => {
  if (!clusters || clusters.length === 0) {
    console.warn('⚠️ [Clustering] No clusters to save');
    return;
  }
  
  try {
    // Delete old clusters based on scope (including Standard/ILO filter)
    // When standardType/standardId or iloId is provided, we need to delete clusters with matching filters in based_on JSON
    if (sectionCourseId !== null && sectionCourseId !== undefined) {
      // Delete old clusters for this specific class
      if (termId !== null && termId !== undefined) {
        if (standardType && standardId !== null && standardId !== undefined) {
          // Delete standard-specific clusters for this class
          await db.query(
            `DELETE FROM analytics_clusters 
             WHERE section_course_id = $1 AND term_id = $2 AND student_id IS NOT NULL
             AND ((based_on->>'standard_type')::text = $3 AND (based_on->>'standard_id')::int = $4 
                  OR (based_on->>'standard_type') IS NULL)`,
            [sectionCourseId, termId, standardType, standardId]
          );
        } else if (iloId !== null && iloId !== undefined) {
          // Delete ILO-specific clusters for this class
          await db.query(
            `DELETE FROM analytics_clusters 
             WHERE section_course_id = $1 AND term_id = $2 AND student_id IS NOT NULL
             AND ((based_on->>'ilo_id')::int = $3 OR (based_on->>'ilo_id') IS NULL)`,
            [sectionCourseId, termId, iloId]
          );
        } else {
          // Delete overall clusters (no filter) for this class
          await db.query(
            `DELETE FROM analytics_clusters 
             WHERE section_course_id = $1 AND term_id = $2 AND student_id IS NOT NULL
             AND (based_on->>'ilo_id') IS NULL AND (based_on->>'standard_type') IS NULL`,
            [sectionCourseId, termId]
          );
        }
      } else {
        await db.query(
          'DELETE FROM analytics_clusters WHERE section_course_id = $1 AND student_id IS NOT NULL',
          [sectionCourseId]
        );
      }
    } else if (termId !== null && termId !== undefined) {
      // Delete old clusters for this term (only non-class-specific)
      if (standardType && standardId !== null && standardId !== undefined) {
        // Delete standard-specific clusters for this term
        await db.query(
          `DELETE FROM analytics_clusters 
           WHERE term_id = $1 AND section_course_id IS NULL AND student_id IS NOT NULL
           AND ((based_on->>'standard_type')::text = $2 AND (based_on->>'standard_id')::int = $3 
                OR (based_on->>'standard_type') IS NULL)`,
          [termId, standardType, standardId]
        );
      } else if (iloId !== null && iloId !== undefined) {
        // Delete ILO-specific clusters for this term
        await db.query(
          `DELETE FROM analytics_clusters 
           WHERE term_id = $1 AND section_course_id IS NULL AND student_id IS NOT NULL
           AND ((based_on->>'ilo_id')::int = $2 OR (based_on->>'ilo_id') IS NULL)`,
          [termId, iloId]
        );
      } else {
        // Delete overall clusters (no filter) for this term
        await db.query(
          `DELETE FROM analytics_clusters 
           WHERE term_id = $1 AND section_course_id IS NULL AND student_id IS NOT NULL
           AND (based_on->>'ilo_id') IS NULL AND (based_on->>'standard_type') IS NULL`,
          [termId]
        );
      }
    } else {
      // For all terms, delete clusters older than 48 hours (only non-class-specific)
      const twoDaysAgo = new Date();
      twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);
      await db.query(
        'DELETE FROM analytics_clusters WHERE generated_at < $1 AND section_course_id IS NULL AND student_id IS NOT NULL',
        [twoDaysAgo]
      );
    }
    
    // Prepare batch insert
    let savedCount = 0;
    for (const cluster of clusters) {
      if (!cluster.student_id) continue;
      
      // Normalize student_id to number
      const studentId = typeof cluster.student_id === 'string' ? parseInt(cluster.student_id, 10) : cluster.student_id;
      if (isNaN(studentId)) continue;
      
      // Prepare based_on data (include ilo_id and standard info if provided)
      const basedOn = {
        attendance: cluster.attendance_percentage || null,
        score: cluster.average_score || null,
        submission_rate: cluster.submission_rate || null,
        average_days_late: cluster.average_days_late || null,
        ilo_id: cluster.ilo_id || null,  // Store ILO ID for ILO-filtered clusters
        standard_type: cluster.standard_type || null,  // Store standard type for standard-filtered clusters
        standard_id: cluster.standard_id || null  // Store standard ID for standard-filtered clusters
      };
      
      // Get cluster number (0, 1, 2, etc.)
      const clusterNumber = cluster.cluster !== undefined && cluster.cluster !== null
        ? (typeof cluster.cluster === 'string' ? parseInt(cluster.cluster, 10) : cluster.cluster)
        : null;
      
      // Normalize cluster_label to string
      let clusterLabel = cluster.cluster_label;
      if (clusterLabel === null || clusterLabel === undefined) {
        clusterLabel = null;
      } else {
        clusterLabel = String(clusterLabel);
      }
      
      // Get silhouette score from cluster result
      const silhouetteScore = cluster.silhouette_score !== null && cluster.silhouette_score !== undefined
        ? (typeof cluster.silhouette_score === 'string' ? parseFloat(cluster.silhouette_score) : cluster.silhouette_score)
        : null;
      
      // Handle INSERT with proper conflict resolution based on scope
      if (sectionCourseId !== null && sectionCourseId !== undefined && termId !== null && termId !== undefined) {
        // Class-specific clustering: use composite unique constraint
        await db.query(`
          INSERT INTO analytics_clusters 
            (student_id, term_id, section_course_id, cluster_label, cluster_number, based_on, algorithm_used, model_version, silhouette_score, generated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (student_id, term_id, section_course_id) 
          WHERE student_id IS NOT NULL AND term_id IS NOT NULL AND section_course_id IS NOT NULL
          DO UPDATE SET 
            cluster_label = EXCLUDED.cluster_label,
            cluster_number = EXCLUDED.cluster_number,
            based_on = EXCLUDED.based_on,
            algorithm_used = EXCLUDED.algorithm_used,
            model_version = EXCLUDED.model_version,
            silhouette_score = EXCLUDED.silhouette_score,
            generated_at = NOW()
        `, [
          studentId,
          termId,
          sectionCourseId,
          clusterLabel,
          clusterNumber,
          JSON.stringify(basedOn),
          algorithm,
          version,
          silhouetteScore
        ]);
      } else if (termId !== null && termId !== undefined) {
        // Term-specific clustering (no class): use term unique constraint
        await db.query(`
          INSERT INTO analytics_clusters 
            (student_id, term_id, section_course_id, cluster_label, cluster_number, based_on, algorithm_used, model_version, silhouette_score, generated_at)
          VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT (student_id, term_id) 
          WHERE student_id IS NOT NULL AND term_id IS NOT NULL AND section_course_id IS NULL
          DO UPDATE SET 
            cluster_label = EXCLUDED.cluster_label,
            cluster_number = EXCLUDED.cluster_number,
            based_on = EXCLUDED.based_on,
            algorithm_used = EXCLUDED.algorithm_used,
            model_version = EXCLUDED.model_version,
            silhouette_score = EXCLUDED.silhouette_score,
            generated_at = NOW()
        `, [
          studentId,
          termId,
          clusterLabel,
          clusterNumber,
          JSON.stringify(basedOn),
          algorithm,
          version,
          silhouetteScore
        ]);
      } else {
        // All terms clustering: delete old NULL term_id clusters for this student first
        await db.query(`
          DELETE FROM analytics_clusters 
          WHERE student_id = $1 AND term_id IS NULL AND section_course_id IS NULL
        `, [studentId]);
        
        // Insert new cluster
        await db.query(`
          INSERT INTO analytics_clusters 
            (student_id, term_id, section_course_id, cluster_label, cluster_number, based_on, algorithm_used, model_version, silhouette_score, generated_at)
          VALUES ($1, NULL, NULL, $2, $3, $4, $5, $6, $7, NOW())
        `, [
          studentId,
          clusterLabel,
          clusterNumber,
          JSON.stringify(basedOn),
          algorithm,
          version,
          silhouetteScore
        ]);
      }
      
      savedCount++;
    }
    
    const scope = sectionCourseId ? `class: ${sectionCourseId}` : (termId ? `term: ${termId}` : 'all');
    let filterScope = ', Overall';
    if (standardType && standardId) {
      filterScope = `, ${standardType}: ${standardId}`;
    } else if (iloId) {
      filterScope = `, ILO: ${iloId}`;
    }
    console.log(`💾 [Clustering] Saved ${savedCount} clusters to database cache (${scope}${filterScope})`);
    console.log(`💾 [Clustering] Cache save details:`, {
      savedCount,
      totalClusters: clusters.length,
      termId: termId || 'all',
      sectionCourseId: sectionCourseId || 'all classes',
      algorithm,
      version,
      sampleCluster: clusters.length > 0 ? {
        student_id: clusters[0].student_id,
        cluster_label: clusters[0].cluster_label,
        cluster_number: clusters[0].cluster
      } : null
    });
  } catch (error) {
    console.error('❌ [Clustering] Error saving clusters to cache:', error);
    console.error('❌ [Clustering] Cache save error stack:', error.stack);
    // Don't throw - clustering should still work even if cache save fails
  }
};

// ==========================================
// CLUSTER API OPERATIONS
// ==========================================

/**
 * Normalize student data for clustering API
 * 
 * Clustering is based on THREE primary data sources:
 * 1. TRANSMUTED SCORES: Pre-calculated transmuted scores from assessments (average_score, ilo_weighted_score, assessment_scores_by_ilo)
 * 2. SUBMISSION DATA: Submission behavior (ontime, late, missing counts and rates)
 * 3. ATTENDANCE DATA: Attendance patterns (present, absent, late counts and percentages)
 * 
 * @param {Array} students - Array of student data
 * @returns {Array} Sanitized student data ready for clustering
 */
const normalizeStudentData = (students) => {
  return students.map((row) => ({
    student_id: row.student_id,
    // ==========================================
    // 1. ATTENDANCE DATA (Primary clustering feature)
    // ==========================================
    attendance_percentage: row.attendance_percentage !== null && row.attendance_percentage !== undefined && !isNaN(row.attendance_percentage)
      ? Number(row.attendance_percentage)
      : null,
    attendance_present_count: row.attendance_present_count !== null && row.attendance_present_count !== undefined && !isNaN(row.attendance_present_count)
      ? Number(row.attendance_present_count)
      : null,
    attendance_absent_count: row.attendance_absent_count !== null && row.attendance_absent_count !== undefined && !isNaN(row.attendance_absent_count)
      ? Number(row.attendance_absent_count)
      : null,
    attendance_late_count: row.attendance_late_count !== null && row.attendance_late_count !== undefined && !isNaN(row.attendance_late_count)
      ? Number(row.attendance_late_count)
      : null,
    attendance_total_sessions: row.attendance_total_sessions !== null && row.attendance_total_sessions !== undefined && !isNaN(row.attendance_total_sessions)
      ? Number(row.attendance_total_sessions)
      : null,
    // ==========================================
    // 2. TRANSMUTED SCORES DATA (Primary clustering feature)
    // These scores follow: Raw → Adjusted → Actual → Transmuted formula
    // ==========================================
    average_score: row.average_score !== null && row.average_score !== undefined && !isNaN(row.average_score)
      ? Number(row.average_score)  // Final grade using transmuted scores (sum of transmuted_score per course, averaged)
      : null,
    ilo_weighted_score: row.ilo_weighted_score !== null && row.ilo_weighted_score !== undefined && !isNaN(row.ilo_weighted_score)
      ? Number(row.ilo_weighted_score)  // Transmuted scores with ILO boost factor applied
      : null,
    // Assessment-level transmuted scores grouped by ILO
    // Contains: {ilo_id, ilo_code, assessments: [{assessment_id, transmuted_score, weight_percentage}]}
    assessment_scores_by_ilo: row.assessment_scores_by_ilo || null,
    // ==========================================
    // 3. SUBMISSION DATA (Primary clustering feature)
    // ==========================================
    submission_rate: row.submission_rate !== null && row.submission_rate !== undefined && !isNaN(row.submission_rate)
      ? Number(row.submission_rate)
      : null,
    submission_ontime_count: row.submission_ontime_count !== null && row.submission_ontime_count !== undefined && !isNaN(row.submission_ontime_count)
      ? Number(row.submission_ontime_count)
      : null,
    submission_late_count: row.submission_late_count !== null && row.submission_late_count !== undefined && !isNaN(row.submission_late_count)
      ? Number(row.submission_late_count)
      : null,
    submission_missing_count: row.submission_missing_count !== null && row.submission_missing_count !== undefined && !isNaN(row.submission_missing_count)
      ? Number(row.submission_missing_count)
      : null,
    submission_total_assessments: row.submission_total_assessments !== null && row.submission_total_assessments !== undefined && !isNaN(row.submission_total_assessments)
      ? Number(row.submission_total_assessments)
      : null,
    average_submission_status_score: row.average_submission_status_score !== null && row.average_submission_status_score !== undefined && !isNaN(row.average_submission_status_score)
      ? Number(row.average_submission_status_score)
      : null,
    // Legacy support
    average_days_late: row.average_days_late !== null && row.average_days_late !== undefined && !isNaN(row.average_days_late)
      ? Number(row.average_days_late)
      : null,
  }));
};

/**
 * Call clustering API to get cluster assignments
 * @param {Array} students - Array of student data
 * @param {number} timeoutMs - Request timeout in milliseconds
 * @returns {Promise<Array>} Array of cluster results
 */
const callClusteringAPI = async (students, timeoutMs = 30000) => {
  const config = getClusteringConfig();
  
  if (!config.enabled || !config.endpoint) {
    throw new Error('Clustering is not enabled or service URL is not configured');
  }
  
  const sanitizedPayload = normalizeStudentData(students);
  console.log(`📤 [Clustering] Sending ${sanitizedPayload.length} students to clustering API`);
  console.log(`🔍 [Clustering] API Endpoint: ${config.endpoint}`);
  
  // Log detailed sample payload
  if (sanitizedPayload.length > 0) {
    const sample = sanitizedPayload[0];
    console.log(`🔍 [Clustering] Payload sample (first student):`, {
      student_id: sample.student_id,
      attendance_percentage: sample.attendance_percentage,
      attendance_present_count: sample.attendance_present_count,
      attendance_absent_count: sample.attendance_absent_count,
      attendance_late_count: sample.attendance_late_count,
      attendance_total_sessions: sample.attendance_total_sessions,
      average_score: sample.average_score,
      ilo_weighted_score: sample.ilo_weighted_score,
      submission_rate: sample.submission_rate,
      submission_ontime_count: sample.submission_ontime_count,
      submission_late_count: sample.submission_late_count,
      submission_missing_count: sample.submission_missing_count,
      submission_total_assessments: sample.submission_total_assessments,
      allKeys: Object.keys(sample)
    });
    
    // Check for missing critical fields
    const criticalFields = ['student_id', 'attendance_percentage', 'average_score', 'submission_rate'];
    const missingFields = criticalFields.filter(field => sample[field] === null || sample[field] === undefined);
    if (missingFields.length > 0) {
      console.warn(`⚠️ [Clustering] Sample student missing critical fields:`, missingFields);
    }
  }

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    console.log(`🔄 [Clustering] Making POST request to clustering API...`);
    console.log(`🔍 [Clustering] Full endpoint URL: ${config.endpoint}`);
    console.log(`🔍 [Clustering] Payload size: ${JSON.stringify(sanitizedPayload).length} bytes`);
    console.log(`🔍 [Clustering] Number of students: ${sanitizedPayload.length}`);
    
    const startTime = Date.now();
    
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sanitizedPayload),
      signal: controller.signal
    });
    
    const responseTime = Date.now() - startTime;
    clearTimeout(timeoutId);
    
    console.log(`📡 [Clustering] API Response received:`, {
      status: response.status,
      statusText: response.statusText,
      responseTime: `${responseTime}ms`,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      ok: response.ok
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [Clustering] API Error Response:`, {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500),
        endpoint: config.endpoint,
        payloadSize: sanitizedPayload.length
      });
      
      // Provide more specific error messages
      if (response.status === 404) {
        throw new Error(`Clustering API endpoint not found (404). Check if URL is correct: ${config.endpoint}`);
      } else if (response.status === 500) {
        throw new Error(`Clustering API server error (500). Check Python API logs for details.`);
      } else if (response.status === 503) {
        throw new Error(`Clustering API service unavailable (503). The service may be down or overloaded.`);
      } else {
        throw new Error(`Clustering API returned ${response.status}: ${errorText.substring(0, 500)}`);
      }
    }
    
    // Get raw response text first for debugging
    const responseText = await response.text();
    console.log(`🔍 [Clustering] Raw API response (first 1000 chars):`, responseText.substring(0, 1000));
    
    let clusterResults;
    try {
      clusterResults = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`❌ [Clustering] Failed to parse JSON response:`, parseError);
      console.error(`❌ [Clustering] Response text:`, responseText.substring(0, 500));
      throw new Error(`Clustering API returned invalid JSON: ${parseError.message}`);
    }
    
    console.log(`🔍 [Clustering] Parsed API response:`, {
      isArray: Array.isArray(clusterResults),
      type: typeof clusterResults,
      length: Array.isArray(clusterResults) ? clusterResults.length : 'N/A',
      sampleResult: Array.isArray(clusterResults) && clusterResults.length > 0 ? clusterResults[0] : null,
      sampleResultKeys: Array.isArray(clusterResults) && clusterResults.length > 0 ? Object.keys(clusterResults[0]) : []
    });
    
    if (!Array.isArray(clusterResults)) {
      console.error(`❌ [Clustering] Invalid response type:`, {
        received: typeof clusterResults,
        expected: 'array',
        actualValue: clusterResults
      });
      throw new Error('Clustering API returned invalid response: expected array');
    }
    
    if (clusterResults.length === 0) {
      console.error(`❌ [Clustering] API returned empty array!`);
      console.error(`❌ [Clustering] This means Python API processed ${sanitizedPayload.length} students but returned 0 results.`);
      console.error(`❌ [Clustering] Check Python API logs for errors during clustering.`);
      throw new Error('Clustering API returned empty results array');
    }
    
    if (clusterResults.length !== sanitizedPayload.length) {
      console.warn(`⚠️ [Clustering] Result count mismatch:`, {
        sent: sanitizedPayload.length,
        received: clusterResults.length,
        difference: sanitizedPayload.length - clusterResults.length
      });
    }
    
    console.log(`✅ [Clustering] Received ${clusterResults.length} cluster results from API`);
    
    // Log cluster label distribution with null detection
    if (clusterResults.length > 0) {
      const labelCounts = {};
      const nullLabels = [];
      const sampleFullResult = clusterResults[0];
      console.log(`🔍 [Clustering] Full sample result from API:`, JSON.stringify(sampleFullResult, null, 2));
      
      clusterResults.forEach((r, idx) => {
        const label = r.cluster_label || 'null';
        labelCounts[label] = (labelCounts[label] || 0) + 1;
        if (!r.cluster_label || r.cluster_label === null || r.cluster_label === undefined) {
          if (nullLabels.length < 5) {
            nullLabels.push({ 
              index: idx, 
              student_id: r.student_id, 
              cluster: r.cluster,
              cluster_label: r.cluster_label,
              clustering_explanation: r.clustering_explanation,
              allKeys: Object.keys(r)
            });
          }
        }
      });
      console.log(`📊 [Clustering] Cluster label distribution:`, labelCounts);
      if (nullLabels.length > 0 || labelCounts['null'] > 0) {
        const nullCount = labelCounts['null'] || 0;
        console.error(`❌ [Clustering] CRITICAL: Found ${nullCount} results with null cluster_label!`);
        console.error(`❌ [Clustering] Sample null label entries:`, JSON.stringify(nullLabels, null, 2));
        console.error(`❌ [Clustering] Python API failed to assign cluster labels. Check Python API logs.`);
        console.error(`❌ [Clustering] This could mean:`);
        console.error(`   - Python API encountered an error during clustering`);
        console.error(`   - Python API returned results but cluster_label field is missing/null`);
        console.error(`   - Data sent to Python API is invalid or missing required fields`);
        console.error(`   - Check clustering_explanation field for error messages`);
      }
    }
    
    return clusterResults;
  } catch (error) {
    clearTimeout(timeoutId);
    
    console.error(`❌ [Clustering] API call failed:`, {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack?.substring(0, 500)
    });
    
    if (error.name === 'AbortError') {
      console.error(`⏱️ [Clustering] Request timed out after ${timeoutMs}ms`);
      throw new Error(`Clustering API timeout after ${timeoutMs}ms`);
    }
    
    throw error;
  }
};

// ==========================================
// MAIN CLUSTERING FUNCTION
// ==========================================

/**
 * Get clusters for students with caching
 * Flow: Check cache -> If miss, call API -> Save to cache -> Return clusters
 * @param {Array} students - Array of student data with analytics
 * @param {number|null} termId - School term ID (optional)
 * @param {Object} options - Additional options
 * @param {number|null} options.sectionCourseId - Section course ID for per-class clustering (optional)
 * @param {number|null} options.iloId - ILO ID for ILO-filtered clustering (optional)
 * @param {string|null} options.standardType - Standard type ('SO', 'IGA', 'CDIO', 'SDG') for standard-filtered clustering (optional)
 * @param {number|null} options.standardId - Standard ID for standard-filtered clustering (optional)
 * @returns {Promise<Object>} Object with clusters map and metadata
 */
const getStudentClusters = async (students, termId = null, options = {}) => {
  const {
    cacheMaxAgeHours = 24,
    algorithm = 'kmeans',
    version = '1.0',
    timeoutMs = 30000,
    forceRefresh = false,
    sectionCourseId = null,
    sectionCourseIds = null, // Array of section_course_ids for faculty filtering
    iloId = null,
    standardType = null,
    standardId = null
  } = options;
  
  const config = getClusteringConfig();
  
  // Initialize result structure
  const result = {
    clusters: new Map(),
    cacheUsed: false,
    apiCalled: false,
    error: null,
    silhouetteScore: null, // Overall silhouette score for this clustering run
    config: {
      enabled: config.enabled,
      url: config.url,
      cacheMaxAgeHours
    }
  };
  
  // Step 1: Check cache first (FAST PATH) - skip if forceRefresh is true
  // For faculty filtering with multiple section_course_ids, check cache for all classes
  if (!forceRefresh && config.enabled) {
    try {
      let cachedClusters = [];
      
      // If multiple section_course_ids provided (faculty filtering), check cache for each
      if (sectionCourseIds && Array.isArray(sectionCourseIds) && sectionCourseIds.length > 0) {
        console.log(`🔍 [Clustering] Checking cache for ${sectionCourseIds.length} section_course_ids:`, sectionCourseIds);
        // Check cache for each section_course_id and combine results
        for (const scId of sectionCourseIds) {
          const classCached = await getCachedClusters(termId, scId, iloId, standardType, standardId, cacheMaxAgeHours);
          cachedClusters = cachedClusters.concat(classCached);
        }
        // Remove duplicates (same student might be in multiple classes)
        const uniqueCached = new Map();
        cachedClusters.forEach(c => {
          const studentId = typeof c.student_id === 'string' ? parseInt(c.student_id, 10) : c.student_id;
          if (!uniqueCached.has(studentId)) {
            uniqueCached.set(studentId, c);
          }
        });
        cachedClusters = Array.from(uniqueCached.values());
        console.log(`📦 [Clustering] Found cached clusters from ${sectionCourseIds.length} classes: ${cachedClusters.length} unique students`);
      } else {
        // Single section_course_id or no filtering
        cachedClusters = await getCachedClusters(termId, sectionCourseId, iloId, standardType, standardId, cacheMaxAgeHours);
      }
      
      if (cachedClusters.length > 0) {
      // Check if cache covers all students
      const cachedStudentIds = new Set(cachedClusters.map(c => c.student_id));
      const studentIds = new Set(students.map(s => s.student_id));
      const allStudentsCached = [...studentIds].every(id => cachedStudentIds.has(id));
      
      if (allStudentsCached) {
        // Cache hit - use cached data
        console.log(`✅ [Clustering] Cache hit: Found clusters for ${cachedClusters.length}/${students.length} students`);
        result.cacheUsed = true;
        
        // Build cluster map from cache (normalize student_id to ensure type consistency)
        cachedClusters.forEach(cached => {
          // Normalize student_id to number for consistent matching
          const studentId = typeof cached.student_id === 'string' ? parseInt(cached.student_id, 10) : cached.student_id;
          if (isNaN(studentId)) {
            console.warn(`⚠️ [Clustering] Invalid student_id in cached cluster:`, cached.student_id);
            return;
          }
          
          // Normalize cluster_label
          let clusterLabel = cached.cluster_label;
          if (clusterLabel === null || clusterLabel === undefined || 
              (typeof clusterLabel === 'number' && isNaN(clusterLabel)) ||
              (typeof clusterLabel === 'string' && (clusterLabel.toLowerCase() === 'nan' || clusterLabel.trim() === ''))) {
            clusterLabel = null;
          } else {
            clusterLabel = String(clusterLabel);
          }
          
          result.clusters.set(studentId, {
            cluster: cached.cluster_number,
            cluster_label: clusterLabel,
            silhouette_score: cached.silhouette_score ?? null,
            based_on: cached.based_on
          });
          
          // Store overall silhouette score from cache if available
          if (cached.silhouette_score !== null && cached.silhouette_score !== undefined && result.silhouetteScore === undefined) {
            result.silhouetteScore = typeof cached.silhouette_score === 'string' ? parseFloat(cached.silhouette_score) : cached.silhouette_score;
          }
        });
        
        return result;
      } else {
        console.log(`⚠️ [Clustering] Partial cache: Found ${cachedClusters.length}/${students.length} students in cache`);
        // Continue to API call for missing students
      }
    }
    } catch (error) {
      console.error('❌ [Clustering] Error checking cache:', error);
      // Continue to API call if cache check fails
    }
  } else {
    console.log('🔄 [Clustering] Force refresh enabled - bypassing cache');
  }
  
  // Step 2: Call clustering API (SLOW PATH) - only if enabled
  if (!config.enabled) {
    result.error = 'Clustering is disabled';
    console.warn('⚠️ [Clustering] Clustering is disabled');
    return result;
  }
  
  try {
    console.log('🔄 [Clustering] Calling clustering API...');
    console.log('🔍 [Clustering] Request details:', {
      endpoint: config.endpoint,
      studentsCount: students.length,
      timeoutMs: timeoutMs,
      termId: termId,
      sectionCourseId: sectionCourseId,
      sectionCourseIds: sectionCourseIds && Array.isArray(sectionCourseIds) ? sectionCourseIds : null,
      forceRefresh: forceRefresh
    });
    
    // Log faculty filtering info
    if (sectionCourseIds && Array.isArray(sectionCourseIds) && sectionCourseIds.length > 0) {
      console.log(`🎯 [Clustering] Faculty filtering: Computing clusters for ${students.length} students across ${sectionCourseIds.length} classes`);
      if (forceRefresh) {
        console.log(`🔄 [Clustering] Force refresh: Recomputing clusters for all students in faculty's classes`);
      }
    }
    
    // Log sample student data being sent
    if (students.length > 0) {
      console.log('🔍 [Clustering] Sample student data being sent:', {
        student_id: students[0].student_id,
        attendance_percentage: students[0].attendance_percentage,
        average_score: students[0].average_score,
        submission_rate: students[0].submission_rate,
        attendance_present_count: students[0].attendance_present_count,
        attendance_absent_count: students[0].attendance_absent_count,
        attendance_late_count: students[0].attendance_late_count
      });
    }
    
    result.apiCalled = true;
    
    const clusterResults = await callClusteringAPI(students, timeoutMs);
    
    console.log('🔍 [Clustering] API response received:', {
      resultsCount: clusterResults.length,
      sampleResult: clusterResults.length > 0 ? clusterResults[0] : null
    });
    
    if (clusterResults.length === 0) {
      console.warn('⚠️ [Clustering] Clustering API returned empty array');
      console.warn('⚠️ [Clustering] This could mean:');
      console.warn('   - API returned empty response');
      console.warn('   - API timed out or errored silently');
      console.warn('   - API endpoint is incorrect');
      result.error = 'Clustering API returned empty results';
      return result;
    }
    
    // Log detailed analysis of API response
    console.log('🔍 [Clustering] Analyzing API response:', {
      totalResults: clusterResults.length,
      resultsWithStudentId: clusterResults.filter(r => r.student_id).length,
      resultsWithCluster: clusterResults.filter(r => r.cluster !== null && r.cluster !== undefined).length,
      resultsWithClusterLabel: clusterResults.filter(r => r.cluster_label && r.cluster_label !== null && r.cluster_label !== undefined).length,
      resultsWithSilhouetteScore: clusterResults.filter(r => r.silhouette_score !== null && r.silhouette_score !== undefined).length,
      sampleResults: clusterResults.slice(0, 3).map(r => ({
        student_id: r.student_id,
        cluster: r.cluster,
        cluster_label: r.cluster_label,
        silhouette_score: r.silhouette_score,
        hasAllFields: !!(r.student_id && r.cluster !== null && r.cluster !== undefined && r.cluster_label)
      }))
    });
    
    // Build cluster map from API results
    let clustersWithLabels = 0;
    let clustersWithoutLabels = 0;
    const missingStudentIds = [];
    const nullLabelStudentIds = [];
    
    clusterResults.forEach((item, index) => {
      if (!item.student_id) {
        console.warn(`⚠️ [Clustering] Result ${index} missing student_id:`, item);
        missingStudentIds.push(index);
        return;
      }
      
      const studentId = typeof item.student_id === 'string' ? parseInt(item.student_id, 10) : item.student_id;
      if (isNaN(studentId)) {
        console.warn(`⚠️ [Clustering] Result ${index} has invalid student_id:`, item.student_id);
        missingStudentIds.push(index);
        return;
      }
      
      // Normalize cluster_label
      let clusterLabel = item.cluster_label;
      if (clusterLabel === null || clusterLabel === undefined || 
          (typeof clusterLabel === 'number' && isNaN(clusterLabel)) ||
          (typeof clusterLabel === 'string' && (clusterLabel.toLowerCase() === 'nan' || clusterLabel.trim() === ''))) {
        clusterLabel = null;
        clustersWithoutLabels++;
        nullLabelStudentIds.push({ studentId, cluster: item.cluster, rawLabel: item.cluster_label });
      } else {
        clusterLabel = String(clusterLabel);
        clustersWithLabels++;
      }
      
      result.clusters.set(studentId, {
        cluster: item.cluster ?? null,
        cluster_label: clusterLabel,
        silhouette_score: item.silhouette_score ?? null,
        based_on: {
          attendance: item.attendance_percentage || null,
          score: item.average_score || null,
          submission_rate: item.submission_rate || null,
          average_days_late: item.average_days_late || null
        }
      });
      
      // Store overall silhouette score in result (same for all students in a batch)
      if (item.silhouette_score !== null && item.silhouette_score !== undefined && result.silhouetteScore === undefined) {
        result.silhouetteScore = typeof item.silhouette_score === 'string' ? parseFloat(item.silhouette_score) : item.silhouette_score;
      }
    });
    
    if (missingStudentIds.length > 0) {
      console.warn(`⚠️ [Clustering] ${missingStudentIds.length} results missing student_id`);
    }
    
    if (nullLabelStudentIds.length > 0) {
      console.warn(`⚠️ [Clustering] ${nullLabelStudentIds.length} results have null cluster_label:`, nullLabelStudentIds.slice(0, 5));
      console.warn(`⚠️ [Clustering] This suggests Python API returned clusters but without labels. Check Python API logs.`);
    }
    
    console.log('🔍 [Clustering] Cluster map built:', {
      totalClusters: result.clusters.size,
      clustersWithLabels: clustersWithLabels,
      clustersWithoutLabels: clustersWithoutLabels,
      missingStudentIds: missingStudentIds.length,
      nullLabelCount: nullLabelStudentIds.length,
      sampleClusterEntry: result.clusters.size > 0 ? Array.from(result.clusters.entries())[0] : null,
      sampleNullLabelEntry: nullLabelStudentIds.length > 0 ? nullLabelStudentIds[0] : null
    });
    
    // Step 3: Save to cache asynchronously (non-blocking)
    if (clusterResults.length > 0) {
      // Merge student data with cluster results for saving
      const clustersToSave = clusterResults.map(clusterResult => {
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
          average_days_late: studentData?.average_days_late || null,
          ilo_id: iloId, // Include ILO ID for ILO-filtered clusters
          standard_type: standardType, // Include standard type for standard-filtered clusters
          standard_id: standardId // Include standard ID for standard-filtered clusters
        };
      });
      
      // Save to cache asynchronously (don't wait for it to complete)
      // This happens for both normal API calls and force refresh
      // For faculty filtering with multiple section_course_ids, save clusters for each class
      console.log(`💾 [Clustering] Preparing to save ${clustersToSave.length} clusters to database cache...`);
      
      if (sectionCourseIds && Array.isArray(sectionCourseIds) && sectionCourseIds.length > 0) {
        // Save clusters for each section_course_id (faculty has multiple classes)
        console.log(`💾 [Clustering] Saving clusters for ${sectionCourseIds.length} section_course_ids:`, sectionCourseIds);
        Promise.all(
          sectionCourseIds.map(scId => 
            saveClustersToCache(clustersToSave, termId, scId, iloId, standardType, standardId, algorithm, version)
              .then(() => {
                console.log(`✅ [Clustering] Saved clusters for section_course_id ${scId}`);
              })
              .catch(err => {
                console.error(`⚠️ [Clustering] Failed to save clusters for section_course_id ${scId}:`, err.message);
              })
          )
        ).then(() => {
          console.log(`✅ [Clustering] Successfully saved clusters for all ${sectionCourseIds.length} classes`);
        }).catch(err => {
          console.error('⚠️ [Clustering] Error saving clusters for some classes:', err);
        });
      } else {
        // Single section_course_id or no filtering
        saveClustersToCache(clustersToSave, termId, sectionCourseId, iloId, standardType, standardId, algorithm, version)
          .then(() => {
            const scope = sectionCourseId ? `class: ${sectionCourseId}` : (termId ? `term: ${termId}` : 'all');
            console.log(`✅ [Clustering] Successfully saved ${clustersToSave.length} clusters to database cache (${scope})`);
          })
          .catch(err => {
            console.error('⚠️ [Clustering] Failed to save clusters to cache (non-blocking):', err.message);
            console.error('⚠️ [Clustering] Cache save error details:', err);
          });
      }
    } else {
      console.warn('⚠️ [Clustering] No cluster results to save to cache');
    }
    
    console.log(`✅ [Clustering] Successfully clustered ${result.clusters.size} students`);
    return result;
  } catch (error) {
    result.error = error.message;
    console.error('❌ [Clustering] Error calling clustering API:', error.message);
    console.error('❌ [Clustering] Cluster endpoint:', config.endpoint);
    // Don't throw - return result with error, students will show "Not Clustered"
    return result;
  }
};

/**
 * Apply clusters to student data
 * @param {Array} students - Array of student data
 * @param {Map} clusterMap - Map of student_id to cluster data
 * @returns {Array} Students with cluster data added
 */
const applyClustersToStudents = (students, clusterMap) => {
  console.log('🔍 [Clustering] Applying clusters to students:', {
    studentsCount: students.length,
    clusterMapSize: clusterMap.size,
    sampleStudentIds: students.slice(0, 3).map(s => s.student_id),
    sampleClusterMapKeys: Array.from(clusterMap.keys()).slice(0, 3)
  });
  
  let matchedCount = 0;
  let unmatchedCount = 0;
  const unmatchedIds = [];
  
  const result = students.map(row => {
    const studentId = typeof row.student_id === 'string' ? parseInt(row.student_id, 10) : row.student_id;
    const clusterInfo = clusterMap.get(studentId);
    
    if (!clusterInfo) {
      unmatchedCount++;
      if (unmatchedIds.length < 5) {
        unmatchedIds.push({ studentId, studentName: row.full_name });
      }
    } else {
      matchedCount++;
    }
    
    // Normalize cluster_label
    let clusterLabel = clusterInfo?.cluster_label;
    if (clusterLabel === null || clusterLabel === undefined || 
        (typeof clusterLabel === 'number' && isNaN(clusterLabel)) ||
        (typeof clusterLabel === 'string' && (clusterLabel.toLowerCase() === 'nan' || clusterLabel.trim() === ''))) {
      clusterLabel = null;
    } else {
      clusterLabel = String(clusterLabel);
    }
    
    return {
      ...row,
      cluster: clusterInfo?.cluster ?? null,
      cluster_label: clusterLabel,
      silhouette_score: clusterInfo?.silhouette_score ?? null,
    };
  });
  
  // Detailed logging for debugging
  const studentsWithClusters = result.filter(s => s.cluster_label && s.cluster_label !== null);
  const studentsWithoutClusters = result.filter(s => !s.cluster_label || s.cluster_label === null);
  
  console.log('🔍 [Clustering] Cluster application results:', {
    totalStudents: students.length,
    matched: matchedCount,
    unmatched: unmatchedCount,
    studentsWithClusters: studentsWithClusters.length,
    studentsWithoutClusters: studentsWithoutClusters.length,
    unmatchedSampleIds: unmatchedIds,
    sampleMatchedStudent: studentsWithClusters.length > 0 ? {
      student_id: studentsWithClusters[0].student_id,
      full_name: studentsWithClusters[0].full_name,
      cluster: studentsWithClusters[0].cluster,
      cluster_label: studentsWithClusters[0].cluster_label
    } : null,
    sampleUnmatchedStudent: studentsWithoutClusters.length > 0 ? {
      student_id: studentsWithoutClusters[0].student_id,
      full_name: studentsWithoutClusters[0].full_name,
      cluster: studentsWithoutClusters[0].cluster,
      cluster_label: studentsWithoutClusters[0].cluster_label
    } : null,
    clusterMapKeys: Array.from(clusterMap.keys()).slice(0, 10),
    studentIds: students.slice(0, 10).map(s => s.student_id)
  });
  
  if (studentsWithoutClusters.length > 0 && clusterMap.size > 0) {
    console.warn('⚠️ [Clustering] Some students have no cluster labels even though cluster map has entries.');
    console.warn('⚠️ [Clustering] This suggests a student_id mismatch. Checking...');
    const firstUnmatched = studentsWithoutClusters[0];
    const matchingCluster = Array.from(clusterMap.entries()).find(([id]) => {
      const studentId = typeof firstUnmatched.student_id === 'string' ? parseInt(firstUnmatched.student_id, 10) : firstUnmatched.student_id;
      return id === studentId;
    });
    if (!matchingCluster) {
      console.warn(`⚠️ [Clustering] Student ${firstUnmatched.student_id} (${firstUnmatched.full_name}) not found in cluster map.`);
      console.warn(`⚠️ [Clustering] Available cluster map keys:`, Array.from(clusterMap.keys()).slice(0, 10));
    }
  }
  
  return result;
};

/**
 * Get cluster distribution statistics
 * @param {Array} students - Array of students with cluster data
 * @returns {Object} Cluster distribution counts
 */
const getClusterDistribution = (students) => {
  return students.reduce((acc, row) => {
    const cluster = row.cluster_label;
    // Only count valid cluster labels (skip null/undefined/invalid)
    if (cluster && 
        cluster !== null && 
        cluster !== undefined &&
        !(typeof cluster === 'number' && isNaN(cluster)) &&
        !(typeof cluster === 'string' && (cluster.toLowerCase() === 'nan' || cluster.trim() === ''))) {
      acc[cluster] = (acc[cluster] || 0) + 1;
    }
    return acc;
  }, {});
};

// ==========================================
// EXPORTS
// ==========================================

export default {
  // Configuration
  getClusteringConfig,
  isClusteringEnabled,
  getClusterServiceUrl,
  
  // Cache operations
  getCachedClusters,
  saveClustersToCache,
  
  // API operations
  callClusteringAPI,
  normalizeStudentData,
  
  // Main functions
  getStudentClusters,
  applyClustersToStudents,
  getClusterDistribution,
};

