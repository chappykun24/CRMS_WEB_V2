import { Pool } from 'pg';
import bcrypt from 'bcrypt';

export default async function handler(req, res) {
  console.log('👥 [USERS] Request received:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('👥 [USERS] OPTIONS request, sending CORS response');
    res.status(200).end();
    return;
  }

  // Handle POST: create new user
  if (req.method === 'POST') {
    try {
      console.log('👥 [USERS] Creating new user...');
      const { name, email, role_id, password } = req.body;
      
      // Validate required fields
      if (!name || !email || !role_id || !password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Name, email, role_id, and password are required' 
        });
      }

      // Check if email already exists
      const connectionString = `postgresql://${process.env.VITE_NEON_USER}:${process.env.VITE_NEON_PASSWORD}@${process.env.VITE_NEON_HOST}:${process.env.VITE_NEON_PORT || 5432}/${process.env.VITE_NEON_DATABASE}?sslmode=require`;
      const pool = new Pool({ connectionString, ssl: true, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
      
      const existingUserQuery = 'SELECT user_id FROM users WHERE email = $1';
      const existingUserResult = await pool.query(existingUserQuery, [email]);
      
      if (existingUserResult.rows.length > 0) {
        await pool.end();
        return res.status(400).json({ 
          success: false, 
          error: 'Email address is already registered' 
        });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Insert new user
      const insertUserQuery = `
        INSERT INTO users (name, email, password_hash, role_id, is_approved, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
        RETURNING user_id, name, email, role_id, is_approved, created_at
      `;
      
      const insertUserResult = await pool.query(insertUserQuery, [
        name.trim(),
        email.trim().toLowerCase(),
        passwordHash,
        parseInt(role_id),
        true // is_approved = true for admin-created users
      ]);

      const newUser = insertUserResult.rows[0];

      // Get role name for the response
      const roleQuery = 'SELECT name FROM roles WHERE role_id = $1';
      const roleResult = await pool.query(roleQuery, [role_id]);
      const roleName = roleResult.rows[0]?.name || 'Unknown';

      await pool.end();

      // Return the created user with role name
      const responseUser = {
        ...newUser,
        role_name: roleName
      };

      console.log('✅ [USERS] User created successfully:', responseUser.user_id);
      return res.status(201).json(responseUser);

    } catch (error) {
      console.error('❌ [USERS] Create user error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // Handle GET: list users
  if (req.method === 'GET') {
    try {
      console.log('👥 [USERS] Processing users request...');
      const requiredEnvVars = ['VITE_NEON_HOST', 'VITE_NEON_DATABASE', 'VITE_NEON_USER', 'VITE_NEON_PASSWORD'];
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      if (missingVars.length > 0) {
        console.log('❌ [USERS] Missing environment variables:', missingVars);
        return res.status(500).json({ 
          success: false, 
          error: `Missing environment variables: ${missingVars.join(', ')}`,
          message: 'Please set Neon database environment variables in Vercel dashboard'
        });
      }
      const connectionString = `postgresql://${process.env.VITE_NEON_USER}:${process.env.VITE_NEON_PASSWORD}@${process.env.VITE_NEON_HOST}:${process.env.VITE_NEON_PORT || 5432}/${process.env.VITE_NEON_DATABASE}?sslmode=require`;
      const pool = new Pool({ connectionString, ssl: true, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
      const result = await pool.query(`
        SELECT u.*, r.name AS role_name, up.department_id, d.name AS department_name, d.department_abbreviation
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.role_id
        LEFT JOIN user_profiles up ON u.user_id = up.user_id
        LEFT JOIN departments d ON up.department_id = d.department_id
        ORDER BY u.created_at DESC
      `);
      await pool.end();
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error('❌ [USERS] Error occurred:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Handle PATCH: approve user
  if (req.method === 'PATCH') {
    try {
      const url = new URL(req.url, 'http://localhost');
      const pathParts = url.pathname.split('/').filter(Boolean);
      // Expect path /api/users/:id/approve
      const approveIndex = pathParts.indexOf('approve');
      const idIndex = pathParts.indexOf('users') + 1;
      const userId = pathParts[idIndex];
      if (!approveIndex || !userId) {
        return res.status(400).json({ error: 'Invalid approve path' });
      }
      const connectionString = `postgresql://${process.env.VITE_NEON_USER}:${process.env.VITE_NEON_PASSWORD}@${process.env.VITE_NEON_HOST}:${process.env.VITE_NEON_PORT || 5432}/${process.env.VITE_NEON_DATABASE}?sslmode=require`;
      const pool = new Pool({ connectionString, ssl: true, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
      const result = await pool.query('UPDATE users SET is_approved = TRUE, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 RETURNING user_id', [userId]);
      if (result.rowCount === 0) {
        await pool.end();
        return res.status(404).json({ error: 'User not found' });
      }
      await pool.query('INSERT INTO user_approvals (user_id, approval_note) VALUES ($1, $2)', [userId, 'Approved by admin']);
      await pool.end();
      return res.status(200).json({ success: true, userId, isApproved: true });
    } catch (error) {
      console.error('❌ [USERS] Approve error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  console.log('❌ [USERS] Invalid method:', req.method);
  return res.status(405).json({ success: false, error: 'Method not allowed' });

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
