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
      <style>{`
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
            <div className="px-8 h-full">
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <ClipboardDocumentListIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Submissions</h4>
                  <p>Submissions content will be displayed here</p>
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
