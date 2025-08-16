// Database configuration is not needed in the frontend
// This file should only be used in a backend Node.js server
// For the frontend, use the API endpoints instead

/*
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

// Load .env.local file from current working directory
dotenv.config({ path: '.env.local' });

// Debug: Log environment variables
console.log('Environment variables loaded:');
console.log('NEON_HOST:', process.env.NEON_HOST);
console.log('NEON_DATABASE:', process.env.NEON_DATABASE);
console.log('NEON_USER:', process.env.NEON_USER);
console.log('NEON_PASSWORD:', process.env.NEON_PASSWORD ? '***SET***' : 'NOT SET');

// Neon Database Configuration - Using connection string format
const connectionString = `postgresql://${process.env.NEON_USER}:${process.env.NEON_PASSWORD}@${process.env.NEON_HOST}:${process.env.NEON_PORT || 5432}/${process.env.NEON_DATABASE}?sslmode=require`;

console.log('Connection string:', connectionString.replace(process.env.NEON_PASSWORD, '***PASSWORD***'));

const neonConfig = {
  connectionString,
  ssl: true,
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
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Query error:', error);
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
*/

// Frontend placeholder - use API endpoints instead
export const databasePlaceholder = {
  message: 'Database operations are not available in the frontend. Use API endpoints instead.',
  note: 'This file is for backend use only. Frontend should communicate with your backend API.'
};
