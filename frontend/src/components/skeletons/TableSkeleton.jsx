import React from 'react'

const TableSkeleton = ({ rows = 8, columns = 6 }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300">
      {/* Table Header */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="flex space-x-4 px-6 py-3">
          {[...Array(columns)].map((_, index) => (
            <div key={index} className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Table Body */}
      <div className="divide-y divide-gray-200">
        {[...Array(rows)].map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center space-x-4 px-6 py-4">
            {[...Array(columns)].map((_, colIndex) => (
              <div key={colIndex} className="flex-1">
                {colIndex === 0 ? (
                  // First column - primary text (e.g., name)
                  <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                ) : colIndex === columns - 1 ? (
                  // Last column - status badge / actions
                  <div className="h-5 bg-gray-200 rounded-full w-16 animate-pulse"></div>
                ) : (
                  // Middle columns - generic text
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default TableSkeleton
