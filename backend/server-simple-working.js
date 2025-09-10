import express from 'express';
import cors from 'cors';
import db from './config/database.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  origin: [
    'https://crms-web-v2-frontend.vercel.app',
    'https://frontend-oezriebnl-kcs-projects-59f6ae3a.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'user-id']
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await db.healthCheck();
    res.json({
      status: 'healthy',
      message: 'Database connected',
      database: dbHealth
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Simple login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 [LOGIN] Login attempt for email:', req.body.email);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Query user from database
    const result = await db.query(`
      SELECT u.user_id, u.email, u.password_hash, u.name,
             u.role_id, u.is_approved, u.last_login,
             r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      WHERE u.email = $1
    `, [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    const user = result.rows[0];
    
    // For now, skip password verification to test the flow
    // In production, you should verify the password hash
    console.log('🔐 [LOGIN] User found:', user.email);
    
    // Update last login
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE user_id = $1',
      [user.user_id]
    );
    
    // Return user data
    res.json({
      success: true,
      data: {
        user: {
          user_id: user.user_id,
          email: user.email,
          name: user.name,
          role_name: user.role_name,
          is_approved: user.is_approved,
          last_login: user.last_login
        },
        token: 'dummy-token-for-testing' // In production, generate JWT
      }
    });
    
  } catch (error) {
    console.error('🔐 [LOGIN] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Debug endpoint to test database
app.get('/api/debug/db', async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) as user_count FROM users');
    res.json({
      success: true,
      message: 'Database connection working',
      userCount: result.rows[0].user_count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 [SIMPLE SERVER] Backend API running on port ${PORT}`);
  console.log(`🔍 [SIMPLE SERVER] Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 [SIMPLE SERVER] Login: http://localhost:${PORT}/api/auth/login`);
  console.log(`🌍 [SIMPLE SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
});
