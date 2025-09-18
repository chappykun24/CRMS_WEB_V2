import React from 'react'

const StudentListSkeleton = ({ students = 5 }) => {
  return (
    <div className="space-y-3">
      {[...Array(students)].map((_, index) => (
        <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg animate-pulse">
          <div className="flex-shrink-0 w-6 text-center">
            <div className="h-4 bg-gray-200 rounded w-4 mx-auto"></div>
          </div>
          <div className="flex-shrink-0">
            <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="flex-shrink-0">
            <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default StudentListSkeleton
