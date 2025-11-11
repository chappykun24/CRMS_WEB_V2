import React from 'react'

/**
 * Dashboard Skeleton Component
 * Consistent loading skeleton for dashboard pages with stats cards
 */
const DashboardSkeleton = ({ showQuickAccess = true }) => {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Background refresh indicator skeleton */}
        {showQuickAccess && (
          <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
        )}
        
        {/* Key Statistics Cards Skeleton (Top Row) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                  <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="h-14 w-14 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Performance Overview Cards Skeleton (Second Row) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 bg-gray-200 rounded w-28"></div>
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              </div>
              <div className="h-7 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
          ))}
        </div>

        {/* Quick Access Section Skeleton */}
        {showQuickAccess && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-50 rounded-lg border border-gray-200 p-4 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                      </div>
                    </div>
                    <div className="h-5 w-5 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardSkeleton

