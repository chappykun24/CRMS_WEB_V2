import React, { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/UnifiedAuthContext'
import { 
  isProtectedRoute, 
  isPublicRoute, 
  getDefaultDashboardRoute,
  setIntendedDestination,
  clearAuthData
} from '../utils/sessionManager'

const BrowserHistoryProtection = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isLoading, logout } = useAuth()
  const lastAuthenticatedPath = useRef(null)
  const isNavigating = useRef(false)

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event) => {
      console.log('[BrowserHistoryProtection] Popstate event triggered', {
        currentPath: location.pathname,
        isAuthenticated,
        isLoading,
        isNavigating: isNavigating.current
      })

      // Prevent navigation if we're in the middle of a programmatic navigation
      if (isNavigating.current) {
        console.log('[BrowserHistoryProtection] Ignoring popstate during programmatic navigation')
        return
      }

      // If not authenticated and trying to access protected route
      if (!isAuthenticated && !isLoading && isProtectedRoute(location.pathname)) {
        console.log('[BrowserHistoryProtection] Unauthenticated access to protected route, redirecting to login')
        event.preventDefault()
        
        // Replace current history entry with login page
        navigate('/login', { replace: true })
        return
      }

      // If authenticated and trying to access login page, redirect to dashboard
      if (isAuthenticated && (location.pathname === '/login' || location.pathname === '/signup')) {
        console.log('[BrowserHistoryProtection] Authenticated user trying to access login, redirecting to dashboard')
        event.preventDefault()
        
        // Get user's default dashboard route
        const userData = JSON.parse(localStorage.getItem('userData') || '{}')
        const role = userData?.role_name || userData?.role || ''
        const defaultRoute = getDefaultDashboardRoute(role)
        
        navigate(defaultRoute, { replace: true })
        return
      }

      // Update last authenticated path if user is authenticated and on protected route
      if (isAuthenticated && isProtectedRoute(location.pathname)) {
        lastAuthenticatedPath.current = location.pathname
      }
    }

    // Add popstate event listener
    window.addEventListener('popstate', handlePopState)

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [navigate, location.pathname, isAuthenticated, isLoading])

  // Handle route changes and authentication checks
  useEffect(() => {
    console.log('[BrowserHistoryProtection] Route change detected', {
      path: location.pathname,
      isAuthenticated,
      isLoading,
      isProtected: isProtectedRoute(location.pathname)
    })

    // Skip checks if still loading
    if (isLoading) {
      return
    }

    // If not authenticated and trying to access protected route
    if (!isAuthenticated && isProtectedRoute(location.pathname)) {
      console.log('[BrowserHistoryProtection] Redirecting unauthenticated user to login')
      isNavigating.current = true
      
      // Store intended destination for post-login redirect
      setIntendedDestination(location.pathname)
      
      navigate('/login', { replace: true })
      
      // Reset navigation flag after a short delay
      setTimeout(() => {
        isNavigating.current = false
      }, 100)
      return
    }

    // If authenticated and trying to access login/signup pages, redirect to appropriate dashboard
    if (isAuthenticated && (location.pathname === '/login' || location.pathname === '/signup')) {
      console.log('[BrowserHistoryProtection] Redirecting authenticated user away from login')
      isNavigating.current = true
      
      // Get user's default dashboard route
      const userData = JSON.parse(localStorage.getItem('userData') || '{}')
      const role = userData?.role_name || userData?.role || ''
      const defaultRoute = getDefaultDashboardRoute(role)
      
      navigate(defaultRoute, { replace: true })
      
      // Reset navigation flag after a short delay
      setTimeout(() => {
        isNavigating.current = false
      }, 100)
      return
    }

    // Update last authenticated path
    if (isAuthenticated && isProtectedRoute(location.pathname)) {
      lastAuthenticatedPath.current = location.pathname
    }

    // Reset navigation flag
    isNavigating.current = false
  }, [location.pathname, isAuthenticated, isLoading, navigate])

  // Add beforeunload event to prevent accidental navigation away from protected areas
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isAuthenticated && isProtectedRoute(location.pathname)) {
        // Only show warning for certain critical routes
        const criticalRoutes = ['/admin', '/faculty', '/dean', '/staff', '/program-chair']
        if (criticalRoutes.some(route => location.pathname.startsWith(route))) {
          const message = 'Are you sure you want to leave? Any unsaved changes may be lost.'
          event.returnValue = message
          return message
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isAuthenticated, location.pathname])

  // Disable browser back/forward buttons on protected routes
  useEffect(() => {
    if (isAuthenticated && isProtectedRoute(location.pathname)) {
      // Push current state to history to prevent back navigation
      const currentState = window.history.state
      window.history.pushState(currentState, '', window.location.href)
      
      // Add popstate listener to prevent back navigation
      const preventBack = (event) => {
        if (isProtectedRoute(location.pathname)) {
          window.history.pushState(currentState, '', window.location.href)
        }
      }
      
      window.addEventListener('popstate', preventBack)
      
      return () => {
        window.removeEventListener('popstate', preventBack)
      }
    }
  }, [isAuthenticated, location.pathname])

  return <>{children}</>
}

export default BrowserHistoryProtection
