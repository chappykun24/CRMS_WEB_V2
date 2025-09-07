import express from 'express';
import { 
  getUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser,
  approveUser,
  rejectUser,
  getPendingApprovals
} from '../controllers/userController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { 
  validateRequired, 
  validateEmail, 
  validatePassword, 
  validateId,
  validatePagination,
  sanitizeInput 
} from '../middleware/validation.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all users (admin, dean, program_chair)
router.get('/', 
  requireRole(['admin', 'dean', 'program_chair']),
  validatePagination,
  getUsers
);

// Get pending approvals (admin, dean)
router.get('/approvals/pending',
  requireRole(['admin', 'dean']),
  getPendingApprovals
);

// Get user by ID
router.get('/:id',
  validateId('id'),
  getUserById
);

// Create user (admin only)
router.post('/',
  requireRole(['admin']),
  sanitizeInput,
  validateRequired(['email', 'password', 'first_name', 'last_name', 'role_id']),
  validateEmail,
  validatePassword,
  createUser
);

// Update user (admin, dean, program_chair)
router.put('/:id',
  requireRole(['admin', 'dean', 'program_chair']),
  validateId('id'),
  sanitizeInput,
  updateUser
);

// Delete user (admin only)
router.delete('/:id',
  requireRole(['admin']),
  validateId('id'),
  deleteUser
);

// Approve user (admin, dean)
router.put('/:id/approve',
  requireRole(['admin', 'dean']),
  validateId('id'),
  sanitizeInput,
  approveUser
);

// Reject user (admin, dean)
router.put('/:id/reject',
  requireRole(['admin', 'dean']),
  validateId('id'),
  sanitizeInput,
  rejectUser
);

export default router;
