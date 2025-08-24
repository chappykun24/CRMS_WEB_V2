import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import StudentManagement from './StudentManagement'

const StaffDashboard = ({ user }) => {
  const location = useLocation()

  // If we're at the root staff dashboard, show minimal content
  if (location.pathname === '/dashboard') {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Staff Dashboard</h1>
              <p className="text-lg text-gray-600 mb-6">Welcome back, {user?.name || 'Staff Member'}!</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Student Management</h3>
                  <p className="text-blue-700">Register new students and manage student records</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">Records</h3>
                  <p className="text-green-700">View and update student information</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-purple-900 mb-2">Reports</h3>
                  <p className="text-purple-700">Generate student reports and analytics</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Route to specific staff pages
  return (
    <Routes>
      <Route path="/students" element={<StudentManagement />} />
    </Routes>
  )
}

export default StaffDashboard 