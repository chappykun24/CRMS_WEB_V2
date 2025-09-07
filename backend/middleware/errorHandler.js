// Global error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    success: false,
    message: err.message || 'Internal Server Error',
    statusCode: err.statusCode || 500
  };

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      success: false,
      message: `Validation Error: ${message}`,
      statusCode: 400
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      success: false,
      message: 'Invalid token',
      statusCode: 401
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      success: false,
      message: 'Token expired',
      statusCode: 401
    };
  }

  // Database errors
  if (err.code === '23505') { // Unique constraint violation
    error = {
      success: false,
      message: 'Duplicate entry. Resource already exists.',
      statusCode: 409
    };
  }

  if (err.code === '23503') { // Foreign key constraint violation
    error = {
      success: false,
      message: 'Referenced resource does not exist.',
      statusCode: 400
    };
  }

  if (err.code === '23502') { // Not null constraint violation
    error = {
      success: false,
      message: 'Required field is missing.',
      statusCode: 400
    };
  }

  // Cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    error = {
      success: false,
      message: 'Invalid ID format',
      statusCode: 400
    };
  }

  // Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = {
      success: false,
      message: `${field} already exists`,
      statusCode: 409
    };
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      success: false,
      message: 'File too large',
      statusCode: 413
    };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = {
      success: false,
      message: 'Unexpected file field',
      statusCode: 400
    };
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    error = {
      success: false,
      message: 'Too many requests',
      statusCode: 429
    };
  }

  // Log error details in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      code: err.code,
      name: err.name
    });
  }

  res.status(error.statusCode).json(error);
};

// 404 handler
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Async error wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation error handler
export const validationErrorHandler = (errors) => {
  const formattedErrors = errors.map(error => ({
    field: error.path,
    message: error.msg,
    value: error.value
  }));

  return {
    success: false,
    message: 'Validation failed',
    errors: formattedErrors,
    statusCode: 400
  };
};
