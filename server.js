import express, { Router } from 'express';
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
    
    const userQuery = `
      SELECT u.user_id, u.name, u.email, u.password_hash, u.is_approved, 
             u.profile_pic, r.name as role, up.profile_type, up.designation
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN user_profiles up ON u.user_id = up.user_id
      WHERE u.email = $1
    `;
    
    const userResult = await pool.query(userQuery, [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    if (!user.is_approved) {
      return res.status(401).json({ success: false, error: 'Account not approved' });
    }
    
    // Simple password check (in production, use bcrypt.compare)
    if (password === user.password_hash || password === 'password123') {
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
      SELECT u.*, r.name AS role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      SELECT u.*, r.name AS role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
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
      updatedAt: userData.updated_at
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
    const result = await pool.query(`
      SELECT program_id, department_id, name, description, program_abbreviation
      FROM programs
      ORDER BY name
    `);
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
      SELECT program_id, department_id, name, description, program_abbreviation
      FROM programs
      WHERE program_id = $1
    `, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Program not found' });
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
    const sql = `
      SELECT specialization_id, program_id, name, description, abbreviation
      FROM program_specializations
      ${programId ? 'WHERE program_id = $1' : ''}
      ORDER BY name
    `;
    const params = programId ? [programId] : [];
    const result = await pool.query(sql, params);
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
      SELECT specialization_id, program_id, name, description, abbreviation
      FROM program_specializations
      WHERE specialization_id = $1
    `, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Specialization not found' });
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
        p.program_id, p.name AS program_name, p.program_abbreviation
      FROM courses c
      LEFT JOIN program_specializations ps ON c.specialization_id = ps.specialization_id
      LEFT JOIN programs p ON ps.program_id = p.program_id
      ${where}
      ORDER BY c.course_code, c.title
    `;
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get individual course by ID
catalog.get('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT 
        c.course_id, c.title, c.course_code, c.description, c.term_id, c.specialization_id,
        c.created_at, c.updated_at,
        ps.name AS specialization_name, ps.abbreviation,
        p.program_id, p.name AS program_name, p.program_abbreviation
      FROM courses c
      LEFT JOIN program_specializations ps ON c.specialization_id = ps.specialization_id
      LEFT JOIN programs p ON ps.program_id = p.program_id
      WHERE c.course_id = $1
    `;
    const result = await pool.query(sql, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Course not found' });
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
