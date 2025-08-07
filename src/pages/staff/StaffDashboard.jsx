import React from 'react'

const StaffDashboard = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-500 text-lg">Welcome to your Staff Dashboard</p>
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <p className="text-gray-600">You are currently in the <span className="font-semibold text-gray-800">Dashboard</span> section</p>
        </div>
      </div>
    </div>
  )
}

export default StaffDashboard 