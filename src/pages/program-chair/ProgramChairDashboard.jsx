import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import CourseManagement from './CourseManagement'
import Analytics from './Analytics'
import Reports from './Reports'
import Submissions from './Submissions'

const ProgramChairDashboard = ({ user }) => {
  const location = useLocation()

  // If we're at the root program chair dashboard, show welcome content
  if (location.pathname === '/dashboard') {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Program Chair Dashboard</h1>
              <p className="text-lg text-gray-600 mb-6">Welcome back, {user?.name || 'Program Chair'}!</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Course Management</h3>
                  <p className="text-blue-700">Manage program courses and curriculum</p>
                </div>
                <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">Analytics</h3>
                  <p className="text-green-700">View program performance metrics</p>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                  <h3 className="text-lg font-semibold text-purple-900 mb-2">Reports</h3>
                  <p className="text-purple-700">Generate and view reports</p>
                </div>
                <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                  <h3 className="text-lg font-semibold text-orange-900 mb-2">Submissions</h3>
                  <p className="text-orange-700">Review faculty submissions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Route to specific program chair pages
  return (
    <Routes>
      <Route path="/courses" element={<CourseManagement />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/submissions" element={<Submissions />} />
    </Routes>
  )
}

export default ProgramChairDashboard 