import React, { useState, useEffect } from 'react'
import { ChartBarIcon, UsersIcon, BookOpenIcon, AcademicCapIcon, ClockIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/solid'
// Removed SidebarContext import - using local state instead
import { trackEvent } from '../../utils/analytics'

const Analytics = () => {
  const [sidebarExpanded] = useState(true) // Default to expanded
  const [selectedPeriod, setSelectedPeriod] = useState('current')
  const [selectedProgram, setSelectedProgram] = useState('')

  useEffect(() => {
    trackEvent('pc_analytics_viewed')
  }, [])

  useEffect(() => {
    trackEvent('pc_analytics_filter_changed', { selectedPeriod, selectedProgram })
  }, [selectedPeriod, selectedProgram])

  return (
    <>
      <style>{`
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
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <ChartBarIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Analytics</h4>
                  <p>Analytics content will be displayed here</p>
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
