import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Analytics from './Analytics'
import MyClasses from './MyClasses'

const DeanDashboard = ({ user }) => {
  // Default dean dashboard content
  const defaultContent = (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dean Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics</h3>
            <p className="text-gray-600">View department analytics and reports</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">My Classes</h3>
            <p className="text-gray-600">Manage your assigned classes</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Faculty Management</h3>
            <p className="text-gray-600">Oversee faculty performance and assignments</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <Routes>
      <Route path="/" element={defaultContent} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/classes" element={<MyClasses />} />
      <Route path="*" element={<Navigate to="/dean" replace />} />
    </Routes>
  )
}

export default DeanDashboard 