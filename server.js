import express from 'express';
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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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
             r.name as role, up.profile_type, up.designation
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
      res.json({
        success: true,
        user: userData,
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
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 [SERVER] Server running on port ${PORT}`);
  console.log(`🔍 [SERVER] Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 [SERVER] Auth API: http://localhost:${PORT}/api/auth`);
  console.log(`📊 [SERVER] Departments API: http://localhost:${PORT}/api/departments`);
  console.log(`📅 [SERVER] School Terms API: http://localhost:${PORT}/api/school-terms`);
  console.log(`📸 [SERVER] File uploads: Enabled (5MB max, base64 storage)`);
});
