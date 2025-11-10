import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/UnifiedAuthContext'
import {
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/solid'
import { XMarkIcon } from '@heroicons/react/24/solid'

const SyllabusReview = () => {
  const { user } = useAuth()
  const [syllabi, setSyllabi] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSyllabus, setSelectedSyllabus] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [reviewing, setReviewing] = useState(false)

  useEffect(() => {
    loadPendingSyllabi()
  }, [])

  const loadPendingSyllabi = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/syllabi', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        // Filter for syllabi pending review (review_status = 'pending')
        const pendingSyllabi = Array.isArray(data) 
          ? data.filter(s => s.review_status === 'pending')
          : []
        setSyllabi(pendingSyllabi)
      }
    } catch (error) {
      console.error('Error loading pending syllabi:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (syllabus, reviewStatus) => {
    const statusText = reviewStatus === 'approved' ? 'approve' : reviewStatus === 'rejected' ? 'reject' : 'request revision for'
    if (!confirm(`Are you sure you want to ${statusText} this syllabus?`)) {
      return
    }

    setReviewing(true)
    try {
      const response = await fetch(`/api/syllabi/${syllabus.syllabus_id}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          reviewed_by: user.user_id,
          review_status: reviewStatus
        })
      })

      if (response.ok) {
        alert(`Syllabus ${reviewStatus} successfully!`)
        loadPendingSyllabi()
        if (showViewModal) {
          setShowViewModal(false)
          setSelectedSyllabus(null)
        }
      } else {
        const error = await response.json()
        alert(error.error || `Failed to ${reviewStatus} syllabus`)
      }
    } catch (error) {
      console.error('Error reviewing syllabus:', error)
      alert(`Failed to ${reviewStatus} syllabus`)
    } finally {
      setReviewing(false)
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

  const filteredSyllabi = syllabi.filter(syllabus =>
    syllabus.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    syllabus.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Syllabus Review</h1>
          <p className="text-gray-600">Review and approve syllabi submitted by faculty members</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search syllabi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>

        {/* Syllabi List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-8">
            <div className="text-center text-gray-500">Loading syllabi...</div>
          </div>
        ) : filteredSyllabi.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSyllabi.map((syllabus) => (
                    <tr key={syllabus.syllabus_id} className="hover:bg-gray-50">
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
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {syllabus.created_at ? new Date(syllabus.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openViewModal(syllabus)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleReview(syllabus, 'approved')}
                            disabled={reviewing}
                            className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                            title="Approve"
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleReview(syllabus, 'rejected')}
                            disabled={reviewing}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Reject"
                          >
                            <XCircleIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleReview(syllabus, 'needs_revision')}
                            disabled={reviewing}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded transition-colors disabled:opacity-50"
                            title="Needs Revision"
                          >
                            <ClockIcon className="h-5 w-5" />
                          </button>
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
              {searchQuery ? 'No syllabi match your search' : 'No pending syllabi'}
            </h3>
            <p className="text-gray-500">
              {searchQuery ? 'Try a different search term' : 'All syllabi have been reviewed or no syllabi are pending review.'}
            </p>
          </div>
        )}

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

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => handleReview(selectedSyllabus, 'approved')}
                      disabled={reviewing}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <CheckCircleIcon className="h-5 w-5" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(selectedSyllabus, 'needs_revision')}
                      disabled={reviewing}
                      className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <ClockIcon className="h-5 w-5" />
                      Needs Revision
                    </button>
                    <button
                      onClick={() => handleReview(selectedSyllabus, 'rejected')}
                      disabled={reviewing}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <XCircleIcon className="h-5 w-5" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SyllabusReview
