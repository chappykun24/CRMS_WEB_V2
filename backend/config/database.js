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
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
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
  if (process.env.NODE_ENV === 'production') {
    process.exit(-1);
  } else {
    console.warn('Continuing without exiting due to pool error in development.');
  }
});

// Database service class
class DatabaseService {
  constructor() {
    this.pool = pool;
  }

  // Get a client from the pool
  async getClient() {
    try {
      const client = await this.pool.connect();
      return client;
    } catch (error) {
      console.error('Error getting database client:', error);
      throw error;
    }
  }

  // Execute a query
  async query(text, params = []) {
    const client = await this.getClient();
    try {
      const result = await client.query(text, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    } finally {
      client.release();
    }
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
