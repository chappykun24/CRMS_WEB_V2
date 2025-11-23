import React from 'react'

const ILOAttainmentSkeleton = () => {
  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <div className="w-full px-6 py-4 flex-shrink-0">
        {/* Filters Section Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 animate-pulse">
          <div className="flex gap-6 items-start">
            {/* Class Selection Skeleton */}
            <div className="flex-shrink-0">
              <div className="h-3 bg-gray-200 rounded w-12 mb-2"></div>
              <div className="h-10 bg-gray-200 rounded w-64"></div>
            </div>

            {/* ILO Filters Skeleton */}
            <div className="flex-1">
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, index) => (
                  <div key={index}>
                    <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content with Sidebar Layout */}
        <div className="flex gap-6 items-stretch flex-1 min-h-0 pb-4">
          {/* Main Content Area - Student Results */}
          <div className="flex-1 min-w-0 flex flex-col space-y-6 overflow-y-auto">
            {/* Percentage Range Filter Skeleton */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="h-4 bg-gray-200 rounded w-40"></div>
                <div className="h-10 bg-gray-200 rounded w-48"></div>
              </div>
            </div>

            {/* Score Range Sections Skeleton */}
            <div className="space-y-4">
              {[...Array(3)].map((_, rangeIndex) => (
                <div key={rangeIndex} className="bg-white rounded-lg shadow-sm border-2 border-gray-200 overflow-hidden p-3 animate-pulse">
                  {/* Range Header Skeleton */}
                  <div className="px-4 py-2 border-b bg-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="h-6 bg-gray-200 rounded w-32"></div>
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>

                  {/* Table Skeleton */}
                  <div className="overflow-x-auto mt-3">
                    <table className="min-w-full divide-y divide-gray-200">
                      {/* Table Header */}
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                            <div className="h-4 bg-gray-200 rounded w-4"></div>
                          </th>
                          {['Student Number', 'Full Name', 'ILO Score', 'Overall %'].map((_, index) => (
                            <th key={index} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <div className="h-4 bg-gray-200 rounded w-24"></div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      {/* Table Body */}
                      <tbody className="bg-white divide-y divide-gray-200">
                        {[...Array(4)].map((_, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="h-5 w-5 bg-gray-200 rounded"></div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="h-4 bg-gray-200 rounded w-24"></div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="h-4 bg-gray-200 rounded w-32"></div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="h-4 bg-gray-200 rounded w-16"></div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="h-4 bg-gray-200 rounded w-16"></div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Sidebar Skeleton */}
          <div className="w-80 flex-shrink-0 flex flex-col">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full overflow-y-auto space-y-4 animate-pulse">
              {/* ILO Definition Skeleton */}
              <div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>

              {/* SO/SDG/IGA/CDIO Definition Skeleton */}
              <div>
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>

              {/* Assessment Breakdown Table Skeleton */}
              <div>
                <div className="h-4 bg-gray-200 rounded w-32 mb-3"></div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Assessment', 'Points', '%'].map((_, index) => (
                          <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {[...Array(5)].map((_, rowIndex) => (
                        <tr key={rowIndex}>
                          <td className="px-3 py-2">
                            <div className="h-3 bg-gray-200 rounded w-32"></div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="h-3 bg-gray-200 rounded w-12"></div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="h-3 bg-gray-200 rounded w-12"></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ILOAttainmentSkeleton

