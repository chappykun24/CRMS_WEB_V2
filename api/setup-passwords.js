import { Pool } from 'pg';
import bcrypt from 'bcrypt';

// Database connection
const pool = new Pool({
  connectionString: process.env.VITE_NEON_DATABASE_URL || `postgresql://${process.env.VITE_NEON_USER}:${process.env.VITE_NEON_PASSWORD}@${process.env.VITE_NEON_HOST}:${process.env.VITE_NEON_PORT || 5432}/${process.env.VITE_NEON_DATABASE}?sslmode=require`,
  ssl: true,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

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
    // Get all users
    const usersResult = await pool.query('SELECT user_id, email, role_id FROM users ORDER BY user_id');
    const users = usersResult.rows;
    
    if (users.length === 0) {
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
    
    res.status(200).json({
      success: true,
      message: `Updated ${users.length} users with password: ${testPassword}`,
      users: users.map(u => ({ id: u.user_id, email: u.email }))
    });
    
  } catch (error) {
    console.error('Password setup error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await pool.end();
  }
}
