import React, { Suspense, lazy, useRef, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { TableSkeleton } from '../../components/skeletons'
import { prefetchAdminData } from '../../services/dataPrefetchService'

// Lazy load admin components for code splitting
const UserManagement = lazy(() => import('./UserManagement'))
const FacultyApproval = lazy(() => import('./FacultyApproval'))
const SchoolConfiguration = lazy(() => import('./SchoolConfiguration'))

// Skeleton loader component for route transitions
const RouteSkeleton = () => (
  <div className="min-h-screen bg-gray-50 p-6">
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
      </div>
      <TableSkeleton rows={8} columns={6} />
    </div>
  </div>
)

const AdminDashboard = ({ user }) => {
  const prefetchCalledRef = useRef(false)

  // Debounced prefetch - only call once per session
  useEffect(() => {
    if (prefetchCalledRef.current) return
    
    // Only prefetch after a delay and only once
    const timer = setTimeout(() => {
      prefetchAdminData().catch(err => {
        console.error('Prefetch error (non-blocking):', err)
      })
      prefetchCalledRef.current = true
    }, 2000) // Increased delay to reduce initial load impact
    
    return () => clearTimeout(timer)
  }, [])

  // Route to specific admin pages with lazy loading
  return (
    <Suspense fallback={<RouteSkeleton />}>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/users" replace />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/faculty-approval" element={<FacultyApproval />} />
        <Route path="/school-config" element={<SchoolConfiguration />} />
        <Route path="*" element={<Navigate to="/admin/users" replace />} />
      </Routes>
    </Suspense>
  )
}

export default AdminDashboard 