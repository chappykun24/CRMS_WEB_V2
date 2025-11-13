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
    console.log(`📦 [Clustering] Retrieved ${result.rows.length} cached clusters (term: ${termId || 'all'}, max age: ${maxAgeHours}h)`);
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
 * @param {string} algorithm - Algorithm name (default: 'kmeans')
 * @param {string} version - Model version (default: '1.0')
 * @returns {Promise<void>}
 */
const saveClustersToCache = async (clusters, termId, algorithm = 'kmeans', version = '1.0') => {
  if (!clusters || clusters.length === 0) {
    console.warn('⚠️ [Clustering] No clusters to save');
    return;
  }
  
  try {
    // Delete old clusters for this term (if term specified)
    if (termId !== null && termId !== undefined) {
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
      
      // Normalize student_id to number
      const studentId = typeof cluster.student_id === 'string' ? parseInt(cluster.student_id, 10) : cluster.student_id;
      if (isNaN(studentId)) continue;
      
      // Prepare based_on data
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
      
      // Normalize cluster_label to string
      let clusterLabel = cluster.cluster_label;
      if (clusterLabel === null || clusterLabel === undefined) {
        clusterLabel = null;
      } else {
        clusterLabel = String(clusterLabel);
      }
      
      // Use INSERT ... ON CONFLICT to update if exists
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
    
    console.log(`💾 [Clustering] Saved ${savedCount} clusters to cache (term: ${termId || 'all'})`);
  } catch (error) {
    console.error('❌ [Clustering] Error saving clusters to cache:', error);
    // Don't throw - clustering should still work even if cache save fails
  }
};

// ==========================================
// CLUSTER API OPERATIONS
// ==========================================

/**
 * Normalize student data for clustering API
 * @param {Array} students - Array of student data
 * @returns {Array} Sanitized student data
 */
const normalizeStudentData = (students) => {
  return students.map((row) => ({
    student_id: row.student_id,
    // Attendance data
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
    // Score data
    average_score: row.average_score !== null && row.average_score !== undefined && !isNaN(row.average_score)
      ? Number(row.average_score)
      : null,
    ilo_weighted_score: row.ilo_weighted_score !== null && row.ilo_weighted_score !== undefined && !isNaN(row.ilo_weighted_score)
      ? Number(row.ilo_weighted_score)
      : null,
    // Submission behavior data
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
  
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sanitizedPayload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Clustering API returned ${response.status}: ${errorText.substring(0, 500)}`);
    }
    
    const clusterResults = await response.json();
    
    if (!Array.isArray(clusterResults)) {
      throw new Error('Clustering API returned invalid response: expected array');
    }
    
    console.log(`✅ [Clustering] Received ${clusterResults.length} cluster results from API`);
    return clusterResults;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
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
 * @returns {Promise<Object>} Object with clusters map and metadata
 */
const getStudentClusters = async (students, termId = null, options = {}) => {
  const {
    cacheMaxAgeHours = 24,
    algorithm = 'kmeans',
    version = '1.0',
    timeoutMs = 30000
  } = options;
  
  const config = getClusteringConfig();
  
  // Initialize result structure
  const result = {
    clusters: new Map(),
    cacheUsed: false,
    apiCalled: false,
    error: null,
    config: {
      enabled: config.enabled,
      url: config.url,
      cacheMaxAgeHours
    }
  };
  
  // Step 1: Check cache first (FAST PATH)
  try {
    const cachedClusters = await getCachedClusters(termId, cacheMaxAgeHours);
    
    if (cachedClusters.length > 0) {
      // Check if cache covers all students
      const cachedStudentIds = new Set(cachedClusters.map(c => c.student_id));
      const studentIds = new Set(students.map(s => s.student_id));
      const allStudentsCached = [...studentIds].every(id => cachedStudentIds.has(id));
      
      if (allStudentsCached) {
        // Cache hit - use cached data
        console.log(`✅ [Clustering] Cache hit: Found clusters for ${cachedClusters.length}/${students.length} students`);
        result.cacheUsed = true;
        
        // Build cluster map from cache
        cachedClusters.forEach(cached => {
          result.clusters.set(cached.student_id, {
            cluster: cached.cluster_number,
            cluster_label: cached.cluster_label,
            based_on: cached.based_on
          });
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
  
  // Step 2: Call clustering API (SLOW PATH) - only if enabled
  if (!config.enabled) {
    result.error = 'Clustering is disabled';
    console.warn('⚠️ [Clustering] Clustering is disabled');
    return result;
  }
  
  try {
    console.log('🔄 [Clustering] Calling clustering API...');
    result.apiCalled = true;
    
    const clusterResults = await callClusteringAPI(students, timeoutMs);
    
    if (clusterResults.length === 0) {
      console.warn('⚠️ [Clustering] Clustering API returned empty array');
      result.error = 'Clustering API returned empty results';
      return result;
    }
    
    // Build cluster map from API results
    clusterResults.forEach(item => {
      const studentId = typeof item.student_id === 'string' ? parseInt(item.student_id, 10) : item.student_id;
      
      // Normalize cluster_label
      let clusterLabel = item.cluster_label;
      if (clusterLabel === null || clusterLabel === undefined || 
          (typeof clusterLabel === 'number' && isNaN(clusterLabel)) ||
          (typeof clusterLabel === 'string' && (clusterLabel.toLowerCase() === 'nan' || clusterLabel.trim() === ''))) {
        clusterLabel = null;
      } else {
        clusterLabel = String(clusterLabel);
      }
      
      result.clusters.set(studentId, {
        cluster: item.cluster ?? null,
        cluster_label: clusterLabel,
        based_on: {
          attendance: item.attendance_percentage || null,
          score: item.average_score || null,
          submission_rate: item.submission_rate || null,
          average_days_late: item.average_days_late || null
        }
      });
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
          average_days_late: studentData?.average_days_late || null
        };
      });
      
      // Save to cache asynchronously (don't wait for it to complete)
      saveClustersToCache(clustersToSave, termId, algorithm, version).catch(err => {
        console.error('⚠️ [Clustering] Failed to save clusters to cache (non-blocking):', err.message);
      });
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
  return students.map(row => {
    const studentId = typeof row.student_id === 'string' ? parseInt(row.student_id, 10) : row.student_id;
    const clusterInfo = clusterMap.get(studentId);
    
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
    };
  });
};

/**
 * Get cluster distribution statistics
 * @param {Array} students - Array of students with cluster data
 * @returns {Object} Cluster distribution counts
 */
const getClusterDistribution = (students) => {
  return students.reduce((acc, row) => {
    const cluster = row.cluster_label || 'Not Clustered';
    acc[cluster] = (acc[cluster] || 0) + 1;
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

