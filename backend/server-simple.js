import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced CORS configuration for Render deployment
const corsOptions = {
  origin: (origin, callback) => {
    const devWhitelist = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174'
    ];
    const prodWhitelist = [
      process.env.FRONTEND_URL || 'https://your-frontend-domain.vercel.app',
      process.env.CORS_ORIGIN || 'https://your-frontend-domain.vercel.app'
    ];
    const whitelist = (process.env.NODE_ENV === 'production') ? prodWhitelist : devWhitelist;
    if (!origin || whitelist.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint for Render
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      service: 'database',
      status: 'healthy'
    }
  });
});

// Basic auth routes (simplified)
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 [/api/auth/login] request received', {
    headers: {
      origin: req.headers.origin,
      'content-type': req.headers['content-type'],
      authorization: req.headers.authorization
    },
    body: req.body
  });
  // Mock successful login payload expected by frontend
  const { email } = req.body || {};
  res.json({
    success: true,
    message: 'Login successful (stubbed)',
    data: {
      user: {
        id: 1,
        email: email || 'test@example.com',
        name: 'Test User',
        role: 'admin',
        is_active: true
      },
      token: 'dev-stub-token'
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  res.json({
    success: true,
    message: 'Register endpoint ready',
    data: { message: 'Registration system ready for implementation' }
  });
});

app.get('/api/auth/profile', (req, res) => {
  res.json({
    success: true,
    message: 'Profile endpoint ready',
    data: { message: 'Profile system ready for implementation' }
  });
});

// Basic user routes (simplified)
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    message: 'Users endpoint ready',
    data: { message: 'User management system ready for implementation' }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'CRMS Backend API',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users'
    }
  });
});

// Serve frontend build in production and enable SPA fallback
// Serve SPA if build exists (works in production and development)
{
  const distPath = path.join(__dirname, '../frontend/dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// 404 handler - fixed syntax
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Basic error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CRMS Backend Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS Origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
});

export default app;
