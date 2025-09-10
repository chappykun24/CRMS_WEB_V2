import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import UserManagement from './UserManagement'
import FacultyApproval from './FacultyApproval'
import SystemSettings from './SystemSettings'
import SchoolConfiguration from './SchoolConfiguration'
import Home from './Home'

const AdminDashboard = ({ user }) => {
  const location = useLocation()

  // Default admin dashboard content
  const defaultContent = (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
            <p className="text-gray-600">Manage system users and permissions</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Faculty Approval</h3>
            <p className="text-gray-600">Review and approve faculty applications</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">School Configuration</h3>
            <p className="text-gray-600">Configure school settings and departments</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">System Settings</h3>
            <p className="text-gray-600">Manage system-wide configurations</p>
          </div>
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