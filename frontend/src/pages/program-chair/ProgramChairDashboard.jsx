import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import CourseManagement from './CourseManagement'
import Analytics from './Analytics'
import Reports from './Reports'
import Submissions from './Submissions'

const ProgramChairDashboard = ({ user }) => {
  // Default program chair dashboard content
  const defaultContent = (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Program Chair Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Management</h3>
            <p className="text-gray-600">Manage program courses and curriculum</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics</h3>
            <p className="text-gray-600">View program performance analytics</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reports</h3>
            <p className="text-gray-600">Generate program reports and summaries</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Submissions</h3>
            <p className="text-gray-600">Review faculty submissions and materials</p>
          </div>
        </div>
      </div>
    </div>
  )

  // Route to specific program chair pages
  return (
    <Routes>
      <Route path="/" element={defaultContent} />
      <Route path="/courses" element={<CourseManagement />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/submissions" element={<Submissions />} />
      <Route path="*" element={<Navigate to="/program-chair" replace />} />
    </Routes>
  )
}

export default ProgramChairDashboard 