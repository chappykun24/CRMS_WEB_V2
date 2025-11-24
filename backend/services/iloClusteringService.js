import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==========================================
// IN-MEMORY CACHE
// ==========================================

// In-memory cache for cluster results
// Key format: `section_course_id:ilo_id:so_id:sdg_id:iga_id:cdio_id`
const clusterCache = new Map();

// Cache entry structure: { data, timestamp, expiresAt }
const CACHE_TTL_MS = parseInt(process.env.ILO_CLUSTER_CACHE_TTL_MS || '3600000', 10); // 1 hour default

/**
 * Generate cache key from parameters
 */
function generateCacheKey(sectionCourseId, iloId, filters = {}) {
  const { soId, sdgId, igaId, cdioId } = filters;
  return `${sectionCourseId}:${iloId}:${soId || 'null'}:${sdgId || 'null'}:${igaId || 'null'}:${cdioId || 'null'}`;
}

/**
 * Get cached cluster results from memory
 */
function getCachedClusters(sectionCourseId, iloId, filters = {}) {
  const key = generateCacheKey(sectionCourseId, iloId, filters);
  const cached = clusterCache.get(key);
  
  if (!cached) {
    return null;
  }
  
  // Check if cache is expired
  if (Date.now() > cached.expiresAt) {
    clusterCache.delete(key);
    console.log(`🗑️ [ILO CLUSTERING] Cache expired for key: ${key}`);
    return null;
  }
  
  console.log(`✅ [ILO CLUSTERING] Cache hit for key: ${key}`);
  return cached.data;
}

/**
 * Set cluster results in memory cache
 */
function setCachedClusters(sectionCourseId, iloId, filters = {}, data) {
  const key = generateCacheKey(sectionCourseId, iloId, filters);
  const expiresAt = Date.now() + CACHE_TTL_MS;
  
  clusterCache.set(key, {
    data,
    timestamp: Date.now(),
    expiresAt
  });
  
  console.log(`💾 [ILO CLUSTERING] Cached cluster results for key: ${key} (expires in ${CACHE_TTL_MS / 1000 / 60} minutes)`);
  
  // Clean up expired entries periodically (every 10 minutes)
  if (clusterCache.size > 100) {
    cleanupExpiredCache();
  }
}

/**
 * Clean up expired cache entries
 */
function cleanupExpiredCache() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, entry] of clusterCache.entries()) {
    if (now > entry.expiresAt) {
      clusterCache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 [ILO CLUSTERING] Cleaned up ${cleaned} expired cache entries`);
  }
}

/**
 * Clear cache for specific parameters
 */
export function clearClusterCache(sectionCourseId, iloId, filters = {}) {
  const key = generateCacheKey(sectionCourseId, iloId, filters);
  const deleted = clusterCache.delete(key);
  if (deleted) {
    console.log(`🗑️ [ILO CLUSTERING] Cleared cache for key: ${key}`);
  }
  return deleted;
}

/**
 * Clear all cluster cache
 */
export function clearAllClusterCache() {
  const size = clusterCache.size;
  clusterCache.clear();
  console.log(`🗑️ [ILO CLUSTERING] Cleared all cache (${size} entries)`);
  return size;
}

// ==========================================
// DATABASE CACHE
// ==========================================

/**
 * Get cached clusters from database
 */
async function getCachedClustersFromDB(sectionCourseId, iloId, filters = {}, maxAgeHours = 24) {
  try {
    const maxAge = new Date();
    maxAge.setHours(maxAge.getHours() - maxAgeHours);
    
    const { soId, sdgId, igaId, cdioId } = filters;
    
    // Build query with filters
    let query = `
      SELECT 
        cache_key,
        cluster_data,
        generated_at
      FROM ilo_cluster_cache
      WHERE section_course_id = $1
        AND ilo_id = $2
        AND generated_at > $3
    `;
    
    const params = [sectionCourseId, iloId, maxAge];
    let paramIndex = 4;
    
    if (soId) {
      query += ` AND so_id = $${paramIndex}`;
      params.push(soId);
      paramIndex++;
    } else {
      query += ` AND so_id IS NULL`;
    }
    
    if (sdgId) {
      query += ` AND sdg_id = $${paramIndex}`;
      params.push(sdgId);
      paramIndex++;
    } else {
      query += ` AND sdg_id IS NULL`;
    }
    
    if (igaId) {
      query += ` AND iga_id = $${paramIndex}`;
      params.push(igaId);
      paramIndex++;
    } else {
      query += ` AND iga_id IS NULL`;
    }
    
    if (cdioId) {
      query += ` AND cdio_id = $${paramIndex}`;
      params.push(cdioId);
      paramIndex++;
    } else {
      query += ` AND cdio_id IS NULL`;
    }
    
    query += ` ORDER BY generated_at DESC LIMIT 1`;
    
    const result = await db.query(query, params);
    
    if (result.rows.length > 0) {
      const cached = result.rows[0];
      console.log(`📦 [ILO CLUSTERING] Found database cache (age: ${Math.round((Date.now() - new Date(cached.generated_at).getTime()) / 1000 / 60)} minutes)`);
      return JSON.parse(cached.cluster_data);
    }
    
    return null;
  } catch (error) {
    console.error('❌ [ILO CLUSTERING] Error fetching from database cache:', error);
    return null;
  }
}

/**
 * Save clusters to database cache
 */
async function saveClustersToDB(sectionCourseId, iloId, filters = {}, clusterData) {
  try {
    const { soId, sdgId, igaId, cdioId } = filters;
    const cacheKey = generateCacheKey(sectionCourseId, iloId, filters);
    
    // Delete old cache entries for this combination
    let deleteQuery = `
      DELETE FROM ilo_cluster_cache
      WHERE section_course_id = $1
        AND ilo_id = $2
    `;
    const deleteParams = [sectionCourseId, iloId];
    let paramIndex = 3;
    
    if (soId) {
      deleteQuery += ` AND so_id = $${paramIndex}`;
      deleteParams.push(soId);
      paramIndex++;
    } else {
      deleteQuery += ` AND so_id IS NULL`;
    }
    
    if (sdgId) {
      deleteQuery += ` AND sdg_id = $${paramIndex}`;
      deleteParams.push(sdgId);
      paramIndex++;
    } else {
      deleteQuery += ` AND sdg_id IS NULL`;
    }
    
    if (igaId) {
      deleteQuery += ` AND iga_id = $${paramIndex}`;
      deleteParams.push(igaId);
      paramIndex++;
    } else {
      deleteQuery += ` AND iga_id IS NULL`;
    }
    
    if (cdioId) {
      deleteQuery += ` AND cdio_id = $${paramIndex}`;
      deleteParams.push(cdioId);
      paramIndex++;
    } else {
      deleteQuery += ` AND cdio_id IS NULL`;
    }
    
    await db.query(deleteQuery, deleteParams);
    
    // Insert new cache entry
    // Use a unique constraint approach - PostgreSQL doesn't support COALESCE in UNIQUE constraints directly
    // So we'll use a composite unique index approach
    const insertQuery = `
      INSERT INTO ilo_cluster_cache (
        section_course_id,
        ilo_id,
        so_id,
        sdg_id,
        iga_id,
        cdio_id,
        cache_key,
        cluster_data,
        generated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (cache_key)
      DO UPDATE SET
        cluster_data = EXCLUDED.cluster_data,
        generated_at = EXCLUDED.generated_at
    `;
    
    await db.query(insertQuery, [
      sectionCourseId,
      iloId,
      soId || null,
      sdgId || null,
      igaId || null,
      cdioId || null,
      cacheKey,
      JSON.stringify(clusterData)
    ]);
    
    console.log(`💾 [ILO CLUSTERING] Saved to database cache`);
  } catch (error) {
    // Check if it's a "table doesn't exist" error
    if (error.message && error.message.includes('does not exist')) {
      console.warn('⚠️ [ILO CLUSTERING] Cache table does not exist yet. Run migration: db/migrations/add_ilo_cluster_cache_table.sql');
    } else {
      console.error('❌ [ILO CLUSTERING] Error saving to database cache:', error.message);
    }
    // Don't throw - caching failure shouldn't break the service
  }
}

/**
 * Get ILO-based clustering results by calling Python script
 * Uses multi-level caching: in-memory -> database -> Python script
 * This function ALWAYS resolves - it never rejects, returning empty clusters on error
 */
export async function getILOClusters(sectionCourseId, iloId, filters = {}, options = {}) {
  // Wrap everything in try-catch to ensure we never throw
  try {
    const { forceRefresh = false, maxAgeHours = 24 } = options;
    const { soId, sdgId, igaId, cdioId } = filters;
    
    // Step 1: Check in-memory cache (FASTEST)
    if (!forceRefresh) {
      try {
        const cached = getCachedClusters(sectionCourseId, iloId, filters);
        if (cached) {
          return cached;
        }
      } catch (cacheError) {
        console.warn('⚠️ [ILO CLUSTERING] Error checking memory cache:', cacheError.message);
      }
      
      // Step 2: Check database cache (FAST)
      // Wrap in try-catch in case table doesn't exist yet
      try {
        const dbCached = await getCachedClustersFromDB(sectionCourseId, iloId, filters, maxAgeHours);
        if (dbCached) {
          // Store in memory cache for faster access next time
          try {
            setCachedClusters(sectionCourseId, iloId, filters, dbCached);
          } catch (setCacheError) {
            console.warn('⚠️ [ILO CLUSTERING] Error setting memory cache:', setCacheError.message);
          }
          return dbCached;
        }
      } catch (dbError) {
        // If table doesn't exist or there's a DB error, log and continue to Python script
        console.warn('⚠️ [ILO CLUSTERING] Database cache check failed (table may not exist yet):', dbError.message);
      }
    }
    
    // Step 3: Call Python script (SLOW)
    console.log(`🔄 [ILO CLUSTERING] Cache miss - calling Python script...`);
    
    // Check if script exists before attempting to run
    const scriptPath = join(__dirname, '../../scripts/ilo-clustering-analysis.py');
    
    try {
      const fs = await import('fs/promises');
      await fs.access(scriptPath);
    } catch (accessError) {
      console.error(`❌ [ILO CLUSTERING] Python script not found at: ${scriptPath}`);
      // Return empty clusters instead of failing
      const emptyResult = {
        clusters: [],
        summary: {
          error: 'Python script not available',
          message: 'Clustering script not found. Please ensure the script is installed.',
          optimal_k: null,
          silhouette_score: null
        },
        optimal_k: null,
        silhouette_score: null
      };
      // Cache empty result to avoid repeated attempts (both in-memory and database)
      try {
        setCachedClusters(sectionCourseId, iloId, filters, emptyResult);
        // Also save to database cache to persist across server restarts
        saveClustersToDB(sectionCourseId, iloId, filters, emptyResult).catch(err => {
          console.warn('⚠️ [ILO CLUSTERING] Failed to save empty result to DB cache:', err.message);
        });
      } catch (setCacheError) {
        console.warn('⚠️ [ILO CLUSTERING] Error setting cache for empty result:', setCacheError.message);
      }
      return emptyResult;
    }
    
    return new Promise((resolve) => {
      // Promise always resolves, never rejects
    
    // Build command arguments
    const args = [
      scriptPath,
      '--section_course_id', sectionCourseId.toString(),
      '--ilo_id', iloId.toString(),
      '--min_k', '2',
      '--max_k', '6',
      '--output_dir', './temp_clustering_results'
    ];
    
    if (soId) args.push('--so_id', soId.toString());
    if (sdgId) args.push('--sdg_id', sdgId.toString());
    if (igaId) args.push('--iga_id', igaId.toString());
    if (cdioId) args.push('--cdio_id', cdioId.toString());
    
    // Spawn Python process - try python3 first, fallback to python
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
    
    let timeoutId;
    let stdout = '';
    let stderr = '';
    let pythonProcess;
    
    try {
      pythonProcess = spawn(pythonCommand, args, {
        cwd: join(__dirname, '../../'),
        env: { ...process.env },
        shell: process.platform === 'win32' // Use shell on Windows
      });
      
      // Add timeout to prevent hanging forever (5 minutes) - after process is created
      timeoutId = setTimeout(() => {
        if (pythonProcess && !pythonProcess.killed) {
          pythonProcess.kill();
          console.error('❌ [ILO CLUSTERING] Python script execution timeout');
          
          // Return empty clusters instead of rejecting
          const errorResult = {
            clusters: [],
            summary: {
              error: 'Execution timeout',
              message: 'Python script execution timeout (exceeded 5 minutes). The script may be taking too long or hanging.',
              optimal_k: null,
              silhouette_score: null
            },
            optimal_k: null,
            silhouette_score: null
          };
          
          setCachedClusters(sectionCourseId, iloId, filters, errorResult);
          // Also save to database cache to persist across server restarts
          saveClustersToDB(sectionCourseId, iloId, filters, errorResult).catch(err => {
            console.warn('⚠️ [ILO CLUSTERING] Failed to save timeout error result to DB cache:', err.message);
          });
          resolve(errorResult);
        }
      }, 5 * 60 * 1000);
    } catch (spawnError) {
      if (timeoutId) clearTimeout(timeoutId);
      console.error(`❌ [ILO CLUSTERING] Failed to start Python process:`, spawnError);
      
      // Return empty clusters instead of rejecting
      const errorResult = {
        clusters: [],
        summary: {
          error: 'Process spawn failed',
          message: `Failed to start Python process: ${spawnError.message}`,
          optimal_k: null,
          silhouette_score: null
        },
        optimal_k: null,
        silhouette_score: null
      };
      
      // Cache error result (both in-memory and database)
      setCachedClusters(sectionCourseId, iloId, filters, errorResult);
      // Also save to database cache to persist across server restarts
      saveClustersToDB(sectionCourseId, iloId, filters, errorResult).catch(err => {
        console.warn('⚠️ [ILO CLUSTERING] Failed to save spawn error result to DB cache:', err.message);
      });
      resolve(errorResult);
      return;
    }
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('[ILO CLUSTERING] Python output:', data.toString());
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('[ILO CLUSTERING] Python error:', data.toString());
    });
    
    pythonProcess.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      
      // Handle async operations
      (async () => {
        if (code !== 0) {
          const errorMsg = (stderr || stdout || 'Unknown error').substring(0, 1000);
          console.error(`❌ [ILO CLUSTERING] Python script exited with code ${code}:`, errorMsg);
          
          // Return empty clusters instead of rejecting
          const errorResult = {
            clusters: [],
            summary: {
              error: `Python script failed (exit code ${code})`,
              message: errorMsg,
              optimal_k: null,
              silhouette_score: null
            },
            optimal_k: null,
            silhouette_score: null
          };
          
          // Cache error result to avoid repeated failed attempts (both in-memory and database)
          setCachedClusters(sectionCourseId, iloId, filters, errorResult);
          // Also save to database cache to persist across server restarts
          saveClustersToDB(sectionCourseId, iloId, filters, errorResult).catch(err => {
            console.warn('⚠️ [ILO CLUSTERING] Failed to save error result to DB cache:', err.message);
          });
          resolve(errorResult);
          return;
        }
        
        // Parse the output - the script should output JSON summary
        try {
          // Try to read the JSON output file
          const fsModule = await import('fs/promises');
          const outputDir = join(__dirname, '../../temp_clustering_results');
        
          // Check if output directory exists
          try {
            await fsModule.access(outputDir);
          } catch (accessError) {
            // Directory doesn't exist, create it
            await fsModule.mkdir(outputDir, { recursive: true });
          }
          
          const files = await fsModule.readdir(outputDir);
        const summaryFile = files.find(f => f.startsWith('ilo_clustering_summary_') && f.endsWith('.json'));
        
          if (summaryFile) {
            const summaryPath = join(outputDir, summaryFile);
            const summaryContent = await fsModule.readFile(summaryPath, 'utf8');
            const summary = JSON.parse(summaryContent);
            
            // Read CSV results to get cluster assignments
            const csvFile = files.find(f => f.startsWith('ilo_clustering_results_') && f.endsWith('.csv'));
            if (csvFile) {
              const csvPath = join(outputDir, csvFile);
              const csvContent = await fsModule.readFile(csvPath, 'utf8');
              const clusters = parseCSVWithClusters(csvContent);
            
              const result = {
                clusters: clusters,
                summary: summary,
                optimal_k: summary.optimal_k,
                silhouette_score: summary.silhouette_score
              };
              
              // Cache the results (both in-memory and database)
              setCachedClusters(sectionCourseId, iloId, filters, result);
              saveClustersToDB(sectionCourseId, iloId, filters, result).catch(err => {
                console.error('❌ [ILO CLUSTERING] Failed to save to DB cache:', err);
              });
              
              resolve(result);
            } else {
              const result = {
                clusters: [],
                summary: summary
              };
              
              // Cache even empty results to avoid repeated calls (both in-memory and database)
              setCachedClusters(sectionCourseId, iloId, filters, result);
              // Also save to database cache
              saveClustersToDB(sectionCourseId, iloId, filters, result).catch(err => {
                console.warn('⚠️ [ILO CLUSTERING] Failed to save empty result to DB cache:', err.message);
              });
              
              resolve(result);
            }
          } else {
            // Fallback: return empty clusters instead of failing
            console.warn('[ILO CLUSTERING] No output files found. Python stdout:', stdout.substring(0, 500));
            console.warn('[ILO CLUSTERING] Python stderr:', stderr.substring(0, 500));
            
            // Return empty clusters with error info instead of rejecting
            const errorResult = {
              clusters: [],
              summary: {
                error: 'No output files generated',
                message: 'Python script completed but no output files were found. Check Python script configuration and dependencies.',
                stdout: stdout.substring(0, 1000),
                stderr: stderr.substring(0, 1000),
                optimal_k: null,
                silhouette_score: null
              },
              optimal_k: null,
              silhouette_score: null
            };
            
            // Cache error result to avoid repeated failed attempts (both in-memory and database)
            setCachedClusters(sectionCourseId, iloId, filters, errorResult);
            // Also save to database cache to persist across server restarts
            saveClustersToDB(sectionCourseId, iloId, filters, errorResult).catch(err => {
              console.warn('⚠️ [ILO CLUSTERING] Failed to save error result to DB cache:', err.message);
            });
            resolve(errorResult);
          }
        } catch (error) {
          console.error('[ILO CLUSTERING] Error parsing results:', error);
          // Return empty clusters instead of rejecting
          const errorResult = {
            clusters: [],
            summary: {
              error: 'Parsing failed',
              message: `Failed to parse clustering results: ${error.message}`,
              stdout: stdout.substring(0, 1000),
              stderr: stderr.substring(0, 1000),
              optimal_k: null,
              silhouette_score: null
            },
            optimal_k: null,
            silhouette_score: null
          };
          
          setCachedClusters(sectionCourseId, iloId, filters, errorResult);
          // Also save to database cache to persist across server restarts
          saveClustersToDB(sectionCourseId, iloId, filters, errorResult).catch(dbErr => {
            console.warn('⚠️ [ILO CLUSTERING] Failed to save parsing error result to DB cache:', dbErr.message);
          });
          resolve(errorResult);
        }
      })().catch(err => {
        console.error('[ILO CLUSTERING] Unexpected error in async handler:', err);
        // Final fallback - return empty clusters
        const errorResult = {
          clusters: [],
          summary: {
            error: 'Unexpected error',
            message: err.message,
            optimal_k: null,
            silhouette_score: null
          },
          optimal_k: null,
          silhouette_score: null
        };
        setCachedClusters(sectionCourseId, iloId, filters, errorResult);
        resolve(errorResult);
      });
    });
    
    pythonProcess.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      const errorMsg = error.code === 'ENOENT' 
        ? `Python not found. Please ensure Python 3 is installed and accessible. Tried: ${pythonCommand}. Original error: ${error.message}`
        : `Failed to spawn Python process: ${error.message}`;
      console.error(`❌ [ILO CLUSTERING] ${errorMsg}`);
      
      // Return empty clusters instead of rejecting
      const errorResult = {
        clusters: [],
        summary: {
          error: 'Python process error',
          message: errorMsg,
          optimal_k: null,
          silhouette_score: null
        },
        optimal_k: null,
        silhouette_score: null
      };
      
      // Cache error result to avoid repeated failed attempts (both in-memory and database)
      setCachedClusters(sectionCourseId, iloId, filters, errorResult);
      // Also save to database cache to persist across server restarts
      saveClustersToDB(sectionCourseId, iloId, filters, errorResult).catch(err => {
        console.warn('⚠️ [ILO CLUSTERING] Failed to save process error result to DB cache:', err.message);
      });
      resolve(errorResult);
    });
    
    // Handle timeout
    if (timeoutId) {
      // Timeout is already set in the try block above
    }
  });
  } catch (outerError) {
    // Final catch-all - should never reach here, but just in case
    console.error('❌ [ILO CLUSTERING] Unexpected error in getILOClusters:', outerError);
    console.error('❌ [ILO CLUSTERING] Stack:', outerError.stack);
    
    // Return empty clusters as a promise
    return Promise.resolve({
      clusters: [],
      summary: {
        error: 'Unexpected error',
        message: outerError.message || 'An unexpected error occurred',
        optimal_k: null,
        silhouette_score: null
      },
      optimal_k: null,
      silhouette_score: null
    });
  }
}

/**
 * Parse CSV content and group students by cluster
 */
function parseCSVWithClusters(csvContent) {
  const lines = csvContent.split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const clusterIndex = headers.indexOf('cluster');
  const studentIdIndex = headers.indexOf('student_id');
  
  if (clusterIndex === -1) return [];
  
  const clusters = {};
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim());
    const clusterId = parseInt(values[clusterIndex]);
    const studentId = parseInt(values[studentIdIndex]);
    
    if (isNaN(clusterId) || isNaN(studentId)) continue;
    
    if (!clusters[clusterId]) {
      clusters[clusterId] = {
        cluster_id: clusterId,
        students: []
      };
    }
    
    // Parse student data
    const student = {};
    headers.forEach((header, idx) => {
      student[header] = values[idx];
    });
    
    clusters[clusterId].students.push({
      student_id: parseInt(student.student_id),
      student_number: student.student_number,
      full_name: student.full_name,
      ilo_score: parseFloat(student.ilo_score) || 0,
      ilo_percentage: parseFloat(student.ilo_percentage) || 0,
      cluster: clusterId
    });
  }
  
  // Convert to array and add counts
  return Object.values(clusters).map(cluster => ({
    cluster_id: cluster.cluster_id,
    student_count: cluster.students.length,
    avg_ilo_percentage: cluster.students.length > 0
      ? cluster.students.reduce((sum, s) => sum + (s.ilo_percentage || 0), 0) / cluster.students.length
      : 0,
    students: cluster.students
  }));
}

