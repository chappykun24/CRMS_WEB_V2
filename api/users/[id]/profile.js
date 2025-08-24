import { Pool } from 'pg';

export default async function handler(req, res) {
  console.log('👤 [USER PROFILE] Request received:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('👤 [USER PROFILE] OPTIONS request, sending CORS response');
    res.status(200).end();
    return;
  }

  // Handle PUT: update user profile
  if (req.method === 'PUT') {
    try {
      const url = new URL(req.url, 'http://localhost');
      const pathParts = url.pathname.split('/').filter(Boolean);
      const idIndex = pathParts.indexOf('users') + 1;
      const userId = pathParts[idIndex];
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const { name, email, phone, profilePic, bio } = req.body;

      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      // Check if environment variables are set
      const requiredEnvVars = ['NEON_HOST', 'NEON_DATABASE', 'NEON_USER', 'NEON_PASSWORD'];
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        console.log('❌ [USER PROFILE] Missing environment variables:', missingVars);
        return res.status(500).json({ 
          success: false, 
          error: `Missing environment variables: ${missingVars.join(', ')}`
        });
      }

      const connectionString = `postgresql://${process.env.NEON_USER}:${process.env.NEON_PASSWORD}@${process.env.NEON_HOST}:${process.env.NEON_PORT || 5432}/${process.env.NEON_DATABASE}?sslmode=require`;
      const pool = new Pool({ 
        connectionString, 
        ssl: true, 
        max: 20, 
        idleTimeoutMillis: 30000, 
        connectionTimeoutMillis: 10000 
      });

      // Update user profile
      const updateQuery = `
        UPDATE users 
        SET 
          name = $1, 
          email = $2, 
          phone = $3, 
          profile_pic = $4, 
          bio = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $6 
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [
        name, 
        email, 
        phone || null, 
        profilePic || null, 
        bio || null, 
        userId
      ]);

      if (result.rowCount === 0) {
        await pool.end();
        return res.status(404).json({ error: 'User not found' });
      }

      await pool.end();

      const updatedUser = result.rows[0];
      console.log('✅ [USER PROFILE] Profile updated successfully for user:', userId);

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser
      });

    } catch (error) {
      console.error('❌ [USER PROFILE] Error occurred:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // Handle GET: get user profile
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url, 'http://localhost');
      const pathParts = url.pathname.split('/').filter(Boolean);
      const idIndex = pathParts.indexOf('users') + 1;
      const userId = pathParts[idIndex];
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const connectionString = `postgresql://${process.env.NEON_USER}:${process.env.NEON_PASSWORD}@${process.env.NEON_HOST}:${process.env.NEON_PORT || 5432}/${process.env.NEON_DATABASE}?sslmode=require`;
      const pool = new Pool({ 
        connectionString, 
        ssl: true, 
        max: 20, 
        idleTimeoutMillis: 30000, 
        connectionTimeoutMillis: 10000 
      });

      const result = await pool.query(`
        SELECT u.*, r.name AS role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.role_id
        WHERE u.user_id = $1
      `, [userId]);

      await pool.end();

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        success: true,
        user: result.rows[0]
      });

    } catch (error) {
      console.error('❌ [USER PROFILE] Error occurred:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  console.log('❌ [USER PROFILE] Invalid method:', req.method);
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
