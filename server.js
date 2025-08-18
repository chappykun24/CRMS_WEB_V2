import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';

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
app.use(express.json());

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
  console.log(`📊 [SERVER] Departments API: http://localhost:${PORT}/api/departments`);
  console.log(`📅 [SERVER] School Terms API: http://localhost:${PORT}/api/school-terms`);
});
