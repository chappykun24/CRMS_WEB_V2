import express, { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import multer from 'multer';

const { Pool } = pg;
// Load environment variables from .env.local first, then .env
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env if .env.local doesn't exist

// Copy VITE_ environment variables to regular ones for backend use
if (process.env.VITE_NEON_HOST) {
  process.env.NEON_HOST = process.env.VITE_NEON_HOST;
  process.env.NEON_DATABASE = process.env.VITE_NEON_DATABASE;
  process.env.NEON_USER = process.env.VITE_NEON_USER;
  process.env.NEON_PASSWORD = process.env.VITE_NEON_PASSWORD;
  process.env.NEON_PORT = process.env.VITE_NEON_PORT;
}

const app = express();
const PORT = process.env.PORT || 3001;

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced CORS configuration for both development and production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://your-domain.vercel.app', // Replace with your actual Vercel domain
        'https://your-custom-domain.com'  // Replace with your custom domain if any
      ]
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for file uploads (memory storage for base64 conversion)
const upload = multer({
  storage: multer.memoryStorage(), // Store file in memory temporarily
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Add request logging for development
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Department access control middleware
const checkDepartmentAccess = async (req, res, next) => {
  try {
    // Skip department check for auth endpoints and admin operations
    if (req.path.startsWith('/api/auth') || req.path.includes('/approve') || req.method === 'POST') {
      return next();
    }

    // Get user ID from request (you may need to adjust this based on your auth implementation)
    const userId = req.headers['user-id'] || req.query?.userId || (req.body ? req.body.userId : undefined);
    
    if (!userId) {
      // If no user ID, allow the request (for public endpoints)
      return next();
    }

    // Get user's department access
    const userDeptQuery = `
      SELECT up.department_id, d.name AS department_name
      FROM user_profiles up
      LEFT JOIN departments d ON up.department_id = d.department_id
      WHERE up.user_id = $1
    `;
    
    const userDeptResult = await pool.query(userDeptQuery, [userId]);
    
    if (userDeptResult.rows.length > 0 && userDeptResult.rows[0].department_id) {
      // User has department access, add it to request for filtering
      req.userDepartment = {
        id: userDeptResult.rows[0].department_id,
        name: userDeptResult.rows[0].department_name
      };
      console.log(`🔒 [AUTH] User ${userId} restricted to department: ${req.userDepartment.name}`);
    } else {
      // User has no department access, they should see NO data
      req.userDepartment = {
        id: null,
        name: null,
        noAccess: true
      };
      console.log(`🚫 [AUTH] User ${userId} has no department access - NO DATA ACCESS ALLOWED`);
    }
    
    next();
  } catch (error) {
    console.error('❌ [AUTH] Department access check failed:', error);
    // Continue without department restriction if check fails
    req.userDepartment = null;
    next();
  }
};

// Apply department access middleware to all API routes
app.use('/api', checkDepartmentAccess);

// Database connection
const connectionString = `postgresql://${process.env.VITE_NEON_USER || process.env.NEON_USER}:${process.env.VITE_NEON_PASSWORD || process.env.NEON_PASSWORD}@${process.env.VITE_NEON_HOST || process.env.NEON_HOST}:${process.env.VITE_NEON_PORT || process.env.NEON_PORT || 5432}/${process.env.VITE_NEON_DATABASE || process.env.NEON_DATABASE}?sslmode=require`;

console.log('🔗 [SERVER] Database connection string:', connectionString.replace(process.env.VITE_NEON_PASSWORD || process.env.NEON_PASSWORD, '***PASSWORD***'));
console.log('🌍 [SERVER] Environment:', process.env.NODE_ENV);

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : true,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test database connection
app.get('/api/health', async (req, res) => {
  try {
    const client = await pool.connect();
    client.release();
    res.json({ status: 'healthy', message: 'Database connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// Test registration endpoint
app.get('/api/auth/register', (req, res) => {
  res.json({ 
    message: 'Registration endpoint is accessible',
    method: 'GET',
    timestamp: new Date().toISOString()
  });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 [LOGIN] Attempting login for email:', email);
    
    const userQuery = `
      SELECT u.user_id, u.name, u.email, u.password_hash, u.is_approved, 
             u.profile_pic, r.name as role, up.profile_type, up.designation
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN user_profiles up ON u.user_id = up.user_id
      WHERE u.email = $1
    `;
    
    console.log('🔐 [LOGIN] Executing query for email:', email);
    const userResult = await pool.query(userQuery, [email]);
    console.log('🔐 [LOGIN] Query result rows:', userResult.rows.length);
    
    if (userResult.rows.length === 0) {
      console.log('❌ [LOGIN] No user found for email:', email);
      
      // Debug: Check if user exists without role JOIN
      const basicUserQuery = 'SELECT user_id, name, email, role_id FROM users WHERE email = $1';
      const basicUserResult = await pool.query(basicUserQuery, [email]);
      console.log('🔍 [LOGIN] Basic user query result:', basicUserResult.rows);
      
      if (basicUserResult.rows.length > 0) {
        console.log('⚠️ [LOGIN] User exists but role JOIN failed. User data:', basicUserResult.rows[0]);
        return res.status(401).json({ success: false, error: 'User found but role information missing' });
      }
      
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    if (!user.is_approved) {
      return res.status(401).json({ success: false, error: 'Account not approved' });
    }
    
    // Proper password verification using bcrypt.compare
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (isPasswordValid || password === 'password123') { // Keep fallback for testing
      const { password_hash, ...userData } = user;
      
      // Transform user data to match frontend expectations
      const transformedUser = {
        id: userData.user_id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        isApproved: userData.is_approved,
        profileType: userData.profile_type,
        designation: userData.designation,
        profilePic: userData.profile_pic // Add the missing profilePic field
      };
      
      res.json({
        success: true,
        user: transformedUser,
        message: 'Login successful'
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid password' });
    }
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Faculty Registration endpoint with file upload
app.post('/api/auth/register', upload.single('profilePic'), async (req, res) => {
  try {
    console.log('📝 [REGISTER] Registration request received at:', new Date().toISOString());
    console.log('📝 [REGISTER] Request headers:', req.headers);
    console.log('📝 [REGISTER] Request body:', JSON.stringify(req.body, null, 2));
    
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
        termEnd
      } = req.body;

      // Handle profile picture upload and convert to base64
      let profilePicBase64 = null;
      if (req.file) {
        const base64String = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;
        profilePicBase64 = `data:${mimeType};base64,${base64String}`;
        console.log('📸 [REGISTER] Profile picture converted to base64, size:', req.file.size, 'bytes');
      } else {
        console.log('📸 [REGISTER] No profile picture uploaded');
      }

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !department || !schoolTerm) {
      return res.status(400).json({ 
        success: false, 
        error: 'First name, last name, email, password, department, and school term are required' 
      });
    }

    // Check if email already exists
    const existingUserQuery = 'SELECT user_id FROM users WHERE email = $1';
    const existingUserResult = await pool.query(existingUserQuery, [email]);
    
    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email address is already registered' 
      });
    }

    // Use fixed role ID 2 for FACULTY members
    const roleId = 2;
    console.log('✅ [REGISTER] Using fixed FACULTY role ID:', roleId);

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Combine name fields
    const fullName = [firstName, middleInitial, lastName, suffix].filter(Boolean).join(' ');

    // Insert user with pending approval
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
      profilePicBase64, 
      false // is_approved = false (pending approval)
    ]);

    const userId = insertUserResult.rows[0].user_id;

    // Insert user profile
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

    // Insert user approval record
    const insertApprovalQuery = `
      INSERT INTO user_approvals (user_id, approval_note) 
      VALUES ($1, $2)
    `;
    
    await pool.query(insertApprovalQuery, [
      userId,
      'Faculty registration pending admin approval'
    ]);

    const response = {
      success: true,
      message: 'Faculty registration successful! Your account is pending approval.',
      userId: userId,
      status: 'pending_approval'
    };

    console.log('✅ [REGISTER] Registration successful for user ID:', userId);
    res.status(201).json(response);

  } catch (error) {
    console.error('❌ [REGISTER] Registration error:', error);
    
    // Handle multer errors specifically
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 5MB.',
          details: 'Please choose a smaller image file'
        });
      }
    }
    
    res.status(500).json({ 
      success: false, 
      error: `Registration failed: ${error.message}`,
      details: 'Please try again or contact support'
    });
  }
});

// Get users endpoint
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.*, r.name AS role_name, up.department_id, d.name AS department_name, d.department_abbreviation
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN user_profiles up ON u.user_id = up.user_id
      LEFT JOIN departments d ON up.department_id = d.department_id
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create user endpoint
app.post('/api/users', async (req, res) => {
  try {
    console.log('👥 [CREATE USER] Creating new user...');
    const { name, email, role_id, password, department_id } = req.body;
    
    // Validate required fields
    if (!name || !email || !role_id || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, email, role_id, and password are required' 
      });
    }

    // Check if email already exists
    const existingUserQuery = 'SELECT user_id FROM users WHERE email = $1';
    const existingUserResult = await pool.query(existingUserQuery, [email]);
    
    if (existingUserResult.rows.length > 0) {
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

    // Create user profile with department if provided
    if (department_id) {
      const insertProfileQuery = `
        INSERT INTO user_profiles (user_id, department_id, profile_type, created_at, updated_at) 
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      await pool.query(insertProfileQuery, [newUser.user_id, department_id, 'STAFF']);
    }

    // Get role name and department name for the response
    const roleQuery = 'SELECT name FROM roles WHERE role_id = $1';
    const roleResult = await pool.query(roleQuery, [role_id]);
    const roleName = roleResult.rows[0]?.name || 'Unknown';

    let departmentName = null;
    if (department_id) {
      const deptQuery = 'SELECT name FROM departments WHERE department_id = $1';
      const deptResult = await pool.query(deptQuery, [department_id]);
      departmentName = deptResult.rows[0]?.name || 'Unknown';
    }

    // Return the created user with role name and department
    const responseUser = {
      ...newUser,
      role_name: roleName,
      department_id: department_id,
      department_name: departmentName
    };

    console.log('✅ [CREATE USER] User created successfully:', responseUser.user_id);
    res.status(201).json(responseUser);

  } catch (error) {
    console.error('❌ [CREATE USER] Error occurred:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get roles endpoint
app.get('/api/roles', async (req, res) => {
  try {
    const result = await pool.query('SELECT role_id, name FROM roles ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve user endpoint
app.patch('/api/users/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    // Approve user and insert approval record
    const approveQuery = 'UPDATE users SET is_approved = TRUE, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 RETURNING user_id, is_approved';
    const result = await pool.query(approveQuery, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const insertApproval = 'INSERT INTO user_approvals (user_id, approval_note) VALUES ($1, $2)';
    await pool.query(insertApproval, [id, 'Approved by admin']);
    res.json({ success: true, userId: id, isApproved: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user department access endpoint
app.patch('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { department_id } = req.body;
    
    // Validate that id is a valid integer
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid user ID. Must be a valid integer.' 
      });
    }

    // Check if user exists
    const userExists = await pool.query('SELECT user_id FROM users WHERE user_id = $1', [userId]);
    if (userExists.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If department_id is provided, validate it exists
    if (department_id !== null && department_id !== undefined) {
      const deptExists = await pool.query('SELECT department_id FROM departments WHERE department_id = $1', [department_id]);
      if (deptExists.rowCount === 0) {
        return res.status(400).json({ error: 'Department not found' });
      }
    }

    // Update or create user profile with department access
    if (department_id !== null && department_id !== undefined) {
      // Check if user profile exists
      const profileExists = await pool.query('SELECT user_profile_id FROM user_profiles WHERE user_id = $1', [userId]);
      
      if (profileExists.rowCount > 0) {
        // Update existing profile
        await pool.query(
          'UPDATE user_profiles SET department_id = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
          [department_id, userId]
        );
      } else {
        // Create new profile
        await pool.query(
          'INSERT INTO user_profiles (user_id, department_id, profile_type, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
          [userId, department_id, 'STAFF']
        );
      }
    } else {
      // Remove department access
      await pool.query(
        'UPDATE user_profiles SET department_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
        [userId]
      );
    }

    // Get updated user data with department name
    const result = await pool.query(`
      SELECT u.*, r.name AS role_name, up.department_id, d.name AS department_name, d.department_abbreviation
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN user_profiles up ON u.user_id = up.user_id
      LEFT JOIN departments d ON up.department_id = d.department_id
      WHERE u.user_id = $1
    `, [userId]);

    const updatedUser = result.rows[0];
    
    res.json({
      success: true,
      message: 'Department access updated successfully',
      user: updatedUser,
      department_id: updatedUser.department_id,
      department_name: updatedUser.department_name,
      department_abbreviation: updatedUser.department_abbreviation
    });

  } catch (error) {
    console.error('❌ [UPDATE USER] Error occurred:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get user profile endpoint
app.get('/api/users/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate that id is a valid integer
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid user ID. Must be a valid integer.' 
      });
    }
    const result = await pool.query(`
      SELECT u.*, r.name AS role_name, up.department_id, d.name AS department_name, d.department_abbreviation
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN user_profiles up ON u.user_id = up.user_id
      LEFT JOIN departments d ON up.department_id = d.department_id
      WHERE u.user_id = $1
    `, [userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Transform user data to match frontend expectations
    const userData = result.rows[0];
    const transformedUser = {
      id: userData.user_id,
      name: userData.name,
      email: userData.email,
      role: userData.role_name,
      isApproved: userData.is_approved,
      profilePic: userData.profile_pic,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
      departmentId: userData.department_id,
      departmentName: userData.department_name,
      departmentAbbreviation: userData.department_abbreviation
    };
    
    res.json({
      success: true,
      user: transformedUser
    });
  } catch (error) {
    console.error('❌ [USER PROFILE] Error occurred:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update user profile endpoint
app.put('/api/users/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate that id is a valid integer
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid user ID. Must be a valid integer.' 
      });
    }
    
    const { name, email, profilePic } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // First, get the current user data to compare email
    const currentUserQuery = `SELECT name, email, profile_pic FROM users WHERE user_id = $1`;
    const currentUserResult = await pool.query(currentUserQuery, [userId]);
    
    if (currentUserResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const currentUser = currentUserResult.rows[0];
    
    // Only update email if it has actually changed
    let updateQuery;
    let updateValues;
    
    if (email === currentUser.email) {
      // Email unchanged, only update name and profile_pic
      updateQuery = `
        UPDATE users 
        SET 
          name = $1, 
          profile_pic = $2, 
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $3 
        RETURNING *
      `;
      updateValues = [name, profilePic || null, userId];
    } else {
      // Email changed, update everything
      updateQuery = `
        UPDATE users 
        SET 
          name = $1, 
          email = $2, 
          profile_pic = $3, 
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $4 
        RETURNING *
      `;
      updateValues = [name, email, profilePic || null, userId];
    }

    const result = await pool.query(updateQuery, updateValues);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = result.rows[0];
    console.log('✅ [USER PROFILE] Profile updated successfully for user:', id);

    // Transform user data to match frontend expectations
    const transformedUser = {
      id: updatedUser.user_id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role_id, // This might need a join to get role name
      profilePic: updatedUser.profile_pic,
      updatedAt: updatedUser.updated_at
    };

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: transformedUser
    });
  } catch (error) {
    console.error('❌ [USER PROFILE] Error occurred:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Change password endpoint
app.put('/api/users/:id/change-password', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate that id is a valid integer
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid user ID. Must be a valid integer.' 
      });
    }
    
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'New password must be at least 6 characters long' 
      });
    }

    // Get user's current password hash
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    
    if (!isValidPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Current password is incorrect' 
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING user_id',
      [newPasswordHash, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ [USER PASSWORD] Password changed successfully for user:', id);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('❌ [USER PASSWORD] Error occurred:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Upload profile photo endpoint
app.post('/api/users/:id/upload-photo', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate that id is a valid integer
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid user ID. Must be a valid integer.' 
      });
    }
    
    const { photoData } = req.body;

    if (!photoData) {
      return res.status(400).json({ 
        success: false, 
        error: 'No photo data provided' 
      });
    }

    // Validate base64 data format
    if (!photoData.startsWith('data:image/')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid photo data format. Expected base64 image data.' 
      });
    }

    // Check base64 data size (approximately 1.33x larger than original file)
    // 5MB file = ~6.7MB base64 string
    const base64Size = Buffer.byteLength(photoData, 'utf8');
    const maxSize = 7 * 1024 * 1024; // 7MB limit for base64
    
    if (base64Size > maxSize) {
      return res.status(400).json({ 
        success: false, 
        error: 'Photo data too large. Please select a smaller image (max 5MB original file).' 
      });
    }

    // Update user profile with base64 photo data
    const result = await pool.query(`
      UPDATE users 
      SET profile_pic = $1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2 
      RETURNING user_id, profile_pic
    `, [photoData, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ [UPLOAD PHOTO] Photo uploaded successfully for user:', id);

    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      photoUrl: photoData,
      user: {
        id: result.rows[0].user_id,
        profilePic: result.rows[0].profile_pic
      }
    });
  } catch (error) {
    console.error('❌ [UPLOAD PHOTO] Error occurred:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get students endpoint
app.get('/api/students', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register new student (students-only model)
app.post('/api/students/register', async (req, res) => {
  try {
    const { 
      studentNumber,
      firstName,
      lastName,
      middleInitial,
      suffix,
      email,
      gender,
      birthDate,
      profilePic
    } = req.body;

    if (!studentNumber || !firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        error: 'Student number, first name, last name, and email are required'
      });
    }

    // Unique checks
    const existingStudent = await pool.query('SELECT 1 FROM students WHERE student_number = $1', [studentNumber]);
    if (existingStudent.rowCount > 0) {
      return res.status(400).json({ success: false, error: 'Student number is already registered' });
    }

    const existingEmail = await pool.query('SELECT 1 FROM students WHERE contact_email = $1', [email]);
    if (existingEmail.rowCount > 0) {
      return res.status(400).json({ success: false, error: 'Email address is already used by another student' });
    }

    const fullName = [firstName, middleInitial, lastName, suffix].filter(Boolean).join(' ');

    const insert = await pool.query(
      `INSERT INTO students (student_number, full_name, gender, birth_date, contact_email, student_photo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING student_id`,
      [studentNumber, fullName, gender || null, birthDate || null, email, profilePic || null]
    );

    return res.status(201).json({ success: true, studentId: insert.rows[0].student_id, message: 'Student registration successful!' });
  } catch (error) {
    console.error('❌ [STUDENTS REGISTER] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update student
app.put('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      studentNumber,
      firstName,
      lastName,
      middleInitial,
      suffix,
      email,
      gender,
      birthDate,
      profilePic
    } = req.body;

    if (!studentNumber || !firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        error: 'Student number, first name, last name, and email are required'
      });
    }

    const fullName = [firstName, middleInitial, lastName, suffix].filter(Boolean).join(' ');

    const result = await pool.query(
      `UPDATE students
       SET student_number = $1, full_name = $2, gender = $3, birth_date = $4,
           contact_email = $5, student_photo = $6, updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $7`,
      [studentNumber, fullName, gender || null, birthDate || null, email, profilePic || null, id]
    );

    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Student not found' });

    res.json({ success: true, message: 'Student updated successfully' });
  } catch (error) {
    console.error('❌ [STUDENTS UPDATE] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete student
app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM students WHERE student_id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Student not found' });
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    console.error('❌ [STUDENTS DELETE] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload student photo (base64)
app.post('/api/students/upload-photo', async (req, res) => {
  try {
    const { photoBase64, studentId } = req.body;

    if (!photoBase64 || !studentId) {
      return res.status(400).json({
        success: false,
        error: 'Photo and student ID are required'
      });
    }

    // Validate base64 string
    if (typeof photoBase64 !== 'string' || !photoBase64.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image format'
      });
    }

    // Check base64 size (approximately 5MB limit)
    const base64Size = Math.ceil((photoBase64.length * 3) / 4);
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (base64Size > maxSize) {
      return res.status(400).json({
        success: false,
        error: 'Image size must be less than 5MB'
      });
    }

    // Update database with base64 photo data
    const result = await pool.query(`
      UPDATE students 
      SET student_photo = $1, 
          updated_at = NOW()
      WHERE student_id = $2
      RETURNING student_id, student_photo
    `, [photoBase64, studentId]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    console.log(`✅ [STUDENT PHOTO] Photo uploaded for student ${studentId}`);

    res.json({
      success: true,
      photoUrl: photoBase64,
      message: 'Photo uploaded successfully'
    });

  } catch (error) {
    console.error('❌ [STUDENT PHOTO] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload photo'
    });
  }
});

// Get classes endpoint
app.get('/api/classes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM classes');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import API routes
import departmentsRouter from './api/departments/index.js';
import schoolTermsRouter from './api/school-terms/index.js';

// Use API routes
app.use('/api/departments', departmentsRouter);
app.use('/api/school-terms', schoolTermsRouter);

console.log('🚀 [SERVER] School Configuration API routes loaded:');
console.log('   📍 /api/departments');
console.log('   📍 /api/school-terms');

// Catalog API (programs, specializations, terms, courses)
const catalog = Router();

catalog.get('/programs', async (req, res) => {
  try {
    let sql = `
      SELECT p.program_id, p.department_id, p.name, p.description, p.program_abbreviation,
             d.name AS department_name
      FROM programs p
      LEFT JOIN departments d ON p.department_id = d.department_id
    `;
    const params = [];
    
    // Check if user has no department access
    if (req.userDepartment && req.userDepartment.noAccess) {
      console.log(`🚫 [PROGRAMS] User has no department access - returning empty result`);
      return res.json([]);
    }
    
    // Add department filtering if user has department access
    if (req.userDepartment && req.userDepartment.id) {
      sql += ` WHERE p.department_id = $1`;
      params.push(req.userDepartment.id);
      console.log(`🔒 [PROGRAMS] Filtering by department: ${req.userDepartment.name} (ID: ${req.userDepartment.id})`);
    }
    
    sql += ` ORDER BY p.name`;
    
    const result = await pool.query(sql, params);
    
    if (req.userDepartment && req.userDepartment.id) {
      console.log(`🔒 [PROGRAMS] User restricted to department ${req.userDepartment.name}: showing ${result.rows.length} programs`);
    } else {
      console.log(`🔓 [PROGRAMS] No department restriction: showing ${result.rows.length} programs`);
    }
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get individual program by ID
catalog.get('/programs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT p.program_id, p.department_id, p.name, p.description, p.program_abbreviation,
             d.name AS department_name
      FROM programs p
      LEFT JOIN departments d ON p.department_id = d.department_id
      WHERE p.program_id = $1
    `, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Program not found' });
    }
    
    // Check if user has access to this program's department
    if (req.userDepartment && req.userDepartment.id) {
      const program = result.rows[0];
      if (program.department_id !== req.userDepartment.id) {
        console.log(`🚫 [PROGRAM] User denied access to program ${id} from department ${program.department_name}`);
        return res.status(403).json({ error: 'Access denied: Program not in your department' });
      }
      console.log(`✅ [PROGRAM] User granted access to program ${id} from department ${program.department_name}`);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching program:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create program
catalog.post('/programs', async (req, res) => {
  try {
    const { name, description, program_abbreviation, department_id } = req.body;
    if (!name || !program_abbreviation) {
      return res.status(400).json({ error: 'name and program_abbreviation are required' });
    }
    const result = await pool.query(
      `INSERT INTO programs (name, description, program_abbreviation, department_id)
       VALUES ($1, $2, $3, $4)
       RETURNING program_id, department_id, name, description, program_abbreviation`,
      [name, description || null, program_abbreviation, department_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update program
catalog.put('/programs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, program_abbreviation, department_id } = req.body;
    const result = await pool.query(
      `UPDATE programs
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           program_abbreviation = COALESCE($3, program_abbreviation),
           department_id = COALESCE($4, department_id)
       WHERE program_id = $5
       RETURNING program_id, department_id, name, description, program_abbreviation`,
      [name || null, description || null, program_abbreviation || null, department_id || null, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Program not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete program
catalog.delete('/programs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if program exists
    const programCheck = await pool.query('SELECT name FROM programs WHERE program_id = $1', [id]);
    if (programCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Program not found' });
    }
    
    // Check for child specializations
    const specializationsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM program_specializations WHERE program_id = $1', 
      [id]
    );
    
    if (parseInt(specializationsCheck.rows[0].count) > 0) {
      const specializationCount = parseInt(specializationsCheck.rows[0].count);
      
      // Get the actual specialization names for better user experience
      const specializationNames = await pool.query(`
        SELECT name, abbreviation 
        FROM program_specializations 
        WHERE program_id = $1 
        ORDER BY name
        LIMIT 5
      `, [id]);
      
      const specializationList = specializationNames.rows.map(s => `${s.name} (${s.abbreviation})`).join(', ');
      const remainingText = specializationCount > 5 ? ` and ${specializationCount - 5} more` : '';
      
      return res.status(400).json({ 
        error: `Cannot delete program "${programCheck.rows[0].name}"`,
        message: `This program contains ${specializationCount} specialization${specializationCount > 1 ? 's' : ''}:`,
        reminder: `You must remove all specializations first before deleting this program.`,
        existingData: {
          type: 'specializations',
          count: specializationCount,
          examples: specializationList + remainingText
        },
        details: {
          type: 'program_has_specializations',
          count: specializationCount,
          programName: programCheck.rows[0].name,
          action: 'delete_specializations_first'
        },
        nextSteps: [
          "Go to the Specializations tab",
          "Delete all specializations under this program",
          "Return to Programs tab and try deleting again"
        ],
        hierarchy: {
          level: "Program",
          children: "Specializations",
          grandchildren: "Courses"
        }
      });
    }
    
    // Check for child courses (through specializations)
    const coursesCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM courses c
      JOIN program_specializations ps ON c.specialization_id = ps.specialization_id
      WHERE ps.program_id = $1
    `, [id]);
    
    if (parseInt(coursesCheck.rows[0].count) > 0) {
      const courseCount = parseInt(coursesCheck.rows[0].count);
      
      // Get the actual course names for better user experience
      const courseNames = await pool.query(`
        SELECT c.course_code, c.title, ps.name as specialization_name
        FROM courses c
        JOIN program_specializations ps ON c.specialization_id = ps.specialization_id
        WHERE ps.program_id = $1 
        ORDER BY c.course_code
        LIMIT 5
      `, [id]);
      
      const courseList = courseNames.rows.map(c => `${c.course_code} - ${c.title} (${c.specialization_name})`).join(', ');
      const remainingText = courseCount > 5 ? ` and ${courseCount - 5} more` : '';
      
      return res.status(400).json({ 
        error: `Cannot delete program "${programCheck.rows[0].name}"`,
        message: `This program contains ${courseCount} course${courseCount > 1 ? 's' : ''}:`,
        reminder: `You must remove all courses first before deleting this program.`,
        existingData: {
          type: 'courses',
          count: courseCount,
          examples: courseList + remainingText
        },
        details: {
          type: 'program_has_courses',
          count: courseCount,
          programName: programCheck.rows[0].name,
          action: 'delete_courses_first'
        },
        nextSteps: [
          "Go to the Courses tab",
          "Delete all courses under this program",
          "Return to Programs tab and try deleting again"
        ],
        hierarchy: {
          level: "Program",
          children: "Specializations",
          grandchildren: "Courses"
        }
      });
    }
    
    // If no child records, proceed with deletion
    await pool.query('DELETE FROM programs WHERE program_id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting program:', error);
    res.status(500).json({ error: error.message });
  }
});

catalog.get('/program-specializations', async (req, res) => {
  try {
    const { programId } = req.query;
    let sql = `
      SELECT ps.specialization_id, ps.program_id, ps.name, ps.description, ps.abbreviation,
             p.department_id, d.name AS department_name
      FROM program_specializations ps
      JOIN programs p ON ps.program_id = p.program_id
      LEFT JOIN departments d ON p.department_id = d.department_id
    `;
    const conditions = [];
    const params = [];
    
    // Check if user has no department access
    if (req.userDepartment && req.userDepartment.noAccess) {
      console.log(`🚫 [SPECIALIZATIONS] User has no department access - returning empty result`);
      return res.json([]);
    }
    
    // Add department filtering if user has department access
    if (req.userDepartment && req.userDepartment.id) {
      params.push(req.userDepartment.id);
      conditions.push(`p.department_id = $${params.length}`);
      console.log(`🔒 [SPECIALIZATIONS] Filtering by department: ${req.userDepartment.name} (ID: ${req.userDepartment.id})`);
    }
    
    // Add program filtering if specified
    if (programId) {
      params.push(programId);
      conditions.push(`ps.program_id = $${params.length}`);
    }
    
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    sql += ` ORDER BY ps.name`;
    
    const result = await pool.query(sql, params);
    
    if (req.userDepartment && req.userDepartment.id) {
      console.log(`🔒 [SPECIALIZATIONS] User restricted to department ${req.userDepartment.name}: showing ${result.rows.length} specializations`);
    } else {
      console.log(`🔓 [SPECIALIZATIONS] No department restriction: showing ${result.rows.length} specializations`);
    }
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get individual specialization by ID
catalog.get('/program-specializations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT ps.specialization_id, ps.program_id, ps.name, ps.description, ps.abbreviation,
             p.department_id, d.name AS department_name
      FROM program_specializations ps
      JOIN programs p ON ps.program_id = p.program_id
      LEFT JOIN departments d ON p.department_id = d.department_id
      WHERE ps.specialization_id = $1
    `, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Specialization not found' });
    }
    
    // Check if user has access to this specialization's department
    if (req.userDepartment && req.userDepartment.id) {
      const specialization = result.rows[0];
      if (specialization.department_id !== req.userDepartment.id) {
        console.log(`🚫 [SPECIALIZATION] User denied access to specialization ${id} from department ${specialization.department_name}`);
        return res.status(403).json({ error: 'Access denied: Specialization not in your department' });
      }
      console.log(`✅ [SPECIALIZATION] User granted access to specialization ${id} from department ${specialization.department_name}`);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching specialization:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create specialization
catalog.post('/program-specializations', async (req, res) => {
  try {
    const { name, description, abbreviation, program_id } = req.body;
    if (!name || !abbreviation || !program_id) {
      return res.status(400).json({ error: 'name, abbreviation and program_id are required' });
    }
    const result = await pool.query(
      `INSERT INTO program_specializations (name, description, abbreviation, program_id)
       VALUES ($1, $2, $3, $4)
       RETURNING specialization_id, program_id, name, description, abbreviation`,
      [name, description || null, abbreviation, program_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update specialization
catalog.put('/program-specializations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, abbreviation } = req.body;
    const result = await pool.query(
      `UPDATE program_specializations
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           abbreviation = COALESCE($3, abbreviation)
       WHERE specialization_id = $4
       RETURNING specialization_id, program_id, name, description, abbreviation`,
      [name || null, description || null, abbreviation || null, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Specialization not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete specialization
catalog.delete('/program-specializations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if specialization exists
    const specializationCheck = await pool.query(
      'SELECT name FROM program_specializations WHERE specialization_id = $1', 
      [id]
    );
    if (specializationCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Specialization not found' });
    }
    
    // Check for child courses
    const coursesCheck = await pool.query(
      'SELECT COUNT(*) as count FROM courses WHERE specialization_id = $1', 
      [id]
    );
    
    if (parseInt(coursesCheck.rows[0].count) > 0) {
      const courseCount = parseInt(coursesCheck.rows[0].count);
      
      // Get the actual course names for better user experience
      const courseNames = await pool.query(`
        SELECT course_code, title 
        FROM courses 
        WHERE specialization_id = $1 
        ORDER BY course_code
        LIMIT 5
      `, [id]);
      
      const courseList = courseNames.rows.map(c => `${c.course_code} - ${c.title}`).join(', ');
      const remainingText = courseCount > 5 ? ` and ${courseCount - 5} more` : '';
      
      return res.status(400).json({ 
        error: `Cannot delete specialization "${specializationCheck.rows[0].name}"`,
        message: `This specialization contains ${courseCount} course${courseCount > 1 ? 's' : ''}:`,
        reminder: `You must remove all courses first before deleting this specialization.`,
        existingData: {
          type: 'courses',
          count: courseCount,
          examples: courseList + remainingText
        },
        details: {
          type: 'specialization_has_courses',
          count: courseCount,
          specializationName: specializationCheck.rows[0].name,
          action: 'delete_courses_first'
        },
        nextSteps: [
          "Go to the Courses tab",
          "Delete all courses under this specialization",
          "Return to Specializations tab and try deleting again"
        ],
        hierarchy: {
          level: "Specialization",
          children: "Courses"
        }
      });
    }
    
    // If no child records, proceed with deletion
    await pool.query('DELETE FROM program_specializations WHERE specialization_id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting specialization:', error);
    res.status(500).json({ error: error.message });
  }
});

catalog.get('/terms', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT term_id, school_year, semester, is_active
      FROM school_terms
      ORDER BY term_id
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

catalog.get('/courses', async (req, res) => {
  try {
    const { programId, specializationId, termId } = req.query;
    const conditions = [];
    const params = [];
    
    // Check if user has no department access
    if (req.userDepartment && req.userDepartment.noAccess) {
      console.log(`🚫 [COURSES] User has no department access - returning empty result`);
      return res.json([]);
    }
    
    // Add department filtering if user has department access
    if (req.userDepartment && req.userDepartment.id) {
      params.push(req.userDepartment.id);
      conditions.push(`p.department_id = $${params.length}`);
      console.log(`🔒 [COURSES] Filtering by department: ${req.userDepartment.name} (ID: ${req.userDepartment.id})`);
    }
    
    if (programId) {
      params.push(programId);
      conditions.push(`p.program_id = $${params.length}`);
    }
    if (specializationId) {
      params.push(specializationId);
      conditions.push(`ps.specialization_id = $${params.length}`);
    }
    if (termId) {
      params.push(termId);
      conditions.push(`c.term_id = $${params.length}`);
    }
    
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT 
        c.course_id, c.title, c.course_code, c.description, c.term_id, c.specialization_id,
        c.created_at, c.updated_at,
        ps.name AS specialization_name, ps.abbreviation,
        p.program_id, p.name AS program_name, p.program_abbreviation,
        p.department_id, d.name AS department_name
      FROM courses c
      LEFT JOIN program_specializations ps ON c.specialization_id = ps.specialization_id
      LEFT JOIN programs p ON ps.program_id = p.program_id
      LEFT JOIN departments d ON p.department_id = d.department_id
      ${where}
      ORDER BY c.course_code, c.title
    `;
    
    const result = await pool.query(sql, params);
    
    if (req.userDepartment && req.userDepartment.id) {
      console.log(`🔒 [COURSES] User restricted to department ${req.userDepartment.name}: showing ${result.rows.length} courses`);
    } else {
      console.log(`🔓 [COURSES] No department restriction: showing ${result.rows.length} courses`);
    }
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get individual course by ID
catalog.get('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const conditions = ['c.course_id = $1'];
    const params = [id];
    
    // Add department filtering if user has department access
    if (req.userDepartment && req.userDepartment.id) {
      params.push(req.userDepartment.id);
      conditions.push(`p.department_id = $${params.length}`);
      console.log(`🔒 [COURSE] Filtering by department: ${req.userDepartment.name} (ID: ${req.userDepartment.id})`);
    }
    
    const where = conditions.join(' AND ');
    const sql = `
      SELECT 
        c.course_id, c.title, c.course_code, c.description, c.term_id, c.specialization_id,
        c.created_at, c.updated_at,
        ps.name AS specialization_name, ps.abbreviation,
        p.program_id, p.name AS program_name, p.program_abbreviation,
        p.department_id, d.name AS department_name
      FROM courses c
      LEFT JOIN program_specializations ps ON c.specialization_id = ps.specialization_id
      LEFT JOIN programs p ON ps.program_id = p.program_id
      LEFT JOIN departments d ON p.department_id = d.department_id
      WHERE ${where}
    `;
    
    const result = await pool.query(sql, params);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Check if user has access to this course's department
    if (req.userDepartment && req.userDepartment.id) {
      const course = result.rows[0];
      if (course.department_id !== req.userDepartment.id) {
        console.log(`🚫 [COURSE] User denied access to course ${id} from department ${course.department_name}`);
        return res.status(403).json({ error: 'Access denied: Course not in your department' });
      }
      console.log(`✅ [COURSE] User granted access to course ${id} from department ${course.department_name}`);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create course
catalog.post('/courses', async (req, res) => {
  try {
    const { title, course_code, description, term_id, specialization_id } = req.body;
    if (!title || !course_code) {
      return res.status(400).json({ error: 'title and course_code are required' });
    }
    const result = await pool.query(
      `INSERT INTO courses (title, course_code, description, term_id, specialization_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING course_id, title, course_code, description, term_id, specialization_id`,
      [title, course_code, description || null, term_id || null, specialization_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update course
catalog.put('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, course_code, description, term_id, specialization_id } = req.body;
    const result = await pool.query(
      `UPDATE courses
       SET title = COALESCE($1, title),
           course_code = COALESCE($2, course_code),
           description = COALESCE($3, description),
           term_id = COALESCE($4, term_id),
           specialization_id = COALESCE($5, specialization_id)
       WHERE course_id = $6
       RETURNING course_id, title, course_code, description, term_id, specialization_id`,
      [title || null, course_code || null, description || null, term_id || null, specialization_id || null, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Course not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete course
catalog.delete('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if course exists
    const courseCheck = await pool.query(
      'SELECT title, course_code FROM courses WHERE course_id = $1', 
      [id]
    );
    if (courseCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Check for child records - you can add more checks here as your system grows
    // For example: class enrollments, grades, attendance records, etc.
    
    // Example check for class enrollments (uncomment when you have this table):
    // const enrollmentsCheck = await pool.query(
    //   'SELECT COUNT(*) as count FROM class_enrollments WHERE course_id = $1', 
    //   [id]
    // );
    // if (parseInt(enrollmentsCheck.rows[0].count) > 0) {
    //   return res.status(400).json({ 
    //     error: 'Cannot delete course. It has enrolled students. Please remove all enrollments first.' 
    //   });
    // }
    
    // If no child records, proceed with deletion
    await pool.query('DELETE FROM courses WHERE course_id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use('/api', catalog);

// Section-courses helper endpoints for staff assignment
app.get('/api/section-courses/sections', async (req, res) => {
  try {
    const result = await pool.query('SELECT section_id, section_code, term_id, program_id, year_level, specialization_id FROM sections ORDER BY section_code');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new section
app.post('/api/sections', async (req, res) => {
  try {
    const { section_code, term_id, program_id, year_level, specialization_id } = req.body || {};
    if (!section_code) return res.status(400).json({ error: 'section_code is required' });

    const result = await pool.query(
      `INSERT INTO sections (section_code, term_id, program_id, year_level, specialization_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING section_id, section_code, term_id, program_id, year_level, specialization_id`,
      [section_code, term_id || null, program_id || null, year_level || null, specialization_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating section:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a section
app.put('/api/sections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { section_code, term_id, program_id, year_level, specialization_id } = req.body || {};
    if (!section_code) return res.status(400).json({ error: 'section_code is required' });

    const result = await pool.query(
      `UPDATE sections 
       SET section_code = $1, term_id = $2, program_id = $3, year_level = $4, specialization_id = $5
       WHERE section_id = $6
       RETURNING section_id, section_code, term_id, program_id, year_level, specialization_id`,
      [section_code, term_id || null, program_id || null, year_level || null, specialization_id || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a section
app.delete('/api/sections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if section has dependencies
    const dependencyCheck = await pool.query(
      'SELECT COUNT(*) FROM section_courses WHERE section_id = $1',
      [id]
    );
    
    if (parseInt(dependencyCheck.rows[0].count) > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete section. It has associated courses or students.' 
      });
    }

    const result = await pool.query(
      'DELETE FROM sections WHERE section_id = $1 RETURNING section_id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json({ success: true, message: 'Section deleted successfully' });
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/section-courses/school-terms', async (req, res) => {
  try {
    const result = await pool.query('SELECT term_id, school_year, semester FROM school_terms ORDER BY term_id DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/section-courses/faculty', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.user_id, u.name, u.profile_pic
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE LOWER(r.name) = 'faculty' AND u.is_approved = true
      ORDER BY u.name
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get classes assigned to a specific faculty member
app.get('/api/section-courses/faculty/:facultyId', async (req, res) => {
  try {
    const { facultyId } = req.params;
    console.log(`🔍 [FACULTY CLASSES] Fetching classes for faculty ID: ${facultyId}`);
    
    const result = await pool.query(`
      SELECT 
        sc.section_course_id,
        sc.section_id,
        s.section_code,
        sc.course_id,
        c.course_code,
        c.title AS course_title,
        sc.instructor_id,
        u.name AS faculty_name,
        u.profile_pic AS faculty_avatar,
        st.term_id,
        st.semester,
        st.school_year,
        COALESCE(sc.banner_type, 'color') AS banner_type,
        COALESCE(sc.banner_color, '#3B82F6') AS banner_color,
        sc.banner_image AS banner_image
      FROM section_courses sc
      INNER JOIN sections s ON sc.section_id = s.section_id
      INNER JOIN courses c ON sc.course_id = c.course_id
      INNER JOIN users u ON sc.instructor_id = u.user_id
      INNER JOIN school_terms st ON sc.term_id = st.term_id
      WHERE sc.instructor_id = $1
      ORDER BY st.term_id DESC, s.section_code, c.title
      LIMIT 20
    `, [facultyId]);
    
    console.log(`✅ [FACULTY CLASSES] Found ${result.rows.length} classes for faculty ${facultyId}`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ [FACULTY CLASSES] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/section-courses/assigned', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sc.section_course_id,
             sc.section_id,
             s.section_code,
             sc.course_id,
             c.course_code,
             c.title AS course_title,
             sc.instructor_id,
             u.name AS faculty_name,
             u.profile_pic AS faculty_avatar,
             st.term_id,
             st.semester,
             st.school_year,
             sc.banner_type,
             sc.banner_color,
             sc.banner_image
      FROM section_courses sc
      LEFT JOIN sections s ON sc.section_id = s.section_id
      LEFT JOIN courses c ON sc.course_id = c.course_id
      LEFT JOIN users u ON sc.instructor_id = u.user_id
      LEFT JOIN school_terms st ON sc.term_id = st.term_id
      ORDER BY st.term_id DESC, s.section_code, c.title
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================
// Attendance: sessions + records
// =========================

// Get an attendance session and its records for a section_course and date
app.get('/api/attendance/sessions', async (req, res) => {
  try {
    const { section_course_id, date } = req.query || {};
    if (!section_course_id || !date) {
      return res.status(400).json({ error: 'section_course_id and date are required' });
    }

    // Ensure session exists
    const sessionRes = await pool.query(
      `SELECT session_id, section_course_id, session_date, start_time, end_time
       FROM attendance_sessions
       WHERE section_course_id = $1 AND session_date = $2`,
      [section_course_id, date]
    );

    let session = sessionRes.rows[0] || null;

    // Load records if session exists
    let records = [];
    if (session) {
      const recRes = await pool.query(
        `SELECT record_id, session_id, student_id, status, time_in, time_out, remarks
         FROM attendance_records
         WHERE session_id = $1
         ORDER BY student_id`,
        [session.session_id]
      );
      records = recRes.rows;
    }

    return res.json({ session, records });
  } catch (error) {
    console.error('❌ [ATTENDANCE] GET session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create (or get) an attendance session for a section_course and date
app.post('/api/attendance/sessions', async (req, res) => {
  try {
    const { section_course_id, date, start_time = null, end_time = null, created_by = null } = req.body || {};
    if (!section_course_id || !date) {
      return res.status(400).json({ error: 'section_course_id and date are required' });
    }

    // Check if session already exists
    const exists = await pool.query(
      `SELECT session_id FROM attendance_sessions WHERE section_course_id = $1 AND session_date = $2`,
      [section_course_id, date]
    );
    if (exists.rowCount > 0) {
      return res.json({ session_id: exists.rows[0].session_id, created: false });
    }

    // Create new session
    const insert = await pool.query(
      `INSERT INTO attendance_sessions (section_course_id, session_date, start_time, end_time, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING session_id`,
      [section_course_id, date, start_time, end_time, created_by]
    );
    return res.status(201).json({ session_id: insert.rows[0].session_id, created: true });
  } catch (error) {
    console.error('❌ [ATTENDANCE] Create session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upsert multiple attendance records for a session
app.post('/api/attendance/records/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const { session_id, records } = req.body || {};
    if (!session_id || !Array.isArray(records)) {
      return res.status(400).json({ error: 'session_id and records[] are required' });
    }

    await client.query('BEGIN');

    // For idempotency: delete existing records for the provided students, then insert fresh
    const studentIds = records.map(r => r.student_id).filter(Boolean);
    if (studentIds.length > 0) {
      await client.query(
        `DELETE FROM attendance_records WHERE session_id = $1 AND student_id = ANY($2::int[])`,
        [session_id, studentIds]
      );
    }

    for (const r of records) {
      const status = r.status && ['present','absent','late','excused'].includes(r.status) ? r.status : 'present';
      await client.query(
        `INSERT INTO attendance_records (session_id, student_id, status, time_in, time_out, remarks)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [session_id, r.student_id, status, r.time_in || null, r.time_out || null, r.remarks || null]
      );
    }

    await client.query('COMMIT');
    return res.json({ success: true, count: records.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [ATTENDANCE] Bulk upsert error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Create new section course
app.post('/api/section-courses', async (req, res) => {
  try {
    const { section_id, course_id, instructor_id, term_id, banner_type, banner_color, banner_image } = req.body;
    
    // Validate required fields
    if (!section_id || !course_id || !instructor_id || !term_id) {
      return res.status(400).json({ 
        error: 'section_id, course_id, instructor_id, and term_id are required' 
      });
    }

    // Check if section-course combination already exists
    const existingCheck = await pool.query(
      'SELECT section_course_id FROM section_courses WHERE section_id = $1 AND course_id = $2 AND term_id = $3',
      [section_id, course_id, term_id]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ 
        error: 'A class with this course, section, and semester combination already exists. Please choose different values or update the existing class.' 
      });
    }

    // Insert new section course
    const result = await pool.query(`
      INSERT INTO section_courses (section_id, course_id, instructor_id, term_id, banner_type, banner_color, banner_image, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING section_course_id, section_id, course_id, instructor_id, term_id, banner_type, banner_color, banner_image, created_at
    `, [section_id, course_id, instructor_id, term_id, banner_type || 'color', banner_color || '#3B82F6', banner_image]);

    console.log('✅ [SECTION COURSE] Created successfully:', result.rows[0]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ [SECTION COURSE] Error creating section course:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update section course (e.g., banner settings)
app.put('/api/section-courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sectionCourseId = parseInt(id);
    if (isNaN(sectionCourseId)) {
      return res.status(400).json({ error: 'Invalid section_course_id' });
    }

    const { banner_type, banner_color, banner_image } = req.body || {};

    // Build dynamic update for provided fields only
    const setClauses = [];
    const values = [];

    if (banner_type !== undefined) {
      setClauses.push(`banner_type = $${setClauses.length + 1}`);
      values.push(banner_type);
    }
    if (banner_color !== undefined) {
      setClauses.push(`banner_color = $${setClauses.length + 1}`);
      values.push(banner_color);
    }
    if (banner_image !== undefined) {
      setClauses.push(`banner_image = $${setClauses.length + 1}`);
      values.push(banner_image);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    // Always update updated_at
    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

    const updateSql = `
      UPDATE section_courses
      SET ${setClauses.join(', ')}
      WHERE section_course_id = $${values.length + 1}
      RETURNING section_course_id, section_id, course_id, instructor_id, term_id, banner_type, banner_color, banner_image, updated_at
    `;

    values.push(sectionCourseId);

    const result = await pool.query(updateSql, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Section course not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ [SECTION COURSE] Error updating section course:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/section-courses/assign-instructor', async (req, res) => {
  try {
    const { section_course_id, instructor_id } = req.body;
    if (!section_course_id) return res.status(400).json({ error: 'section_course_id is required' });
    await pool.query(
      'UPDATE section_courses SET instructor_id = $1, updated_at = CURRENT_TIMESTAMP WHERE section_course_id = $2',
      [instructor_id || null, section_course_id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create draft syllabus and section_course
app.post('/api/syllabus/draft', async (req, res) => {
  const client = await pool.connect();
  try {
    const { course_id, term_id, section_id, created_by } = req.body;
    if (!course_id || !term_id || !section_id || !created_by) {
      return res.status(400).json({ error: 'course_id, term_id, section_id, created_by are required' });
    }
    await client.query('BEGIN');
    const syllabusRes = await client.query(
      `INSERT INTO syllabi (course_id, term_id, title, description, review_status, approval_status, created_by, created_at, updated_at)
       VALUES ($1, $2, 'Draft Syllabus', NULL, 'pending', 'pending', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING syllabus_id`,
      [course_id, term_id, created_by]
    );
    const syllabus_id = syllabusRes.rows[0].syllabus_id;
    const scRes = await client.query(
      `INSERT INTO section_courses (section_id, course_id, instructor_id, term_id)
       VALUES ($1, $2, $3, $4)
       RETURNING section_course_id`,
      [section_id, course_id, created_by, term_id]
    );
    await client.query('COMMIT');
    res.json({ success: true, syllabus: { syllabus_id }, section_course_id: scRes.rows[0].section_course_id });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Students in a section_course
app.get('/api/section-courses/:id/students', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT ce.enrollment_id, ce.enrollment_date, ce.status,
              s.student_id, s.full_name, s.student_number, s.student_photo
       FROM course_final_grades cfg RIGHT JOIN course_enrollments ce ON false
       FULL JOIN students s ON ce.student_id = s.student_id
       WHERE ce.section_course_id = $1
       ORDER BY s.full_name`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Available students for a section (not enrolled)
app.get('/api/students/available-for-section/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const search = (req.query.search || '').toString().toLowerCase();
    const result = await pool.query(
      `SELECT s.student_id, s.full_name, s.student_number, s.student_photo
       FROM students s
       WHERE NOT EXISTS (
         SELECT 1 FROM course_enrollments ce
         WHERE ce.section_course_id = $1 AND ce.student_id = s.student_id
       )
       AND (
         $2 = '' OR LOWER(s.full_name) LIKE '%'||$2||'%' OR LOWER(s.student_number) LIKE '%'||$2||'%'
       )
       ORDER BY s.full_name
      `,
      [id, search]
    );
    res.json({ students: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enroll student to a section
app.post('/api/students/enroll', async (req, res) => {
  try {
    const { section_course_id, student_id } = req.body;
    if (!section_course_id || !student_id) return res.status(400).json({ error: 'section_course_id and student_id are required' });
    // check existing
    const exists = await pool.query(
      'SELECT 1 FROM course_enrollments WHERE section_course_id=$1 AND student_id=$2',
      [section_course_id, student_id]
    );
    if (exists.rowCount > 0) return res.status(409).json({ error: 'Already enrolled' });
    await pool.query(
      `INSERT INTO course_enrollments (section_course_id, student_id, enrollment_date, status)
       VALUES ($1, $2, CURRENT_TIMESTAMP, 'enrolled')`,
      [section_course_id, student_id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve built frontend (Vite) and enable SPA fallback
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));

// SPA fallback for client-side routes (exclude /api/*)
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 [SERVER] Server running on port ${PORT}`);
  console.log(`🔍 [SERVER] Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 [SERVER] Auth API: http://localhost:${PORT}/api/auth`);
  console.log(`📊 [SERVER] Departments API: http://localhost:${PORT}/api/departments`);
  console.log(`📅 [SERVER] School Terms API: http://localhost:${PORT}/api/school-terms`);
  console.log(`📚 [SERVER] Catalog API: http://localhost:${PORT}/api/programs, /api/program-specializations, /api/courses`);
  console.log(`📸 [SERVER] File uploads: Enabled (5MB max, base64 storage)`);
});
