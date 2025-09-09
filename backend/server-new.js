import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import middleware
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';

// Import database
import db from './config/database.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration (strict whitelist)
const allowedOrigins = (
  process.env.NODE_ENV === 'production'
    ? [
        process.env.FRONTEND_URL,
        process.env.CORS_ORIGIN,
      ]
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        // Vite dev server default
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        // Vite preview default
        'http://localhost:4173',
        'http://127.0.0.1:4173',
      ]
).filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server or curl with no origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware
app.use(cors(corsOptions));
// Handle preflight without wildcard route (Express v5 compatibility)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const health = await db.healthCheck();
    res.json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      database: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 [SERVER] Backend API running on port ${PORT}`);
  console.log(`🔍 [SERVER] Health check: http://localhost:${PORT}/api/health`);
  
  // Test database connection
  try {
    const dbTest = await db.testConnection();
    if (dbTest.success) {
      console.log(`✅ [DATABASE] Connected successfully`);
    } else {
      console.log(`❌ [DATABASE] Connection failed: ${dbTest.error}`);
    }
  } catch (error) {
    console.log(`❌ [DATABASE] Connection error: ${error.message}`);
  }
});

export default app;
