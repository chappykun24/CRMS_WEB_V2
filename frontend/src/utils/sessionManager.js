/**
 * Session Management Utilities
 * Provides helper functions for managing user sessions and preventing bypass attempts
 */

// Session validation constants
export const SESSION_CONFIG = {
  VALIDATION_INTERVAL: 5 * 60 * 1000, // 5 minutes
  MAX_IDLE_TIME: 30 * 60 * 1000, // 30 minutes
  TOKEN_REFRESH_THRESHOLD: 10 * 60 * 1000, // 10 minutes before expiry
}

// Protected routes that require authentication
export const PROTECTED_ROUTES = [
  '/admin',
  '/faculty', 
  '/dean',
  '/staff',
  '/program-chair',
  '/manage-account'
]

// Public routes that don't require authentication
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup'
]

/**
 * Check if a route is protected
 * @param {string} path - The route path to check
 * @returns {boolean} - True if the route is protected
 */
export const isProtectedRoute = (path) => {
  return PROTECTED_ROUTES.some(route => path.startsWith(route))
}

/**
 * Check if a route is public
 * @param {string} path - The route path to check
 * @returns {boolean} - True if the route is public
 */
export const isPublicRoute = (path) => {
  return PUBLIC_ROUTES.includes(path) || PUBLIC_ROUTES.some(route => path.startsWith(route))
}

/**
 * Get the default dashboard route for a user role
 * @param {string} role - The user's role
 * @returns {string} - The default dashboard route
 */
export const getDefaultDashboardRoute = (role) => {
  const normalizedRole = String(role || '').toLowerCase().replace(/\s|_/g, '')
  
  switch (normalizedRole) {
    case 'admin':
      return '/admin'
    case 'faculty':
      return '/faculty'
    case 'dean':
      return '/dean'
    case 'staff':
      return '/staff'
    case 'programchair':
      return '/program-chair'
    default:
      // If role is unknown, redirect to login to let them choose
      return '/login'
  }
}

/**
 * Validate session data structure
 * @param {Object} userData - The user data to validate
 * @returns {boolean} - True if the user data is valid
 */
export const validateUserData = (userData) => {
  if (!userData || typeof userData !== 'object') {
    return false
  }

  // Check for required user identification
  if (!userData.user_id && !userData.id) {
    return false
  }

  // Check for required role information
  if (!userData.role_name && !userData.role) {
    return false
  }

  return true
}

/**
 * Clear all authentication data
 */
export const clearAuthData = () => {
  localStorage.removeItem('userData')
  localStorage.removeItem('authToken')
  sessionStorage.removeItem('intendedDestination')
}

/**
 * Get stored authentication data
 * @returns {Object} - Object containing user data and token
 */
export const getAuthData = () => {
  try {
    const userData = localStorage.getItem('userData')
    const token = localStorage.getItem('authToken')
    
    if (!userData || !token) {
      return { userData: null, token: null }
    }

    const parsedUserData = JSON.parse(userData)
    return { userData: parsedUserData, token }
  } catch (error) {
    console.error('[SessionManager] Error parsing auth data:', error)
    clearAuthData()
    return { userData: null, token: null }
  }
}

/**
 * Store authentication data
 * @param {Object} userData - The user data to store
 * @param {string} token - The authentication token
 */
export const setAuthData = (userData, token) => {
  try {
    localStorage.setItem('userData', JSON.stringify(userData))
    if (token) {
      localStorage.setItem('authToken', token)
    }
  } catch (error) {
    console.error('[SessionManager] Error storing auth data:', error)
  }
}

/**
 * Set intended destination for post-login redirect
 * @param {string} path - The path the user was trying to access
 */
export const setIntendedDestination = (path) => {
  if (path && isProtectedRoute(path)) {
    sessionStorage.setItem('intendedDestination', path)
  }
}

/**
 * Get and clear intended destination
 * @returns {string|null} - The intended destination path
 */
export const getIntendedDestination = () => {
  const destination = sessionStorage.getItem('intendedDestination')
  if (destination) {
    sessionStorage.removeItem('intendedDestination')
  }
  return destination
}

/**
 * Check if current session is valid
 * @returns {boolean} - True if session appears valid
 */
export const isSessionValid = () => {
  const { userData, token } = getAuthData()
  
  if (!userData || !token) {
    return false
  }

  return validateUserData(userData)
}

/**
 * Prevent browser back navigation bypass
 * This function manipulates the browser history to prevent back navigation
 * @param {string} currentPath - The current path to maintain
 */
export const preventBackNavigation = (currentPath) => {
  try {
    // Push current state to prevent back navigation
    const currentState = window.history.state
    window.history.pushState(currentState, '', window.location.href)
    
    // Add popstate listener to maintain current state
    const handlePopState = (event) => {
      if (isProtectedRoute(currentPath)) {
        window.history.pushState(currentState, '', window.location.href)
      }
    }
    
    window.addEventListener('popstate', handlePopState)
    
    // Return cleanup function
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  } catch (error) {
    console.error('[SessionManager] Error preventing back navigation:', error)
    return () => {}
  }
}
