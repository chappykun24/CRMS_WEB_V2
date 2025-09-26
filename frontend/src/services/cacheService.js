// Cache clearing service for development
class CacheService {
  constructor() {
    this.isDevelopment = import.meta.env.DEV;
  }

  // Clear all frontend caches
  clearFrontendCache() {
    if (!this.isDevelopment) {
      console.warn('Cache clearing is only available in development mode');
      return false;
    }

    console.log('🧹 [CACHE SERVICE] Clearing frontend caches...');

    try {
      // Clear localStorage
      const keysToRemove = [
        'authToken',
        'userData',
        'facultyCache',
        'apiCache',
        'performanceData',
        'dashboardCache',
        'classCache',
        'studentCache',
        'attendanceCache'
      ];

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`✅ Removed localStorage key: ${key}`);
      });

      // Clear sessionStorage
      sessionStorage.clear();
      console.log('✅ Cleared sessionStorage');

      // Clear any cached data in memory (if using any global cache objects)
      if (window.cacheStore) {
        window.cacheStore.clear();
        console.log('✅ Cleared memory cache store');
      }

      // Clear service worker cache if available
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              console.log(`✅ Deleting cache: ${cacheName}`);
              return caches.delete(cacheName);
            })
          );
        });
      }

      console.log('🧹 [CACHE SERVICE] Frontend cache clearing completed');
      return true;

    } catch (error) {
      console.error('❌ [CACHE SERVICE] Error clearing frontend cache:', error);
      return false;
    }
  }

  // Clear backend database indexes
  async clearBackendCache() {
    if (!this.isDevelopment) {
      console.warn('Backend cache clearing is only available in development mode');
      return { success: false, message: 'Not available in production' };
    }

    try {
      console.log('🧹 [CACHE SERVICE] Clearing backend database indexes...');

      const response = await fetch('/api/auth/clear-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ [CACHE SERVICE] Backend cache cleared successfully:', result.message);
        return result;
      } else {
        console.error('❌ [CACHE SERVICE] Backend cache clearing failed:', result.message);
        return result;
      }

    } catch (error) {
      console.error('❌ [CACHE SERVICE] Error clearing backend cache:', error);
      return {
        success: false,
        message: 'Failed to connect to backend',
        error: error.message
      };
    }
  }

  // Clear all caches (frontend + backend)
  async clearAllCaches() {
    if (!this.isDevelopment) {
      console.warn('Cache clearing is only available in development mode');
      return { success: false, message: 'Not available in production' };
    }

    console.log('🧹 [CACHE SERVICE] Starting complete cache clearing...');

    // Clear frontend cache
    const frontendResult = this.clearFrontendCache();

    // Clear backend cache
    const backendResult = await this.clearBackendCache();

    const success = frontendResult && backendResult.success;

    console.log(success ? '✅ [CACHE SERVICE] All caches cleared successfully' : '❌ [CACHE SERVICE] Some caches failed to clear');

    return {
      success,
      frontend: frontendResult,
      backend: backendResult,
      timestamp: new Date().toISOString()
    };
  }

  // Get cache status with storage usage
  getCacheStatus() {
    const status = {
      isDevelopment: this.isDevelopment,
      localStorage: {},
      sessionStorage: {},
      memoryCache: !!window.cacheStore,
      serviceWorker: 'caches' in window,
      storageUsage: this.getStorageUsage()
    };

    // Check localStorage usage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      status.localStorage[key] = localStorage.getItem(key)?.length || 0;
    }

    // Check sessionStorage usage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      status.sessionStorage[key] = sessionStorage.getItem(key)?.length || 0;
    }

    return status;
  }

  // Get storage usage information
  getStorageUsage() {
    try {
      // Calculate localStorage usage
      let localStorageSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          localStorageSize += localStorage[key].length + key.length;
        }
      }

      // Calculate sessionStorage usage
      let sessionStorageSize = 0;
      for (let key in sessionStorage) {
        if (sessionStorage.hasOwnProperty(key)) {
          sessionStorageSize += sessionStorage[key].length + key.length;
        }
      }

      // Estimate total storage usage
      const totalSize = localStorageSize + sessionStorageSize;
      const totalSizeKB = Math.round(totalSize / 1024 * 100) / 100;
      const totalSizeMB = Math.round(totalSize / (1024 * 1024) * 100) / 100;

      return {
        localStorage: {
          size: localStorageSize,
          sizeKB: Math.round(localStorageSize / 1024 * 100) / 100,
          sizeMB: Math.round(localStorageSize / (1024 * 1024) * 100) / 100
        },
        sessionStorage: {
          size: sessionStorageSize,
          sizeKB: Math.round(sessionStorageSize / 1024 * 100) / 100,
          sizeMB: Math.round(sessionStorageSize / (1024 * 1024) * 100) / 100
        },
        total: {
          size: totalSize,
          sizeKB: totalSizeKB,
          sizeMB: totalSizeMB
        }
      };
    } catch (error) {
      console.error('Error calculating storage usage:', error);
      return null;
    }
  }

  // Check if storage usage exceeds threshold and auto-clear if needed
  async checkStorageAndAutoClear(thresholdMB = 5) {
    if (!this.isDevelopment) {
      return { cleared: false, reason: 'Not in development mode' };
    }

    const storageUsage = this.getStorageUsage();
    if (!storageUsage) {
      return { cleared: false, reason: 'Could not calculate storage usage' };
    }

    const totalMB = storageUsage.total.sizeMB;
    
    if (totalMB > thresholdMB) {
      console.log(`🧹 [AUTO CLEAR] Storage usage (${totalMB}MB) exceeds threshold (${thresholdMB}MB). Auto-clearing...`);
      
      const result = await this.clearAllCaches();
      
      if (result.success) {
        console.log('✅ [AUTO CLEAR] Storage automatically cleared');
        return { 
          cleared: true, 
          reason: `Storage usage (${totalMB}MB) exceeded threshold (${thresholdMB}MB)`,
          beforeSize: totalMB,
          afterSize: this.getStorageUsage()?.total.sizeMB || 0
        };
      } else {
        console.error('❌ [AUTO CLEAR] Failed to clear storage automatically');
        return { 
          cleared: false, 
          reason: 'Auto-clear failed',
          error: result.backend?.message || 'Unknown error'
        };
      }
    }

    return { 
      cleared: false, 
      reason: `Storage usage (${totalMB}MB) is within threshold (${thresholdMB}MB)`,
      currentSize: totalMB,
      threshold: thresholdMB
    };
  }

  // Set up automatic storage monitoring
  setupStorageMonitoring(thresholdMB = 5, checkInterval = 30000) {
    if (!this.isDevelopment) {
      console.warn('Storage monitoring is only available in development mode');
      return;
    }

    console.log(`🔍 [STORAGE MONITOR] Setting up monitoring with ${thresholdMB}MB threshold, checking every ${checkInterval/1000}s`);

    // Check immediately
    this.checkStorageAndAutoClear(thresholdMB);

    // Set up interval checking
    const intervalId = setInterval(async () => {
      const result = await this.checkStorageAndAutoClear(thresholdMB);
      if (result.cleared) {
        console.log('🧹 [STORAGE MONITOR] Auto-cleared due to storage threshold:', result);
      }
    }, checkInterval);

    // Return cleanup function
    return () => {
      clearInterval(intervalId);
      console.log('🔍 [STORAGE MONITOR] Monitoring stopped');
    };
  }
}

// Create singleton instance
const cacheService = new CacheService();

export default cacheService;
