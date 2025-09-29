import React from 'react'

const Grades = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Grades</h1>
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-gray-500 text-lg">
            <p>No grades available at the moment.</p>
            <p className="text-sm mt-2">Grades will appear here once they are entered.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Grades
