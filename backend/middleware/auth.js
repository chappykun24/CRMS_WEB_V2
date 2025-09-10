import jwt from 'jsonwebtoken';
import db from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database to ensure they still exist and are approved
    const userResult = await db.query(
      'SELECT user_id, email, name, role_id, is_approved FROM users WHERE user_id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not found.' 
      });
    }

    const user = userResult.rows[0];
    
    if (!user.is_approved) {
      return res.status(401).json({ 
        success: false, 
        error: 'Account is not approved.' 
      });
    }

    // Add user info to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired.' 
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error.' 
    });
  }
};

// Middleware to check user roles
export const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required.' 
        });
      }

      // Get user's role
      const roleResult = await db.query(
        'SELECT name FROM roles WHERE role_id = $1',
        [req.user.role_id]
      );

      if (roleResult.rows.length === 0) {
        return res.status(403).json({ 
          success: false, 
          error: 'User role not found.' 
        });
      }

      const userRole = roleResult.rows[0].name;
      
      if (!roles.includes(userRole)) {
        return res.status(403).json({ 
          success: false, 
          error: `Access denied. Required roles: ${roles.join(', ')}` 
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Internal server error.' 
      });
    }
  };
};

// Middleware to check department access
export const requireDepartmentAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required.' 
      });
    }

    // Admin and super users can access all departments
    if (req.user.role_id === 1) { // Assuming role_id 1 is admin
      return next();
    }

    // Check if user has access to the requested department
    const departmentId = req.params.departmentId || req.body.department_id;
    
    if (departmentId && req.user.department_id !== parseInt(departmentId)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied. Insufficient department permissions.' 
      });
    }

    next();
  } catch (error) {
    console.error('Department access check error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error.' 
    });
  }
};

// Generate JWT token
export const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Verify token without middleware
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw error;
  }
};
