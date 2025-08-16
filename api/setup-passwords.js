import { Pool } from 'pg';
import bcrypt from 'bcrypt';

export default async function handler(req, res) {
  console.log('🔑 [SETUP-PASSWORDS] Request received:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('🔑 [SETUP-PASSWORDS] OPTIONS request, sending CORS response');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    console.log('❌ [SETUP-PASSWORDS] Invalid method:', req.method);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('🔑 [SETUP-PASSWORDS] Processing password setup request...');
    
    // Check if environment variables are set
    const requiredEnvVars = ['VITE_NEON_HOST', 'VITE_NEON_DATABASE', 'VITE_NEON_USER', 'VITE_NEON_PASSWORD'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    console.log('🔑 [SETUP-PASSWORDS] Environment variables check:', {
      required: requiredEnvVars,
      missing: missingVars,
      host: process.env.VITE_NEON_HOST ? 'SET' : 'NOT SET',
      database: process.env.VITE_NEON_DATABASE ? 'SET' : 'NOT SET',
      user: process.env.VITE_NEON_USER ? 'SET' : 'NOT SET',
      password: process.env.VITE_NEON_PASSWORD ? 'SET' : 'NOT SET'
    });
    
    if (missingVars.length > 0) {
      console.log('❌ [SETUP-PASSWORDS] Missing environment variables:', missingVars);
      return res.status(500).json({ 
        success: false, 
        error: `Missing environment variables: ${missingVars.join(', ')}`,
        message: 'Please set Neon database environment variables in Vercel dashboard'
      });
    }

    console.log('🔑 [SETUP-PASSWORDS] Environment variables OK, connecting to database...');

    // Database connection
    const connectionString = `postgresql://${process.env.VITE_NEON_USER}:${process.env.VITE_NEON_PASSWORD}@${process.env.VITE_NEON_HOST}:${process.env.VITE_NEON_PORT || 5432}/${process.env.VITE_NEON_DATABASE}?sslmode=require`;
    
    console.log('🔑 [SETUP-PASSWORDS] Connection string (masked):', connectionString.replace(process.env.VITE_NEON_PASSWORD, '***PASSWORD***'));
    
    const pool = new Pool({
      connectionString,
      ssl: true,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    try {
      console.log('🔑 [SETUP-PASSWORDS] Pool created, getting users...');
      
      // Get all users
      const usersResult = await pool.query('SELECT user_id, email, role_id FROM users ORDER BY user_id');
      const users = usersResult.rows;
      
      console.log('🔑 [SETUP-PASSWORDS] Found users:', users.length, users.map(u => ({ id: u.user_id, email: u.email })));
      
      if (users.length === 0) {
        console.log('❌ [SETUP-PASSWORDS] No users found in database');
        await pool.end();
        return res.status(404).json({ success: false, error: 'No users found' });
      }

      console.log('🔑 [SETUP-PASSWORDS] Setting up password for all users...');
      
      // Set a simple password for all users (for testing purposes)
      const testPassword = 'password123';
      console.log('🔑 [SETUP-PASSWORDS] Using test password:', testPassword);
      
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      console.log('🔑 [SETUP-PASSWORDS] Password hashed successfully');
      
      // Update all users with the new password
      for (const user of users) {
        console.log('🔑 [SETUP-PASSWORDS] Updating user:', user.email);
        await pool.query(
          'UPDATE users SET password_hash = $1 WHERE user_id = $2',
          [hashedPassword, user.user_id]
        );
        console.log('🔑 [SETUP-PASSWORDS] Updated user:', user.email);
      }
      
      await pool.end();
      console.log('🔑 [SETUP-PASSWORDS] Pool closed successfully');
      
      const successResponse = {
        success: true,
        message: `Updated ${users.length} users with password: ${testPassword}`,
        users: users.map(u => ({ id: u.user_id, email: u.email }))
      };
      
      console.log('✅ [SETUP-PASSWORDS] Sending success response:', successResponse);
      res.status(200).json(successResponse);
      console.log('✅ [SETUP-PASSWORDS] Password setup completed successfully');
      
    } catch (dbError) {
      console.log('❌ [SETUP-PASSWORDS] Database operation failed:', dbError.message);
      await pool.end();
      const errorResponse = { 
        success: false, 
        error: `Database operation failed: ${dbError.message}`,
        details: 'Check your database schema and permissions'
      };
      console.log('❌ [SETUP-PASSWORDS] Sending error response:', errorResponse);
      res.status(500).json(errorResponse);
    }
    
  } catch (error) {
    console.error('❌ [SETUP-PASSWORDS] Error occurred:', error);
    const errorResponse = { 
      success: false, 
      error: error.message,
      details: 'Check Vercel function logs for more information'
    };
    console.log('❌ [SETUP-PASSWORDS] Sending error response:', errorResponse);
    res.status(500).json(errorResponse);
  }
}
