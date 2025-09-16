import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/UnifiedAuthContext.jsx'

// PublicRoute: Blocks access to public pages (login/signup) for authenticated users
const PublicRoute = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    const role = String(user?.role_name || user?.role || '').toLowerCase().replace(/\s|_/g, '')
    const roleDefaultPath = (() => {
      if (role === 'admin') return '/dashboard'
      if (role === 'faculty') return '/dashboard/classes'
      if (role === 'dean') return '/dashboard/analytics'
      if (role === 'staff') return '/dashboard/students'
      if (role === 'programchair') return '/dashboard/courses'
      return '/dashboard'
    })()
    // replace to prevent going back to login via history
    return <Navigate to={roleDefaultPath} state={{ from: location }} replace />
  }

  return children
}

export default PublicRoute


