import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import UserManagement from './UserManagement'
import FacultyApproval from './FacultyApproval'
import SystemSettings from './SystemSettings'
import SchoolConfiguration from './SchoolConfiguration'

const AdminDashboard = ({ user }) => {
  const location = useLocation()

  // If we're at the root admin dashboard, show empty content
  if (location.pathname === '/dashboard') {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Content removed */}
        </div>
      </div>
    )
  }

  // Route to specific admin pages
  return (
    <Routes>
      <Route path="/users" element={<UserManagement />} />
      <Route path="/faculty-approval" element={<FacultyApproval />} />
      <Route path="/school-config" element={<SchoolConfiguration />} />
      <Route path="/settings" element={<SystemSettings />} />
    </Routes>
  )
}

export default AdminDashboard 