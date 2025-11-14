import React from 'react'

const ClassDetailsSkeleton = () => {
  return (
    <div className="h-full flex flex-col animate-pulse">
      {/* Class Header Skeleton */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>

      {/* Students Header Skeleton */}
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 bg-gray-200 rounded w-32"></div>
        <div className="flex items-center gap-2">
          <div className="h-6 bg-gray-200 rounded-full w-20"></div>
          <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
        </div>
      </div>

      {/* Students List Skeleton */}
      <div className="flex-1 min-h-0 space-y-3">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            {/* Avatar skeleton with gradient */}
            <div className="flex-shrink-0">
              <div className="h-10 w-10 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 rounded-full border-2 border-gray-200"></div>
            </div>
            
            {/* Student info skeleton */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </div>
            
            {/* Status badge skeleton */}
            <div className="h-5 bg-gray-200 rounded-full w-16"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ClassDetailsSkeleton

