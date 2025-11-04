import React, { createContext, useContext, useReducer, useEffect } from 'react'
import authService from '../services/authService'
import { identifyUser, trackEvent } from '../services/analyticsService'

const UnifiedAuthContext = createContext()

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  token: null
}

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null }
    case 'LOGIN_SUCCESS':
      return { 
        ...state, 
        user: action.payload.user, 
        token: action.payload.token,
        isAuthenticated: true, 
        isLoading: false,
        error: null 
      }
    case 'LOGIN_FAILURE':
      return { 
        ...state, 
        isAuthenticated: false, 
        isLoading: false, 
        error: action.payload 
      }
    case 'LOGOUT':
      return { 
        ...state, 
        user: null, 
        token: null,
        isAuthenticated: false, 
        isLoading: false,
        error: null 
      }
    case 'UPDATE_USER':
      return { 
        ...state, 
        user: action.payload.user 
      }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    default:
      return state
  }
}

export const UnifiedAuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log('[UnifiedAuth] Checking authentication status...')
      const userData = localStorage.getItem('userData')
      const token = localStorage.getItem('authToken')
      
      if (userData && userData !== 'undefined' && userData !== 'null' && userData !== '') {
        try {
          const user = JSON.parse(userData)
          console.log('[UnifiedAuth] Found user data in localStorage:', user)
          
          // If we have both user data and token, authenticate immediately
          if (token && (user.user_id || user.id)) {
            console.log('[UnifiedAuth] Found valid user data and token, authenticating user')
            dispatch({ 
              type: 'LOGIN_SUCCESS', 
              payload: { user, token } 
            })
            
            // Try to refresh user data in the background (non-blocking)
            try {
              const userId = user.user_id || user.id
              console.log('[UnifiedAuth] Refreshing user data in background for user ID:', userId)
              const profileResult = await authService.getUserById(userId)
              if (profileResult.success) {
                console.log('[UnifiedAuth] User data refreshed successfully:', profileResult.user)
                localStorage.setItem('userData', JSON.stringify(profileResult.user))
                dispatch({ 
                  type: 'UPDATE_USER', 
                  payload: { user: profileResult.user } 
                })
              } else {
                console.warn('[UnifiedAuth] Failed to refresh user data, keeping stored data')
              }
            } catch (error) {
              console.warn('[UnifiedAuth] User data refresh failed, keeping stored data:', error.message)
              // Don't log out user if refresh fails
            }
            return
          } else {
            console.log('[UnifiedAuth] No valid user ID or token found, clearing invalid data')
            localStorage.removeItem('userData')
            localStorage.removeItem('authToken')
            dispatch({ type: 'LOGOUT' })
            return
          }
        } catch (error) {
          console.error('[UnifiedAuth] User data verification failed:', error)
          // User data is invalid, remove it and logout
          localStorage.removeItem('userData')
          localStorage.removeItem('authToken')
          dispatch({ type: 'LOGOUT' })
        }
      } else {
        console.log('[UnifiedAuth] No user data found, user not authenticated')
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    checkAuthStatus()
  }, [])

  const login = async (email, password) => {
    console.log('[UnifiedAuth] LOGIN_START', { email })
    dispatch({ type: 'LOGIN_START' })
    
    try {
      // Attempt authentication with our auth service
      const result = await authService.login(email, password)
      console.log('[UnifiedAuth] authService.login result', result)
      
      if (result.success && result.user) {
        // Store basic user data and token first
        localStorage.setItem('userData', JSON.stringify(result.user))
        if (result.token) {
          localStorage.setItem('authToken', result.token)
        }
        
        // Update user state with basic login data immediately
        dispatch({ 
          type: 'LOGIN_SUCCESS', 
          payload: { user: result.user, token: result.token } 
        })
        console.log('[UnifiedAuth] LOGIN_SUCCESS with basic data', { user: result.user, token: result.token })

        try {
          identifyUser(result.user)
          const role = String(result.user?.role_name || result.user?.role || '')
          trackEvent('login_success', { role })
        } catch (_) {}
        
        // Try to fetch full user profile in the background (non-blocking)
        try {
          console.log('[UnifiedAuth] Fetching full user profile in background...')
          const profileResult = await authService.getCurrentUserProfile()
          
          if (profileResult.success && profileResult.user) {
            console.log('[UnifiedAuth] Full profile fetched successfully:', profileResult.user)
            // Update with full profile data
            localStorage.setItem('userData', JSON.stringify(profileResult.user))
            dispatch({ 
              type: 'UPDATE_USER', 
              payload: { user: profileResult.user } 
            })
            console.log('[UnifiedAuth] User profile updated with full data')
            try {
              identifyUser(profileResult.user)
              const role = String(profileResult.user?.role_name || profileResult.user?.role || '')
              trackEvent('profile_refreshed', { role })
            } catch (_) {}
          } else {
            console.warn('[UnifiedAuth] Failed to fetch full profile, keeping basic login data')
          }
        } catch (profileError) {
          console.warn('[UnifiedAuth] Profile fetch failed, keeping basic login data:', profileError)
          // Don't fail the login if profile fetch fails
        }
        
        return { success: true, user: result.user, token: result.token }
      } else {
        // Authentication failed
        dispatch({ 
          type: 'LOGIN_FAILURE', 
          payload: result.error || 'Login failed' 
        })
        console.log('[UnifiedAuth] LOGIN_FAILURE', result.error)
        return { success: false, error: result.error || 'Login failed' }
      }
    } catch (error) {
      console.error('[UnifiedAuth] Login error:', error)
      dispatch({ 
        type: 'LOGIN_FAILURE', 
        payload: error.message 
      })
      return { success: false, error: error.message }
    }
  }

  const register = async (userData) => {
    console.log('[UnifiedAuth] REGISTER_START', { email: userData.email })
    dispatch({ type: 'LOGIN_START' })
    
    try {
      const result = await authService.createUser(userData)
      console.log('[UnifiedAuth] authService.createUser result', result)
      
      if (result.success) {
        dispatch({ type: 'SET_LOADING', payload: false })
        return { success: true, message: result.message }
      } else {
        dispatch({ 
          type: 'LOGIN_FAILURE', 
          payload: result.error || 'Registration failed' 
        })
        return { success: false, error: result.error || 'Registration failed' }
      }
    } catch (error) {
      console.error('[UnifiedAuth] Registration error:', error)
      dispatch({ 
        type: 'LOGIN_FAILURE', 
        payload: error.message 
      })
      return { success: false, error: error.message }
    }
  }

  const logout = () => {
    console.log('[UnifiedAuth] LOGOUT')
    // Clear localStorage
    localStorage.removeItem('userData')
    localStorage.removeItem('authToken')
    
    // Update state
    dispatch({ type: 'LOGOUT' })
    try { trackEvent('logout') } catch (_) {}
  }

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' })
  }

  const refreshUser = async () => {
    try {
      const userData = localStorage.getItem('userData')
      if (userData) {
        let user = null
        try {
          user = JSON.parse(userData)
        } catch (e) {
          user = null
        }
        
        if (user && user.user_id) {
          // Get fresh user data from database
          const result = await authService.getUserById(user.user_id)
          if (result.success) {
            console.log('[UnifiedAuth] User refreshed from database:', result.user)
            localStorage.setItem('userData', JSON.stringify(result.user))
            dispatch({ 
              type: 'LOGIN_SUCCESS', 
              payload: { user: result.user, token: localStorage.getItem('authToken') } 
            })
            return { success: true, user: result.user }
          }
        }
        
        // Fallback to stored data
        dispatch({ 
          type: 'LOGIN_SUCCESS', 
          payload: { user, token: localStorage.getItem('authToken') } 
        })
        return { success: true, user }
      } else {
        throw new Error('No user data found')
      }
    } catch (error) {
      console.error('[UnifiedAuth] Failed to refresh user:', error)
      logout()
      return { success: false, error: 'Failed to refresh user session' }
    }
  }

  const updateUser = (updatedUserData) => {
    console.log('[UnifiedAuth] Updating user data:', updatedUserData)
    // Update local storage
    localStorage.setItem('userData', JSON.stringify(updatedUserData))
    
    // Update state
    dispatch({ 
      type: 'UPDATE_USER', 
      payload: { user: updatedUserData } 
    })
  }

  const updateProfile = async (profileData) => {
    try {
      const result = await authService.updateProfile(state.user.user_id || state.user.id, profileData)
      if (result.success) {
        updateUser(result.data.user)
        return { success: true, user: result.data.user }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('[UnifiedAuth] Update profile error:', error)
      return { success: false, error: error.message }
    }
  }

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const result = await authService.changePassword(state.user.user_id || state.user.id, {
        current_password: currentPassword,
        new_password: newPassword
      })
      return result
    } catch (error) {
      console.error('[UnifiedAuth] Change password error:', error)
      return { success: false, error: error.message }
    }
  }

  // Role and permission helpers
  const hasRole = (role) => {
    return state.user?.role_name === role || state.user?.role === role
  }

  const hasAnyRole = (roles) => {
    const userRole = state.user?.role_name || state.user?.role
    return roles.includes(userRole)
  }

  const hasDepartment = (departmentId) => {
    return state.user?.department_id === departmentId
  }

  const value = {
    ...state,
    login,
    register,
    logout,
    clearError,
    refreshUser,
    updateUser,
    updateProfile,
    changePassword,
    hasRole,
    hasAnyRole,
    hasDepartment
  }

  return (
    <UnifiedAuthContext.Provider value={value}>
      {children}
    </UnifiedAuthContext.Provider>
  )
}

// Unified hooks for backward compatibility
export const useAuth = () => {
  const context = useContext(UnifiedAuthContext)
  if (!context) {
    throw new Error('useAuth must be used within a UnifiedAuthProvider')
  }
  return context
}

export const useUser = () => {
  const context = useContext(UnifiedAuthContext)
  if (!context) {
    throw new Error('useUser must be used within a UnifiedAuthProvider')
  }
  return context
}

export default UnifiedAuthContext
