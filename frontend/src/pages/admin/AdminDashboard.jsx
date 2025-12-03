import React, { Suspense, lazy, useRef, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { TableSkeleton } from '../../components/skeletons'

// Lazy load admin components for code splitting
const UserManagement = lazy(() => import('./UserManagement'))
const FacultyApproval = lazy(() => import('./FacultyApproval'))
const SchoolConfiguration = lazy(() => import('./SchoolConfiguration'))

// Lightweight loader while routes/components are being code-split loaded
const RouteSkeleton = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
      <p className="text-sm text-gray-500">Loading page…</p>
    </div>
  </div>
)

const AdminDashboard = ({ user }) => {
  // Removed admin-wide data prefetch to only load data when specific pages need it

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