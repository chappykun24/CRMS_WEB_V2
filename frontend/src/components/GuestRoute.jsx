import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/UnifiedAuthContext.jsx'

const getDefaultPathForRole = (roleRaw) => {
  const role = String(roleRaw || '').toLowerCase().replace(/\s|_/g, '')
  if (role === 'admin') return '/dashboard'
  if (role === 'faculty') return '/faculty/classes'
  if (role === 'dean') return '/dean'
  if (role === 'staff') return '/staff'
  if (role === 'programchair') return '/program-chair'
  return '/dashboard'
}

const GuestRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (isAuthenticated) {
    const to = getDefaultPathForRole(user?.role || user?.role_name)
    return <Navigate to={to} state={{ from: location }} replace />
  }

  return children
}

export default GuestRoute
