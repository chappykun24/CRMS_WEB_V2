import bcrypt from 'bcrypt';
import db from '../config/database.js';
import { generateToken } from '../middleware/auth.js';

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
    const { email, password } = req.body;

    // Find user by email
    const result = await db.query(`
      SELECT u.user_id, u.email, u.password_hash, u.first_name, u.last_name, u.middle_name, 
             u.role_id, u.department_id, u.employee_id, u.phone, u.is_active, u.last_login,
             r.name as role_name, d.name as department_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN departments d ON u.department_id = d.department_id
      WHERE u.email = $1
    `, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        statusCode: 401
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.',
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

    // Update last login
    await db.query('UPDATE users SET last_login = NOW() WHERE user_id = $1', [user.user_id]);

    // Remove password from response
    delete user.password_hash;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          user_id: user.user_id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          middle_name: user.middle_name,
          role_id: user.role_id,
          role_name: user.role_name,
          department_id: user.department_id,
          department_name: user.department_name,
          employee_id: user.employee_id,
          phone: user.phone,
          is_active: user.is_active,
          last_login: user.last_login
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
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

    const result = await db.query(`
      SELECT u.user_id, u.email, u.first_name, u.last_name, u.middle_name, 
             u.role_id, u.department_id, u.employee_id, u.phone, u.profile_photo, 
             u.is_active, u.last_login, u.created_at,
             r.name as role_name, d.name as department_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN departments d ON u.department_id = d.department_id
      WHERE u.user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        statusCode: 404
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get profile error:', error);
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
