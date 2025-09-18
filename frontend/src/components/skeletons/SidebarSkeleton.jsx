import React from 'react'

const SidebarSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
      {/* Header section */}
      <div className="flex items-center gap-4 mb-4">
        <div className="h-14 w-14 bg-gray-200 rounded-full"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
      
      {/* Details section */}
      <div className="space-y-3 border-t border-gray-200 pt-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="flex justify-between">
            <div className="h-3 bg-gray-200 rounded w-16"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        ))}
      </div>
      
      {/* Action buttons */}
      <div className="mt-4 space-y-2">
        <div className="h-10 bg-gray-200 rounded w-full"></div>
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>
    </div>
  )
}

export default SidebarSkeleton
