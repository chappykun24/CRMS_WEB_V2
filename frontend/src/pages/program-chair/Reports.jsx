import React, { useState } from 'react'
import { DocumentTextIcon, MagnifyingGlassIcon, EyeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid'
import { useSidebar } from '../../contexts/SidebarContext'

const Reports = () => {
  const { sidebarExpanded } = useSidebar()
  const [query, setQuery] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [reportType, setReportType] = useState('')
  const [dateRange, setDateRange] = useState('current')

  // Sample reports data structure (no mock data as requested)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)

  const handleGenerateReport = (e) => {
    e.preventDefault()
    // Report generation logic would go here
    setShowGenerateModal(false)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading reports...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
                <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <DocumentTextIcon className="h-4 w-4" />
                  Generate Report
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="pt-20 pb-6 transition-all duration-500 ease-in-out" style={{ height: 'calc(100vh - 80px)' }}>
            <div className="px-8 h-full">
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <DocumentTextIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Reports</h4>
                  <p>Reports content will be displayed here</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Generate New Report</h3>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleGenerateReport} className="space-y-4">
              <div>
                <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 mb-1">
                  Report Type *
                </label>
                <select
                  id="reportType"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select report type</option>
                  <option value="enrollment">Enrollment Report</option>
                  <option value="academic">Academic Performance Report</option>
                  <option value="faculty">Faculty Report</option>
                  <option value="course">Course Report</option>
                </select>
              </div>

              <div>
                <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range *
                </label>
                <select
                  id="dateRange"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="current">Current Semester</option>
                  <option value="previous">Previous Semester</option>
                  <option value="year">Academic Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              <div>
                <label htmlFor="program" className="block text-sm font-medium text-gray-700 mb-1">
                  Program
                </label>
                <select
                  id="program"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All Programs</option>
                  <option value="bsit">BS Information Technology</option>
                  <option value="bscs">BS Computer Science</option>
                  <option value="bsis">BS Information Systems</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Generate Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default Reports
