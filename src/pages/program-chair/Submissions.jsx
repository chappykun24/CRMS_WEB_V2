import React, { useState } from 'react'
import { ClipboardDocumentListIcon, MagnifyingGlassIcon, EyeIcon, CheckIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/solid'
import { useSidebar } from '../../contexts/SidebarContext'

const TabButton = ({ isActive, onClick, children }) => (
  <button
    onClick={onClick}
    className={`tab-button py-4 px-4 font-medium text-sm ${
      isActive ? 'text-red-600' : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    {children}
  </button>
)

const Submissions = () => {
  const { sidebarExpanded } = useSidebar()
  const [activeTab, setActiveTab] = useState('pending')
  const [query, setQuery] = useState('')
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewComment, setReviewComment] = useState('')

  // Sample submissions data structure (no mock data as requested)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(false)

  const handleApprove = (submissionId) => {
    // Approval logic would go here
    setShowReviewModal(false)
  }

  const handleReject = (submissionId) => {
    // Rejection logic would go here
    setShowReviewModal(false)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading submissions...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx>{`
        .tab-button {
          transition: all 0.2s ease-in-out !important;
          border: none !important;
          border-bottom: none !important;
          outline: none !important;
          box-shadow: none !important;
        }
        
        input[type="text"], input[type="search"], select, textarea {
          border-color: #d1d5db !important;
          outline: none !important;
          box-shadow: none !important;
        }
        
        input[type="text"]:focus, input[type="search"]:focus, select:focus, textarea:focus {
          border-color: #9ca3af !important;
          outline: none !important;
          box-shadow: none !important;
        }
        
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

          {/* Tabs */}
          <div className="absolute top-0 right-0 z-40 bg-gray-50 transition-all duration-500 ease-in-out left-0">
            <div className="px-8 bg-gray-50">
              <nav className="flex space-x-8 bg-gray-50 border-b border-gray-200">
                <TabButton isActive={activeTab === 'pending'} onClick={() => setActiveTab('pending')}>
                  Pending Review
                </TabButton>
                <TabButton isActive={activeTab === 'approved'} onClick={() => setActiveTab('approved')}>
                  Approved
                </TabButton>
                <TabButton isActive={activeTab === 'rejected'} onClick={() => setActiveTab('rejected')}>
                  Rejected
                </TabButton>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="pt-16 pb-6 transition-all duration-500 ease-in-out" style={{ height: 'calc(100vh - 80px)' }}>
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
                      placeholder="Search submissions by faculty or course"
                      className="w-full px-3 py-2 pl-9 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 border-gray-300"
                    />
                    <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
                  </div>
                  
                  <select className="px-3 py-2 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 border-gray-300">
                    <option value="">All Types</option>
                    <option value="syllabus">Syllabus</option>
                    <option value="assessment">Assessment</option>
                    <option value="curriculum">Curriculum</option>
                    <option value="proposal">Proposal</option>
                  </select>
                  
                  <select className="px-3 py-2 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 border-gray-300">
                    <option value="">All Programs</option>
                    <option value="bsit">BS Information Technology</option>
                    <option value="bscs">BS Computer Science</option>
                    <option value="bsis">BS Information Systems</option>
                  </select>
                </div>

                <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300">
                  {submissions.length > 0 ? (
                    <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Faculty
                            </th>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Course
                            </th>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Submitted
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
                          {submissions.map(submission => (
                            <tr
                              key={submission.id}
                              onClick={() => setSelectedSubmission(submission)}
                              className={`hover:bg-gray-50 cursor-pointer ${selectedSubmission?.id === submission.id ? 'bg-red-50' : ''}`}
                            >
                              <td className="px-8 py-3">
                                <div className="flex items-center">
                                  <div className="h-8 w-8 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center ring-1 ring-gray-300 mr-3">
                                    <span className="text-sm font-semibold text-gray-500">
                                      {submission.facultyName?.charAt(0)?.toUpperCase() || '?'}
                                    </span>
                                  </div>
                                  <div className="text-sm font-medium text-gray-900">{submission.facultyName}</div>
                                </div>
                              </td>
                              <td className="px-8 py-3">
                                <div className="text-sm text-gray-700">{submission.type}</div>
                              </td>
                              <td className="px-8 py-3">
                                <div className="text-sm text-gray-700">{submission.course}</div>
                              </td>
                              <td className="px-8 py-3">
                                <div className="text-sm text-gray-700">{submission.submittedAt}</div>
                              </td>
                              <td className="px-8 py-3">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  submission.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                                  submission.status === 'approved' ? 'bg-green-100 text-green-700' : 
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {submission.status}
                                </span>
                              </td>
                              <td className="px-8 py-3">
                                <div className="flex items-center gap-2">
                                  <button 
                                    className="text-blue-600 hover:text-blue-800"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedSubmission(submission)
                                    }}
                                  >
                                    <EyeIcon className="h-4 w-4" />
                                  </button>
                                  {submission.status === 'pending' && (
                                    <>
                                      <button 
                                        className="text-green-600 hover:text-green-800"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setSelectedSubmission(submission)
                                          setShowReviewModal(true)
                                        }}
                                      >
                                        <CheckIcon className="h-4 w-4" />
                                      </button>
                                      <button 
                                        className="text-red-600 hover:text-red-800"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setSelectedSubmission(submission)
                                          setShowReviewModal(true)
                                        }}
                                      >
                                        <XMarkIcon className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
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
                        <ClipboardDocumentListIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions found</h3>
                        <p className="text-gray-500">No submissions match your current filters.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Side actions / Submission details */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-4 sticky top-4 border border-gray-300">
                  {selectedSubmission ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center ring-1 ring-blue-300">
                          <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{selectedSubmission.type}</h4>
                          <p className="text-sm text-gray-600">{selectedSubmission.facultyName}</p>
                          <p className="text-xs text-gray-500">{selectedSubmission.course}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Status</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            selectedSubmission.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                            selectedSubmission.status === 'approved' ? 'bg-green-100 text-green-700' : 
                            'bg-red-100 text-red-700'
                          }`}>
                            {selectedSubmission.status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Submitted</span>
                          <span className="text-gray-800">{selectedSubmission.submittedAt}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Program</span>
                          <span className="text-gray-800">{selectedSubmission.program}</span>
                        </div>
                      </div>

                      {selectedSubmission.status === 'pending' && (
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => setShowReviewModal(true)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
                          >
                            <CheckIcon className="h-4 w-4" />
                            Approve
                          </button>
                          <button 
                            onClick={() => setShowReviewModal(true)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                          >
                            <XMarkIcon className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      )}

                      {selectedSubmission.status !== 'pending' && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">
                            <strong>Comment:</strong> {selectedSubmission.comment || 'No comment provided'}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-10">
                      <ClipboardDocumentListIcon className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-sm">Select a submission from the list to view details here.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Review Submission</h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Submission Details</h4>
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  <p><strong>Faculty:</strong> {selectedSubmission.facultyName}</p>
                  <p><strong>Type:</strong> {selectedSubmission.type}</p>
                  <p><strong>Course:</strong> {selectedSubmission.course}</p>
                  <p><strong>Submitted:</strong> {selectedSubmission.submittedAt}</p>
                </div>
              </div>

              <div>
                <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                  Review Comment
                </label>
                <textarea
                  id="comment"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Add your review comment..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedSubmission.id)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(selectedSubmission.id)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Submissions
