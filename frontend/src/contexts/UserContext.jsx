import React, { createContext, useContext, useReducer, useEffect } from 'react'
import authService from '../services/authService'

const UserContext = createContext()

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
}

const userReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null }
    case 'LOGIN_SUCCESS':
      return { 
        ...state, 
        user: action.payload.user, 
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

export const UserProvider = ({ children }) => {
  const [state, dispatch] = useReducer(userReducer, initialState)

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuthStatus = async () => {
      const raw = localStorage.getItem('userData')
      if (raw && raw !== 'undefined' && raw !== 'null') {
        try {
          // Verify user data from localStorage
          const user = JSON.parse(raw)
          dispatch({ 
            type: 'LOGIN_SUCCESS', 
            payload: { user } 
          })
        } catch (error) {
          console.error('User data verification failed:', error)
          // User data is invalid, remove it and logout
          localStorage.removeItem('userData')
          dispatch({ type: 'LOGOUT' })
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    checkAuthStatus()
  }, [])

  const login = async (email, password) => {
    dispatch({ type: 'LOGIN_START' })
    
    try {
      // Attempt authentication with our auth service
      const result = await authService.login(email, password)
      
      if (result.success) {
        // Store user data in localStorage
        localStorage.setItem('userData', JSON.stringify(result.user))
        if (result.token) {
          localStorage.setItem('authToken', result.token)
        }
        
        // Update user state
        dispatch({ 
          type: 'LOGIN_SUCCESS', 
          payload: { user: result.user } 
        })
        
        return { success: true, user: result.user }
      } else {
        // Authentication failed
        dispatch({ 
          type: 'LOGIN_FAILURE', 
          payload: result.error 
        })
        
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('Login error:', error)
      
      const errorMessage = 'An unexpected error occurred. Please try again.'
      
      dispatch({ 
        type: 'LOGIN_FAILURE', 
        payload: errorMessage 
      })
      
      return { success: false, error: errorMessage }
    }
  }

  const logout = () => {
    // Clear local storage
    localStorage.removeItem('userData')
    
    // Update state
    dispatch({ type: 'LOGOUT' })
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
        dispatch({ 
          type: 'LOGIN_SUCCESS', 
          payload: { user } 
        })
        return { success: true, user }
      } else {
        throw new Error('No user data found')
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
      logout()
      return { success: false, error: 'Failed to refresh user session' }
    }
  }

  const updateUser = (updatedUserData) => {
    // Update local storage
    localStorage.setItem('userData', JSON.stringify(updatedUserData))
    
    // Update state
    dispatch({ 
      type: 'UPDATE_USER', 
      payload: { user: updatedUserData } 
    })
  }

  const value = {
    ...state,
    login,
    logout,
    clearError,
    refreshUser,
    updateUser
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
} 