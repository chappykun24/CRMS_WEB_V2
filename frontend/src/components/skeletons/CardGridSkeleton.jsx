import React from 'react'

const CardGridSkeleton = ({ cards = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(cards)].map((_, index) => (
        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col animate-pulse">
          {/* Banner skeleton with gradient effect */}
          <div className="relative h-24 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10"></div>
            {/* Text overlay skeleton */}
            <div className="absolute inset-x-0 top-0 p-4 space-y-2">
              <div className="h-6 bg-white/30 rounded w-3/4"></div>
              <div className="h-4 bg-white/20 rounded w-1/2"></div>
            </div>
          </div>
          
          {/* Body skeleton */}
          <div className="flex-1 p-4 pt-8">
            {/* Code skeleton */}
            <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
            
            {/* Title skeleton */}
            <div className="space-y-2 mb-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
            
            {/* Instructor skeleton */}
            <div className="flex items-center space-x-2 mt-4">
              <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default CardGridSkeleton
