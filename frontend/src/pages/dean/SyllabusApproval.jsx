import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/UnifiedAuthContext'
import {
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/solid'
import { XMarkIcon } from '@heroicons/react/24/solid'

const SyllabusApproval = () => {
  const { user } = useAuth()
  const [syllabi, setSyllabi] = useState([])
  const [approvedSyllabi, setApprovedSyllabi] = useState([])
  const [editRequests, setEditRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSyllabus, setSelectedSyllabus] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [approving, setApproving] = useState(false)
  const [activeTab, setActiveTab] = useState('pending') // 'pending', 'approved', 'edit-requests'

  useEffect(() => {
    loadPendingApprovalSyllabi()
    loadApprovedSyllabi()
    loadEditRequests()
  }, [])

  const loadPendingApprovalSyllabi = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/syllabi', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        // Filter for syllabi approved by program chair but pending dean approval
        const pendingApproval = Array.isArray(data) 
          ? data.filter(s => s.review_status === 'approved' && s.approval_status === 'pending')
          : []
        setSyllabi(pendingApproval)
      }
    } catch (error) {
      console.error('Error loading pending approval syllabi:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadApprovedSyllabi = async () => {
    try {
      const response = await fetch('/api/syllabi', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        // Filter for approved syllabi
        const approved = Array.isArray(data) 
          ? data.filter(s => s.review_status === 'approved' && s.approval_status === 'approved')
          : []
        setApprovedSyllabi(approved)
      }
    } catch (error) {
      console.error('Error loading approved syllabi:', error)
    }
  }

  const loadEditRequests = async () => {
    try {
      const response = await fetch('/api/syllabi/edit-requests?role=dean', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setEditRequests(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error loading edit requests:', error)
    }
  }

  const handleApprove = async (syllabus, approvalStatus) => {
    const statusText = approvalStatus === 'approved' ? 'approve' : 'reject'
    if (!confirm(`Are you sure you want to ${statusText} this syllabus?`)) {
      return
    }

    setApproving(true)
    try {
      const response = await fetch(`/api/syllabi/${syllabus.syllabus_id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          approved_by: user.user_id,
          approval_status: approvalStatus
        })
      })

      if (response.ok) {
        alert(`Syllabus ${approvalStatus} successfully!`)
        loadPendingApprovalSyllabi()
        loadApprovedSyllabi()
        if (showViewModal) {
          setShowViewModal(false)
          setSelectedSyllabus(null)
        }
      } else {
        const error = await response.json()
        alert(error.error || `Failed to ${approvalStatus} syllabus`)
      }
    } catch (error) {
      console.error('Error approving syllabus:', error)
      alert(`Failed to ${approvalStatus} syllabus`)
    } finally {
      setApproving(false)
    }
  }

  const handleApproveEditRequest = async (editRequest, approved) => {
    const action = approved ? 'approve' : 'reject'
    if (!confirm(`Are you sure you want to ${action} this edit request?`)) {
      return
    }

    try {
      const response = await fetch(`/api/syllabi/edit-requests/${editRequest.edit_request_id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          approved,
          approved_by: user.user_id,
          role: 'dean'
        })
      })

      if (response.ok) {
        alert(`Edit request ${approved ? 'approved' : 'rejected'} successfully!`)
        loadEditRequests()
      } else {
        const error = await response.json()
        alert(error.error || `Failed to ${action} edit request`)
      }
    } catch (error) {
      console.error('Error approving edit request:', error)
      alert(`Failed to ${action} edit request`)
    }
  }

  const openViewModal = (syllabus) => {
    setSelectedSyllabus(syllabus)
    setShowViewModal(true)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'needs_revision': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatLearningResources = (resources) => {
    if (Array.isArray(resources)) {
      return resources.join(', ')
    }
    if (typeof resources === 'string') {
      return resources
    }
    return 'N/A'
  }

  const filteredSyllabi = (syllabi || []).filter(syllabus =>
    syllabus.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    syllabus.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredApprovedSyllabi = (approvedSyllabi || []).filter(syllabus =>
    syllabus.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    syllabus.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredEditRequests = (editRequests || []).filter(request =>
    request.syllabus_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.requested_by_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Safe date formatting function
  const formatDate = (dateString) => {
    if (!dateString) return '—'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return '—'
      }
      return date.toLocaleDateString()
    } catch (error) {
      console.error('Error formatting date:', error)
      return '—'
    }
  }

  return (
    <div className="h-full w-full flex flex-col bg-gray-50 overflow-hidden">
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="max-w-7xl mx-auto">
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Approvals ({syllabi.length})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'approved'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Approved Syllabuses ({approvedSyllabi.length})
            </button>
            <button
              onClick={() => setActiveTab('edit-requests')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'edit-requests'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Edit Requests ({editRequests.length})
            </button>
          </nav>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6 pt-0">
          <div className="max-w-7xl mx-auto">
        {/* Tab Content */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-8">
            <div className="text-center text-gray-500">Loading...</div>
          </div>
        ) : activeTab === 'pending' ? (
          /* Pending Approvals Tab */
          filteredSyllabi.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden flex flex-col max-h-[calc(100vh-280px)]">
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reviewed</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSyllabi.map((syllabus) => (
                    <tr 
                      key={syllabus.syllabus_id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => openViewModal(syllabus)}
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{syllabus.title}</div>
                        <div className="text-sm text-gray-500">{syllabus.description || 'No description'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">v{syllabus.version}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{syllabus.course_title || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(syllabus.review_status)}`}>
                          {syllabus.review_status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(syllabus.approval_status)}`}>
                          {syllabus.approval_status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(syllabus.reviewed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-12 text-center">
            <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No syllabi match your search' : 'No pending approvals'}
            </h3>
            <p className="text-gray-500">
              {searchQuery ? 'Try a different search term' : 'All syllabi have been approved or no syllabi are pending dean approval.'}
            </p>
          </div>
        )
        ) : activeTab === 'approved' ? (
          /* Approved Syllabuses Tab */
          filteredApprovedSyllabi.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredApprovedSyllabi.map((syllabus) => (
                      <tr 
                        key={syllabus.syllabus_id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => openViewModal(syllabus)}
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{syllabus.title}</div>
                          <div className="text-sm text-gray-500">{syllabus.description || 'No description'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">v{syllabus.version}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{syllabus.course_title || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(syllabus.review_status)}`}>
                            {syllabus.review_status || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(syllabus.approval_status)}`}>
                            {syllabus.approval_status || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(syllabus.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-12 text-center">
              <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No syllabi match your search' : 'No approved syllabuses'}
              </h3>
              <p className="text-gray-500">
                {searchQuery ? 'Try a different search term' : 'No syllabuses have been approved yet.'}
              </p>
            </div>
          )
        ) : activeTab === 'edit-requests' ? (
          /* Edit Requests Tab */
          filteredEditRequests.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Syllabus</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEditRequests.map((request) => (
                      <tr key={request.edit_request_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{request.syllabus_title}</div>
                          <div className="text-sm text-gray-500">v{request.syllabus_version}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{request.requested_by_name || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={request.reason}>
                          {request.reason || 'No reason provided'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(request.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {!request.dean_approved && request.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveEditRequest(request, true)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                                  title="Approve"
                                >
                                  <CheckCircleIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleApproveEditRequest(request, false)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Reject"
                                >
                                  <XCircleIcon className="h-5 w-5" />
                                </button>
                              </>
                            )}
                            {request.dean_approved && (
                              <span className="text-xs text-green-600 font-medium">Approved</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-12 text-center">
              <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No edit requests match your search' : 'No edit requests'}
              </h3>
              <p className="text-gray-500">
                {searchQuery ? 'Try a different search term' : 'No edit requests are pending your approval.'}
              </p>
            </div>
          )
        ) : null}

        {/* View Syllabus Modal */}
        {showViewModal && selectedSyllabus && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">{selectedSyllabus.title}</h2>
                  <button
                    onClick={() => {
                      setShowViewModal(false)
                      setSelectedSyllabus(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Version</h3>
                    <p className="text-sm text-gray-900">v{selectedSyllabus.version}</p>
                  </div>

                  {selectedSyllabus.description && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Description</h3>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedSyllabus.description}</p>
                    </div>
                  )}

                  {selectedSyllabus.course_objectives && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Course Objectives</h3>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedSyllabus.course_objectives}</p>
                    </div>
                  )}

                  {selectedSyllabus.course_outline && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Course Outline</h3>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedSyllabus.course_outline}</p>
                    </div>
                  )}

                  {selectedSyllabus.prerequisites && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Prerequisites</h3>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedSyllabus.prerequisites}</p>
                    </div>
                  )}

                  {selectedSyllabus.learning_resources && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Learning Resources</h3>
                      <p className="text-sm text-gray-900">{formatLearningResources(selectedSyllabus.learning_resources)}</p>
                    </div>
                  )}

                  {selectedSyllabus.assessment_framework && (() => {
                    let framework = null
                    try {
                      if (typeof selectedSyllabus.assessment_framework === 'string') {
                        framework = JSON.parse(selectedSyllabus.assessment_framework)
                      } else {
                        framework = selectedSyllabus.assessment_framework
                      }
                    } catch (e) {
                      framework = null
                    }
                    
                    const components = framework?.components || []
                    const totalWeight = components.reduce((sum, comp) => sum + (parseFloat(comp.weight) || 0), 0)
                    
                    return (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Assessment Framework</h3>
                        {components.length > 0 ? (
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              {components.map((comp, index) => (
                                <div key={index} className="p-2 bg-white rounded border border-gray-200">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="font-semibold text-gray-900 text-sm">{comp.type}</span>
                                    <span className="text-xs font-medium text-blue-600">{comp.weight}%</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {comp.count && (
                                      <span className="text-xs text-gray-500">
                                        {comp.count} {comp.count === 1 ? 'item' : 'items'}
                                      </span>
                                    )}
                                    {comp.description && (
                                      <span className="text-xs text-gray-500 truncate" title={comp.description}>
                                        {comp.description}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="pt-2 border-t border-gray-300">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-700">Total Weight:</span>
                                <span className={`text-xs font-bold ${totalWeight === 100 ? 'text-green-600' : 'text-red-600'}`}>
                                  {totalWeight}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 p-3 rounded border border-gray-200">
                            <p className="text-sm text-gray-500 italic">No assessment components defined</p>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {selectedSyllabus.grading_policy && (() => {
                    let policy = null
                    try {
                      if (typeof selectedSyllabus.grading_policy === 'string') {
                        policy = JSON.parse(selectedSyllabus.grading_policy)
                      } else {
                        policy = selectedSyllabus.grading_policy
                      }
                    } catch (e) {
                      policy = null
                    }
                    
                    return (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Grading Policy</h3>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          {policy?.scale && Array.isArray(policy.scale) && policy.scale.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-gray-800 mb-2">Grading Scale</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {policy.scale.map((item, index) => (
                                  <div key={index} className="p-2 bg-white rounded border border-gray-200">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-gray-900 text-sm">{item.grade || 'N/A'}</span>
                                      <span className="text-xs text-gray-600">{item.range || 'N/A'}</span>
                                    </div>
                                    {item.description && (
                                      <p className="text-xs text-gray-500 mt-0.5 truncate" title={item.description}>{item.description}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {policy?.components && policy.components.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-800 mb-2">Grading Components</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {policy.components.map((comp, index) => (
                                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                                    <span className="text-xs text-gray-900 truncate">{comp.type || comp.name || 'Component'}</span>
                                    <span className="text-xs font-medium text-blue-600 ml-2">{comp.weight || comp.percentage || 0}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {!policy?.scale && !policy?.components && (
                            <p className="text-sm text-gray-500 italic">No grading policy details available</p>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Review Status</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedSyllabus.review_status)}`}>
                        {selectedSyllabus.review_status || 'pending'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Approval Status</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedSyllabus.approval_status)}`}>
                        {selectedSyllabus.approval_status || 'pending'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons - Only show if syllabus is pending approval */}
                  {selectedSyllabus.approval_status === 'pending' && (
                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        onClick={() => handleApprove(selectedSyllabus, 'approved')}
                        disabled={approving}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleApprove(selectedSyllabus, 'rejected')}
                        disabled={approving}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <XCircleIcon className="h-5 w-5" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SyllabusApproval
