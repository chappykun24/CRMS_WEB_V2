import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import CourseManagement from './CourseManagement'
import Analytics from './Analytics'
import Reports from './Reports'
import Submissions from './Submissions'

const ProgramChairDashboard = ({ user }) => {
  const location = useLocation()

  // If we're at the root program chair dashboard, show minimal content
  if (location.pathname === '/dashboard') {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Program Chair Dashboard</h1>
              <p className="text-lg text-gray-600 mb-6">Welcome back, {user?.name || 'Program Chair'}!</p>
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