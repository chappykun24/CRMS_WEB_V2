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
    console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');

    // Check for case sensitivity issues
    console.log('🔍 [DEBUG API] All environment variables:');
    Object.keys(process.env).forEach(key => {
      if (key.includes('NEON') || key.includes('neon')) {
        console.log(`${key}:`, process.env[key] ? 'SET' : 'NOT SET');
      }
    });

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

    // Show the actual values (be careful with sensitive data)
    console.log('🔗 [DEBUG API] Connection string parts:');
    console.log('Host:', process.env.NEON_HOST);
    console.log('Database:', process.env.NEON_DATABASE);
    console.log('User:', process.env.NEON_USER);
    console.log('Port:', process.env.NEON_PORT || 5432);

    // Try to connect to database
    const connectionString = `postgresql://${process.env.NEON_USER}:${process.env.NEON_PASSWORD}@${process.env.NEON_HOST}:${process.env.NEON_PORT || 5432}/${process.env.NEON_DATABASE}?sslmode=require`;
    
    console.log('🔗 [DEBUG API] Full connection string (masked):', 
      connectionString.replace(process.env.NEON_PASSWORD, '***'));
    
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
      environment: process.env.NODE_ENV || 'production',
      connection_info: {
        host: process.env.NEON_HOST,
        database: process.env.NEON_DATABASE,
        user: process.env.NEON_USER,
        port: process.env.NEON_PORT || 5432
      }
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
      },
      environment_check: {
        NEON_HOST: process.env.NEON_HOST ? 'SET' : 'NOT SET',
        NEON_DATABASE: process.env.NEON_DATABASE ? 'SET' : 'NOT SET',
        NEON_USER: process.env.NEON_USER ? 'SET' : 'NOT SET',
        NEON_PASSWORD: process.env.NEON_PASSWORD ? 'SET' : 'NOT SET'
      }
    });
  }
}
