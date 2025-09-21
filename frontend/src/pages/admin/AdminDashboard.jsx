import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import UserManagement from './UserManagement'
import FacultyApproval from './FacultyApproval'
import SystemSettings from './SystemSettings'
import SchoolConfiguration from './SchoolConfiguration'
import Home from './Home'
import { CardGridSkeleton } from '../../components/skeletons'

const AdminDashboard = ({ user }) => {
  const location = useLocation()

  // Default admin dashboard content with skeleton loading
  const defaultContent = (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardGridSkeleton cards={6} />
        </div>
      </div>
    </div>
  )

  // Route to specific admin pages
  return (
    <Routes>
      <Route path="/" element={defaultContent} />
      <Route path="/users" element={<UserManagement />} />
      <Route path="/faculty-approval" element={<FacultyApproval />} />
      <Route path="/school-config" element={<SchoolConfiguration />} />
      <Route path="/settings" element={<SystemSettings />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

export default AdminDashboard 