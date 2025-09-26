// Storage monitoring utility for development
import cacheService from '../services/cacheService';

// Example usage of storage-based cache clearing
export const initializeStorageMonitoring = () => {
  if (!import.meta.env.DEV) {
    console.log('Storage monitoring is only available in development mode');
    return null;
  }

  console.log('🔍 Initializing storage monitoring...');

  // Set up monitoring with custom thresholds
  const cleanup = cacheService.setupStorageMonitoring(
    5,    // 5MB threshold
    10000 // Check every 10 seconds
  );

  // You can also manually check storage at any time
  const checkStorage = () => {
    const usage = cacheService.getStorageUsage();
    console.log('📊 Current storage usage:', usage);
    return usage;
  };

  // Manual cache clearing based on storage
  const clearIfNeeded = async (thresholdMB = 5) => {
    const result = await cacheService.checkStorageAndAutoClear(thresholdMB);
    if (result.cleared) {
      console.log('🧹 Cache was automatically cleared:', result);
    } else {
      console.log('✅ Storage is within limits:', result);
    }
    return result;
  };

  return {
    cleanup,
    checkStorage,
    clearIfNeeded,
    getStorageUsage: cacheService.getStorageUsage.bind(cacheService)
  };
};

// Auto-initialize in development
if (import.meta.env.DEV) {
  // This will start monitoring automatically when the module is imported
  const monitor = initializeStorageMonitoring();
  
  // Make it available globally for debugging
  if (typeof window !== 'undefined') {
    window.storageMonitor = monitor;
  }
}
