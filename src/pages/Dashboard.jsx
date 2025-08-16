import React from 'react'
import { useUser } from '../contexts/UserContext'
import AdminDashboard from './admin/AdminDashboard'
import FacultyDashboard from './faculty/FacultyDashboard'
import DeanDashboard from './dean/DeanDashboard'
import StaffDashboard from './staff/StaffDashboard'
import ProgramChairDashboard from './program-chair/ProgramChairDashboard'

const Dashboard = () => {
  const { user, isLoading } = useUser()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please log in to access your dashboard.</p>
        </div>
      </div>
    )
  }

  // Route to role-specific dashboard
  switch (user.role?.toLowerCase()) {
    case 'admin':
      return <AdminDashboard user={user} />
    case 'faculty':
      return <FacultyDashboard user={user} />
    case 'dean':
      return <DeanDashboard user={user} />
    case 'staff':
      return <StaffDashboard user={user} />
    case 'program chair':
      return <ProgramChairDashboard user={user} />
    default:
      return (
        <div className="p-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Welcome, {user.name}!</h2>
                <p className="text-gray-600 mb-4">Role: {user.role || 'Unknown'}</p>
                <p className="text-gray-600">Email: {user.email}</p>
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800">
                    <strong>Note:</strong> Dashboard for role "{user.role}" is under development.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
  }
}

export default Dashboard 