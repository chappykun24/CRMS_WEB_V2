import React from 'react'

const Assessments = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Assessments</h1>
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-gray-500 text-lg">
            <p>No assessments available at the moment.</p>
            <p className="text-sm mt-2">Check back later for new assessments.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Assessments
