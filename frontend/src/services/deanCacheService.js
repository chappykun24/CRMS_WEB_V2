// Dean-specific caching service for enhanced performance
class DeanCacheService {
  constructor() {
    this.cache = {
      analytics: new Map(),
      classes: new Map(),
      syllabi: new Map(),
      departments: new Map(),
      terms: new Map(),
      lastUpdated: new Map()
    };
    
    this.defaultTTL = {
      analytics: 10 * 60 * 1000,     // 10 minutes
      classes: 5 * 60 * 1000,         // 5 minutes
      syllabi: 5 * 60 * 1000,         // 5 minutes
      departments: 30 * 60 * 1000,    // 30 minutes
      terms: 30 * 60 * 1000           // 30 minutes
    };
    
    this.maxCacheSize = 100; // Maximum items per cache type
  }

  // Get cached data with TTL check
  get(cacheType, key, customTTL = null) {
    const cache = this.cache[cacheType];
    if (!cache) return null;
    
    const cached = cache.get(key);
    if (!cached) return null;
    
    const ttl = customTTL || this.defaultTTL[cacheType] || 300000;
    const isExpired = Date.now() - cached.timestamp > ttl;
    
    if (isExpired) {
      cache.delete(key);
      console.log(`⏰ [DEAN CACHE] Expired ${cacheType}:${key}`);
      return null;
    }
    
    console.log(`📦 [DEAN CACHE] Hit ${cacheType}:${key}`);
    return cached.data;
  }

  // Set cached data
  set(cacheType, key, data, customTTL = null) {
    const cache = this.cache[cacheType];
    if (!cache) return false;
    
    // Clean cache if it's getting too large
    if (cache.size >= this.maxCacheSize) {
      this.cleanCache(cacheType);
    }
    
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    this.cache.lastUpdated.set(cacheType, Date.now());
    console.log(`💾 [DEAN CACHE] Stored ${cacheType}:${key}`);
    return true;
  }

  // Clear specific cache entry or entire cache type
  clear(cacheType, key = null) {
    const cache = this.cache[cacheType];
    if (!cache) return false;
    
    if (key) {
      cache.delete(key);
      console.log(`🧹 [DEAN CACHE] Cleared ${cacheType}:${key}`);
    } else {
      cache.clear();
      this.cache.lastUpdated.delete(cacheType);
      console.log(`🧹 [DEAN CACHE] Cleared all ${cacheType}`);
    }
    return true;
  }

  // Clear all caches
  clearAll() {
    Object.keys(this.cache).forEach(cacheType => {
      if (cacheType !== 'lastUpdated') {
        this.cache[cacheType].clear();
      }
    });
    this.cache.lastUpdated.clear();
    console.log('🧹 [DEAN CACHE] Cleared all caches');
  }

  // Clean old entries from cache
  cleanCache(cacheType) {
    const cache = this.cache[cacheType];
    if (!cache) return;
    
    const ttl = this.defaultTTL[cacheType] || 300000;
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > ttl) {
        cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 [DEAN CACHE] Cleaned ${cleaned} expired entries from ${cacheType}`);
    }
  }

  // Get cache statistics
  getStats() {
    const stats = {
      totalEntries: 0,
      cacheTypes: {},
      lastUpdated: {},
      memoryUsage: 0
    };
    
    Object.keys(this.cache).forEach(cacheType => {
      if (cacheType === 'lastUpdated') return;
      
      const cache = this.cache[cacheType];
      const size = cache.size;
      stats.totalEntries += size;
      stats.cacheTypes[cacheType] = size;
      stats.lastUpdated[cacheType] = this.cache.lastUpdated.get(cacheType);
      
      // Estimate memory usage (rough calculation)
      let memoryUsage = 0;
      for (const [key, value] of cache.entries()) {
        memoryUsage += JSON.stringify(key).length * 2; // Key size
        memoryUsage += JSON.stringify(value.data).length * 2; // Data size
      }
      stats.memoryUsage += memoryUsage;
    });
    
    return stats;
  }

  // Cache with background refresh
  async getWithRefresh(cacheType, key, fetchFunction, customTTL = null) {
    // Try to get from cache first
    const cached = this.get(cacheType, key, customTTL);
    if (cached) return cached;
    
    // If not in cache, fetch and store
    try {
      const data = await fetchFunction();
      this.set(cacheType, key, data, customTTL);
      return data;
    } catch (error) {
      console.error(`❌ [DEAN CACHE] Failed to fetch ${cacheType}:${key}`, error);
      throw error;
    }
  }

  // Batch cache operations
  async batchGet(cacheType, keys) {
    const results = {};
    const missingKeys = [];
    
    keys.forEach(key => {
      const cached = this.get(cacheType, key);
      if (cached) {
        results[key] = cached;
      } else {
        missingKeys.push(key);
      }
    });
    
    return { results, missingKeys };
  }

  async batchSet(cacheType, dataMap) {
    Object.entries(dataMap).forEach(([key, data]) => {
      this.set(cacheType, key, data);
    });
  }
}

// Create singleton instance
const deanCacheService = new DeanCacheService();

export default deanCacheService;

