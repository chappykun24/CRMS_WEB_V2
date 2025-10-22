import React from 'react'

const Grades = () => {
  return (
    <div className="absolute top-16 bottom-0 bg-gray-50 rounded-tl-3xl overflow-hidden transition-all duration-500 ease-in-out left-64 right-0" style={{ marginTop: '0px' }}>
      <div className="w-full pr-2 pl-2 transition-all duration-500 ease-in-out" style={{ marginTop: '0px' }}>
        {/* Header */}
        <div className="absolute top-0 right-0 z-40 bg-gray-50 transition-all duration-500 ease-in-out left-0">
          <div className="px-8 bg-gray-50">
            <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200">
              <div className="py-2 px-4 font-medium text-sm text-red-600 border-b-2 border-red-600">
                Grade Management
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="pt-16 pb-6 transition-all duration-500 ease-in-out" style={{ height: 'calc(100vh - 80px)' }}>
          <div className="px-8 h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Grade Management</h3>
              <p className="text-gray-500">This feature is now available in the Assessments page.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Grades