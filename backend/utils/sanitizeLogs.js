/**
 * Utility functions to sanitize sensitive data from logs
 */

/**
 * Sanitizes user data by removing or masking sensitive fields
 * @param {Object|Array} data - User data object or array of user objects
 * @returns {Object|Array} - Sanitized user data
 */
export const sanitizeUserData = (data) => {
  if (!data) return data;
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeUserData(item));
  }
  
  // Handle objects
  if (typeof data === 'object') {
    const sanitized = { ...data };
    
    // Remove sensitive fields
    delete sanitized.password_hash;
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.refresh_token;
    
    // Mask email (show only first 3 characters and domain)
    if (sanitized.email) {
      const [localPart, domain] = sanitized.email.split('@');
      if (localPart && domain) {
        const maskedLocal = localPart.length > 3 
          ? localPart.substring(0, 3) + '***' 
          : '***';
        sanitized.email = `${maskedLocal}@${domain}`;
      }
    }
    
    // Optionally mask user_id (or remove it)
    // sanitized.user_id = sanitized.user_id ? '***' : undefined;
    
    return sanitized;
  }
  
  return data;
};

/**
 * Sanitizes request body by removing sensitive fields
 * @param {Object} body - Request body object
 * @returns {Object} - Sanitized request body
 */
export const sanitizeRequestBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  
  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.password_hash;
  delete sanitized.current_password;
  delete sanitized.new_password;
  delete sanitized.confirm_password;
  delete sanitized.token;
  delete sanitized.refresh_token;
  
  // Mask email if present
  if (sanitized.email) {
    const [localPart, domain] = sanitized.email.split('@');
    if (localPart && domain) {
      const maskedLocal = localPart.length > 3 
        ? localPart.substring(0, 3) + '***' 
        : '***';
      sanitized.email = `${maskedLocal}@${domain}`;
    }
  }
  
  return sanitized;
};

/**
 * Safe JSON stringify that sanitizes sensitive data
 * @param {Object|Array} data - Data to stringify
 * @param {Function} sanitizer - Optional custom sanitizer function
 * @returns {string} - JSON string with sanitized data
 */
export const safeStringify = (data, sanitizer = sanitizeUserData) => {
  try {
    const sanitized = sanitizer ? sanitizer(data) : data;
    return JSON.stringify(sanitized, null, 2);
  } catch (error) {
    return '[Error stringifying data]';
  }
};

