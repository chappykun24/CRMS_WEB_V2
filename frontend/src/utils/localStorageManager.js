/**
 * LocalStorage Manager with Quota Management
 * Handles localStorage operations with automatic cleanup and error handling
 */

// Priority order for cache cleanup (lower priority = cleaned first)
const CACHE_PRIORITY = {
  // Critical - never clean
  'authToken': 0,
  'userData': 0,
  
  // High priority - clean last
  'selectedClass': 1,
  'dean_dashboard_stats': 2,
  
  // Medium priority
  'userMgmtActiveTab': 3,
  'schoolConfigActiveTab': 3,
  
  // Low priority - clean first
  'faculty_classes_': 10,
  'students_': 10,
  'classes_': 10,
  'cache_': 10,
}

// Estimated size limits (in bytes)
const ESTIMATED_SIZE_LIMIT = 4 * 1024 * 1024 // 4MB (leave 1MB buffer from typical 5MB limit)

/**
 * Get the priority of a cache key
 */
const getCachePriority = (key) => {
  for (const [pattern, priority] of Object.entries(CACHE_PRIORITY)) {
    if (key.startsWith(pattern) || key === pattern) {
      return priority
    }
  }
  return 5 // Default medium priority
}

/**
 * Get estimated size of localStorage
 */
const getLocalStorageSize = () => {
  let total = 0
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length
    }
  }
  return total
}

/**
 * Clean up old cache entries when quota is exceeded
 */
const cleanupLocalStorage = (targetSize = ESTIMATED_SIZE_LIMIT) => {
  console.log('🧹 [LocalStorage] Starting cleanup...')
  
  const currentSize = getLocalStorageSize()
  if (currentSize < targetSize) {
    console.log('✅ [LocalStorage] No cleanup needed, size:', Math.round(currentSize / 1024), 'KB')
    return
  }
  
  // Get all keys with their priorities and sizes
  const cacheEntries = []
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const value = localStorage.getItem(key)
      const size = key.length + value.length
      const priority = getCachePriority(key)
      
      cacheEntries.push({
        key,
        size,
        priority,
        timestamp: getCacheTimestamp(key, value)
      })
    }
  }
  
  // Sort by priority (higher first) then by timestamp (older first)
  cacheEntries.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority // Lower priority first (clean first)
    }
    return (a.timestamp || 0) - (b.timestamp || 0) // Older first
  })
  
  // Remove low priority and old entries until we're under target size
  let freedSpace = 0
  const keysToRemove = []
  const targetFreedSpace = currentSize - targetSize
  
  for (const entry of cacheEntries) {
    // Never remove critical data
    if (entry.priority === 0) continue
    
    // Skip selectedClass if it's recent (less than 1 hour old)
    if (entry.key === 'selectedClass' && entry.timestamp) {
      const age = Date.now() - entry.timestamp
      if (age < 60 * 60 * 1000) continue // Keep if less than 1 hour old
    }
    
    keysToRemove.push(entry.key)
    freedSpace += entry.size
    
    // Stop when we've freed enough space
    if (freedSpace >= targetFreedSpace) {
      break
    }
  }
  
  // Remove the keys
  keysToRemove.forEach(key => {
    console.log('🗑️ [LocalStorage] Removing:', key)
    localStorage.removeItem(key)
  })
  
  console.log('✅ [LocalStorage] Cleanup complete. Freed:', Math.round(freedSpace / 1024), 'KB')
}

/**
 * Try to extract timestamp from cached data
 */
const getCacheTimestamp = (key, value) => {
  try {
    const parsed = JSON.parse(value)
    if (parsed.timestamp) {
      return parsed.timestamp
    }
  } catch (e) {
    // Not JSON or no timestamp
  }
  return Date.now() // Default to now (will be cleaned last)
}

/**
 * Safe setItem with quota management
 */
export const setLocalStorageItem = (key, value) => {
  try {
    // Check if we're close to quota limit
    const currentSize = getLocalStorageSize()
    const newItemSize = key.length + JSON.stringify(value).length
    
    // If adding this item would exceed limit, clean up first
    if (currentSize + newItemSize > ESTIMATED_SIZE_LIMIT) {
      console.warn('⚠️ [LocalStorage] Approaching quota limit, cleaning up...')
      cleanupLocalStorage(ESTIMATED_SIZE_LIMIT - newItemSize - 100 * 1024) // Leave 100KB buffer
    }
    
    // Try to set the item
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.error('❌ [LocalStorage] Quota exceeded for key:', key)
      
      // Try aggressive cleanup
      try {
        cleanupLocalStorage(ESTIMATED_SIZE_LIMIT * 0.7) // Clean to 70% of limit
        
        // Try again
        localStorage.setItem(key, JSON.stringify(value))
        console.log('✅ [LocalStorage] Successfully stored after cleanup')
        return true
      } catch (retryError) {
        console.error('❌ [LocalStorage] Failed to store even after cleanup:', retryError)
        
        // Last resort: remove only the oldest cache entries
        try {
          const keys = Object.keys(localStorage).filter(k => 
            getCachePriority(k) > 2 && k !== 'authToken' && k !== 'userData'
          )
          
          // Remove a few old entries
          keys.slice(0, 5).forEach(k => {
            console.log('🗑️ [LocalStorage] Emergency removal:', k)
            localStorage.removeItem(k)
          })
          
          localStorage.setItem(key, JSON.stringify(value))
          return true
        } catch (finalError) {
          console.error('❌ [LocalStorage] Final attempt failed:', finalError)
          return false
        }
      }
    }
    
    console.error('❌ [LocalStorage] Error setting item:', error)
    return false
  }
}

/**
 * Safe getItem
 */
export const getLocalStorageItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key)
    if (item === null) return defaultValue
    
    // Try to parse as JSON, fallback to raw string for backward compatibility
    try {
      return JSON.parse(item)
    } catch (parseError) {
      // If it's not JSON, return the raw string (for backward compatibility)
      return item
    }
  } catch (error) {
    console.error('❌ [LocalStorage] Error getting item:', key, error)
    return defaultValue
  }
}

/**
 * Safe removeItem
 */
export const removeLocalStorageItem = (key) => {
  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error('❌ [LocalStorage] Error removing item:', error)
    return false
  }
}

/**
 * Store only essential data for selectedClass (reduces size)
 */
export const setSelectedClass = (classItem) => {
  if (!classItem) {
    removeLocalStorageItem('selectedClass')
    return
  }
  
  // Store only essential fields to reduce size
  const essentialData = {
    section_course_id: classItem.section_course_id,
    course_code: classItem.course_code,
    course_title: classItem.course_title,
    section_code: classItem.section_code,
    semester: classItem.semester,
    school_year: classItem.school_year,
    // Only include banner data if it exists (can be large)
    banner_type: classItem.banner_type,
    banner_color: classItem.banner_color,
    // Don't store banner_image URL if it's very long
    banner_image: classItem.banner_image && classItem.banner_image.length < 500 
      ? classItem.banner_image 
      : null,
    timestamp: Date.now()
  }
  
  setLocalStorageItem('selectedClass', essentialData)
}

/**
 * Get selectedClass (with fallback to full object if needed)
 */
export const getSelectedClass = () => {
  return getLocalStorageItem('selectedClass', null)
}

/**
 * Clear all non-essential cache
 */
export const clearNonEssentialCache = () => {
  const essentialKeys = ['authToken', 'userData', 'selectedClass']
  const keys = Object.keys(localStorage)
  
  keys.forEach(key => {
    if (!essentialKeys.includes(key) && getCachePriority(key) > 0) {
      localStorage.removeItem(key)
      console.log('🗑️ [LocalStorage] Removed:', key)
    }
  })
}

/**
 * Get localStorage usage statistics
 */
export const getStorageStats = () => {
  const stats = {
    totalSize: 0,
    itemCount: 0,
    items: []
  }
  
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const value = localStorage.getItem(key)
      const size = key.length + value.length
      stats.totalSize += size
      stats.itemCount++
      stats.items.push({
        key,
        size,
        priority: getCachePriority(key)
      })
    }
  }
  
  return stats
}

/**
 * Initialize cleanup on app load
 */
export const initializeStorageCleanup = () => {
  // Clean up on app start
  const currentSize = getLocalStorageSize()
  if (currentSize > ESTIMATED_SIZE_LIMIT * 0.8) {
    console.log('🧹 [LocalStorage] Storage is 80% full, cleaning up...')
    cleanupLocalStorage(ESTIMATED_SIZE_LIMIT * 0.7)
  }
  
  // Set up periodic cleanup (every 10 minutes)
  setInterval(() => {
    const size = getLocalStorageSize()
    if (size > ESTIMATED_SIZE_LIMIT * 0.9) {
      console.log('🧹 [LocalStorage] Periodic cleanup triggered')
      cleanupLocalStorage(ESTIMATED_SIZE_LIMIT * 0.8)
    }
  }, 10 * 60 * 1000) // 10 minutes
}

