import express from 'express';
import { 
  register, 
  login, 
  logout, 
  getProfile, 
  updateProfile, 
  changePassword 
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { 
  validateRequired, 
  validateEmail, 
  validatePassword, 
  sanitizeInput 
} from '../middleware/validation.js';

const router = express.Router();

// Public routes
router.post('/register', 
  sanitizeInput,
  validateRequired(['email', 'password', 'first_name', 'last_name', 'role_id']),
  validateEmail,
  validatePassword,
  register
);

router.post('/login',
  sanitizeInput,
  validateRequired(['email', 'password']),
  validateEmail,
  (req, res, next) => {
    console.log('🔐 [AUTH ROUTE] Login request received:', { email: req.body.email });
    next();
  },
  login
);

router.post('/logout', logout);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', 
  authenticateToken,
  sanitizeInput,
  updateProfile
);
router.put('/change-password',
  authenticateToken,
  sanitizeInput,
  validateRequired(['current_password', 'new_password']),
  validatePassword,
  changePassword
);

export default router;
