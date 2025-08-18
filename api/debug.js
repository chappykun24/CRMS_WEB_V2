import pkg from 'pg';
const { Pool } = pkg;

export default async function handler(req, res) {
  try {
    // Log environment variables (without sensitive data)
    console.log('🔍 [DEBUG API] Environment check:');
    console.log('NEON_HOST:', process.env.NEON_HOST ? 'SET' : 'NOT SET');
    console.log('NEON_DATABASE:', process.env.NEON_DATABASE ? 'SET' : 'NOT SET');
    console.log('NEON_USER:', process.env.NEON_USER ? 'SET' : 'NOT SET');
    console.log('NEON_PASSWORD:', process.env.NEON_PASSWORD ? 'SET' : 'NOT SET');
    console.log('NEON_PORT:', process.env.NEON_PORT || '5432 (default)');

    // Check if environment variables are available
    if (!process.env.NEON_HOST || !process.env.NEON_DATABASE || !process.env.NEON_USER || !process.env.NEON_PASSWORD) {
      return res.status(500).json({
        error: 'Missing environment variables',
        missing: {
          NEON_HOST: !process.env.NEON_HOST,
          NEON_DATABASE: !process.env.NEON_DATABASE,
          NEON_USER: !process.env.NEON_USER,
          NEON_PASSWORD: !process.env.NEON_PASSWORD
        },
        message: 'Please set all required Neon database environment variables in Vercel dashboard'
      });
    }

    // Try to connect to database
    const connectionString = `postgresql://${process.env.NEON_USER}:${process.env.NEON_PASSWORD}@${process.env.NEON_HOST}:${process.env.NEON_PORT || 5432}/${process.env.NEON_DATABASE}?sslmode=require`;
    
    console.log('🔗 [DEBUG API] Attempting database connection...');
    
    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    const client = await pool.connect();
    console.log('✅ [DEBUG API] Database connection successful!');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    client.release();
    await pool.end();

    res.status(200).json({
      status: 'success',
      message: 'Database connection and query successful!',
      database: {
        current_time: result.rows[0].current_time,
        version: result.rows[0].db_version
      },
      environment: process.env.NODE_ENV || 'production'
    });

  } catch (error) {
    console.error('❌ [DEBUG API] Error:', error);
    res.status(500).json({
      error: 'Database connection failed',
      message: error.message,
      details: {
        code: error.code,
        detail: error.detail,
        hint: error.hint
      }
    });
  }
}
