import React, { useState } from 'react'
import { ChartBarIcon, UsersIcon, BookOpenIcon, AcademicCapIcon, ClockIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/solid'
import { useSidebar } from '../../contexts/SidebarContext'

const Analytics = () => {
  const { sidebarExpanded } = useSidebar()
  const [selectedPeriod, setSelectedPeriod] = useState('current')
  const [selectedProgram, setSelectedProgram] = useState('')

  return (
    <>
      <style jsx>{`
        select {
          appearance: none !important;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e") !important;
          background-position: right 8px center !important;
          background-repeat: no-repeat !important;
          background-size: 16px !important;
          padding-right: 40px !important;
          cursor: pointer !important;
        }
      `}</style>
      
      <div className={`absolute top-16 bottom-0 bg-gray-50 rounded-tl-3xl overflow-hidden transition-all duration-500 ease-in-out ${
        sidebarExpanded ? 'left-64 right-0' : 'left-20 right-0'
      }`} style={{ marginTop: '0px' }}>
        <div className="w-full pr-2 pl-2 transition-all duration-500 ease-in-out" style={{ marginTop: '0px' }}>

          {/* Header */}
          <div className="absolute top-0 right-0 z-40 bg-gray-50 transition-all duration-500 ease-in-out left-0">
            <div className="px-8 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Program Analytics</h1>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 border-gray-300"
                  >
                    <option value="current">Current Semester</option>
                    <option value="previous">Previous Semester</option>
                    <option value="year">Academic Year</option>
                  </select>
                  <select
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 border-gray-300"
                  >
                    <option value="">All Programs</option>
                    <option value="bsit">BS Information Technology</option>
                    <option value="bscs">BS Computer Science</option>
                    <option value="bsis">BS Information Systems</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="pt-20 pb-6 transition-all duration-500 ease-in-out" style={{ height: 'calc(100vh - 80px)' }}>
            <div className="px-8 h-full">
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <UsersIcon className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Students</p>
                      <p className="text-2xl font-semibold text-gray-900">0</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <BookOpenIcon className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Active Courses</p>
                      <p className="text-2xl font-semibold text-gray-900">0</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <AcademicCapIcon className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Faculty Members</p>
                      <p className="text-2xl font-semibold text-gray-900">0</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ArrowTrendingUpIcon className="h-8 w-8 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Avg. GPA</p>
                      <p className="text-2xl font-semibold text-gray-900">0.00</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts and Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Enrollment Trends */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Enrollment Trends</h3>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center text-gray-500">
                      <ChartBarIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>Chart will be displayed here</p>
                    </div>
                  </div>
                </div>

                {/* Course Performance */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Performance</h3>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center text-gray-500">
                      <ChartBarIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>Chart will be displayed here</p>
                    </div>
                  </div>
                </div>

                {/* Top Performing Courses */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Courses</h3>
                  <div className="space-y-3">
                    <div className="text-center text-gray-500 py-8">
                      <BookOpenIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>Course performance data will be displayed here</p>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    <div className="text-center text-gray-500 py-8">
                      <ClockIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>Recent activity will be displayed here</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Analytics Table */}
              <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-300">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Detailed Analytics</h3>
                </div>
                <div className="p-6">
                  <div className="text-center text-gray-500 py-12">
                    <ChartBarIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Analytics Data</h4>
                    <p>Detailed analytics and reports will be displayed here</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Analytics
