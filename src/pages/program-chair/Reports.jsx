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
            <div className={`grid grid-cols-1 lg:grid-cols-4 gap-8 px-8 h-full`}>
              
              {/* List */}
              <div className={`lg:col-span-3 h-full`}>
                {/* Controls */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search reports by name or type"
                      className="w-full px-3 py-2 pl-9 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 border-gray-300"
                    />
                    <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
                  </div>
                  
                  <select className="px-3 py-2 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 border-gray-300">
                    <option value="">All Types</option>
                    <option value="enrollment">Enrollment Report</option>
                    <option value="academic">Academic Performance</option>
                    <option value="faculty">Faculty Report</option>
                    <option value="course">Course Report</option>
                  </select>
                  
                  <select className="px-3 py-2 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 border-gray-300">
                    <option value="">All Programs</option>
                    <option value="bsit">BS Information Technology</option>
                    <option value="bscs">BS Computer Science</option>
                    <option value="bsis">BS Information Systems</option>
                  </select>
                </div>

                <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300">
                  {reports.length > 0 ? (
                    <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Report Name
                            </th>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Generated
                            </th>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reports.map(report => (
                            <tr
                              key={report.id}
                              onClick={() => setSelectedReport(report)}
                              className={`hover:bg-gray-50 cursor-pointer ${selectedReport?.id === report.id ? 'bg-red-50' : ''}`}
                            >
                              <td className="px-8 py-3">
                                <div className="text-sm font-medium text-gray-900">{report.name}</div>
                              </td>
                              <td className="px-8 py-3">
                                <div className="text-sm text-gray-700">{report.type}</div>
                              </td>
                              <td className="px-8 py-3">
                                <div className="text-sm text-gray-700">{report.generatedAt}</div>
                              </td>
                              <td className="px-8 py-3">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  report.status === 'completed' ? 'bg-green-100 text-green-700' : 
                                  report.status === 'processing' ? 'bg-yellow-100 text-yellow-700' : 
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {report.status}
                                </span>
                              </td>
                              <td className="px-8 py-3">
                                <div className="flex items-center gap-2">
                                  <button className="text-blue-600 hover:text-blue-800">
                                    <EyeIcon className="h-4 w-4" />
                                  </button>
                                  <button className="text-green-600 hover:text-green-800">
                                    <ArrowDownTrayIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center py-16">
                      <div className="text-center">
                        <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                        <p className="text-gray-500">Generate your first report to get started.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Side actions / Report details */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-4 sticky top-4 border border-gray-300">
                  {selectedReport ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center ring-1 ring-blue-300">
                          <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{selectedReport.name}</h4>
                          <p className="text-sm text-gray-600">{selectedReport.type}</p>
                          <p className="text-xs text-gray-500">Generated: {selectedReport.generatedAt}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Status</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            selectedReport.status === 'completed' ? 'bg-green-100 text-green-700' : 
                            selectedReport.status === 'processing' ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-red-100 text-red-700'
                          }`}>
                            {selectedReport.status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Program</span>
                          <span className="text-gray-800">{selectedReport.program}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">File Size</span>
                          <span className="text-gray-800">{selectedReport.fileSize}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700">
                          <EyeIcon className="h-4 w-4" />
                          View
                        </button>
                        <button className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-white text-green-600 border border-green-300 hover:bg-green-50">
                          <ArrowDownTrayIcon className="h-4 w-4" />
                          Download
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-10">
                      <DocumentTextIcon className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-sm">Select a report from the list to view details here.</p>
                    </div>
                  )}
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
