import React from 'react'

const FacultyDashboard = ({ user }) => {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Faculty Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {user?.name}</p>
        </div>
        
        {/* Main content removed */}
      </div>
    </div>
  )
}

export default FacultyDashboard 