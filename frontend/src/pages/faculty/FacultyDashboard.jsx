import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import MyClasses from './MyClasses'
import Assessments from './Assessments'
import Grades from './Grades'
import Syllabi from './Syllabi'

const FacultyDashboard = ({ user }) => {
  // Removed bulk data prefetching - data is now fetched per section on each page
  // This improves performance and reduces unnecessary API calls
  // Default faculty dashboard content
  const defaultContent = (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Faculty Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">My Classes</h3>
            <p className="text-gray-600">View and manage your assigned classes</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Attendance</h3>
            <p className="text-gray-600">Track student attendance</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Assessments</h3>
            <p className="text-gray-600">Create and manage assessments</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Grades</h3>
            <p className="text-gray-600">Record and manage student grades</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Syllabi</h3>
            <p className="text-gray-600">Manage course syllabi and materials</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <Routes>
      <Route index element={<Navigate to="classes" replace />} />
      <Route path="classes" element={<MyClasses />} />
      <Route path="assessments" element={<Assessments />} />
      <Route path="grades" element={<Grades />} />
      <Route path="syllabi" element={<Syllabi />} />
      <Route path="*" element={<Navigate to="classes" replace />} />
    </Routes>
  )
}

export default FacultyDashboard 