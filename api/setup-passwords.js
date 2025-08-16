import { Pool } from 'pg';
import bcrypt from 'bcrypt';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Check if environment variables are set
    const requiredEnvVars = ['VITE_NEON_HOST', 'VITE_NEON_DATABASE', 'VITE_NEON_USER', 'VITE_NEON_PASSWORD'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return res.status(500).json({ 
        success: false, 
        error: `Missing environment variables: ${missingVars.join(', ')}`,
        message: 'Please set Neon database environment variables in Vercel dashboard'
      });
    }

    // Database connection
    const connectionString = `postgresql://${process.env.VITE_NEON_USER}:${process.env.VITE_NEON_PASSWORD}@${process.env.VITE_NEON_HOST}:${process.env.VITE_NEON_PORT || 5432}/${process.env.VITE_NEON_DATABASE}?sslmode=require`;
    
    const pool = new Pool({
      connectionString,
      ssl: true,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    try {
      // Get all users
      const usersResult = await pool.query('SELECT user_id, email, role_id FROM users ORDER BY user_id');
      const users = usersResult.rows;
      
      if (users.length === 0) {
        await pool.end();
        return res.status(404).json({ success: false, error: 'No users found' });
      }

      // Set a simple password for all users (for testing purposes)
      const testPassword = 'password123';
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      
      // Update all users with the new password
      for (const user of users) {
        await pool.query(
          'UPDATE users SET password_hash = $1 WHERE user_id = $2',
          [hashedPassword, user.user_id]
        );
      }
      
      await pool.end();
      res.status(200).json({
        success: true,
        message: `Updated ${users.length} users with password: ${testPassword}`,
        users: users.map(u => ({ id: u.user_id, email: u.email }))
      });
      
    } catch (dbError) {
      await pool.end();
      res.status(500).json({ 
        success: false, 
        error: `Database operation failed: ${dbError.message}`,
        details: 'Check your database schema and permissions'
      });
    }
    
  } catch (error) {
    console.error('Password setup error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Check Vercel function logs for more information'
    });
  }
}
