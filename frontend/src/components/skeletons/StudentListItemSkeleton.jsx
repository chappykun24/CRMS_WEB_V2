import React from 'react'

const StudentListItemSkeleton = ({ count = 1 }) => {
  return (
    <>
      {[...Array(count)].map((_, index) => (
        <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg animate-pulse">
          {/* Avatar skeleton with gradient shimmer effect */}
          <div className="flex-shrink-0">
            <div className="h-10 w-10 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 rounded-full border-2 border-gray-200"></div>
          </div>
          
          {/* Student info skeleton */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </div>
          
          {/* Status badge skeleton */}
          <div className="h-5 bg-gray-200 rounded-full w-16"></div>
        </div>
      ))}
    </>
  )
}

export default StudentListItemSkeleton

