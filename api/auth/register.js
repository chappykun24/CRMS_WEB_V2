import { Pool } from 'pg';
import bcrypt from 'bcrypt';

export default async function handler(req, res) {
  console.log('📝 [REGISTER] Request received:', {
    method: req.method,
    url: req.url,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('📝 [REGISTER] OPTIONS request, sending CORS response');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    console.log('❌ [REGISTER] Invalid method:', req.method);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('📝 [REGISTER] Processing registration request...');
    
    // Check if environment variables are set
    const requiredEnvVars = ['VITE_NEON_HOST', 'VITE_NEON_DATABASE', 'VITE_NEON_USER', 'VITE_NEON_PASSWORD'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    console.log('📝 [REGISTER] Environment variables check:', {
      required: requiredEnvVars,
      missing: missingVars,
      host: process.env.VITE_NEON_HOST ? 'SET' : 'NOT SET',
      database: process.env.VITE_NEON_DATABASE ? 'SET' : 'NOT SET',
      user: process.env.VITE_NEON_USER ? 'SET' : 'NOT SET',
      password: process.env.VITE_NEON_PASSWORD ? 'SET' : 'NOT SET'
    });
    
    if (missingVars.length > 0) {
      console.log('❌ [REGISTER] Missing environment variables:', missingVars);
      return res.status(500).json({ 
        success: false, 
        error: `Missing environment variables: ${missingVars.join(', ')}`,
        message: 'Please set Neon database environment variables in Vercel dashboard'
      });
    }

    console.log('📝 [REGISTER] Environment variables OK, connecting to database...');

    // Database connection
    const connectionString = `postgresql://${process.env.VITE_NEON_USER}:${process.env.VITE_NEON_PASSWORD}@${process.env.VITE_NEON_HOST}:${process.env.VITE_NEON_PORT || 5432}/${process.env.VITE_NEON_DATABASE}?sslmode=require`;
    
    console.log('📝 [REGISTER] Connection string (masked):', connectionString.replace(process.env.VITE_NEON_PASSWORD, '***PASSWORD***'));
    
    const pool = new Pool({
      connectionString,
      ssl: true,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    try {
      console.log('📝 [REGISTER] Pool created, extracting request data...');

      const { 
        firstName, 
        lastName, 
        middleInitial, 
        suffix, 
        email, 
        password, 
        department, 
        schoolTerm, 
        termStart, 
        termEnd,
        profilePic 
      } = req.body;

      console.log('📝 [REGISTER] Registration data received:', {
        firstName,
        lastName,
        middleInitial,
        suffix,
        email,
        hasPassword: !!password,
        department,
        schoolTerm,
        termStart,
        termEnd,
        hasProfilePic: !!profilePic
      });
      
      // Validate required fields
      if (!firstName || !lastName || !email || !password || !department || !schoolTerm) {
        console.log('❌ [REGISTER] Missing required fields');
        await pool.end();
        return res.status(400).json({ 
          success: false, 
          error: 'First name, last name, email, password, department, and school term are required' 
        });
      }

      // Check if email already exists
      console.log('📝 [REGISTER] Checking if email already exists...');
      const existingUserQuery = 'SELECT user_id FROM users WHERE email = $1';
      const existingUserResult = await pool.query(existingUserQuery, [email]);
      
      if (existingUserResult.rows.length > 0) {
        console.log('❌ [REGISTER] Email already exists:', email);
        await pool.end();
        return res.status(400).json({ 
          success: false, 
          error: 'Email address is already registered' 
        });
      }

      // Get role ID for FACULTY
      console.log('📝 [REGISTER] Getting FACULTY role ID...');
      const roleQuery = 'SELECT role_id FROM roles WHERE name = $1';
      const roleResult = await pool.query(roleQuery, ['FACULTY']);
      
      if (roleResult.rows.length === 0) {
        console.log('❌ [REGISTER] FACULTY role not found, creating it...');
        const createRoleQuery = 'INSERT INTO roles (name) VALUES ($1) RETURNING role_id';
        const createRoleResult = await pool.query(createRoleQuery, ['FACULTY']);
        var roleId = createRoleResult.rows[0].role_id;
        console.log('✅ [REGISTER] FACULTY role created with ID:', roleId);
      } else {
        var roleId = roleResult.rows[0].role_id;
        console.log('✅ [REGISTER] FACULTY role found with ID:', roleId);
      }

      // Hash password
      console.log('📝 [REGISTER] Hashing password...');
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      console.log('✅ [REGISTER] Password hashed successfully');

      // Combine name fields
      const fullName = [firstName, middleInitial, lastName, suffix].filter(Boolean).join(' ');
      console.log('📝 [REGISTER] Full name constructed:', fullName);

      // Insert user with pending approval
      console.log('📝 [REGISTER] Inserting user into database...');
      const insertUserQuery = `
        INSERT INTO users (name, email, password_hash, role_id, profile_pic, is_approved) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING user_id
      `;
      
      const insertUserResult = await pool.query(insertUserQuery, [
        fullName, 
        email, 
        passwordHash, 
        roleId, 
        profilePic || null, 
        false // is_approved = false (pending approval)
      ]);

      const userId = insertUserResult.rows[0].user_id;
      console.log('✅ [REGISTER] User inserted successfully with ID:', userId);

      // Insert user profile
      console.log('📝 [REGISTER] Inserting user profile...');
      const insertProfileQuery = `
        INSERT INTO user_profiles (
          user_id, profile_type, department_id, term_start, term_end, contact_email
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await pool.query(insertProfileQuery, [
        userId,
        'FACULTY',
        department,
        termStart,
        termEnd,
        email
      ]);
      console.log('✅ [REGISTER] User profile inserted successfully');

      // Insert user approval record
      console.log('📝 [REGISTER] Inserting user approval record...');
      const insertApprovalQuery = `
        INSERT INTO user_approvals (user_id, approval_note) 
        VALUES ($1, $2)
      `;
      
      await pool.query(insertApprovalQuery, [
        userId,
        'Faculty registration pending admin approval'
      ]);
      console.log('✅ [REGISTER] User approval record inserted successfully');

      await pool.end();
      console.log('✅ [REGISTER] Database pool closed successfully');

      const response = {
        success: true,
        message: 'Faculty registration successful! Your account is pending approval.',
        userId: userId,
        status: 'pending_approval'
      };

      console.log('✅ [REGISTER] Sending success response:', response);
      res.status(201).json(response);
      console.log('✅ [REGISTER] Registration request completed successfully');

    } catch (dbError) {
      console.log('❌ [REGISTER] Database operation failed:', dbError.message);
      await pool.end();
      const errorResponse = { 
        success: false,
        error: `Registration failed: ${dbError.message}`,
        details: 'Please try again or contact support'
      };
      console.log('❌ [REGISTER] Sending error response:', errorResponse);
      res.status(500).json(errorResponse);
    }
  } catch (error) {
    console.error('❌ [REGISTER] Error occurred:', error);
    const errorResponse = { 
      success: false,
      error: error.message,
      details: 'Check Vercel function logs for more information'
    };
    console.log('❌ [REGISTER] Sending error response:', errorResponse);
    res.status(500).json(errorResponse);
  }
}
