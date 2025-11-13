import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/UnifiedAuthContext'
import { safeSetItem, safeGetItem, minimizeClassData } from '../../utils/cacheUtils'
import { setSelectedClass as saveSelectedClass, getSelectedClass } from '../../utils/localStorageManager'
import ILOMappingTable from '../../components/ILOMappingTable'
import SyllabusCreationWizard from '../../components/SyllabusCreationWizard'
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BookOpenIcon,
  ArrowPathIcon,
  TableCellsIcon
} from '@heroicons/react/24/solid'

const Syllabus = () => {
  const { user } = useAuth()
  const location = useLocation()
  const [syllabi, setSyllabi] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClass, setSelectedClass] = useState(null)
  const [classes, setClasses] = useState([])
  const [schoolTerms, setSchoolTerms] = useState([])
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [editingSyllabus, setEditingSyllabus] = useState(null)
  const [viewingSyllabus, setViewingSyllabus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('syllabi') // 'syllabi' or 'ilo-mapping'
  const [selectedSyllabusForILO, setSelectedSyllabusForILO] = useState(null)
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_outline: '',
    course_objectives: '',
    prerequisites: '',
    learning_resources: '',
    assessment_framework: '',
    grading_policy: '',
    version: '1.0',
    term_id: ''
  })

  // Load faculty classes
  useEffect(() => {
    const loadClasses = async () => {
      if (!user?.user_id) return
      
      const cacheKey = `classes_${user.user_id}`
      const cached = safeGetItem(cacheKey)
      let classesData = []
      
      if (cached) {
        classesData = Array.isArray(cached) ? cached : []
        setClasses(classesData)
        setLoading(false)
      }
      
      try {
        const response = await fetch(`/api/section-courses/faculty/${user.user_id}`)
        if (response.ok) {
          const data = await response.json()
          classesData = Array.isArray(data) ? data : []
          setClasses(classesData)
          safeSetItem(cacheKey, classesData, minimizeClassData)
        } else {
          if (!cached) setError('Failed to load classes')
        }
      } catch (error) {
        console.error('Error loading classes:', error)
        if (!cached) setError('Failed to load classes')
      } finally {
        setLoading(false)
      }
      
      // Restore selected class after classes are loaded
      // Priority: location.state > localStorage > nothing
      if (classesData.length > 0) {
        let classToSelect = null
        
        // First priority: location state
        if (location.state?.selectedClassId) {
          classToSelect = classesData.find(cls => cls.section_course_id === location.state.selectedClassId)
        }
        
        // Second priority: localStorage
        if (!classToSelect) {
          const savedClass = getSelectedClass()
          if (savedClass?.section_course_id) {
            classToSelect = classesData.find(cls => cls.section_course_id === savedClass.section_course_id)
          }
        }
        
        // Set the selected class if found
        if (classToSelect) {
          setSelectedClass(classToSelect)
        }
      }
    }
    
    loadClasses()
  }, [user, location.state])

  // Notify Header when selected class changes
  useEffect(() => {
    if (selectedClass) {
      saveSelectedClass(selectedClass)
      window.dispatchEvent(new CustomEvent('selectedClassChanged', {
        detail: { class: selectedClass }
      }))
    } else {
      try {
        localStorage.removeItem('selectedClass')
        window.dispatchEvent(new CustomEvent('selectedClassChanged', {
          detail: { class: null }
        }))
      } catch (error) {
        console.error('Error clearing selected class:', error)
      }
    }
  }, [selectedClass])

  // Load school terms
  useEffect(() => {
    const loadSchoolTerms = async () => {
      try {
        const response = await fetch('/api/school-terms')
        if (response.ok) {
          const data = await response.json()
          setSchoolTerms(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        console.error('Error loading school terms:', error)
      }
    }
    
    loadSchoolTerms()
  }, [])

  // Load syllabi when class is selected
  useEffect(() => {
    if (!selectedClass) {
      setSyllabi([])
      setSelectedSyllabusForILO(null) // Reset selected syllabus when class changes
      return
    }
    
    const sectionId = selectedClass.section_course_id
    const syllabiCacheKey = `syllabi_${sectionId}`
    const cached = safeGetItem(syllabiCacheKey)
    
    if (cached) {
      setSyllabi(Array.isArray(cached) ? cached : [])
    }
    
    loadSyllabi(sectionId, syllabiCacheKey, !cached)
  }, [selectedClass])
  
  // Reset selected syllabus when switching tabs and restore selected class on ILO tab
  useEffect(() => {
    if (activeTab !== 'ilo-mapping') {
      setSelectedSyllabusForILO(null)
    } else {
      // When switching to ILO tab, ensure selected class is restored from localStorage
      if (!selectedClass && classes.length > 0) {
        const savedClass = getSelectedClass()
        if (savedClass?.section_course_id) {
          const classToSelect = classes.find(cls => cls.section_course_id === savedClass.section_course_id)
          if (classToSelect) {
            setSelectedClass(classToSelect)
          }
        }
      }
    }
  }, [activeTab, classes, selectedClass])

  const loadSyllabi = async (sectionCourseId, cacheKey, showLoading = true) => {
    if (!sectionCourseId) return
    
    try {
      if (showLoading) setLoading(true)
      
      const response = await fetch(`/api/syllabi/class/${sectionCourseId}`)
      if (response.ok) {
        const data = await response.json()
        const syllabiData = Array.isArray(data) ? data : []
        setSyllabi(syllabiData)
        setError('')
        safeSetItem(cacheKey, syllabiData)
      } else {
        setError('Failed to load syllabus')
        if (showLoading) setSyllabi([])
      }
    } catch (error) {
      console.error('Error loading syllabus:', error)
      setError('Failed to load syllabus')
      if (showLoading) setSyllabi([])
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleArrayInputChange = (field, value) => {
    // Convert comma-separated string to array for learning_resources
    const arrayValue = value.split(',').map(item => item.trim()).filter(item => item !== '')
    setFormData(prev => ({
      ...prev,
      [field]: arrayValue
    }))
  }

  const handleJSONInputChange = (field, value) => {
    // Try to parse JSON, if invalid, store as string
    try {
      const parsed = JSON.parse(value)
      setFormData(prev => ({
        ...prev,
        [field]: parsed
      }))
    } catch (e) {
      // If not valid JSON, store as string (user can format later)
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const handleCreateSyllabus = async (wizardFormData) => {
    if (!selectedClass) return

    setIsSubmitting(true)
    try {
      // Get term_id from form, or fall back to selected class term_id
      const termId = wizardFormData.term_id || selectedClass.term_id
      
      if (!termId) {
        alert('Please select a school term')
        setIsSubmitting(false)
        return
      }

      // Prepare learning_resources - handle both string and array
      let learningResources = null
      if (wizardFormData.learning_resources) {
        if (typeof wizardFormData.learning_resources === 'string') {
          learningResources = wizardFormData.learning_resources.split(',').map(item => item.trim()).filter(item => item !== '')
        } else if (Array.isArray(wizardFormData.learning_resources)) {
          learningResources = wizardFormData.learning_resources
        }
      }

      // Prepare JSON fields - they should already be objects from the wizard
      const assessmentFramework = wizardFormData.assessment_framework || null
      const gradingPolicy = wizardFormData.grading_policy || null

      const response = await fetch('/api/syllabi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          title: wizardFormData.title,
          description: wizardFormData.description || null,
          course_outline: wizardFormData.course_outline || null,
          course_objectives: wizardFormData.course_objectives || null,
          prerequisites: wizardFormData.prerequisites || null,
          learning_resources: learningResources,
          assessment_framework: assessmentFramework,
          grading_policy: gradingPolicy,
          version: wizardFormData.version || '1.0',
          course_id: selectedClass.course_id,
          term_id: termId,
          section_course_id: selectedClass.section_course_id,
          created_by: user.user_id,
          ilos: wizardFormData.ilos || [] // Include ILOs
        })
      })

      if (response.ok) {
        const result = await response.json()
        setShowCreateModal(false)
        resetForm()
        loadSyllabi(selectedClass.section_course_id, `syllabi_${selectedClass.section_course_id}`, false)
        alert('Syllabus created successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create syllabus')
      }
    } catch (error) {
      console.error('Error creating syllabus:', error)
      alert('Failed to create syllabus')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleUpdateSyllabus = async (wizardFormData) => {
    if (!editingSyllabus) return

    setIsSubmitting(true)
    try {
      // Prepare learning_resources
      let learningResources = null
      if (wizardFormData.learning_resources) {
        if (typeof wizardFormData.learning_resources === 'string') {
          learningResources = wizardFormData.learning_resources.split(',').map(item => item.trim()).filter(item => item !== '')
        } else if (Array.isArray(wizardFormData.learning_resources)) {
          learningResources = wizardFormData.learning_resources
        }
      }

      // Prepare JSON fields
      const assessmentFramework = wizardFormData.assessment_framework || null
      const gradingPolicy = wizardFormData.grading_policy || null

      const response = await fetch(`/api/syllabi/${editingSyllabus.syllabus_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          title: wizardFormData.title,
          description: wizardFormData.description || null,
          course_outline: wizardFormData.course_outline || null,
          course_objectives: wizardFormData.course_objectives || null,
          prerequisites: wizardFormData.prerequisites || null,
          learning_resources: learningResources,
          assessment_framework: assessmentFramework,
          grading_policy: gradingPolicy,
          version: wizardFormData.version || '1.0',
          ilos: wizardFormData.ilos || [] // Include ILOs
        })
      })

      if (response.ok) {
        setShowEditModal(false)
        setEditingSyllabus(null)
        resetForm()
        loadSyllabi(selectedClass.section_course_id, `syllabi_${selectedClass.section_course_id}`, false)
        alert('Syllabus updated successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update syllabus')
      }
    } catch (error) {
      console.error('Error updating syllabus:', error)
      alert('Failed to update syllabus')
    } finally {
      setIsSubmitting(false)
    }
  }


  const handleDeleteSyllabus = async (syllabusId) => {
    if (!confirm('Are you sure you want to delete this syllabus?')) return

    try {
      const response = await fetch(`/api/syllabi/${syllabusId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })

      if (response.ok) {
        loadSyllabi(selectedClass.section_course_id, `syllabi_${selectedClass.section_course_id}`, false)
        alert('Syllabus deleted successfully!')
      } else {
        alert('Failed to delete syllabus')
      }
    } catch (error) {
      console.error('Error deleting syllabus:', error)
      alert('Failed to delete syllabus')
    }
  }


  const openEditModal = (syllabus) => {
    setEditingSyllabus(syllabus)
    setShowEditModal(true)
  }
  
  const handleWizardSave = async (wizardFormData) => {
    if (editingSyllabus) {
      await handleUpdateSyllabus(wizardFormData)
    } else {
      await handleCreateSyllabus(wizardFormData)
    }
  }
  
  const handleWizardClose = () => {
    setShowCreateModal(false)
    setShowEditModal(false)
    setEditingSyllabus(null)
    resetForm()
  }

  const openViewModal = (syllabus) => {
    setViewingSyllabus(syllabus)
    setShowViewModal(true)
  }
  
  // Submit syllabus for review (Faculty)
  const handleSubmitForReview = async (syllabus) => {
    if (!confirm('Are you sure you want to submit this syllabus for review? You won\'t be able to edit it until it\'s reviewed.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/syllabi/${syllabus.syllabus_id}/submit-review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          created_by: user.user_id
        })
      })
      
      if (response.ok) {
        alert('Syllabus submitted for review successfully!')
        if (selectedClass) {
          loadSyllabi(selectedClass.section_course_id, `syllabi_${selectedClass.section_course_id}`, false)
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to submit syllabus for review')
      }
    } catch (error) {
      console.error('Error submitting syllabus for review:', error)
      alert('Failed to submit syllabus for review')
    }
  }
  
  // Review syllabus (Program Chair)
  const handleReviewSyllabus = async (syllabus, reviewStatus) => {
    const statusText = reviewStatus === 'approved' ? 'approve' : reviewStatus === 'rejected' ? 'reject' : 'request revision for'
    if (!confirm(`Are you sure you want to ${statusText} this syllabus?`)) {
      return
    }
    
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
        if (selectedClass) {
          loadSyllabi(selectedClass.section_course_id, `syllabi_${selectedClass.section_course_id}`, false)
        }
      } else {
        const error = await response.json()
        alert(error.error || `Failed to ${reviewStatus} syllabus`)
      }
    } catch (error) {
      console.error('Error reviewing syllabus:', error)
      alert(`Failed to ${reviewStatus} syllabus`)
    }
  }
  
  // Approve syllabus (Dean)
  const handleEditRequest = async (syllabus) => {
    const reason = prompt('Please provide a reason for requesting an edit to this approved syllabus:')
    if (!reason || reason.trim() === '') {
      return
    }

    try {
      const response = await fetch(`/api/syllabi/${syllabus.syllabus_id}/edit-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          reason: reason.trim(),
          requested_by: user.user_id
        })
      })

      if (response.ok) {
        alert('Edit request submitted successfully! The dean and program chair will be notified.')
        loadSyllabi()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to submit edit request')
      }
    } catch (error) {
      console.error('Error submitting edit request:', error)
      alert('Failed to submit edit request')
    }
  }

  const handleApproveSyllabus = async (syllabus, approvalStatus) => {
    const statusText = approvalStatus === 'approved' ? 'approve' : 'reject'
    if (!confirm(`Are you sure you want to ${statusText} this syllabus?`)) {
      return
    }
    
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
        if (selectedClass) {
          loadSyllabi(selectedClass.section_course_id, `syllabi_${selectedClass.section_course_id}`, false)
        }
      } else {
        const error = await response.json()
        alert(error.error || `Failed to ${approvalStatus} syllabus`)
      }
    } catch (error) {
      console.error('Error approving syllabus:', error)
      alert(`Failed to ${approvalStatus} syllabus`)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      course_outline: '',
      course_objectives: '',
      prerequisites: '',
      learning_resources: '',
      assessment_framework: '',
      grading_policy: '',
      version: '1.0',
      term_id: ''
    })
  }

  const openCreateModal = () => {
    resetForm()
    // Set default term_id from selected class if available
    if (selectedClass?.term_id) {
      setFormData(prev => ({ 
        ...prev, 
        term_id: selectedClass.term_id,
        title: selectedClass.course_title ? `${selectedClass.course_title} Syllabus` : ''
      }))
    }
    setShowCreateModal(true)
  }

  const filteredSyllabi = syllabi.filter(syllabus =>
    syllabus.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    syllabus.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
    return 'No resources'
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    try {
      const date = new Date(dateString)
      // Check if date is valid
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
    <>
      <style>{`
        .syllabus-card {
          transition: all 0.2s ease-in-out;
        }
        .syllabus-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .skeleton {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
      <div className="h-full w-full flex flex-col bg-gray-50 overflow-hidden">
        <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 z-40">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between bg-gray-50">
              <div className="flex space-x-4 sm:space-x-6 lg:space-x-8">
                <button
                  onClick={() => setActiveTab('syllabi')}
                  className={`py-2 px-3 sm:px-4 font-medium text-xs sm:text-sm transition-colors bg-transparent border-0 focus:outline-none focus:ring-0 ${
                    activeTab === 'syllabi'
                      ? 'text-red-600 border-b-2 border-red-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Syllabus
                </button>
                <button
                  onClick={() => setActiveTab('ilo-mapping')}
                  className={`py-2 px-3 sm:px-4 font-medium text-xs sm:text-sm transition-colors bg-transparent border-0 focus:outline-none focus:ring-0 ${
                    activeTab === 'ilo-mapping'
                      ? 'text-red-600 border-b-2 border-red-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  ILO Mapping
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="px-8 py-6 h-full overflow-y-auto">
            {activeTab === 'syllabi' ? (
              /* Content with Sidebar */
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full min-h-0">
                {/* Main Content - Syllabus Table */}
                <div className="lg:col-span-4 flex flex-col min-h-0">
                {/* Search Bar and Create Button */}
                {selectedClass && (
                  <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                    <div className="relative flex-1">
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="Search syllabus..." 
                          value={searchQuery} 
                          onChange={(e) => setSearchQuery(e.target.value)} 
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500" 
                        />
                      </div>
                    </div>
                    <button 
                      onClick={openCreateModal} 
                      className="inline-flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex-shrink-0">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}
                
                {/* Syllabus Table */}
                {selectedClass && (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300 flex flex-col flex-1 min-h-0">
                    {loading ? (
                      <div className="flex-1 overflow-y-auto min-h-0">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review Status</th>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Status</th>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-8 py-4">
                                  <div className="h-4 bg-gray-200 rounded w-32 skeleton mb-2"></div>
                                  <div className="h-3 bg-gray-100 rounded w-24 skeleton"></div>
                                </td>
                                <td className="px-8 py-4">
                                  <div className="h-4 bg-gray-200 rounded w-12 skeleton"></div>
                                </td>
                                <td className="px-8 py-4">
                                  <div className="h-6 bg-gray-200 rounded-full w-20 skeleton"></div>
                                </td>
                                <td className="px-8 py-4">
                                  <div className="h-6 bg-gray-200 rounded-full w-20 skeleton"></div>
                                </td>
                                <td className="px-8 py-4">
                                  <div className="h-4 bg-gray-200 rounded w-24 skeleton"></div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : filteredSyllabi.length > 0 ? (
                      <div className="flex-1 overflow-y-auto min-h-0">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review Status</th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Status</th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredSyllabi.map((syllabus) => (
                              <tr
                                key={syllabus.syllabus_id}
                                className="hover:bg-gray-50"
                              >
                                <td 
                                  className="px-6 py-4 cursor-pointer"
                                  onClick={() => openViewModal(syllabus)}
                                >
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{syllabus.title}</div>
                                    <div className="text-sm text-gray-500">{syllabus.description || 'No description'}</div>
                                  </div>
                                </td>
                                <td 
                                  className="px-6 py-4 cursor-pointer"
                                  onClick={() => openViewModal(syllabus)}
                                >
                                  <div className="text-sm text-gray-900">v{syllabus.version || '1.0'}</div>
                                </td>
                                <td 
                                  className="px-6 py-4 cursor-pointer"
                                  onClick={() => openViewModal(syllabus)}
                                >
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(syllabus.review_status)}`}>
                                    {syllabus.review_status || 'pending'}
                                  </span>
                                </td>
                                <td 
                                  className="px-6 py-4 cursor-pointer"
                                  onClick={() => openViewModal(syllabus)}
                                >
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(syllabus.approval_status)}`}>
                                    {syllabus.approval_status || 'pending'}
                                  </span>
                                </td>
                                <td 
                                  className="px-6 py-4 cursor-pointer"
                                  onClick={() => openViewModal(syllabus)}
                                >
                                  <div className="text-sm text-gray-900">
                                    {formatDate(syllabus.created_at)}
                                  </div>
                                </td>
                                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-2">
                                    {syllabus.approval_status === 'approved' && syllabus.review_status === 'approved' && (
                                      <button
                                        onClick={() => handleEditRequest(syllabus)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                        title="Request edit for this approved syllabus"
                                      >
                                        <PencilIcon className="h-3 w-3" />
                                        Edit Request
                                      </button>
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
                          <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No syllabus found</h3>
                          <p className="text-gray-500">
                            {searchQuery ? 'No syllabus match your search.' : 'Create your first syllabus to get started.'}
                          </p>
                          {!searchQuery && (
                            <button 
                              onClick={openCreateModal} 
                              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <PlusIcon className="h-4 w-4" />
                              Create Syllabus
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* No Class Selected State */}
                {!selectedClass && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-300 flex items-center justify-center flex-1 min-h-0">
                    <div className="text-center">
                      <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Class</h3>
                      <p className="text-gray-500">Choose a class from the sidebar to view its syllabus.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Sidebar - Classes */}
              <div className="lg:col-span-1 flex flex-col min-h-0">
                <div className="bg-white rounded-lg shadow-sm border border-gray-300 flex flex-col h-full">
                  <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                    <h3 className="text-sm font-medium text-gray-900">Classes</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    {loading ? (
                      <div className="p-4 space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="p-3 rounded-lg border border-gray-200 animate-pulse">
                            <div className="flex items-center space-x-3">
                              <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-3/4 skeleton mb-1"></div>
                                <div className="h-3 bg-gray-100 rounded w-1/2 skeleton"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : classes.length > 0 ? (
                      <div className="p-4 space-y-2">
                        {classes.map((cls) => (
                          <div
                            key={cls.section_course_id}
                            onClick={() => setSelectedClass(cls)}
                            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm border ${
                              selectedClass?.section_course_id === cls.section_course_id
                                ? 'border-gray-300 bg-gray-50'
                                : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                            } group`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium text-sm truncate ${
                                  selectedClass?.section_course_id === cls.section_course_id
                                    ? 'text-gray-900'
                                    : 'text-gray-900 group-hover:text-gray-900'
                                }`}>
                                  {cls.course_title}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{cls.course_code} - {cls.section_code}</p>
                              </div>
                              {selectedClass?.section_course_id === cls.section_course_id && (
                                <div className="h-2 w-2 bg-gray-500 rounded-full flex-shrink-0 ml-2"></div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center p-8">
                        <div className="text-center">
                          <AcademicCapIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No classes assigned</h3>
                          <p className="text-sm text-gray-500">Contact your administrator to get classes assigned.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
              /* ILO Mapping Tab */
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full min-h-0">
                {/* Main Content */}
                <div className="lg:col-span-4 flex flex-col min-h-0">
                  {!selectedClass ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-300 flex items-center justify-center flex-1 min-h-0">
                      <div className="text-center">
                        <TableCellsIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Class</h3>
                        <p className="text-gray-500">Choose a class from the sidebar to view ILO mappings.</p>
                      </div>
                    </div>
                  ) : selectedSyllabusForILO ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6 flex flex-col min-h-0">
                      <div className="mb-4 flex items-center justify-between flex-shrink-0">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{selectedSyllabusForILO.title}</h3>
                          <p className="text-sm text-gray-500">Version {selectedSyllabusForILO.version || '1.0'}</p>
                        </div>
                        <button
                          onClick={() => setSelectedSyllabusForILO(null)}
                          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Back to Syllabi
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto min-h-0">
                        <ILOMappingTable
                          syllabusId={selectedSyllabusForILO.syllabus_id}
                          courseCode={selectedClass?.course_code || ''}
                          onUpdate={() => {
                            // Refresh syllabi list if needed
                            if (selectedClass) {
                              loadSyllabi(selectedClass.section_course_id, `syllabi_${selectedClass.section_course_id}`, false)
                            }
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Select a Syllabus for ILO Mapping</h3>
                      {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading syllabi...</div>
                      ) : syllabi.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {syllabi.map((syllabus) => (
                            <div
                              key={syllabus.syllabus_id}
                              onClick={() => setSelectedSyllabusForILO(syllabus)}
                              className="p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                              <div className="font-medium text-gray-900">{syllabus.title}</div>
                              <div className="text-sm text-gray-500">Version {syllabus.version || '1.0'}</div>
                              <div className="mt-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(syllabus.review_status)}`}>
                                  {syllabus.review_status || 'pending'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No syllabi found. Create a syllabus first.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Right Sidebar - Classes */}
                <div className="lg:col-span-1 flex flex-col min-h-0">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-300 flex flex-col h-full">
                    <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                      <h3 className="text-sm font-medium text-gray-900">Classes</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto min-h-0">
                      {loading ? (
                        <div className="p-4 space-y-2">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="p-3 rounded-lg border border-gray-200 animate-pulse">
                              <div className="flex items-center space-x-3">
                                <div className="flex-1">
                                  <div className="h-4 bg-gray-200 rounded w-3/4 skeleton mb-1"></div>
                                  <div className="h-3 bg-gray-100 rounded w-1/2 skeleton"></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : classes.length > 0 ? (
                        <div className="p-4 space-y-2">
                          {classes.map((cls) => (
                            <div
                              key={cls.section_course_id}
                              onClick={() => setSelectedClass(cls)}
                              className={`p-3 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm border ${
                                selectedClass?.section_course_id === cls.section_course_id
                                  ? 'border-gray-300 bg-gray-50'
                                  : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                              } group`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className={`font-medium text-sm truncate ${
                                    selectedClass?.section_course_id === cls.section_course_id
                                      ? 'text-gray-900'
                                      : 'text-gray-900 group-hover:text-gray-900'
                                  }`}>
                                    {cls.course_title}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">{cls.course_code} - {cls.section_code}</p>
                                </div>
                                {selectedClass?.section_course_id === cls.section_course_id && (
                                  <div className="h-2 w-2 bg-gray-500 rounded-full flex-shrink-0 ml-2"></div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center p-8">
                          <div className="text-center">
                            <AcademicCapIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No classes assigned</h3>
                            <p className="text-sm text-gray-500">Contact your administrator to get classes assigned.</p>
                          </div>
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

      {/* Create/Edit Syllabus Wizard */}
      {(showCreateModal || showEditModal) && selectedClass && (
        <SyllabusCreationWizard
          selectedClass={selectedClass}
          schoolTerms={schoolTerms}
          onClose={handleWizardClose}
          onSave={handleWizardSave}
          editingSyllabus={editingSyllabus}
        />
      )}
      
      {/* Legacy Create Syllabus Modal - Kept for fallback if no class selected */}
      {showCreateModal && !selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Syllabus</h2>
              <p className="text-red-600 mb-4">Please select a class first to create a syllabus.</p>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Legacy Create Modal - Removed, using wizard instead */}
      {false && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Syllabus</h2>
              
              <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="e.g., Introduction to Computer Science"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                    <input
                      type="text"
                      name="version"
                      value={formData.version}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="1.0"
                    />
                  </div>
          </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Term *</label>
                  <select
                    name="term_id"
                    value={formData.term_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Select term</option>
                    {schoolTerms.filter(term => term.is_active).map(term => (
                      <option key={term.term_id} value={term.term_id}>
                        {term.school_year} - {term.semester}
                      </option>
                    ))}
                  </select>
                  {selectedClass?.term_id && !formData.term_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      Default: {selectedClass.school_year} - {selectedClass.semester}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Course description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course Objectives</label>
                  <textarea
                    name="course_objectives"
                    value={formData.course_objectives}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="List the course objectives..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course Outline</label>
                  <textarea
                    name="course_outline"
                    value={formData.course_outline}
                    onChange={handleInputChange}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Detailed course outline..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prerequisites</label>
                  <textarea
                    name="prerequisites"
                    value={formData.prerequisites}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Course prerequisites..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Learning Resources (comma-separated)</label>
                  <textarea
                    name="learning_resources"
                    value={typeof formData.learning_resources === 'string' 
                      ? formData.learning_resources 
                      : Array.isArray(formData.learning_resources) 
                        ? formData.learning_resources.join(', ')
                        : ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, learning_resources: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Resource 1, Resource 2, Resource 3..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Framework (JSON)</label>
                  <textarea
                    name="assessment_framework"
                    value={typeof formData.assessment_framework === 'string' 
                      ? formData.assessment_framework 
                      : JSON.stringify(formData.assessment_framework, null, 2)}
                    onChange={(e) => handleJSONInputChange('assessment_framework', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-sm"
                    placeholder='{"quizzes": 20, "exams": 40, "projects": 40}'
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grading Policy (JSON)</label>
                  <textarea
                    name="grading_policy"
                    value={typeof formData.grading_policy === 'string' 
                      ? formData.grading_policy 
                      : JSON.stringify(formData.grading_policy, null, 2)}
                    onChange={(e) => handleJSONInputChange('grading_policy', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-sm"
                    placeholder='{"A": "90-100", "B": "80-89", "C": "70-79", "D": "60-69", "F": "0-59"}'
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Syllabus'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Syllabus Modal - Replaced by Wizard */}
      {false && showEditModal && editingSyllabus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Syllabus</h2>
              
              <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                    <input
                      type="text"
                      name="version"
                      value={formData.version}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course Objectives</label>
                  <textarea
                    name="course_objectives"
                    value={formData.course_objectives}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course Outline</label>
                  <textarea
                    name="course_outline"
                    value={formData.course_outline}
                    onChange={handleInputChange}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prerequisites</label>
                  <textarea
                    name="prerequisites"
                    value={formData.prerequisites}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Learning Resources (comma-separated)</label>
                  <textarea
                    name="learning_resources"
                    value={typeof formData.learning_resources === 'string' 
                      ? formData.learning_resources 
                      : Array.isArray(formData.learning_resources) 
                        ? formData.learning_resources.join(', ')
                        : ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, learning_resources: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Framework (JSON)</label>
                  <textarea
                    name="assessment_framework"
                    value={typeof formData.assessment_framework === 'string' 
                      ? formData.assessment_framework 
                      : JSON.stringify(formData.assessment_framework, null, 2)}
                    onChange={(e) => handleJSONInputChange('assessment_framework', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grading Policy (JSON)</label>
                  <textarea
                    name="grading_policy"
                    value={typeof formData.grading_policy === 'string' 
                      ? formData.grading_policy 
                      : JSON.stringify(formData.grading_policy, null, 2)}
                    onChange={(e) => handleJSONInputChange('grading_policy', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Updating...' : 'Update Syllabus'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Syllabus Modal */}
      {showViewModal && viewingSyllabus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{viewingSyllabus.title}</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Version</h3>
                  <p className="text-sm text-gray-900">v{viewingSyllabus.version || '1.0'}</p>
                </div>

                {viewingSyllabus.description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Description</h3>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{viewingSyllabus.description}</p>
                  </div>
                )}

                {viewingSyllabus.course_objectives && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Course Objectives</h3>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{viewingSyllabus.course_objectives}</p>
                  </div>
                )}

                {viewingSyllabus.course_outline && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Course Outline</h3>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{viewingSyllabus.course_outline}</p>
                  </div>
                )}

                {viewingSyllabus.prerequisites && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Prerequisites</h3>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{viewingSyllabus.prerequisites}</p>
                  </div>
                )}

                {viewingSyllabus.learning_resources && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Learning Resources</h3>
                    <p className="text-sm text-gray-900">{formatLearningResources(viewingSyllabus.learning_resources)}</p>
                  </div>
                )}

                {viewingSyllabus.assessment_framework && (() => {
                  // Parse assessment framework
                  let framework = null
                  try {
                    if (typeof viewingSyllabus.assessment_framework === 'string') {
                      framework = JSON.parse(viewingSyllabus.assessment_framework)
                    } else {
                      framework = viewingSyllabus.assessment_framework
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

                {viewingSyllabus.grading_policy && (() => {
                  // Parse grading policy
                  let policy = null
                  try {
                    if (typeof viewingSyllabus.grading_policy === 'string') {
                      policy = JSON.parse(viewingSyllabus.grading_policy)
                    } else {
                      policy = viewingSyllabus.grading_policy
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
                        {policy?.scale && !Array.isArray(policy.scale) && typeof policy.scale === 'object' && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-gray-800 mb-2">Grading Scale</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(policy.scale).map(([grade, range]) => {
                                // Handle if range is an object or string
                                const rangeValue = typeof range === 'object' && range !== null 
                                  ? range.range || range.value || JSON.stringify(range)
                                  : String(range)
                                return (
                                  <div key={grade} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                                    <span className="font-medium text-gray-900 text-sm">{grade}</span>
                                    <span className="text-xs text-gray-600">{rangeValue}</span>
                                  </div>
                                )
                              })}
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
                        {policy?.description && (
                          <div className="mt-4 pt-4 border-t border-gray-300">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{policy.description}</p>
                          </div>
                        )}
                        {!policy?.scale && !policy?.components && !policy?.description && (
                          <p className="text-sm text-gray-500 italic">No grading policy details available</p>
                        )}
                      </div>
                    </div>
                  )
                })()}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Review Status</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewingSyllabus.review_status)}`}>
                      {viewingSyllabus.review_status || 'pending'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Approval Status</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewingSyllabus.approval_status)}`}>
                      {viewingSyllabus.approval_status || 'pending'}
                    </span>
                  </div>
                </div>
              </div>
        </div>
      </div>
    </div>
      )}
    </>
  )
}

export default Syllabus

