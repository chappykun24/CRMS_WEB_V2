import bcrypt from 'bcrypt';
import db from '../config/database.js';
import { generateToken } from '../middleware/auth.js';
import { sanitizeUserData, sanitizeRequestBody, safeStringify } from '../utils/sanitizeLogs.js';

// Register new user
export const register = async (req, res) => {
  try {
    const { email, password, first_name, last_name, middle_name, role_id, department_id, employee_id, phone } = req.body;

    // Check if user already exists
    const existingUser = await db.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
        statusCode: 409
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await db.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, middle_name, role_id, department_id, employee_id, phone, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING user_id, email, first_name, last_name, middle_name, role_id, department_id, employee_id, phone, is_active, created_at
    `, [email, hashedPassword, first_name, last_name, middle_name, role_id, department_id, employee_id, phone, false]);

    const user = result.rows[0];

    // Create user approval record
    await db.query(`
      INSERT INTO user_approvals (user_id, status, requested_at)
      VALUES ($1, 'pending', NOW())
    `, [user.user_id]);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Awaiting approval.',
      data: {
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        status: 'pending_approval'
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      statusCode: 500
    });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    // Sanitize email for logging
    const sanitizedEmail = req.body.email ? (() => {
      const [localPart, domain] = req.body.email.split('@');
      return localPart && domain ? `${localPart.substring(0, 3)}***@${domain}` : '***';
    })() : 'N/A';
    console.log('🔐 [AUTH CONTROLLER] Login attempt for email:', sanitizedEmail);
    console.log('🔐 [AUTH CONTROLLER] Request body:', safeStringify(req.body, sanitizeRequestBody));
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        statusCode: 400
      });
    }

    // Test database connection first
    try {
      console.log('🔐 [AUTH CONTROLLER] Testing database connection...');
      await db.testConnection();
      console.log('🔐 [AUTH CONTROLLER] Database connection successful');
    } catch (dbError) {
      console.error('🔐 [AUTH CONTROLLER] Database connection failed:', dbError);
      console.error('🔐 [AUTH CONTROLLER] Database error details:', {
        message: dbError.message,
        code: dbError.code,
        stack: dbError.stack
      });
      return res.status(500).json({
        success: false,
        message: 'Database connection failed',
        statusCode: 500,
        debug: {
          error: dbError.message,
          code: dbError.code
        }
      });
    }

    // First, let's check the actual table structure
    console.log('🔐 [AUTH CONTROLLER] Checking users table structure...');
    try {
      const tableInfo = await db.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `);
      console.log('🔐 [AUTH CONTROLLER] Users table columns:', JSON.stringify(tableInfo.rows, null, 2));
    } catch (tableError) {
      console.error('🔐 [AUTH CONTROLLER] Error checking table structure:', tableError.message);
    }

    // Find user by email
    console.log('🔐 [AUTH CONTROLLER] Querying user with email:', email);
    let result;
    try {
      result = await db.query(`
        SELECT u.user_id, u.email, u.password_hash, u.name,
               u.role_id, u.is_approved, u.created_at, u.updated_at,
               r.name as role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.role_id
        WHERE u.email = $1
      `, [email]);
      console.log('🔐 [AUTH CONTROLLER] Query executed successfully');
    } catch (queryError) {
      console.error('🔐 [AUTH CONTROLLER] Database query failed:', queryError);
      console.error('🔐 [AUTH CONTROLLER] Query error details:', {
        message: queryError.message,
        code: queryError.code,
        stack: queryError.stack
      });
      return res.status(500).json({
        success: false,
        message: 'Database query failed',
        statusCode: 500,
        debug: {
          error: queryError.message,
          code: queryError.code
        }
      });
    }
    
    console.log('🔐 [AUTH CONTROLLER] Query result:', result.rows.length, 'rows found');
    // Sanitize user data before logging
    console.log('🔐 [AUTH CONTROLLER] Query result data:', safeStringify(result.rows, sanitizeUserData));

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        statusCode: 401
      });
    }

    const user = result.rows[0];

    // Check if user is approved
    if (!user.is_approved) {
      return res.status(401).json({
        success: false,
        message: 'Account is not approved. Please contact administrator.',
        statusCode: 401
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        statusCode: 401
      });
    }

    // Generate JWT token
    const token = generateToken(user.user_id, user.email);

    // Note: last_login column doesn't exist in the actual database schema

    // Remove password from response
    delete user.password_hash;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          user_id: user.user_id,
          id: user.user_id, // Add id field for compatibility
          email: user.email,
          name: user.name,
          first_name: user.name ? user.name.split(' ')[0] : '',
          last_name: user.name ? user.name.split(' ').slice(1).join(' ') : '',
          role_id: user.role_id,
          role_name: user.role_name,
          role: user.role_name, // Add role field for compatibility
          is_approved: user.is_approved,
          profilePic: user.profile_pic, // Add profile picture
          profile_pic: user.profile_pic, // Keep both for compatibility
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        token
      }
    });
  } catch (error) {
    console.error('🔐 [AUTH CONTROLLER] Login error:', error);
    console.error('🔐 [AUTH CONTROLLER] Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      statusCode: 500,
      debug: {
        error: error.message,
        code: error.code,
        name: error.name
      }
    });
  }
};

// Logout user (client-side token removal)
export const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    console.log('🔍 [AUTH CONTROLLER] Getting profile for user ID:', userId);

    const result = await db.query(`
      SELECT u.*, r.name AS role_name, up.department_id, d.name AS department_name, d.department_abbreviation,
             up.profile_type, up.specialization, up.designation, up.office_assigned, up.contact_email, up.bio, up.position
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN user_profiles up ON u.user_id = up.user_id
      LEFT JOIN departments d ON up.department_id = d.department_id
      WHERE u.user_id = $1
    `, [userId]);

    console.log('🔍 [AUTH CONTROLLER] Profile query result:', result.rows.length, 'rows found');

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        statusCode: 404
      });
    }

    // Transform user data to match frontend expectations
    const userData = result.rows[0];
    const user = {
      user_id: userData.user_id,
      id: userData.user_id, // Add id field for compatibility
      name: userData.name,
      first_name: userData.first_name,
      last_name: userData.last_name,
      email: userData.email,
      role_name: userData.role_name,
      role: userData.role_name, // Add role field for compatibility
      role_id: userData.role_id,
      is_approved: userData.is_approved,
      profilePic: userData.profile_pic, // Frontend expects camelCase
      profile_pic: userData.profile_pic, // Keep both for compatibility
      created_at: userData.created_at,
      updated_at: userData.updated_at,
      department_id: userData.department_id,
      department_name: userData.department_name,
      department_abbreviation: userData.department_abbreviation,
      profile_type: userData.profile_type,
      specialization: userData.specialization,
      designation: userData.designation,
      office_assigned: userData.office_assigned,
      contact_email: userData.contact_email,
      bio: userData.bio,
      position: userData.position
    };

    // Sanitize user data before logging
    console.log('🔍 [AUTH CONTROLLER] Transformed user data:', safeStringify(user, sanitizeUserData));

    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('❌ [AUTH CONTROLLER] Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      statusCode: 500
    });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { first_name, last_name, middle_name, phone, profile_photo } = req.body;

    const result = await db.query(`
      UPDATE users 
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          middle_name = COALESCE($3, middle_name),
          phone = COALESCE($4, phone),
          profile_photo = COALESCE($5, profile_photo),
          updated_at = NOW()
      WHERE user_id = $6
      RETURNING user_id, email, first_name, last_name, middle_name, phone, profile_photo, updated_at
    `, [first_name, last_name, middle_name, phone, profile_photo, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        statusCode: 404
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: result.rows[0] }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      statusCode: 500
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { current_password, new_password } = req.body;

    // Get current password hash
    const result = await db.query('SELECT password_hash FROM users WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        statusCode: 404
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
        statusCode: 400
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2', 
      [hashedPassword, userId]);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      statusCode: 500
    });
  }
};
