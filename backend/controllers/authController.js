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

// Login user - Optimized for performance
export const login = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { email, password } = req.body;

    // Early validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        statusCode: 400
      });
    }

    // Sanitize email for logging (only log in development)
    const sanitizedEmail = process.env.NODE_ENV === 'development' && email ? (() => {
      const [localPart, domain] = email.split('@');
      return localPart && domain ? `${localPart.substring(0, 3)}***@${domain}` : '***';
    })() : '***';
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 [AUTH] Login attempt:', sanitizedEmail);
    }

    // Optimized single query: fetch all user data including profile_pic in one query
    const result = await db.query(`
      SELECT 
        u.user_id, 
        u.email, 
        u.password_hash, 
        u.name,
        u.profile_pic,
        u.role_id, 
        u.is_approved, 
        u.created_at, 
        u.updated_at,
        r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      WHERE u.email = $1
      LIMIT 1
    `, [email]);

    // User not found - return generic error for security
    if (!result.rows || result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        statusCode: 401
      });
    }

    const user = result.rows[0];

    // Check approval status before password verification (fail fast)
    if (!user.is_approved) {
      return res.status(401).json({
        success: false,
        message: 'Account is not approved. Please contact administrator.',
        statusCode: 401
      });
    }

    // Verify password asynchronously
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        statusCode: 401
      });
    }

    // Generate JWT token (synchronous operation)
    const token = generateToken(user.user_id, user.email);

    // Parse name into first/last name efficiently
    const nameParts = user.name ? user.name.trim().split(/\s+/) : [];
    const first_name = nameParts[0] || '';
    const last_name = nameParts.slice(1).join(' ') || '';

    // Prepare user response object
    const userResponse = {
      user_id: user.user_id,
      id: user.user_id,
      email: user.email,
      name: user.name,
      first_name,
      last_name,
      role_id: user.role_id,
      role_name: user.role_name,
      role: user.role_name,
      is_approved: user.is_approved,
      profilePic: user.profile_pic || null,
      profile_pic: user.profile_pic || null,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      const duration = Date.now() - startTime;
      console.log(`✅ [AUTH] Login successful for ${sanitizedEmail} (${duration}ms)`);
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    // Log error details
    console.error('❌ [AUTH] Login error:', error.message);
    
    // Only log stack trace in development
    if (process.env.NODE_ENV === 'development') {
      console.error('🔐 [AUTH] Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      statusCode: 500
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
