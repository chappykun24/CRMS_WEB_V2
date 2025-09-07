// Validation middleware for common patterns

// Validate required fields
export const validateRequired = (fields) => {
  return (req, res, next) => {
    const missingFields = [];
    
    fields.forEach(field => {
      if (!req.body[field] || req.body[field].toString().trim() === '') {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        missingFields,
        statusCode: 400
      });
    }

    next();
  };
};

// Validate email format
export const validateEmail = (req, res, next) => {
  const email = req.body.email;
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        statusCode: 400
      });
    }
  }
  next();
};

// Validate password strength
export const validatePassword = (req, res, next) => {
  const password = req.body.password;
  if (password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with uppercase, lowercase, and number',
        statusCode: 400
      });
    }
  }
  next();
};

// Validate ID parameter
export const validateId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`,
        statusCode: 400
      });
    }
    req.params[paramName] = parseInt(id);
    next();
  };
};

// Validate pagination parameters
export const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  if (page < 1) {
    return res.status(400).json({
      success: false,
      message: 'Page must be greater than 0',
      statusCode: 400
    });
  }
  
  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be between 1 and 100',
      statusCode: 400
    });
  }
  
  req.pagination = { page, limit, offset: (page - 1) * limit };
  next();
};

// Validate file upload
export const validateFileUpload = (allowedTypes = ['image/jpeg', 'image/png', 'image/gif']) => {
  return (req, res, next) => {
    if (req.file) {
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
          statusCode: 400
        });
      }
      
      // Check file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (req.file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 5MB',
          statusCode: 400
        });
      }
    }
    next();
  };
};

// Validate JSON body
export const validateJSON = (req, res, next) => {
  if (req.headers['content-type'] && !req.headers['content-type'].includes('application/json')) {
    return res.status(400).json({
      success: false,
      message: 'Content-Type must be application/json',
      statusCode: 400
    });
  }
  next();
};

// Sanitize input
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };
  
  if (req.body) {
    sanitize(req.body);
  }
  
  if (req.query) {
    sanitize(req.query);
  }
  
  next();
};

// Validate date range
export const validateDateRange = (startDateField = 'start_date', endDateField = 'end_date') => {
  return (req, res, next) => {
    const startDate = req.body[startDateField] || req.query[startDateField];
    const endDate = req.body[endDateField] || req.query[endDateField];
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format',
          statusCode: 400
        });
      }
      
      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: 'Start date must be before end date',
          statusCode: 400
        });
      }
    }
    
    next();
  };
};
