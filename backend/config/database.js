import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

// Copy VITE_ environment variables to regular ones for backend use (for compatibility)
if (process.env.VITE_NEON_HOST) {
  process.env.NEON_HOST = process.env.VITE_NEON_HOST;
  process.env.NEON_DATABASE = process.env.VITE_NEON_DATABASE;
  process.env.NEON_USER = process.env.VITE_NEON_USER;
  process.env.NEON_PASSWORD = process.env.VITE_NEON_PASSWORD;
  process.env.NEON_PORT = process.env.VITE_NEON_PORT;
}

// Database configuration - prioritize Neon, then Render DB, then local
const dbConfig = {
  host: process.env.NEON_HOST || process.env.DB_HOST || 'localhost',
  database: process.env.NEON_DATABASE || process.env.DB_NAME || 'crms_db',
  user: process.env.NEON_USER || process.env.DB_USER || 'postgres',
  password: process.env.NEON_PASSWORD || process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.NEON_PORT || process.env.DB_PORT || '5432'),
  ssl: (process.env.NODE_ENV === 'production' || process.env.NEON_HOST) ? { rejectUnauthorized: false } : false,
  // Optimized connection pool settings for Neon
  max: 5, // Further reduced max connections for Neon compatibility
  min: 1, // Reduced minimum connections
  idleTimeoutMillis: 20000, // Reduced idle timeout for Neon
  connectionTimeoutMillis: 15000, // Increased timeout for better reliability
  acquireTimeoutMillis: 30000, // Increased timeout for acquiring connections
  // Neon-specific settings
  keepAlive: true,
  keepAliveInitialDelayMillis: 0, // Start keep-alive immediately
  // Removed allowExitOnIdle as it can cause issues with Neon
  // Query optimization settings
  statement_timeout: 30000, // 30 second query timeout
  query_timeout: 30000, // 30 second query timeout
  // Connection keep-alive settings (already set above)
};

console.log('Database configuration:', {
  host: dbConfig.host,
  database: dbConfig.database,
  user: dbConfig.user,
  port: dbConfig.port,
  ssl: dbConfig.ssl,
  env: process.env.NODE_ENV
});

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit the process on connection errors - let the app continue
  // The connection pool will handle reconnection automatically
  console.warn('Database connection error - pool will attempt to reconnect');
});

// Database service class
class DatabaseService {
  constructor() {
    this.pool = pool;
    this.queryCache = new Map(); // Simple in-memory cache
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache timeout
  }

  // Get a client from the pool with retry logic
  async getClient(retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const client = await this.pool.connect();
        return client;
      } catch (error) {
        console.error(`Error getting database client (attempt ${i + 1}/${retries}):`, error.message);
        if (i === retries - 1) {
          throw error;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  // Execute a query with optional caching
  async query(text, params = [], useCache = false) {
    // Check cache first for read queries
    if (useCache && text.trim().toUpperCase().startsWith('SELECT')) {
      const cacheKey = `${text}:${JSON.stringify(params)}`;
      const cached = this.queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('📦 [DB] Cache hit for query');
        return cached.result;
      }
    }

    let client;
    try {
      client = await this.getClient();
      const startTime = Date.now();
      const result = await client.query(text, params);
      const duration = Date.now() - startTime;
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`🐌 [DB] Slow query (${duration}ms):`, text.substring(0, 100));
      }
      
      // Cache SELECT queries
      if (useCache && text.trim().toUpperCase().startsWith('SELECT')) {
        const cacheKey = `${text}:${JSON.stringify(params)}`;
        this.queryCache.set(cacheKey, {
          result,
          timestamp: Date.now()
        });
        
        // Clean old cache entries periodically
        if (this.queryCache.size > 100) {
          this.cleanCache();
        }
      }
      
      return result;
    } catch (error) {
      console.error('Database query error:', error.message);
      // Don't throw the error immediately - log it and return a graceful response
      if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.message.includes('Connection terminated')) {
        console.warn('Database connection lost - attempting to continue');
        // Return empty result for SELECT queries, throw for others
        if (text.trim().toUpperCase().startsWith('SELECT')) {
          return { rows: [], rowCount: 0 };
        }
      }
      throw error;
    } finally {
      if (client) {
        try {
          client.release();
        } catch (releaseError) {
          console.warn('Error releasing client:', releaseError.message);
        }
      }
    }
  }

  // Clean old cache entries
  cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.queryCache.delete(key);
      }
    }
  }

  // Clear cache (useful for testing or manual cache invalidation)
  clearCache() {
    this.queryCache.clear();
  }

  // Execute a transaction
  async transaction(callback) {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Test database connection
  async testConnection() {
    try {
      console.log('🔍 [DATABASE] Testing connection...');
      console.log('🔍 [DATABASE] Pool stats:', {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });
      
      const result = await this.query('SELECT NOW()');
      console.log('✅ [DATABASE] Connection successful, timestamp:', result.rows[0].now);
      return { success: true, timestamp: result.rows[0].now };
    } catch (error) {
      console.error('❌ [DATABASE] Connection failed:', error.message);
      console.error('❌ [DATABASE] Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      return { success: false, error: error.message };
    }
  }

  // Health check
  async healthCheck() {
    try {
      const result = await this.query(`
        SELECT 
          'database' as service,
          'healthy' as status,
          NOW() as timestamp,
          (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count
      `);
      return result.rows[0];
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Close the pool
  async close() {
    await this.pool.end();
  }
}

// Create singleton instance
const db = new DatabaseService();

export default db;
export { DatabaseService };
