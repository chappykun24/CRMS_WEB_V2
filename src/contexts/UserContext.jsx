import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { api } from '../utils/api'

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
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    default:
      return state
  }
}

// Demo users for testing
const demoUsers = {
  'admin@university.edu': {
    id: 1,
    name: 'Admin User',
    email: 'admin@university.edu',
    role: 'ADMIN'
  },
  'faculty@university.edu': {
    id: 2,
    name: 'Faculty User',
    email: 'faculty@university.edu',
    role: 'FACULTY'
  },
  'dean@university.edu': {
    id: 3,
    name: 'Dean User',
    email: 'dean@university.edu',
    role: 'DEAN'
  },
  'staff@university.edu': {
    id: 4,
    name: 'Staff User',
    email: 'staff@university.edu',
    role: 'STAFF'
  },
  'chair@university.edu': {
    id: 5,
    name: 'Program Chair User',
    email: 'chair@university.edu',
    role: 'PROGRAM_CHAIR'
  }
}

export const UserProvider = ({ children }) => {
  const [state, dispatch] = useReducer(userReducer, initialState)

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          // Try to verify with API first
          const response = await api.get('/auth/me')
          dispatch({ 
            type: 'LOGIN_SUCCESS', 
            payload: { user: response.data.user } 
          })
        } catch (error) {
          // If API fails, check for demo user
          const demoUser = localStorage.getItem('demoUser')
          if (demoUser) {
            const user = JSON.parse(demoUser)
            dispatch({ 
              type: 'LOGIN_SUCCESS', 
              payload: { user } 
            })
          } else {
            localStorage.removeItem('token')
            dispatch({ type: 'LOGOUT' })
          }
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    checkAuthStatus()
  }, [])

  const login = async (email, password) => {
    dispatch({ type: 'LOGIN_START' })
    
    // Check if it's a demo user
    if (demoUsers[email] && password === 'admin123') {
      const user = demoUsers[email]
      localStorage.setItem('token', 'demo-token')
      localStorage.setItem('demoUser', JSON.stringify(user))
      
      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: { user } 
      })
      
      return { success: true }
    }
    
    try {
      const response = await api.post('/auth/login', { email, password })
      const { token, user } = response.data
      
      localStorage.setItem('token', token)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: { user } 
      })
      
      return { success: true }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed'
      dispatch({ 
        type: 'LOGIN_FAILURE', 
        payload: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('demoUser')
    delete api.defaults.headers.common['Authorization']
    dispatch({ type: 'LOGOUT' })
  }

  const value = {
    ...state,
    login,
    logout
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