import React, { useState, useEffect, useCallback, useRef } from 'react'
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
import { API_BASE_URL } from '../../utils/api'
import programChairCacheService from '../../services/programChairCacheService'
import { safeSetItem, safeGetItem, minimizeSyllabusData, createCacheGetter, createCacheSetter } from '../../utils/cacheUtils'
import { TableSkeleton, ListSkeleton } from '../../components/skeletons'

// Cache helpers
const getCachedData = createCacheGetter(programChairCacheService)
const setCachedData = createCacheSetter(programChairCacheService)

const SyllabusReview = () => {
  const { user } = useAuth()
  const [syllabi, setSyllabi] = useState([])
  const [approvedSyllabi, setApprovedSyllabi] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSyllabus, setSelectedSyllabus] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [activeTab, setActiveTab] = useState('pending') // 'pending', 'approved'
  
  // ILOs and reference data for mapping tables
  const [selectedSyllabusILOs, setSelectedSyllabusILOs] = useState([])
  const [soReferences, setSoReferences] = useState([])
  const [igaReferences, setIgaReferences] = useState([])
  const [cdioReferences, setCdioReferences] = useState([])
  const [sdgReferences, setSdgReferences] = useState([])
  const abortControllerRef = useRef(null)

  // Load pending syllabi with caching
  const loadPendingSyllabi = useCallback(async () => {
    console.log('🔍 [PROGRAM CHAIR SYLLABUS] loadPendingSyllabi starting')
    setError(null)
    
    // Check sessionStorage first for instant display
    const sessionCacheKey = 'program_chair_pending_syllabi_session'
    const sessionCached = safeGetItem(sessionCacheKey)
    
    if (sessionCached) {
      console.log('📦 [PROGRAM CHAIR SYLLABUS] Using session cached pending syllabi')
      setSyllabi(Array.isArray(sessionCached) ? sessionCached : [])
      setLoading(false)
      // Continue to fetch fresh data in background
    } else {
      setLoading(true)
    }
    
    // Check enhanced cache
    const cacheKey = 'program_chair_pending_syllabi'
    const cachedData = getCachedData('syllabi', cacheKey, 2 * 60 * 1000) // 2 minute cache (frequent updates)
    if (cachedData && !sessionCached) {
      console.log('📦 [PROGRAM CHAIR SYLLABUS] Using enhanced cached pending syllabi')
      setSyllabi(Array.isArray(cachedData) ? cachedData : [])
      setLoading(false)
      // Cache minimized data in sessionStorage for next time
      safeSetItem(sessionCacheKey, cachedData, minimizeSyllabusData)
      // Continue to fetch fresh data in background
    }
    
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController()
    
    try {
      console.log('🔄 [PROGRAM CHAIR SYLLABUS] Fetching fresh pending syllabi...')
      const response = await fetch(`${API_BASE_URL}/syllabi`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        signal: abortControllerRef.current.signal
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch syllabi: ${response.status}`)
      }
      
      const data = await response.json()
      // Filter for syllabi pending review (review_status = 'pending')
      const pendingSyllabi = Array.isArray(data) 
        ? data.filter(s => s.review_status === 'pending')
        : []
      console.log(`✅ [PROGRAM CHAIR SYLLABUS] Received ${pendingSyllabi.length} pending syllabi`)
      setSyllabi(pendingSyllabi)
      
      // Store minimized data in sessionStorage for instant next load
      if (!sessionCached) {
        safeSetItem(sessionCacheKey, pendingSyllabi, minimizeSyllabusData)
      }
      
      // Store full data in enhanced cache
      setCachedData('syllabi', cacheKey, pendingSyllabi)
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🚫 [PROGRAM CHAIR SYLLABUS] Request was aborted')
        return
      }
      console.error('❌ [PROGRAM CHAIR SYLLABUS] Error loading pending syllabi:', error)
      const sessionCached = safeGetItem(sessionCacheKey)
      const cachedData = getCachedData('syllabi', cacheKey, 2 * 60 * 1000)
      if (!sessionCached && !cachedData) {
        setError(error.message)
        setSyllabi([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const loadApprovedSyllabi = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/syllabi`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        // Filter for approved syllabi (by program chair)
        const approved = Array.isArray(data) 
          ? data.filter(s => s.review_status === 'approved')
          : []
        setApprovedSyllabi(approved)
      }
    } catch (error) {
      console.error('Error loading approved syllabi:', error)
    }
  }, [])


  useEffect(() => {
    loadPendingSyllabi()
    loadApprovedSyllabi()
    
    // Cleanup function to abort pending requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [loadPendingSyllabi, loadApprovedSyllabi])

  const handleReview = async (syllabus, reviewStatus) => {
    const statusText = reviewStatus === 'approved' ? 'approve' : reviewStatus === 'rejected' ? 'reject' : 'request revision for'
    if (!confirm(`Are you sure you want to ${statusText} this syllabus?`)) {
      return
    }

    setReviewing(true)
    try {
      const response = await fetch(`${API_BASE_URL}/syllabi/${syllabus.syllabus_id}/review`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
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
        // Clear cache and reload
        programChairCacheService.clear('syllabi', 'program_chair_pending_syllabi')
        safeSetItem('program_chair_pending_syllabi_session', syllabi.filter(s => s.syllabus_id !== syllabus.syllabus_id), minimizeSyllabusData)
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

  const loadSyllabusILOs = async (syllabusId) => {
    try {
      const response = await fetch(`/api/ilos/syllabus/${syllabusId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSelectedSyllabusILOs(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error loading ILOs:', error)
      setSelectedSyllabusILOs([])
    }
  }

  const loadReferenceData = async () => {
    try {
      const [soRes, igaRes, cdioRes, sdgRes] = await Promise.all([
        fetch('/api/ilos/references/so'),
        fetch('/api/ilos/references/iga'),
        fetch('/api/ilos/references/cdio'),
        fetch('/api/ilos/references/sdg')
      ])
      
      if (soRes.ok) {
        const soData = await soRes.json()
        setSoReferences(Array.isArray(soData) ? soData : [])
      }
      if (igaRes.ok) {
        const igaData = await igaRes.json()
        setIgaReferences(Array.isArray(igaData) ? igaData : [])
      }
      if (cdioRes.ok) {
        const cdioData = await cdioRes.json()
        setCdioReferences(Array.isArray(cdioData) ? cdioData : [])
      }
      if (sdgRes.ok) {
        const sdgData = await sdgRes.json()
        setSdgReferences(Array.isArray(sdgData) ? sdgData : [])
      }
    } catch (error) {
      console.error('Error loading reference data:', error)
    }
  }

  const openViewModal = async (syllabus) => {
    setSelectedSyllabus(syllabus)
    setShowViewModal(true)
    await Promise.all([
      loadSyllabusILOs(syllabus.syllabus_id),
      loadReferenceData()
    ])
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800'
      case 'pending_review': return 'bg-yellow-100 text-yellow-800'
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
              Pending Reviews ({syllabi.length})
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
          <TableSkeleton rows={6} columns={6} />
        ) : error ? (
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8">
            <div className="text-center text-red-600">
              <p className="font-medium">Error loading syllabi</p>
              <p className="text-sm text-red-500 mt-1">{error}</p>
            </div>
          </div>
        ) : activeTab === 'pending' ? (
          /* Pending Reviews Tab */
          filteredSyllabi.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden flex flex-col max-h-[calc(100vh-280px)]">
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revision Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Submission</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSyllabi.map((syllabus) => {
                    // Get review and approval statuses
                    const reviewStatus = syllabus.review_status || 'pending'
                    const approvalStatus = syllabus.approval_status || 'pending'
                    
                    // Format review status text
                    const reviewStatusText = reviewStatus === 'approved' ? 'Approved (Review)' :
                                           reviewStatus === 'rejected' ? 'Rejected (Review)' :
                                           reviewStatus === 'needs_revision' ? 'Needs Revision' :
                                           'Pending Review'
                    
                    // Format approval status text
                    const approvalStatusText = approvalStatus === 'approved' ? 'Approved' :
                                             approvalStatus === 'rejected' ? 'Rejected' :
                                             'Pending Approval'
                    
                    // Determine color for each status independently
                    const reviewStatusColor = reviewStatus === 'approved' ? 'bg-green-100 text-green-800' :
                                             reviewStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                                             reviewStatus === 'needs_revision' ? 'bg-orange-100 text-orange-800' :
                                             'bg-yellow-100 text-yellow-800' // pending
                    
                    const approvalStatusColor = approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                                               approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                                               'bg-yellow-100 text-yellow-800' // pending
                    
                    // Extract revision number from grading_policy.metadata
                    let revisionNo = '0'
                    try {
                      const gradingPolicy = typeof syllabus.grading_policy === 'string' 
                        ? JSON.parse(syllabus.grading_policy) 
                        : syllabus.grading_policy
                      if (gradingPolicy && gradingPolicy.metadata && gradingPolicy.metadata.revision_no) {
                        revisionNo = gradingPolicy.metadata.revision_no
                      }
                    } catch (e) {
                      // If parsing fails, use default
                    }
                    
                    return (
                      <tr 
                        key={syllabus.syllabus_id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => openViewModal(syllabus)}
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{syllabus.title}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${reviewStatusColor}`}>
                              {reviewStatusText}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${approvalStatusColor}`}>
                              {approvalStatusText}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {revisionNo}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(syllabus.created_at)}
                        </td>
                      </tr>
                    )
                  })}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revision Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Submission</th>
                  </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredApprovedSyllabi.map((syllabus) => {
                      // Get review and approval statuses
                      const reviewStatus = syllabus.review_status || 'pending'
                      const approvalStatus = syllabus.approval_status || 'pending'
                      
                      // Format review status text
                      const reviewStatusText = reviewStatus === 'approved' ? 'Approved (Review)' :
                                             reviewStatus === 'rejected' ? 'Rejected (Review)' :
                                             reviewStatus === 'needs_revision' ? 'Needs Revision' :
                                             'Pending Review'
                      
                      // Format approval status text
                      const approvalStatusText = approvalStatus === 'approved' ? 'Approved' :
                                                approvalStatus === 'rejected' ? 'Rejected' :
                                                'Pending Approval'
                      
                      // Determine color for each status independently
                      const reviewStatusColor = reviewStatus === 'approved' ? 'bg-green-100 text-green-800' :
                                               reviewStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                                               reviewStatus === 'needs_revision' ? 'bg-orange-100 text-orange-800' :
                                               'bg-yellow-100 text-yellow-800' // pending
                      
                      const approvalStatusColor = approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                                                 approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                                                 'bg-yellow-100 text-yellow-800' // pending
                      
                      // Extract revision number from grading_policy.metadata
                      let revisionNo = '0'
                      try {
                        const gradingPolicy = typeof syllabus.grading_policy === 'string' 
                          ? JSON.parse(syllabus.grading_policy) 
                          : syllabus.grading_policy
                        if (gradingPolicy && gradingPolicy.metadata && gradingPolicy.metadata.revision_no) {
                          revisionNo = gradingPolicy.metadata.revision_no
                        }
                      } catch (e) {
                        // If parsing fails, use default
                      }
                      
                      return (
                        <tr 
                          key={syllabus.syllabus_id} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => openViewModal(syllabus)}
                        >
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{syllabus.title}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${reviewStatusColor}`}>
                                {reviewStatusText}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${approvalStatusColor}`}>
                                {approvalStatusText}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {revisionNo}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {formatDate(syllabus.created_at)}
                          </td>
                        </tr>
                      )
                    })}
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
        ) : null}

        {/* View Syllabus Modal */}
        {showViewModal && selectedSyllabus && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedSyllabus.title}</h2>
                    {selectedSyllabus.course_code && (
                      <p className="text-sm text-gray-600 mt-1">Course Code: {selectedSyllabus.course_code}</p>
                    )}
                  </div>
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
                  {/* Course Information Section */}
                  {(() => {
                    // Extract metadata from grading_policy
                    let metadata = {}
                    try {
                      const gradingPolicy = typeof selectedSyllabus.grading_policy === 'string'
                        ? JSON.parse(selectedSyllabus.grading_policy)
                        : selectedSyllabus.grading_policy
                      metadata = gradingPolicy?.metadata || {}
                    } catch (e) {
                        metadata = {}
                      }
                      
                      // Collect all course information fields
                      const courseInfoFields = []
                      if (metadata.course_category) courseInfoFields.push({ label: 'Course Category', value: metadata.course_category })
                      if (metadata.semester_year) courseInfoFields.push({ label: 'Semester/Year', value: metadata.semester_year })
                      if (metadata.credit_hours) courseInfoFields.push({ label: 'Credit Hours', value: metadata.credit_hours })
                      if (metadata.id_number) courseInfoFields.push({ label: 'ID Number', value: metadata.id_number })
                      if (metadata.reference_cmo) courseInfoFields.push({ label: 'Reference CMO', value: metadata.reference_cmo })
                      if (metadata.date_prepared) courseInfoFields.push({ label: 'Date Prepared', value: metadata.date_prepared })
                      if (metadata.revision_no) courseInfoFields.push({ label: 'Revision Number', value: metadata.revision_no })
                      if (metadata.revision_date) courseInfoFields.push({ label: 'Revision Date', value: metadata.revision_date })
                      
                      const hasInstructor = metadata.course_instructor && (metadata.course_instructor.name || metadata.course_instructor.qualification || metadata.course_instructor.contact_email || metadata.course_instructor.contact_phone)
                      
                      if (courseInfoFields.length === 0 && !hasInstructor) return null
                      
                      return (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                          <h3 className="text-sm font-bold text-indigo-900 mb-3 pb-2 border-b border-indigo-300">Course Information</h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border border-gray-300">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-900">Field</th>
                                  <th className="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-900">Value</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white">
                                {courseInfoFields.map((field, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 border border-gray-300 text-gray-700 font-medium">{field.label}</td>
                                    <td className="px-3 py-2 border border-gray-300 text-gray-900">{field.value}</td>
                                  </tr>
                                ))}
                                {hasInstructor && (
                                  <>
                                    {metadata.course_instructor.name && (
                                      <tr className="hover:bg-gray-50">
                                        <td className="px-3 py-2 border border-gray-300 text-gray-700 font-medium">Instructor Name</td>
                                        <td className="px-3 py-2 border border-gray-300 text-gray-900">{metadata.course_instructor.name}</td>
                                      </tr>
                                    )}
                                    {metadata.course_instructor.qualification && (
                                      <tr className="hover:bg-gray-50">
                                        <td className="px-3 py-2 border border-gray-300 text-gray-700 font-medium">Qualification</td>
                                        <td className="px-3 py-2 border border-gray-300 text-gray-900">{metadata.course_instructor.qualification}</td>
                                      </tr>
                                    )}
                                    {metadata.course_instructor.contact_email && (
                                      <tr className="hover:bg-gray-50">
                                        <td className="px-3 py-2 border border-gray-300 text-gray-700 font-medium">Contact Email</td>
                                        <td className="px-3 py-2 border border-gray-300 text-gray-900">{metadata.course_instructor.contact_email}</td>
                                      </tr>
                                    )}
                                    {metadata.course_instructor.contact_phone && (
                                      <tr className="hover:bg-gray-50">
                                        <td className="px-3 py-2 border border-gray-300 text-gray-700 font-medium">Contact Phone</td>
                                        <td className="px-3 py-2 border border-gray-300 text-gray-900">{metadata.course_instructor.contact_phone}</td>
                                      </tr>
                                    )}
                                  </>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    })()}

                  {/* Course Details Section */}
                  {(() => {
                    const courseDetails = []
                    if (selectedSyllabus.version) {
                      courseDetails.push({ label: 'Version', value: `v${selectedSyllabus.version || '1.0'}` })
                    }
                    if (selectedSyllabus.description) {
                      courseDetails.push({ label: 'Description', value: selectedSyllabus.description })
                    }
                    if (selectedSyllabus.course_objectives) {
                      courseDetails.push({ label: 'Course Objectives', value: selectedSyllabus.course_objectives })
                    }
                    if (selectedSyllabus.course_outline) {
                      courseDetails.push({ label: 'Course Outline', value: selectedSyllabus.course_outline })
                    }
                    if (selectedSyllabus.prerequisites) {
                      courseDetails.push({ label: 'Prerequisites', value: selectedSyllabus.prerequisites })
                    }
                    if (selectedSyllabus.learning_resources && Array.isArray(selectedSyllabus.learning_resources) && selectedSyllabus.learning_resources.length > 0) {
                      courseDetails.push({ label: 'Learning Resources', value: selectedSyllabus.learning_resources.join('\n') })
                    } else if (selectedSyllabus.learning_resources) {
                      courseDetails.push({ label: 'Learning Resources', value: formatLearningResources(selectedSyllabus.learning_resources) })
                    }
                    
                    if (courseDetails.length === 0) return null
                    
                    return (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="text-sm font-bold text-blue-900 mb-3 pb-2 border-b border-blue-300">Course Details</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border border-gray-300">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-900">Field</th>
                                <th className="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-900">Content</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {courseDetails.map((detail, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 border border-gray-300 text-gray-700 font-medium align-top w-1/4">{detail.label}</td>
                                  <td className="px-3 py-2 border border-gray-300 text-gray-900 whitespace-pre-wrap">{detail.value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Contact Hours */}
                  {(() => {
                    let contactHours = []
                    try {
                      const framework = typeof selectedSyllabus.assessment_framework === 'string'
                        ? JSON.parse(selectedSyllabus.assessment_framework)
                        : selectedSyllabus.assessment_framework
                      contactHours = framework?.contact_hours || []
                    } catch (e) {
                      contactHours = []
                    }
                    
                    if (contactHours.length === 0) return null
                    
                    return (
                      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                        <h3 className="text-sm font-bold text-teal-900 mb-3 pb-2 border-b border-teal-300">Contact Hours</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border border-gray-300">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-900">Contact Hour Type</th>
                                <th className="px-3 py-2 border border-gray-300 text-center font-semibold text-gray-900">Hours</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {contactHours.map((ch, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 border border-gray-300 text-gray-900">{ch.name || 'Contact Hour'}</td>
                                  <td className="px-3 py-2 border border-gray-300 text-center text-gray-700">
                                    <span title="Number of hours for this contact hour type" className="cursor-help">
                                      {ch.hours || 0} hours
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Teaching Strategies */}
                  {(() => {
                    let teachingStrategies = null
                    try {
                      const framework = typeof selectedSyllabus.assessment_framework === 'string'
                        ? JSON.parse(selectedSyllabus.assessment_framework)
                        : selectedSyllabus.assessment_framework
                      teachingStrategies = framework?.teaching_strategies
                    } catch (e) {
                      teachingStrategies = null
                    }
                    
                    if (!teachingStrategies || (!teachingStrategies.general_description && (!teachingStrategies.assessment_components || teachingStrategies.assessment_components.length === 0))) {
                      return null
                    }
                    
                    return (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h3 className="text-sm font-bold text-green-900 mb-3 pb-2 border-b border-green-300">Teaching & Learning Strategies</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border border-gray-300">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-900">Component</th>
                                <th className="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-900">Description</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {teachingStrategies.general_description && (
                                <tr className="hover:bg-gray-50">
                                  <td className="px-3 py-2 border border-gray-300 text-gray-700 font-medium">General Description</td>
                                  <td className="px-3 py-2 border border-gray-300 text-gray-900 whitespace-pre-wrap">{teachingStrategies.general_description}</td>
                                </tr>
                              )}
                              {teachingStrategies.assessment_components && teachingStrategies.assessment_components.length > 0 && (
                                teachingStrategies.assessment_components.map((comp, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 border border-gray-300 text-gray-700 font-medium">Assessment Component {index + 1}</td>
                                    <td className="px-3 py-2 border border-gray-300 text-gray-900">{comp}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })()}

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
                    
                    if (components.length === 0) return null
                    
                    return (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="text-sm font-bold text-blue-900 mb-3 pb-2 border-b border-blue-300">Assessment Framework Components</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border border-gray-300">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-900">Component Type</th>
                                <th className="px-3 py-2 border border-gray-300 text-center font-semibold text-gray-900">Weight (%)</th>
                                <th className="px-3 py-2 border border-gray-300 text-center font-semibold text-gray-900">Count</th>
                                <th className="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-900">Description</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {components.map((comp, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 border border-gray-300 text-gray-900 font-medium">{comp.type || '—'}</td>
                                  <td className="px-3 py-2 border border-gray-300 text-center text-gray-700">
                                    <span title="Weight percentage of this assessment component" className="cursor-help">
                                      {comp.weight || 0}%
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 border border-gray-300 text-center text-gray-700">
                                    {comp.count ? (
                                      <span title="Number of items in this component" className="cursor-help">
                                        {comp.count} {comp.count === 1 ? 'item' : 'items'}
                                      </span>
                                    ) : '—'}
                                  </td>
                                  <td className="px-3 py-2 border border-gray-300 text-gray-700">{comp.description || '—'}</td>
                                </tr>
                              ))}
                              <tr className="bg-gray-100 font-semibold">
                                <td className="px-3 py-2 border border-gray-300 text-gray-900">Total</td>
                                <td className="px-3 py-2 border border-gray-300 text-center">
                                  <span 
                                    className={`cursor-help ${totalWeight === 100 ? 'text-green-600' : 'text-red-600'}`}
                                    title="Total weight percentage: Should equal 100%"
                                  >
                                    {totalWeight}%
                                  </span>
                                </td>
                                <td className="px-3 py-2 border border-gray-300"></td>
                                <td className="px-3 py-2 border border-gray-300"></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
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
                    
                    const assessmentCriteria = policy?.assessment_criteria || []
                    const subAssessments = policy?.sub_assessments || {}
                    
                    return (
                      <div className="space-y-4">
                        {/* Assessment Criteria Section */}
                        {assessmentCriteria.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="text-sm font-bold text-blue-900 mb-3 pb-2 border-b border-blue-300">Assessment Criteria</h3>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border border-gray-300">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-900">Assessment Name</th>
                                    <th className="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-900">Abbreviation</th>
                                    <th className="px-3 py-2 border border-gray-300 text-center font-semibold text-gray-900">I/R/D</th>
                                    <th className="px-3 py-2 border border-gray-300 text-center font-semibold text-gray-900">Weight (%)</th>
                                    <th className="px-3 py-2 border border-gray-300 text-center font-semibold text-gray-900">Cognitive</th>
                                    <th className="px-3 py-2 border border-gray-300 text-center font-semibold text-gray-900">Psychomotor</th>
                                    <th className="px-3 py-2 border border-gray-300 text-center font-semibold text-gray-900">Affective</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white">
                                  {assessmentCriteria.map((criterion, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                      <td className="px-3 py-2 border border-gray-300 text-gray-900">{criterion.name || '—'}</td>
                                      <td className="px-3 py-2 border border-gray-300 text-gray-700">{criterion.abbreviation || '—'}</td>
                                      <td className="px-3 py-2 border border-gray-300 text-center text-gray-700">{criterion.ird || 'R'}</td>
                                      <td className="px-3 py-2 border border-gray-300 text-center text-gray-700">
                                        <span title="Weight percentage of this assessment criterion" className="cursor-help">
                                          {criterion.weight || 0}%
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 border border-gray-300 text-center text-gray-700">
                                        <span title="Cognitive domain percentage" className="cursor-help">
                                          {criterion.cognitive || 0}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 border border-gray-300 text-center text-gray-700">
                                        <span title="Psychomotor domain percentage" className="cursor-help">
                                          {criterion.psychomotor || 0}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 border border-gray-300 text-center text-gray-700">
                                        <span title="Affective domain percentage" className="cursor-help">
                                          {criterion.affective || 0}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <h3 className="text-sm font-bold text-amber-900 mb-3 pb-2 border-b border-amber-300">Grading Policy</h3>
                          <div className="space-y-4">
                            {policy?.scale && Array.isArray(policy.scale) && policy.scale.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-800 mb-2">Grading Scale</h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs border border-gray-300">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-900">Grade</th>
                                        <th className="px-3 py-2 border border-gray-300 text-center font-semibold text-gray-900">Range</th>
                                        <th className="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-900">Description</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                      {policy.scale.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                          <td className="px-3 py-2 border border-gray-300 text-gray-900 font-medium">{item.grade || 'N/A'}</td>
                                          <td className="px-3 py-2 border border-gray-300 text-center text-gray-700">{item.range || 'N/A'}</td>
                                          <td className="px-3 py-2 border border-gray-300 text-gray-700">{item.description || '—'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                            {policy?.components && policy.components.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-800 mb-2">Grading Components</h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs border border-gray-300">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-900">Component</th>
                                        <th className="px-3 py-2 border border-gray-300 text-center font-semibold text-gray-900">Weight (%)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                      {policy.components.map((comp, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                          <td className="px-3 py-2 border border-gray-300 text-gray-900">{comp.type || comp.name || 'Component'}</td>
                                          <td className="px-3 py-2 border border-gray-300 text-center text-gray-700">
                                            <span title="Weight percentage of this grading component" className="cursor-help">
                                              {comp.weight || comp.percentage || 0}%
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                            {!policy?.scale && !policy?.components && assessmentCriteria.length === 0 && (
                              <div className="bg-white p-3 rounded border border-gray-300">
                                <p className="text-sm text-gray-500 italic">No grading policy details available</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                {/* Assessment and ILO Mapping Tables */}
                {selectedSyllabusILOs.length > 0 && (() => {
                  // Extract assessment data from grading_policy
                  let policy = null
                  try {
                    if (selectedSyllabus.grading_policy) {
                      if (typeof selectedSyllabus.grading_policy === 'string') {
                        policy = JSON.parse(selectedSyllabus.grading_policy)
                      } else {
                        policy = selectedSyllabus.grading_policy
                      }
                    }
                  } catch (e) {
                    policy = null
                  }
                  
                  const assessmentCriteria = policy?.assessment_criteria || []
                  const subAssessments = policy?.sub_assessments || {}
                  
                  // Get all assessment tasks from sub-assessments
                  const allAssessmentTasks = []
                  assessmentCriteria.forEach((criterion, idx) => {
                    const subs = subAssessments[idx] || []
                    subs.forEach(sub => {
                      if (sub.abbreviation || sub.name) {
                        allAssessmentTasks.push({
                          code: sub.abbreviation || sub.name.substring(0, 2).toUpperCase(),
                          name: sub.name,
                          weight: parseFloat(sub.weight_percentage) || 0,
                          score: parseFloat(sub.score) || 0
                        })
                      }
                    })
                  })
                  
                  // Calculate score for tasks
                  const calculateScoreForTasks = (taskCodes) => {
                    if (!taskCodes || taskCodes.length === 0) return { totalScore: 0, totalWeight: 0, display: '—' }
                    
                    let totalScore = 0
                    let totalWeight = 0
                    const taskDetails = []
                    
                    taskCodes.forEach(code => {
                      const sub = allAssessmentTasks.find(s => s.code === code)
                      if (sub) {
                        const totalWeightForScore = allAssessmentTasks.reduce((sum, s) => sum + s.weight, 0)
                        const weightedScore = totalWeightForScore > 0 ? (sub.score * sub.weight) / totalWeightForScore : 0
                        totalScore += weightedScore
                        totalWeight += sub.weight
                        taskDetails.push(`${code}(${weightedScore.toFixed(1)})`)
                      }
                    })
                    
                    return {
                      totalScore: Math.round(totalScore * 10) / 10,
                      totalWeight,
                      display: taskCodes.join(', ')
                    }
                  }
                  
                  // Get assessment tasks for mapping
                  const getAssessmentTasksForMapping = (ilo, mappingType) => {
                    const tasks = new Set()
                    if (ilo[mappingType]) {
                      ilo[mappingType].forEach(mapping => {
                        if (mapping.assessment_tasks) {
                          mapping.assessment_tasks.forEach(task => tasks.add(task))
                        }
                      })
                    }
                    return Array.from(tasks)
                  }
                  
                  return (
                    <div className="mt-4 space-y-4">
                      {/* Assessment Tables Section */}
                      {allAssessmentTasks.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h3 className="text-sm font-bold text-blue-900 mb-3 pb-2 border-b border-blue-300">Assessment Tables</h3>
                          
                          <div className="space-y-4">
                            {/* ILO Assessment Mapping */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3">ILO Assessment Mapping</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs border border-gray-300">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-900">ILO Code</th>
                                      <th className="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-900">ILO Description</th>
                                      <th className="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-900">Assessment Code</th>
                                      <th className="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-900">Assessment Name</th>
                                      <th className="px-3 py-2 border border-gray-300 text-center font-semibold text-gray-900">Weight (%)</th>
                                      <th className="px-3 py-2 border border-gray-300 text-center font-semibold text-gray-900">Score</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white">
                                    {selectedSyllabusILOs.map((ilo, iloIndex) => {
                                      // Get assessment tasks for this ILO from all mappings
                                      const iloTasks = new Set()
                                      ilo.so_mappings?.forEach(m => {
                                        m.assessment_tasks?.forEach(task => iloTasks.add(task))
                                      })
                                      ilo.iga_mappings?.forEach(m => {
                                        m.assessment_tasks?.forEach(task => iloTasks.add(task))
                                      })
                                      ilo.cdio_mappings?.forEach(m => {
                                        m.assessment_tasks?.forEach(task => iloTasks.add(task))
                                      })
                                      ilo.sdg_mappings?.forEach(m => {
                                        m.assessment_tasks?.forEach(task => iloTasks.add(task))
                                      })
                                      
                                      const tasksArray = Array.from(iloTasks)
                                      
                                      if (tasksArray.length === 0) {
                                        return (
                                          <tr key={iloIndex} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 border border-gray-300 font-medium text-gray-900">{ilo.code}</td>
                                            <td className="px-3 py-2 border border-gray-300 text-gray-700">{ilo.description}</td>
                                            <td colSpan="4" className="px-3 py-2 border border-gray-300 text-center text-gray-400 italic">
                                              No sub-assessments mapped yet
                                            </td>
                                          </tr>
                                        )
                                      }
                                      
                                      // Group tasks by base code
                                      const groupedTasks = {}
                                      tasksArray.forEach(taskCode => {
                                        const baseCode = taskCode.replace(/\d+$/, '')
                                        if (!groupedTasks[baseCode]) {
                                          groupedTasks[baseCode] = {
                                            baseCode: baseCode,
                                            codes: [],
                                            totalWeight: 0,
                                            totalScore: 0,
                                            names: new Set()
                                          }
                                        }
                                        groupedTasks[baseCode].codes.push(taskCode)
                                        
                                        const task = allAssessmentTasks.find(t => t.code === taskCode)
                                        if (task) {
                                          groupedTasks[baseCode].totalWeight += parseFloat(task.weight) || 0
                                          groupedTasks[baseCode].totalScore += parseFloat(task.score) || 0
                                          if (task.name) {
                                            const baseName = task.name.replace(/\s+\d+$/, '')
                                            groupedTasks[baseCode].names.add(baseName)
                                          }
                                        }
                                      })
                                      
                                      const groupedArray = Object.values(groupedTasks)
                                      
                                      return groupedArray.map((group, groupIndex) => {
                                        const groupName = Array.from(group.names)[0] || group.baseCode
                                        
                                        return (
                                          <tr key={`${iloIndex}-${groupIndex}`} className="hover:bg-gray-50">
                                            {groupIndex === 0 && (
                                              <>
                                                <td rowSpan={groupedArray.length} className="px-3 py-2 border border-gray-300 font-medium text-gray-900 align-top">
                                                  {ilo.code}
                                                </td>
                                                <td rowSpan={groupedArray.length} className="px-3 py-2 border border-gray-300 text-gray-700 align-top">
                                                  {ilo.description}
                                                </td>
                                              </>
                                            )}
                                            <td className="px-3 py-2 border border-gray-300 font-medium text-gray-900">{group.baseCode}</td>
                                            <td className="px-3 py-2 border border-gray-300 text-gray-700">{groupName}</td>
                                            <td className="px-3 py-2 border border-gray-300 text-center text-gray-700">
                                              {group.totalWeight > 0 ? (
                                                <span title="Total weight percentage of this assessment group across all mapped ILOs" className="cursor-help">
                                                  {group.totalWeight.toFixed(2)}%
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td className="px-3 py-2 border border-gray-300 text-center text-gray-700">
                                              {group.totalScore > 0 ? (
                                                <span title="Total score points for this assessment group" className="cursor-help">
                                                  {group.totalScore.toFixed(1)}
                                                </span>
                                              ) : '—'}
                                            </td>
                                          </tr>
                                        )
                                      })
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            
                            {/* Assessment Method and Distribution Map */}
                            {assessmentCriteria.length > 0 && (() => {
                              // Group sub-assessments by their parent criteria
                              const criteriaWithSubAssessments = []
                              assessmentCriteria.forEach((criterion, idx) => {
                                const subs = subAssessments[idx] || []
                                if (subs.length > 0) {
                                  criteriaWithSubAssessments.push({
                                    criterion: criterion,
                                    subAssessments: subs
                                  })
                                }
                              })
                              
                              if (criteriaWithSubAssessments.length === 0) return null
                              
                              // Calculate ILO mappings for each sub-assessment
                              const getILOMappings = (taskCode, subScore, subWeight) => {
                                const mappings = {}
                                const subAssessment = allAssessmentTasks.find(s => s.code === taskCode)
                                if (!subAssessment) return mappings
                                
                                selectedSyllabusILOs.forEach((ilo, iloIndex) => {
                                  let found = false
                                  ;['so_mappings', 'iga_mappings', 'cdio_mappings', 'sdg_mappings'].forEach(mappingType => {
                                    if (ilo[mappingType]) {
                                      ilo[mappingType].forEach(mapping => {
                                        if (mapping.assessment_tasks && mapping.assessment_tasks.includes(taskCode)) {
                                          found = true
                                        }
                                      })
                                    }
                                  })
                                  
                                  if (found) {
                                    const totalWeight = allAssessmentTasks.reduce((sum, s) => sum + s.weight, 0)
                                    const weightContribution = totalWeight > 0 ? (subAssessment.weight / totalWeight * 100) : 0
                                    const scoreContribution = subScore > 0 && totalWeight > 0 ? (subScore * subAssessment.weight) / totalWeight : 0
                                    
                                    mappings[iloIndex + 1] = {
                                      weightPct: Math.round(weightContribution * 10) / 10,
                                      score: Math.round(scoreContribution * 10) / 10
                                    }
                                  }
                                })
                                return mappings
                              }
                              
                              return (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Assessment Method and Distribution Map</h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs border border-gray-300">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-900">Code</th>
                                          <th className="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-900">Assessment Tasks</th>
                                          <th className="px-2 py-1.5 border border-gray-300 text-center font-semibold text-gray-900">I/R/D</th>
                                          <th className="px-2 py-1.5 border border-gray-300 text-center font-semibold text-gray-900">(%)</th>
                                          {selectedSyllabusILOs.map((ilo, idx) => (
                                            <th key={idx} className="px-2 py-1.5 border border-gray-300 text-center font-semibold text-gray-900">{idx + 1}</th>
                                          ))}
                                          <th className="px-2 py-1.5 border border-gray-300 text-center font-semibold text-gray-900">Domains</th>
                                        </tr>
                                        <tr className="bg-gray-100">
                                          <th colSpan="4" className="px-2 py-1 border border-gray-300"></th>
                                          <th colSpan={selectedSyllabusILOs.length} className="px-2 py-1 border border-gray-300 text-center font-medium text-gray-700">Intended Learning Outcomes</th>
                                          <th className="px-2 py-1 border border-gray-300"></th>
                                        </tr>
                                        <tr className="bg-gray-100">
                                          <th colSpan="4" className="px-2 py-1 border border-gray-300"></th>
                                          {selectedSyllabusILOs.map((ilo, idx) => (
                                            <th key={idx} className="px-2 py-1 border border-gray-300 text-center text-xs font-medium text-gray-600">{ilo.code}</th>
                                          ))}
                                          <th className="px-2 py-1 border border-gray-300"></th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white">
                                        {criteriaWithSubAssessments.map((criterionGroup, groupIdx) => (
                                          <React.Fragment key={groupIdx}>
                                            {/* Criterion Header Row */}
                                            <tr className="bg-gray-100 font-semibold">
                                              <td className="px-4 py-1.5 border border-gray-300 font-medium text-gray-900">{criterionGroup.criterion.abbreviation || '—'}</td>
                                              <td className="px-2 py-1.5 border border-gray-300 text-gray-900">{criterionGroup.criterion.name}</td>
                                              <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-900">{criterionGroup.criterion.ird || 'R'}</td>
                                              <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-900">
                                                <span title="Total weight percentage for this assessment criterion" className="cursor-help">
                                                  {criterionGroup.criterion.weight || 0}%
                                                </span>
                                              </td>
                                              {selectedSyllabusILOs.map((ilo, iloIdx) => {
                                                const totalStats = criterionGroup.subAssessments.reduce((acc, sub) => {
                                                  const iloMappings = getILOMappings(sub.abbreviation || sub.name.substring(0, 2).toUpperCase(), sub.score, sub.weight)
                                                  const mapping = iloMappings[iloIdx + 1]
                                                  if (mapping) {
                                                    acc.weightPct += mapping.weightPct
                                                    acc.score += mapping.score
                                                  }
                                                  return acc
                                                }, { weightPct: 0, score: 0 })
                                                
                                                return (
                                                  <td key={iloIdx} className="px-2 py-1.5 border border-gray-300 text-center text-gray-900">
                                                    {totalStats.weightPct > 0 ? (
                                                      <span title="Total weight percentage contribution to this ILO" className="cursor-help">
                                                        {totalStats.weightPct.toFixed(1)}%
                                                      </span>
                                                    ) : '—'}
                                                  </td>
                                                )
                                              })}
                                              <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-900">
                                                <div className="text-xs">
                                                  C: {criterionGroup.criterion.cognitive || 0} | P: {criterionGroup.criterion.psychomotor || 0} | A: {criterionGroup.criterion.affective || 0}
                                                </div>
                                              </td>
                                            </tr>
                                            
                                            {/* Sub-assessment rows */}
                                            {criterionGroup.subAssessments.map((sub, subIdx) => {
                                              const subCode = sub.abbreviation || sub.name.substring(0, 2).toUpperCase()
                                              const subWeight = parseFloat(sub.weight_percentage) || 0
                                              const subScore = parseFloat(sub.score) || 0
                                              const iloMappings = getILOMappings(subCode, subScore, subWeight)
                                              
                                              return (
                                                <tr key={subIdx} className="hover:bg-gray-50">
                                                  <td className="px-4 py-1.5 border border-gray-300 text-gray-700">{subCode}</td>
                                                  <td className="px-2 py-1.5 border border-gray-300 text-gray-700">{sub.name}</td>
                                                  <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-700">—</td>
                                                  <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-700">
                                                    <span title="Weight percentage of this sub-assessment" className="cursor-help">
                                                      {subWeight.toFixed(1)}%
                                                    </span>
                                                  </td>
                                                  {selectedSyllabusILOs.map((ilo, iloIdx) => {
                                                    const mapping = iloMappings[iloIdx + 1]
                                                    return (
                                                      <td key={iloIdx} className="px-2 py-1.5 border border-gray-300 text-center text-gray-700">
                                                        {mapping ? (
                                                          <div>
                                                            <div className="text-xs" title="Weight percentage contribution to this ILO" className="cursor-help">
                                                              {mapping.weightPct.toFixed(1)}%
                                                            </div>
                                                            {mapping.score > 0 && (
                                                              <div className="text-xs text-red-600 font-semibold" title="Score contribution to this ILO" className="cursor-help">
                                                                {mapping.score.toFixed(1)}
                                                              </div>
                                                            )}
                                                          </div>
                                                        ) : '—'}
                                                      </td>
                                                    )
                                                  })}
                                                  <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-700">—</td>
                                                </tr>
                                              )
                                            })}
                                          </React.Fragment>
                                        ))}
                                        
                                        {/* Total row */}
                                        <tr className="bg-gray-100 font-semibold">
                                          <td colSpan="4" className="px-4 py-1.5 border border-gray-300 text-gray-900">Total</td>
                                          {selectedSyllabusILOs.map((ilo, iloIdx) => {
                                            const totalStats = criteriaWithSubAssessments.reduce((acc, criterionGroup) => {
                                              const groupTotal = criterionGroup.subAssessments.reduce((groupAcc, sub) => {
                                                const iloMappings = getILOMappings(sub.abbreviation || sub.name.substring(0, 2).toUpperCase(), sub.score, sub.weight)
                                                const mapping = iloMappings[iloIdx + 1]
                                                if (mapping) {
                                                  groupAcc.weightPct += mapping.weightPct
                                                  groupAcc.score += mapping.score
                                                }
                                                return groupAcc
                                              }, { weightPct: 0, score: 0 })
                                              acc.weightPct += groupTotal.weightPct
                                              acc.score += groupTotal.score
                                              return acc
                                            }, { weightPct: 0, score: 0 })
                                            
                                            return (
                                              <td key={iloIdx} className="px-2 py-1.5 border border-gray-300 text-center">
                                                <div>
                                                  <span className="cursor-help" title="Total weight percentage for this ILO">
                                                    {totalStats.weightPct.toFixed(1)}%
                                                  </span>
                                                  {totalStats.score > 0 && (
                                                    <div className="text-xs text-red-600 font-semibold cursor-help" title="Total score for this ILO">
                                                      {totalStats.score.toFixed(1)}
                                                    </div>
                                                  )}
                                                </div>
                                              </td>
                                            )
                                          })}
                                          <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-900">
                                            <div className="text-xs">
                                              C: {assessmentCriteria.reduce((sum, c) => sum + (parseFloat(c.cognitive) || 0), 0)} | 
                                              P: {assessmentCriteria.reduce((sum, c) => sum + (parseFloat(c.psychomotor) || 0), 0)} | 
                                              A: {assessmentCriteria.reduce((sum, c) => sum + (parseFloat(c.affective) || 0), 0)}
                                            </div>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        </div>
                      )}

                      {/* ILO Mapping Tables Section */}
                      {(soReferences.length > 0 || igaReferences.length > 0 || cdioReferences.length > 0 || sdgReferences.length > 0) && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h3 className="text-sm font-bold text-green-900 mb-3 pb-2 border-b border-green-300">ILO Mapping Tables</h3>
                          
                          <div className="mt-4 space-y-4">
                            {/* ILO-SO Mapping */}
                            {soReferences.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">ILO-SO Mapping</h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs border border-gray-300">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-900">ILOs</th>
                                        {soReferences.map((so, idx) => (
                                          <th key={idx} className="px-2 py-1.5 border border-gray-300 text-center font-semibold text-gray-900">{so.so_code}</th>
                                        ))}
                                      </tr>
                                      <tr className="bg-gray-100">
                                        <th className="px-2 py-1 border border-gray-300 text-left font-medium text-gray-700">STUDENT OUTCOMES (SO): Mapping of Assessment Tasks (AT)</th>
                                        {soReferences.map((so, idx) => (
                                          <th key={idx} className="px-2 py-1 border border-gray-300"></th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                      {selectedSyllabusILOs.map((ilo, iloIdx) => {
                                        const soTasks = getAssessmentTasksForMapping(ilo, 'so_mappings')
                                        const soTaskScores = calculateScoreForTasks(soTasks)
                                        
                                        return (
                                          <tr key={iloIdx} className="hover:bg-gray-50">
                                            <td className="px-2 py-1.5 border border-gray-300">
                                              <div className="font-medium text-gray-900">{ilo.code}</div>
                                              <div className="text-xs text-gray-500 truncate max-w-xs">{ilo.description}</div>
                                            </td>
                                            {soReferences.map((so, soIdx) => {
                                              const mapping = ilo.so_mappings?.find(m => m.so_id === so.so_id)
                                              const tasks = mapping?.assessment_tasks || []
                                              const taskScores = calculateScoreForTasks(tasks)
                                              return (
                                                <td key={soIdx} className="px-2 py-1.5 border border-gray-300 text-center text-gray-700">
                                                  {tasks.length > 0 ? (
                                                    <div>
                                                      <div className="text-xs" title="Assessment task codes mapped to this ILO and SO">{taskScores.display}</div>
                                                      {taskScores.totalScore > 0 && (
                                                        <div 
                                                          className="text-xs font-semibold text-red-600 mt-0.5 cursor-help" 
                                                          title="Total score points: Sum of scores from all assessment tasks mapped to this ILO and SO"
                                                        >
                                                          {taskScores.totalScore.toFixed(1)}
                                                        </div>
                                                      )}
                                                    </div>
                                                  ) : '—'}
                                                </td>
                                              )
                                            })}
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* ILO-IGA Mapping */}
                            {igaReferences.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">ILO-IGA Mapping</h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs border border-gray-300">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-900">ILOs</th>
                                        {igaReferences.map((iga, idx) => (
                                          <th key={idx} className="px-2 py-1.5 border border-gray-300 text-center font-semibold text-gray-900">{iga.iga_code}</th>
                                        ))}
                                      </tr>
                                      <tr className="bg-gray-100">
                                        <th className="px-2 py-1 border border-gray-300 text-left font-medium text-gray-700">INSTITUTIONAL GRADUATE ATTRIBUTES (IGA): Mapping of Assessment Tasks (AT)</th>
                                        {igaReferences.map((iga, idx) => (
                                          <th key={idx} className="px-2 py-1 border border-gray-300"></th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                      {selectedSyllabusILOs.map((ilo, iloIdx) => (
                                        <tr key={iloIdx} className="hover:bg-gray-50">
                                          <td className="px-2 py-1.5 border border-gray-300">
                                            <div className="font-medium text-gray-900">{ilo.code}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-xs">{ilo.description}</div>
                                          </td>
                                          {igaReferences.map((iga, igaIdx) => {
                                            const mapping = ilo.iga_mappings?.find(m => m.iga_id === iga.iga_id)
                                            const tasks = mapping?.assessment_tasks || []
                                            const taskScores = calculateScoreForTasks(tasks)
                                            return (
                                              <td key={igaIdx} className="px-2 py-1.5 border border-gray-300 text-center text-gray-700">
                                                {tasks.length > 0 ? (
                                                  <div>
                                                    <div className="text-xs" title="Assessment task codes mapped to this ILO and IGA">{taskScores.display}</div>
                                                    {taskScores.totalScore > 0 && (
                                                      <div 
                                                      className="text-xs font-semibold text-red-600 mt-0.5 cursor-help" 
                                                      title="Total score points: Sum of scores from all assessment tasks mapped to this ILO and IGA"
                                                    >
                                                      {taskScores.totalScore.toFixed(1)}
                                                    </div>
                                                    )}
                                                  </div>
                                                ) : '—'}
                                              </td>
                                            )
                                          })}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* ILO-CDIO and ILO-SDG Mapping */}
                            {(cdioReferences.length > 0 || sdgReferences.length > 0) && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">ILO-CDIO and ILO-SDG Mapping</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {cdioReferences.length > 0 && (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs border border-gray-300">
                                        <thead className="bg-gray-50">
                                          <tr>
                                            <th className="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-900">ILOs</th>
                                            {cdioReferences.map((cdio, idx) => (
                                              <th key={idx} className="px-2 py-1.5 border border-gray-300 text-center font-semibold text-gray-900">{cdio.cdio_code}</th>
                                            ))}
                                          </tr>
                                          <tr className="bg-gray-100">
                                            <th className="px-2 py-1 border border-gray-300 text-left font-medium text-gray-700">CDIO SKILLS</th>
                                            {cdioReferences.map((cdio, idx) => (
                                              <th key={idx} className="px-2 py-1 border border-gray-300"></th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                          {selectedSyllabusILOs.map((ilo, iloIdx) => (
                                            <tr key={iloIdx} className="hover:bg-gray-50">
                                              <td className="px-2 py-1.5 border border-gray-300">
                                                <div className="font-medium text-gray-900">{ilo.code}</div>
                                              </td>
                                              {cdioReferences.map((cdio, cdioIdx) => {
                                                const mapping = ilo.cdio_mappings?.find(m => m.cdio_id === cdio.cdio_id)
                                                const tasks = mapping?.assessment_tasks || []
                                                const taskScores = calculateScoreForTasks(tasks)
                                                return (
                                                  <td key={cdioIdx} className="px-2 py-1.5 border border-gray-300 text-center text-gray-700">
                                                    {tasks.length > 0 ? (
                                                      <div>
                                                        <div className="text-xs" title="Assessment task codes mapped to this ILO and CDIO">{taskScores.display}</div>
                                                        {taskScores.totalScore > 0 && (
                                                          <div 
                                                            className="text-xs font-semibold text-red-600 mt-0.5 cursor-help" 
                                                            title="Total score points: Sum of scores from all assessment tasks mapped to this ILO and CDIO"
                                                          >
                                                            {taskScores.totalScore.toFixed(1)}
                                                          </div>
                                                        )}
                                                      </div>
                                                    ) : '—'}
                                                  </td>
                                                )
                                              })}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}

                                  {sdgReferences.length > 0 && (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs border border-gray-300">
                                        <thead className="bg-gray-50">
                                          <tr>
                                            <th className="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-900">ILOs</th>
                                            {sdgReferences.map((sdg, idx) => (
                                              <th key={idx} className="px-2 py-1.5 border border-gray-300 text-center font-semibold text-gray-900">{sdg.sdg_code}</th>
                                            ))}
                                          </tr>
                                          <tr className="bg-gray-100">
                                            <th className="px-2 py-1 border border-gray-300 text-left font-medium text-gray-700">SDG Skills</th>
                                            {sdgReferences.map((sdg, idx) => (
                                              <th key={idx} className="px-2 py-1 border border-gray-300"></th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                          {selectedSyllabusILOs.map((ilo, iloIdx) => (
                                            <tr key={iloIdx} className="hover:bg-gray-50">
                                              <td className="px-2 py-1.5 border border-gray-300">
                                                <div className="font-medium text-gray-900">{ilo.code}</div>
                                              </td>
                                              {sdgReferences.map((sdg, sdgIdx) => {
                                                const mapping = ilo.sdg_mappings?.find(m => m.sdg_id === sdg.sdg_id)
                                                const tasks = mapping?.assessment_tasks || []
                                                const taskScores = calculateScoreForTasks(tasks)
                                                return (
                                                  <td key={sdgIdx} className="px-2 py-1.5 border border-gray-300 text-center text-gray-700">
                                                    {tasks.length > 0 ? (
                                                      <div>
                                                        <div className="text-xs" title="Assessment task codes mapped to this ILO and SDG">{taskScores.display}</div>
                                                        {taskScores.totalScore > 0 && (
                                                          <div 
                                                            className="text-xs font-semibold text-red-600 mt-0.5 cursor-help" 
                                                            title="Total score points: Sum of scores from all assessment tasks mapped to this ILO and SDG"
                                                          >
                                                            {taskScores.totalScore.toFixed(1)}
                                                          </div>
                                                        )}
                                                      </div>
                                                    ) : '—'}
                                                  </td>
                                                )
                                              })}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Review Status</h3>
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedSyllabus.review_status)}`}>
                          {selectedSyllabus.review_status || 'pending'}
                        </span>
                        {selectedSyllabus.review_status === 'approved' && selectedSyllabus.reviewer_name && (
                          <p className="text-xs text-gray-600">
                            Reviewed by: <span className="font-medium">{selectedSyllabus.reviewer_name}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Approval Status</h3>
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedSyllabus.approval_status)}`}>
                          {selectedSyllabus.approval_status || 'pending'}
                        </span>
                        {selectedSyllabus.approval_status === 'approved' && selectedSyllabus.approver_name && (
                          <p className="text-xs text-gray-600">
                            Approved by: <span className="font-medium">{selectedSyllabus.approver_name}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons - Only show if syllabus is pending review */}
                  {selectedSyllabus.review_status === 'pending' && (
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

export default SyllabusReview
