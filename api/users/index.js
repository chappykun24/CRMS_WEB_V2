import { Pool } from 'pg';

export default async function handler(req, res) {
  console.log('👥 [USERS] Request received:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('👥 [USERS] OPTIONS request, sending CORS response');
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    console.log('❌ [USERS] Invalid method:', req.method);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('👥 [USERS] Processing users request...');
    
    // Check if environment variables are set
    const requiredEnvVars = ['VITE_NEON_HOST', 'VITE_NEON_DATABASE', 'VITE_NEON_USER', 'VITE_NEON_PASSWORD'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    console.log('👥 [USERS] Environment variables check:', {
      required: requiredEnvVars,
      missing: missingVars,
      host: process.env.VITE_NEON_HOST ? 'SET' : 'NOT SET',
      database: process.env.VITE_NEON_DATABASE ? 'SET' : 'NOT SET',
      user: process.env.VITE_NEON_USER ? 'SET' : 'NOT SET',
      password: process.env.VITE_NEON_PASSWORD ? 'SET' : 'NOT SET'
    });
    
    if (missingVars.length > 0) {
      console.log('❌ [USERS] Missing environment variables:', missingVars);
      return res.status(500).json({ 
        success: false, 
        error: `Missing environment variables: ${missingVars.join(', ')}`,
        message: 'Please set Neon database environment variables in Vercel dashboard'
      });
    }

    console.log('👥 [USERS] Environment variables OK, connecting to database...');

    // Database connection
    const connectionString = `postgresql://${process.env.VITE_NEON_USER}:${process.env.VITE_NEON_PASSWORD}@${process.env.VITE_NEON_HOST}:${process.env.VITE_NEON_PORT || 5432}/${process.env.VITE_NEON_DATABASE}?sslmode=require`;
    
    console.log('👥 [USERS] Connection string (masked):', connectionString.replace(process.env.VITE_NEON_PASSWORD, '***PASSWORD***'));
    
    const pool = new Pool({
      connectionString,
      ssl: true,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    try {
      console.log('👥 [USERS] Pool created, executing query...');
      const result = await pool.query('SELECT * FROM users');
      console.log('👥 [USERS] Query executed successfully, found users:', result.rows.length);
      
      await pool.end();
      console.log('👥 [USERS] Pool closed successfully');
      
      const response = result.rows;
      console.log('✅ [USERS] Sending response with users:', response.length);
      res.status(200).json(response);
      console.log('✅ [USERS] Users request completed successfully');
      
    } catch (dbError) {
      console.log('❌ [USERS] Database query failed:', dbError.message);
      await pool.end();
      const errorResponse = { 
        error: `Database query failed: ${dbError.message}`,
        details: 'Check your database schema and permissions'
      };
      console.log('❌ [USERS] Sending error response:', errorResponse);
      res.status(500).json(errorResponse);
    }
  } catch (error) {
    console.error('❌ [USERS] Error occurred:', error);
    const errorResponse = { 
      error: error.message,
      details: 'Check Vercel function logs for more information'
    };
    console.log('❌ [USERS] Sending error response:', errorResponse);
    res.status(500).json(errorResponse);
  }
}
