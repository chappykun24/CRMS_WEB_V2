import { Pool } from 'pg';

export default async function handler(req, res) {
  console.log('🏥 [HEALTH] Request received:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('🏥 [HEALTH] OPTIONS request, sending CORS response');
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    console.log('❌ [HEALTH] Invalid method:', req.method);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('🏥 [HEALTH] Processing health check request...');
    
    // Check if environment variables are set
    const requiredEnvVars = ['VITE_NEON_HOST', 'VITE_NEON_DATABASE', 'VITE_NEON_USER', 'VITE_NEON_PASSWORD'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    console.log('🏥 [HEALTH] Environment variables check:', {
      required: requiredEnvVars,
      missing: missingVars,
      host: process.env.VITE_NEON_HOST ? 'SET' : 'NOT SET',
      database: process.env.VITE_NEON_DATABASE ? 'SET' : 'NOT SET',
      user: process.env.VITE_NEON_USER ? 'SET' : 'NOT SET',
      password: process.env.VITE_NEON_PASSWORD ? 'SET' : 'NOT SET'
    });
    
    if (missingVars.length > 0) {
      console.log('❌ [HEALTH] Missing environment variables:', missingVars);
      return res.status(500).json({ 
        status: 'unhealthy', 
        error: `Missing environment variables: ${missingVars.join(', ')}`,
        message: 'Please set Neon database environment variables in Vercel dashboard'
      });
    }

    console.log('🏥 [HEALTH] Environment variables OK, connecting to database...');

    // Database connection
    const connectionString = `postgresql://${process.env.VITE_NEON_USER}:${process.env.VITE_NEON_PASSWORD}@${process.env.VITE_NEON_HOST}:${process.env.VITE_NEON_PORT || 5432}/${process.env.VITE_NEON_DATABASE}?sslmode=require`;
    
    console.log('🏥 [HEALTH] Connection string (masked):', connectionString.replace(process.env.VITE_NEON_PASSWORD, '***PASSWORD***'));
    
    const pool = new Pool({
      connectionString,
      ssl: true,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    try {
      console.log('🏥 [HEALTH] Pool created, attempting connection...');
      const client = await pool.connect();
      console.log('✅ [HEALTH] Database connection successful');
      client.release();
      await pool.end();
      console.log('🏥 [HEALTH] Pool closed successfully');
      
      const successResponse = { status: 'healthy', message: 'Database connected' };
      console.log('✅ [HEALTH] Sending success response:', successResponse);
      res.status(200).json(successResponse);
      console.log('✅ [HEALTH] Health check completed successfully');
      
    } catch (dbError) {
      console.log('❌ [HEALTH] Database connection failed:', dbError.message);
      await pool.end();
      const errorResponse = { 
        status: 'unhealthy', 
        error: `Database connection failed: ${dbError.message}`,
        details: 'Check your Neon database credentials and network access'
      };
      console.log('❌ [HEALTH] Sending error response:', errorResponse);
      res.status(500).json(errorResponse);
    }
  } catch (error) {
    console.error('❌ [HEALTH] Error occurred:', error);
    const errorResponse = { 
      status: 'unhealthy', 
      error: error.message,
      details: 'Check Vercel function logs for more information'
    };
    console.log('❌ [HEALTH] Sending error response:', errorResponse);
    res.status(500).json(errorResponse);
  }
}
