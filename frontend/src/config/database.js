import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

// Load environment variables from .env.local first, then .env
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env if .env.local doesn't exist

// Debug: Log environment variables
console.log('Environment variables loaded:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('NEON_HOST:', process.env.NEON_HOST || process.env.VITE_NEON_HOST);
console.log('NEON_DATABASE:', process.env.NEON_DATABASE || process.env.VITE_NEON_DATABASE);
console.log('NEON_USER:', process.env.NEON_USER || process.env.VITE_NEON_USER);
console.log('NEON_PASSWORD:', (process.env.NEON_PASSWORD || process.env.VITE_NEON_PASSWORD) ? '***SET***' : 'NOT SET');

// Neon Database Configuration - Using connection string format
const connectionString = `postgresql://${process.env.NEON_USER || process.env.VITE_NEON_USER}:${process.env.NEON_PASSWORD || process.env.VITE_NEON_PASSWORD}@${process.env.NEON_HOST || process.env.VITE_NEON_HOST}:${process.env.NEON_PORT || process.env.VITE_NEON_PORT || 5432}/${process.env.NEON_DATABASE || process.env.VITE_NEON_DATABASE}?sslmode=require`;

console.log('Connection string:', connectionString.replace(process.env.VITE_NEON_PASSWORD || process.env.NEON_PASSWORD, '***PASSWORD***'));
console.log('Environment:', process.env.NODE_ENV);

const neonConfig = {
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : true,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Increased timeout to 10 seconds
};

// Create connection pool
export const pool = new Pool(neonConfig);

// Test database connection
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Get database client
export const getClient = async () => {
  try {
    return await pool.connect();
  } catch (error) {
    console.error('Error getting database client:', error);
    throw error;
  }
};

// Execute query with parameters
export const query = async (text, params) => {
  try {
    console.log('🔍 [DATABASE] Executing query:', { text, params });
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`✅ [DATABASE] Query executed successfully in ${duration}ms`, { 
      text, 
      duration, 
      rows: result.rowCount,
      hasData: result.rows.length > 0
    });
    if (result.rows.length > 0) {
      console.log('📊 [DATABASE] Sample data from result:', result.rows.slice(0, 2));
    }
    return result;
  } catch (error) {
    console.error('❌ [DATABASE] Query error:', error);
    console.error('🔍 [DATABASE] Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      stack: error.stack
    });
    throw error;
  }
};

// Close pool
export const closePool = async () => {
  try {
    await pool.end();
    console.log('Database pool closed');
  } catch (error) {
    console.error('Error closing pool:', error);
  }
};

// Database health check
export const healthCheck = async () => {
  try {
    const result = await query('SELECT NOW()');
    return {
      status: 'healthy',
      timestamp: result.rows[0].now,
      connection: true
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      connection: false
    };
  }
};

export default pool;
