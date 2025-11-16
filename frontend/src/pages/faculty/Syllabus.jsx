import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/UnifiedAuthContext'
import { safeSetItem, safeGetItem, minimizeClassData } from '../../utils/cacheUtils'
import { setSelectedClass as saveSelectedClass, getSelectedClass } from '../../utils/localStorageManager'
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
  ArrowUpTrayIcon
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
  const [activeTermId, setActiveTermId] = useState(null)
  const [schoolTerms, setSchoolTerms] = useState([])
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [editingSyllabus, setEditingSyllabus] = useState(null)
  const [viewingSyllabus, setViewingSyllabus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewingSyllabusILOs, setViewingSyllabusILOs] = useState([])
  const [loadingILOs, setLoadingILOs] = useState(false)
  const [editRequestReason, setEditRequestReason] = useState('')
  const [showEditRequestForm, setShowEditRequestForm] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isPublished, setIsPublished] = useState(false)
  
  // Reference data for ILO mappings
  const [soReferences, setSoReferences] = useState([])
  const [igaReferences, setIgaReferences] = useState([])
  const [cdioReferences, setCdioReferences] = useState([])
  const [sdgReferences, setSdgReferences] = useState([])
  
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

  // Fetch active term
  useEffect(() => {
    const fetchActiveTerm = async () => {
      try {
        const response = await fetch('/api/school-terms')
        if (response.ok) {
          const terms = await response.json()
          const activeTerm = Array.isArray(terms) ? terms.find(t => t.is_active) : null
          if (activeTerm) {
            setActiveTermId(activeTerm.term_id)
            console.log('✅ [SYLLABUS] Active term found:', activeTerm.term_id, activeTerm.school_year, activeTerm.semester)
          } else {
            console.warn('⚠️ [SYLLABUS] No active term found')
          }
        }
      } catch (error) {
        console.error('❌ [SYLLABUS] Error fetching active term:', error)
      }
    }
    fetchActiveTerm()
  }, [])

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
      
      // Note: Class restoration will happen after filteredClasses is computed
      // to ensure only active term classes are restored
    }
    
    loadClasses()
  }, [user, location.state])

  // Filter classes by active term
  const filteredClasses = React.useMemo(() => {
    if (activeTermId === null) {
      // Wait for active term to be determined
      return []
    }
    const filtered = classes.filter(cls => cls.term_id === activeTermId)
    console.log(`🔍 [SYLLABUS] Filtered by active term (${activeTermId}): ${filtered.length} of ${classes.length} classes`)
    return filtered
  }, [classes, activeTermId])

  // Restore selected class from filteredClasses (only active term classes)
  useEffect(() => {
    // Only restore if we don't already have a selected class and filteredClasses is available
    if (selectedClass || filteredClasses.length === 0 || activeTermId === null) {
      return
    }
    
    let classToSelect = null
    
    // First priority: location state
    if (location.state?.selectedClassId) {
      classToSelect = filteredClasses.find(cls => cls.section_course_id === location.state.selectedClassId)
    }
    
    // Second priority: localStorage (but only if it's from active term)
    if (!classToSelect) {
      const savedClass = getSelectedClass()
      if (savedClass?.section_course_id) {
        classToSelect = filteredClasses.find(cls => cls.section_course_id === savedClass.section_course_id)
      }
    }
    
    // Set the selected class if found
    if (classToSelect) {
      setSelectedClass(classToSelect)
    }
  }, [filteredClasses, location.state?.selectedClassId, activeTermId])

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

  // Validate selected class is from active term
  useEffect(() => {
    if (selectedClass && activeTermId !== null && selectedClass.term_id !== activeTermId) {
      console.warn('⚠️ [SYLLABUS] Selected class is not from active term, clearing selection')
      setSelectedClass(null)
      setSyllabi([])
    }
  }, [activeTermId, selectedClass])

  // Load syllabi when class is selected
  useEffect(() => {
    if (!selectedClass) {
      setSyllabi([])
 // Reset selected syllabus when class changes
      return
    }
    
    // Ensure selected class is from active term
    if (activeTermId !== null && selectedClass.term_id !== activeTermId) {
      console.warn('⚠️ [SYLLABUS] Selected class is not from active term, skipping syllabi load')
      setSyllabi([])
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
  
  // Restore selected class from localStorage
  useEffect(() => {
      if (!selectedClass && filteredClasses.length > 0) {
        const savedClass = getSelectedClass()
        if (savedClass?.section_course_id) {
          const classToSelect = filteredClasses.find(cls => cls.section_course_id === savedClass.section_course_id)
          if (classToSelect) {
            setSelectedClass(classToSelect)
          }
        }
      }
  }, [classes, selectedClass, filteredClasses])

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
      // assessment_framework should already include contact_hours and teaching_strategies from prepareSyllabusData
      const assessmentFramework = wizardFormData.assessment_framework || null
      
      // grading_policy should already include assessment_criteria, sub_assessments, and metadata from prepareSyllabusData
      let gradingPolicy = wizardFormData.grading_policy || null
      
      // Backward compatibility: if assessment_criteria is provided separately, merge it
      if (wizardFormData.assessment_criteria && Array.isArray(wizardFormData.assessment_criteria) && wizardFormData.assessment_criteria.length > 0) {
        // Ensure grading_policy is an object
        if (!gradingPolicy || typeof gradingPolicy === 'string') {
          try {
            gradingPolicy = gradingPolicy ? JSON.parse(gradingPolicy) : {}
          } catch (e) {
            gradingPolicy = {}
          }
        }
        // Add assessment_criteria and sub_assessments to grading_policy
        gradingPolicy = {
          ...gradingPolicy,
          assessment_criteria: wizardFormData.assessment_criteria,
          ...(wizardFormData.sub_assessments && Object.keys(wizardFormData.sub_assessments).length > 0 && {
            sub_assessments: wizardFormData.sub_assessments
          })
        }
      }

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
      // assessment_framework should already include contact_hours and teaching_strategies from prepareSyllabusData
      const assessmentFramework = wizardFormData.assessment_framework || null
      
      // grading_policy should already include assessment_criteria, sub_assessments, and metadata from prepareSyllabusData
      let gradingPolicy = wizardFormData.grading_policy || null
      
      // Backward compatibility: if assessment_criteria is provided separately, merge it
      if (wizardFormData.assessment_criteria && Array.isArray(wizardFormData.assessment_criteria) && wizardFormData.assessment_criteria.length > 0) {
        // Ensure grading_policy is an object
        if (!gradingPolicy || typeof gradingPolicy === 'string') {
          try {
            gradingPolicy = gradingPolicy ? JSON.parse(gradingPolicy) : {}
          } catch (e) {
            gradingPolicy = {}
          }
        }
        // Add assessment_criteria and sub_assessments to grading_policy
        gradingPolicy = {
          ...gradingPolicy,
          assessment_criteria: wizardFormData.assessment_criteria,
          ...(wizardFormData.sub_assessments && Object.keys(wizardFormData.sub_assessments).length > 0 && {
            sub_assessments: wizardFormData.sub_assessments
          })
        }
      }

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

  const loadSyllabusILOs = async (syllabusId) => {
    if (!syllabusId) return
    setLoadingILOs(true)
    try {
      const response = await fetch(`/api/ilos/syllabus/${syllabusId}`)
      if (response.ok) {
        const data = await response.json()
        setViewingSyllabusILOs(data)
      }
    } catch (error) {
      console.error('Error loading ILOs:', error)
      setViewingSyllabusILOs([])
    } finally {
      setLoadingILOs(false)
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
        setSoReferences(soData)
      }
      if (igaRes.ok) {
        const igaData = await igaRes.json()
        setIgaReferences(igaData)
      }
      if (cdioRes.ok) {
        const cdioData = await cdioRes.json()
        setCdioReferences(cdioData)
      }
      if (sdgRes.ok) {
        const sdgData = await sdgRes.json()
        setSdgReferences(sdgData)
      }
    } catch (error) {
      console.error('Error loading reference data:', error)
    }
  }

  const openViewModal = async (syllabus) => {
    setViewingSyllabus(syllabus)
    setShowViewModal(true)
    setShowEditRequestForm(false)
    setEditRequestReason('')
    
    // Check if syllabus is published
    try {
      const response = await fetch(`/api/assessments/syllabus/${syllabus.syllabus_id}`)
      if (response.ok) {
        const assessments = await response.json()
        setIsPublished(Array.isArray(assessments) && assessments.length > 0 && assessments.some(a => a.is_published))
      } else {
        setIsPublished(false)
      }
    } catch (error) {
      console.error('Error checking published status:', error)
      setIsPublished(false)
    }
    
    await Promise.all([
      loadSyllabusILOs(syllabus.syllabus_id),
      loadReferenceData()
    ])
  }
  
  const handlePublish = async () => {
    if (!viewingSyllabus) return
    
    if (!confirm('Are you sure you want to publish this syllabus? This will create assessments from the sub-assessments and make them visible to students.')) {
      return
    }
    
    setIsPublishing(true)
    try {
      const response = await fetch(`/api/syllabi/${viewingSyllabus.syllabus_id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          published_by: user?.user_id
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(result.message || 'Syllabus published successfully!')
        setIsPublished(true)
        if (selectedClass) {
          loadSyllabi(selectedClass.section_course_id, `syllabi_${selectedClass.section_course_id}`, false)
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to publish syllabus')
      }
    } catch (error) {
      console.error('Error publishing syllabus:', error)
      alert('Failed to publish syllabus')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleSubmitEditRequest = async () => {
    if (!editRequestReason.trim() || !viewingSyllabus) return

    try {
      const response = await fetch(`/api/syllabi/${viewingSyllabus.syllabus_id}/edit-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          reason: editRequestReason.trim(),
          requested_by: user?.user_id
        })
      })

      if (response.ok) {
        alert('Edit request submitted successfully! The dean and program chair will be notified.')
        setShowEditRequestForm(false)
        setEditRequestReason('')
        if (selectedClass) {
          loadSyllabi(selectedClass.section_course_id, `syllabi_${selectedClass.section_course_id}`, false)
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to submit edit request')
      }
    } catch (error) {
      console.error('Error submitting edit request:', error)
      alert('Failed to submit edit request')
    }
  }
  
  // Submit syllabus for review (Faculty)
  const handleSubmitForReview = async (syllabus) => {
    const isResubmission = syllabus.review_status === 'needs_revision'
    const confirmMessage = isResubmission 
      ? 'Are you sure you want to resubmit this syllabus for review? Make sure you have made the requested revisions.'
      : 'Are you sure you want to submit this syllabus for review? You won\'t be able to edit it until it\'s reviewed.'
    
    if (!confirm(confirmMessage)) {
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
        const successMessage = isResubmission 
          ? 'Syllabus resubmitted for review successfully!'
          : 'Syllabus submitted for review successfully!'
        alert(successMessage)
        setShowViewModal(false)
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
                <div className="py-2 px-3 sm:px-4 font-medium text-xs sm:text-sm text-red-600 border-b-2 border-red-600">
                  Syllabus
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden min-h-0">
          <div className="px-8 py-6 h-full overflow-hidden flex flex-col">
            {/* Content with Sidebar */}
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
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revision Number</th>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review Status</th>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Status</th>
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
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revision Number</th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review Status</th>
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredSyllabi.map((syllabus) => {
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
                                className="hover:bg-gray-50"
                              >
                                <td 
                                  className="px-6 py-4 cursor-pointer"
                                  onClick={() => openViewModal(syllabus)}
                                >
                                    <div className="text-sm font-medium text-gray-900">{syllabus.title}</div>
                                </td>
                                <td 
                                  className="px-6 py-4 cursor-pointer"
                                  onClick={() => openViewModal(syllabus)}
                                >
                                    <div className="text-sm text-gray-900">{revisionNo}</div>
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
                              </tr>
                              )
                            })}
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
                    ) : filteredClasses.length > 0 ? (
                      <div className="p-4 space-y-2">
                        {filteredClasses.map((cls) => (
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
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
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
                {/* Course Information Section */}
                {(() => {
                  // Extract metadata from grading_policy
                  let metadata = {}
                  try {
                    const gradingPolicy = typeof viewingSyllabus.grading_policy === 'string'
                      ? JSON.parse(viewingSyllabus.grading_policy)
                      : viewingSyllabus.grading_policy
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
                  if (viewingSyllabus.version) {
                    courseDetails.push({ label: 'Version', value: `v${viewingSyllabus.version || '1.0'}` })
                  }
                  if (viewingSyllabus.description) {
                    courseDetails.push({ label: 'Description', value: viewingSyllabus.description })
                  }
                  if (viewingSyllabus.course_objectives) {
                    courseDetails.push({ label: 'Course Objectives', value: viewingSyllabus.course_objectives })
                  }
                  if (viewingSyllabus.course_outline) {
                    courseDetails.push({ label: 'Course Outline', value: viewingSyllabus.course_outline })
                  }
                  if (viewingSyllabus.prerequisites) {
                    courseDetails.push({ label: 'Prerequisites', value: viewingSyllabus.prerequisites })
                  }
                  if (viewingSyllabus.learning_resources && Array.isArray(viewingSyllabus.learning_resources) && viewingSyllabus.learning_resources.length > 0) {
                    courseDetails.push({ label: 'Learning Resources', value: viewingSyllabus.learning_resources.join('\n') })
                  } else if (viewingSyllabus.learning_resources) {
                    courseDetails.push({ label: 'Learning Resources', value: formatLearningResources(viewingSyllabus.learning_resources) })
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
                    const framework = typeof viewingSyllabus.assessment_framework === 'string'
                      ? JSON.parse(viewingSyllabus.assessment_framework)
                      : viewingSyllabus.assessment_framework
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
                    const framework = typeof viewingSyllabus.assessment_framework === 'string'
                      ? JSON.parse(viewingSyllabus.assessment_framework)
                      : viewingSyllabus.assessment_framework
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
                        {policy?.scale && !Array.isArray(policy.scale) && typeof policy.scale === 'object' && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-800 mb-2">Grading Scale</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border border-gray-300">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-900">Grade</th>
                                    <th className="px-3 py-2 border border-gray-300 text-center font-semibold text-gray-900">Range</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white">
                              {Object.entries(policy.scale).map(([grade, range]) => {
                                const rangeValue = typeof range === 'object' && range !== null 
                                  ? range.range || range.value || JSON.stringify(range)
                                  : String(range)
                                return (
                                      <tr key={grade} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 border border-gray-300 text-gray-900 font-medium">{grade}</td>
                                        <td className="px-3 py-2 border border-gray-300 text-center text-gray-700">{rangeValue}</td>
                                      </tr>
                                    )
                                  })}
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
                        {policy?.remedial_note && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-800 mb-2">Remedial Note</h4>
                            <div className="bg-white p-3 rounded border border-gray-300">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{policy.remedial_note}</p>
                            </div>
                          </div>
                        )}
                        {policy?.description && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-800 mb-2">Description</h4>
                            <div className="bg-white p-3 rounded border border-gray-300">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{policy.description}</p>
                            </div>
                          </div>
                        )}
                        {!policy?.scale && !policy?.components && !policy?.description && !policy?.remedial_note && (
                          <div className="bg-white p-3 rounded border border-gray-300">
                          <p className="text-sm text-gray-500 italic">No grading policy details available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* Assessment Criteria Section */}
                {viewingSyllabus.grading_policy && (() => {
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
                  
                  const assessmentCriteria = policy?.assessment_criteria || []
                  const subAssessments = policy?.sub_assessments || {}
                  
                  if (assessmentCriteria.length === 0) return null
                  
                  return (
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
                  )
                })()}

                {/* Assessment and ILO Mapping Tables */}
                {viewingSyllabusILOs.length > 0 && (() => {
                  // Extract assessment data from grading_policy
                  let policy = null
                  try {
                    if (viewingSyllabus.grading_policy) {
                      if (typeof viewingSyllabus.grading_policy === 'string') {
                        policy = JSON.parse(viewingSyllabus.grading_policy)
                      } else {
                        policy = viewingSyllabus.grading_policy
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
                                    {viewingSyllabusILOs.map((ilo, iloIndex) => {
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
                                
                                viewingSyllabusILOs.forEach((ilo, iloIndex) => {
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
                                          {viewingSyllabusILOs.map((ilo, idx) => (
                                            <th key={idx} className="px-2 py-1.5 border border-gray-300 text-center font-semibold text-gray-900">{idx + 1}</th>
                                          ))}
                                          <th className="px-2 py-1.5 border border-gray-300 text-center font-semibold text-gray-900">Domains</th>
                                        </tr>
                                        <tr className="bg-gray-100">
                                          <th colSpan="4" className="px-2 py-1 border border-gray-300"></th>
                                          <th colSpan={viewingSyllabusILOs.length} className="px-2 py-1 border border-gray-300 text-center font-medium text-gray-700">Intended Learning Outcomes</th>
                                          <th className="px-2 py-1 border border-gray-300"></th>
                                        </tr>
                                        <tr className="bg-gray-100">
                                          <th colSpan="4" className="px-2 py-1 border border-gray-300"></th>
                                          {viewingSyllabusILOs.map((ilo, idx) => (
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
                                              {viewingSyllabusILOs.map((ilo, iloIdx) => {
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
                                                  <td key={iloIdx} className="px-2 py-1.5 border border-gray-300 text-center">
                                                    {totalStats.weightPct > 0 ? (
                                                      <div>
                                                        <div 
                                                          className="font-medium cursor-help" 
                                                          title={`Total weight contribution: Sum of all sub-assessment weights allocated to ${ilo.code}`}
                                                        >
                                                          {totalStats.weightPct.toFixed(1)}%
                                                        </div>
                                                        {totalStats.score > 0 && (
                                                          <div 
                                                            className="text-xs text-gray-600 cursor-help" 
                                                            title={`Total score contribution: Sum of all weighted scores from sub-assessments for ${ilo.code}`}
                                                          >
                                                            ({totalStats.score.toFixed(1)})
                                    </div>
                                  )}
                                                      </div>
                                                    ) : '—'}
                                                  </td>
                                                )
                                              })}
                                              <td className="px-2 py-1.5 border border-gray-300 text-center">
                                                <div className="flex justify-center gap-1 font-medium">
                                                  <span 
                                                    className="border-r border-gray-300 pr-1 cursor-help" 
                                                    title="Total Cognitive domain value: Sum of all cognitive percentages from assessment criteria"
                                                  >
                                                    {Math.round(criterionGroup.criterion.cognitive || 0)}
                                                  </span>
                                                  <span 
                                                    className="border-r border-gray-300 pr-1 cursor-help" 
                                                    title="Total Psychomotor domain value: Sum of all psychomotor percentages from assessment criteria"
                                                  >
                                                    {Math.round(criterionGroup.criterion.psychomotor || 0)}
                                                  </span>
                                                  <span 
                                                    className="cursor-help" 
                                                    title="Total Affective domain value: Sum of all affective percentages from assessment criteria"
                                                  >
                                                    {Math.round(criterionGroup.criterion.affective || 0)}
                                                  </span>
                                                </div>
                                              </td>
                                            </tr>
                                            {/* Sub-Assessment Rows */}
                                            {criterionGroup.subAssessments.map((sub, subIdx) => {
                                              const iloMappings = getILOMappings(sub.abbreviation || sub.name.substring(0, 2).toUpperCase(), sub.score, sub.weight)
                                              return (
                                                <tr key={`${groupIdx}-${subIdx}`} className="hover:bg-gray-50 bg-white">
                                                  <td className="px-4 py-1.5 border border-gray-300 font-medium text-gray-700">{sub.abbreviation || sub.name.substring(0, 2).toUpperCase()}</td>
                                                  <td className="px-2 py-1.5 border border-gray-300 text-gray-600">{sub.name}</td>
                                                  <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-600">—</td>
                                                  <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-600">
                                                    <span title="Weight percentage of this sub-assessment within its parent assessment criterion" className="cursor-help">
                                                      {sub.weight_percentage || sub.weight || 0}%
                                                    </span>
                                                  </td>
                                                  {viewingSyllabusILOs.map((ilo, iloIdx) => {
                                                    const mapping = iloMappings[iloIdx + 1]
                                                    const contribution = mapping ? mapping.weightPct : 0
                                                    const scoreValue = mapping ? mapping.score : 0
                                                    return (
                                                      <td key={iloIdx} className="px-2 py-1.5 border border-gray-300 text-center text-gray-600">
                                                        {contribution > 0 ? (
                                    <div>
                                                            <div 
                                                              className="cursor-help" 
                                                              title={`Weight contribution: Percentage of this sub-assessment's weight allocated to ${ilo.code}`}
                                                            >
                                                              {contribution}%
                                                            </div>
                                                            {scoreValue > 0 && (
                                                              <div 
                                                                className="text-xs text-gray-400 cursor-help" 
                                                                title={`Score contribution: Weighted score points from this sub-assessment for ${ilo.code}`}
                                                              >
                                                                ({scoreValue.toFixed(1)})
                                                              </div>
                                                            )}
                                                          </div>
                                                        ) : '—'}
                                                      </td>
                                                    )
                                                  })}
                                                  <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-600">—</td>
                                                </tr>
                                              )
                                            })}
                                          </React.Fragment>
                                        ))}
                                        {/* Total Row */}
                                        <tr className="bg-gray-100 font-semibold">
                                          <td colSpan="3" className="px-2 py-1.5 border border-gray-300 text-right">Total:</td>
                                          <td className="px-2 py-1.5 border border-gray-300 text-center">
                                            <span 
                                              className="cursor-help" 
                                              title="Total weight: Sum of all sub-assessment weights for this assessment criterion"
                                            >
                                              {criteriaWithSubAssessments.reduce((sum, c) => sum + (c.criterion.weight || 0), 0)}%
                                        </span>
                                          </td>
                                          {viewingSyllabusILOs.map((ilo, iloIdx) => {
                                            const totalStats = criteriaWithSubAssessments.reduce((acc, c) => {
                                              c.subAssessments.forEach(sub => {
                                                const iloMappings = getILOMappings(sub.abbreviation || sub.name.substring(0, 2).toUpperCase(), sub.score, sub.weight)
                                                const mapping = iloMappings[iloIdx + 1]
                                                if (mapping) {
                                                  acc.weightPct += mapping.weightPct
                                                  acc.score += mapping.score
                                                }
                                              })
                                              return acc
                                            }, { weightPct: 0, score: 0 })
                                            
                                            return (
                                              <td key={iloIdx} className="px-2 py-1.5 border border-gray-300 text-center">
                                                {totalStats.weightPct > 0 ? (
                                                  <div>
                                                    <div 
                                                      className="font-medium cursor-help" 
                                                      title={`Total weight contribution: Sum of all sub-assessment weights allocated to ${ilo.code}`}
                                                    >
                                                      {totalStats.weightPct.toFixed(1)}%
                                                    </div>
                                                    {totalStats.score > 0 && (
                                                      <div 
                                                        className="text-xs text-gray-600 cursor-help" 
                                                        title={`Total score contribution: Sum of all weighted scores from sub-assessments for ${ilo.code}`}
                                                      >
                                                        ({totalStats.score.toFixed(1)})
                                                      </div>
                                                    )}
                                                  </div>
                                                ) : '—'}
                                              </td>
                                            )
                                          })}
                                          <td className="px-2 py-1.5 border border-gray-300 text-center">
                                            <div className="flex justify-center gap-1 font-medium">
                                              <span 
                                                className="border-r border-gray-300 pr-1 cursor-help" 
                                                title="Total Cognitive domain value: Sum of all cognitive percentages from assessment criteria"
                                              >
                                                {Math.round(criteriaWithSubAssessments.reduce((sum, c) => sum + (c.criterion.cognitive || 0), 0))}
                                              </span>
                                              <span 
                                                className="border-r border-gray-300 pr-1 cursor-help" 
                                                title="Total Psychomotor domain value: Sum of all psychomotor percentages from assessment criteria"
                                              >
                                                {Math.round(criteriaWithSubAssessments.reduce((sum, c) => sum + (c.criterion.psychomotor || 0), 0))}
                                              </span>
                                              <span 
                                                className="cursor-help" 
                                                title="Total Affective domain value: Sum of all affective percentages from assessment criteria"
                                              >
                                                {Math.round(criteriaWithSubAssessments.reduce((sum, c) => sum + (c.criterion.affective || 0), 0))}
                                              </span>
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
                                      {viewingSyllabusILOs.map((ilo, iloIdx) => {
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
                                      {viewingSyllabusILOs.map((ilo, iloIdx) => (
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
                                          {viewingSyllabusILOs.map((ilo, iloIdx) => (
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
                                          {viewingSyllabusILOs.map((ilo, iloIdx) => (
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
                    <h3 className="text-sm font-bold italic text-gray-700 mb-1">Review Status</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewingSyllabus.review_status)}`}>
                      {viewingSyllabus.review_status || 'pending'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold italic text-gray-700 mb-1">Approval Status</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewingSyllabus.approval_status)}`}>
                      {viewingSyllabus.approval_status || 'pending'}
                    </span>
                  </div>
                </div>

                {/* Draft Section - Show Edit button for draft syllabi 
                    Drafts are identified by status='draft' or both review_status and approval_status being 'pending' */}
                {(viewingSyllabus.status === 'draft' || 
                  (viewingSyllabus.review_status === 'pending' && 
                   viewingSyllabus.approval_status === 'pending')) && (
                  <div className="pt-4 border-t border-gray-300">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-yellow-800">
                        <strong>Draft Syllabus:</strong> This syllabus is saved as a draft. You can continue editing it or submit it for review when ready.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          openEditModal(viewingSyllabus)
                          setShowViewModal(false)
                        }}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <PencilIcon className="h-4 w-4" />
                        Edit Syllabus
                      </button>
                      <button
                        onClick={() => handleSubmitForReview(viewingSyllabus)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <ArrowPathIcon className="h-4 w-4" />
                        Submit for Review
                      </button>
                    </div>
                  </div>
                )}

                {/* Revision Requested Section - Show Edit/Resubmit buttons when revision is requested */}
                {viewingSyllabus.review_status === 'needs_revision' && (
                  <div className="pt-4 border-t border-gray-300">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-orange-800">
                        <strong>Revision Requested:</strong> The program chair has requested revisions to this syllabus. 
                        Please edit the syllabus and resubmit it for review.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          openEditModal(viewingSyllabus)
                          setShowViewModal(false)
                        }}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <PencilIcon className="h-4 w-4" />
                        Edit Syllabus
                      </button>
                      <button
                        onClick={() => handleSubmitForReview(viewingSyllabus)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <ArrowPathIcon className="h-4 w-4" />
                        Resubmit for Review
                      </button>
                    </div>
                  </div>
                )}

                {/* Publish Section - Only show for approved syllabi */}
                {viewingSyllabus.approval_status === 'approved' && viewingSyllabus.review_status === 'approved' && (
                  <div className="pt-4 border-t border-gray-300">
                    {isPublished ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-green-800 flex items-center gap-2">
                          <CheckCircleIcon className="h-5 w-5" />
                          <strong>Published:</strong> This syllabus has been published. Assessments are now visible in the assessment tab.
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ArrowUpTrayIcon className="h-5 w-5" />
                        {isPublishing ? 'Publishing...' : 'Publish Syllabus'}
                      </button>
                    )}
                  </div>
                )}

                {/* Edit Request Section - Only show for approved syllabi */}
                {viewingSyllabus.approval_status === 'approved' && viewingSyllabus.review_status === 'approved' && (
                  <div className="pt-4 border-t border-gray-300">
                    {!showEditRequestForm ? (
                      <button
                        onClick={() => setShowEditRequestForm(true)}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        Request Edit
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-bold italic text-gray-700 mb-1">
                            Reason for Edit Request *
                          </label>
                          <textarea
                            value={editRequestReason}
                            onChange={(e) => setEditRequestReason(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            placeholder="Please provide a reason for requesting an edit to this approved syllabus..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setShowEditRequestForm(false)
                              setEditRequestReason('')
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSubmitEditRequest}
                            disabled={!editRequestReason.trim()}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            Submit Request
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
        </div>
      </div>
    </div>
      )}
    </>
  )
}

export default Syllabus

