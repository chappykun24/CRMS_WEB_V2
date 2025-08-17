import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import UserManagement from './UserManagement'
import FacultyApproval from './FacultyApproval'
import SystemSettings from './SystemSettings'
import SchoolConfiguration from './SchoolConfiguration'

const AdminDashboard = ({ user }) => {
  const location = useLocation()

  // If we're at the root admin dashboard, show the main dashboard
  if (location.pathname === '/dashboard') {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome back, {user?.name}</p>
          </div>
          
          {/* Dashboard Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Users</h3>
              <p className="text-3xl font-bold text-blue-600">1,247</p>
              <p className="text-sm text-gray-500">+12% from last month</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Faculty</h3>
              <p className="text-3xl font-bold text-green-600">89</p>
              <p className="text-sm text-gray-500">+5% from last month</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Departments</h3>
              <p className="text-3xl font-bold text-purple-600">12</p>
              <p className="text-sm text-gray-500">All active</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">School Terms</h3>
              <p className="text-3xl font-bold text-orange-600">3</p>
              <p className="text-sm text-gray-500">2 active, 1 inactive</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <h4 className="font-medium text-gray-900 mb-2">User Management</h4>
                <p className="text-sm text-gray-600 mb-3">Manage system users and permissions</p>
                <a href="/dashboard/users" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Go to User Management →
                </a>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <h4 className="font-medium text-gray-900 mb-2">School Configuration</h4>
                <p className="text-sm text-gray-600 mb-3">Manage departments and school terms</p>
                <a href="/dashboard/school-config" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Go to School Config →
                </a>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <h4 className="font-medium text-gray-900 mb-2">System Settings</h4>
                <p className="text-sm text-gray-600 mb-3">Configure system preferences</p>
                <a href="/dashboard/settings" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Go to Settings →
                </a>
              </div>
            </div>
          </div>
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