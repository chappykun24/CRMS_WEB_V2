import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/UnifiedAuthContext'
import { safeSetItem, safeGetItem, minimizeClassData, minimizeStudentData, minimizeGradesData } from '../../utils/cacheUtils'
import { setSelectedClass as saveSelectedClass } from '../../utils/localStorageManager'
import LazyImage from '../../components/LazyImage'
import imageLoaderService from '../../services/imageLoaderService'
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid'

const Assessments = () => {
  const { user } = useAuth()
  const location = useLocation()
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClass, setSelectedClass] = useState(null)
  const [classes, setClasses] = useState([])
  
  // Tab navigation - check location state for default tab
  const [activeTab, setActiveTab] = useState(location.state?.defaultTab || 'assessments')
  
  // Clear cache when switching tabs/interfaces
  useEffect(() => {
    // Clear grading-related cache when leaving grading tab
    if (activeTab !== 'grading') {
      try {
        // Clear assessment grades cache (per assessment, can be large)
        const keysToRemove = []
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key && key.startsWith('assessment_grades_')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key))
        if (keysToRemove.length > 0) {
          console.log(`🧹 [CACHE] Cleared ${keysToRemove.length} assessment grades cache entries`)
        }
        
        // Clear in-memory grading state (keep students cache for faster re-entry)
        setGrades({})
        setOriginalGrades({})
        setSelectedAssessment(null)
        setImagesReady(false)
        
        console.log('🧹 [CACHE] Cleared in-memory grading state')
      } catch (error) {
        console.error('❌ [CACHE] Error clearing grading cache:', error)
      }
    }
    
    // Notify Header of tab change for breadcrumb updates
    try {
      localStorage.setItem('facultyActiveTab', activeTab)
      window.dispatchEvent(new CustomEvent('facultyTabChanged', {
        detail: { activeTab }
      }))
    } catch (error) {
      console.error('Error saving active tab:', error)
    }
  }, [activeTab])
  
  // Update ref when selectedClass changes
  useEffect(() => {
    selectedClassRef.current = selectedClass
  }, [selectedClass])

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
  
  // Grading states
  const [selectedAssessment, setSelectedAssessment] = useState(null)
  const [grades, setGrades] = useState({})
  const [originalGrades, setOriginalGrades] = useState({}) // Store original grades for change detection
  const [isSubmittingGrades, setIsSubmittingGrades] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [gradingLoading, setGradingLoading] = useState(false)
  const [imagesReady, setImagesReady] = useState(false) // Controls when images start loading
  
  // Cached students list for fast switching between assessments (like attendance)
  const [cachedStudentsList, setCachedStudentsList] = useState(null)
  const cachedClassIdRef = useRef(null)
  const selectedClassRef = useRef(selectedClass)
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'Quiz',
    category: 'Formative',
    total_points: 100,
    weight_percentage: 25,
    due_date: '',
    submission_deadline: '',
    grading_method: 'points',
    instructions: '',
    syllabus_id: ''
  })
  
  // Syllabi for the selected class
  const [syllabi, setSyllabi] = useState([])
  // Selected syllabus details (for assessment framework)
  const [selectedSyllabusDetails, setSelectedSyllabusDetails] = useState(null)
  // Assessment components from selected syllabus
  const [assessmentComponents, setAssessmentComponents] = useState([])

  // Load faculty classes - FAST initial load, show immediately
  useEffect(() => {
    const loadClasses = async () => {
      if (!user?.user_id) return
      
      // Show classes immediately if we have cached data
      const cacheKey = `classes_${user.user_id}`
      const cached = safeGetItem(cacheKey)
      if (cached) {
        const classesData = Array.isArray(cached) ? cached : []
        setClasses(classesData)
        setLoading(false) // Show cached data immediately
        
        // Auto-select class if provided in location state
        if (location.state?.selectedClassId) {
          const classToSelect = classesData.find(cls => cls.section_course_id === location.state.selectedClassId)
          if (classToSelect) {
            setSelectedClass(classToSelect)
          }
        }
      }
      
      // Fetch fresh data in background (non-blocking)
      try {
        const response = await fetch(`/api/section-courses/faculty/${user.user_id}`)
        if (response.ok) {
          const data = await response.json()
          const classesData = Array.isArray(data) ? data : []
          setClasses(classesData)
          // Cache minimized data for next time (excludes large images)
          safeSetItem(cacheKey, classesData, minimizeClassData)
          
          // Auto-select class if provided in location state
          if (location.state?.selectedClassId && !selectedClass) {
            const classToSelect = classesData.find(cls => cls.section_course_id === location.state.selectedClassId)
            if (classToSelect) {
              setSelectedClass(classToSelect)
            }
          }
        } else {
          if (!cached) setError('Failed to load classes')
        }
      } catch (error) {
        console.error('Error loading classes:', error)
        if (!cached) setError('Failed to load classes')
      } finally {
        setLoading(false)
      }
    }
    
      loadClasses()
  }, [user, location.state])

  // Cache students list when class is selected (for fast assessment switching)
  useEffect(() => {
    if (!selectedClass) {
      // Clear cache when no class is selected
      setCachedStudentsList(null)
      cachedClassIdRef.current = null
      return
    }
    
    const currentClassId = selectedClass.section_course_id
    
    // Only cache if we haven't cached for this class yet
    if (cachedClassIdRef.current === currentClassId) {
      return // Already cached for this class
    }
    
    // Check for cached students first
    const studentsCacheKey = `students_${currentClassId}`
    const cachedStudents = safeGetItem(studentsCacheKey)
    
    if (cachedStudents && Array.isArray(cachedStudents) && cachedStudents.length > 0) {
      // Verify cached students belong to current class
      const cachedClassId = cachedStudents[0]?.classId || cachedStudents[0]?.section_course_id
      if (cachedClassId === currentClassId) {
        console.log('✅ [GRADING] Using cached students:', cachedStudents.length, 'students')
        setCachedStudentsList(cachedStudents)
        cachedClassIdRef.current = currentClassId
      }
    }
    
    // Fetch students asynchronously in background (non-blocking)
    loadStudentsForClass(currentClassId, studentsCacheKey)
  }, [selectedClass?.section_course_id])

  // Load students for a class (async, cached)
  const loadStudentsForClass = async (sectionCourseId, cacheKey) => {
    if (!sectionCourseId) return
    
    try {
      const response = await fetch(`/api/section-courses/${sectionCourseId}/students`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      
      if (response.ok) {
        const studentsData = await response.json()
        const studentsList = Array.isArray(studentsData) ? studentsData : []
        
        // Sort by last name
        studentsList.sort((a, b) => {
          const lastNameA = extractSurname(a.full_name || '')
          const lastNameB = extractSurname(b.full_name || '')
          if (lastNameA !== lastNameB) {
            return lastNameA.localeCompare(lastNameB)
          }
          return (a.full_name || '').localeCompare(b.full_name || '')
        })
        
        // Add class ID to students for verification
        const studentsWithClassId = studentsList.map(student => ({
          ...student,
          classId: sectionCourseId
        }))
        
        setCachedStudentsList(studentsWithClassId)
        cachedClassIdRef.current = sectionCourseId
        
        // Cache students (minimized - without photos)
        safeSetItem(cacheKey, studentsWithClassId, minimizeStudentData)
        console.log('💾 [GRADING] Cached students:', studentsWithClassId.length, 'students')
      }
    } catch (error) {
      console.error('❌ [GRADING] Error fetching students:', error)
    }
  }

  // Clear cache when switching classes
  useEffect(() => {
    if (!selectedClass) {
      // Clear all cache when no class is selected
      setAssessments([])
      setSelectedAssessment(null)
      setGrades({})
      setOriginalGrades({})
      setSyllabi([])
      setCachedStudentsList(null)
      cachedClassIdRef.current = null
      setImagesReady(false)
      
      // Clear sessionStorage cache for this class
      try {
        const keysToRemove = []
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key && (
            key.startsWith('assessment_grades_') ||
            key.startsWith('assessments_')
          )) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key))
        if (keysToRemove.length > 0) {
          console.log(`🧹 [CACHE] Cleared ${keysToRemove.length} assessment cache entries`)
        }
      } catch (error) {
        console.error('❌ [CACHE] Error clearing assessment cache:', error)
      }
      return
    }
    
    // Clear previous class cache when switching to a new class
    const currentClassId = selectedClass.section_course_id
    if (cachedClassIdRef.current && cachedClassIdRef.current !== currentClassId) {
      console.log('🔄 [CACHE] Switching classes - clearing previous class cache')
      setCachedStudentsList(null)
      setGrades({})
      setOriginalGrades({})
      setSelectedAssessment(null)
      setImagesReady(false)
      
      // Clear all assessment grades cache (from previous class)
      try {
        const keysToRemove = []
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key && key.startsWith('assessment_grades_')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key))
        if (keysToRemove.length > 0) {
          console.log(`🧹 [CACHE] Cleared ${keysToRemove.length} previous class grades cache`)
        }
      } catch (error) {
        console.error('❌ [CACHE] Error clearing previous class cache:', error)
      }
    }
  }, [selectedClass?.section_course_id])

  // Load assessments ONLY when class is selected (lazy loading)
  useEffect(() => {
    if (!selectedClass) {
      return
    }
    
    // Check cache first for instant display
    const sectionId = selectedClass.section_course_id
    const assessmentsCacheKey = `assessments_${sectionId}`
    const cached = safeGetItem(assessmentsCacheKey)
    
    // Show cached data immediately if available
    if (cached) {
      setAssessments(Array.isArray(cached) ? cached : [])
    }
    
    // Fetch fresh data in background (non-blocking if cache exists)
    loadAssessments(sectionId, assessmentsCacheKey, !cached)
    
    // Load syllabi for this class
    loadSyllabiForClass(sectionId)
  }, [selectedClass])
  
  // Load syllabi for the selected class (only approved ones for linking)
  const loadSyllabiForClass = async (sectionCourseId) => {
    if (!sectionCourseId) return
    
    try {
      const response = await fetch(`/api/syllabi/class/${sectionCourseId}`)
      if (response.ok) {
        const data = await response.json()
        // Filter to show only approved syllabi for linking assessments
        const approvedSyllabi = Array.isArray(data) 
          ? data.filter(s => s.approval_status === 'approved') 
          : []
        setSyllabi(approvedSyllabi)
      }
    } catch (error) {
      console.error('Error loading syllabi:', error)
    }
  }

  const loadAssessments = async (sectionCourseId, cacheKey, showLoading = true) => {
    if (!sectionCourseId) return
    
    try {
      if (showLoading) setLoading(true)
      
      const response = await fetch(`/api/assessments/class/${sectionCourseId}`)
      if (response.ok) {
        const data = await response.json()
        const assessmentsData = Array.isArray(data) ? data : []
        setAssessments(assessmentsData)
        setError('')
        // Cache for next time (assessments are typically small)
        safeSetItem(cacheKey, assessmentsData)
      } else {
        setError('Failed to load assessments')
        if (showLoading) setAssessments([])
      }
    } catch (error) {
      console.error('Error loading assessments:', error)
      setError('Failed to load assessments')
      if (showLoading) setAssessments([])
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
    
    // If syllabus_id changes, load the syllabus details to get assessment framework
    if (name === 'syllabus_id') {
      if (value) {
        loadSyllabusDetails(value)
      } else {
        setSelectedSyllabusDetails(null)
        setAssessmentComponents([])
        // Reset type and weight when syllabus is unlinked
        setFormData(prev => ({
          ...prev,
          type: 'Quiz',
          weight_percentage: 25
        }))
      }
    }
  }
  
  // Load syllabus details to get assessment framework
  const loadSyllabusDetails = async (syllabusId) => {
    try {
      const response = await fetch(`/api/syllabi/${syllabusId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      if (response.ok) {
        const syllabus = await response.json()
        setSelectedSyllabusDetails(syllabus)
        
        // Extract assessment components from assessment_framework
        if (syllabus.assessment_framework) {
          let components = []
          if (typeof syllabus.assessment_framework === 'string') {
            try {
              const framework = JSON.parse(syllabus.assessment_framework)
              components = framework.components || []
            } catch (e) {
              console.error('Error parsing assessment_framework:', e)
            }
          } else if (syllabus.assessment_framework.components) {
            components = syllabus.assessment_framework.components
          }
          setAssessmentComponents(components)
        } else {
          setAssessmentComponents([])
        }
      }
    } catch (error) {
      console.error('Error loading syllabus details:', error)
      setAssessmentComponents([])
    }
  }
  
  // Handle assessment component selection
  const handleAssessmentComponentChange = (e) => {
    const selectedIndex = e.target.value
    if (selectedIndex === '' || !assessmentComponents[selectedIndex]) {
      return
    }
    
    const component = assessmentComponents[selectedIndex]
    setFormData(prev => ({
      ...prev,
      type: component.type || prev.type,
      weight_percentage: component.weight || prev.weight_percentage
    }))
  }

  const handleCreateAssessment = async (e) => {
    e.preventDefault()
    if (!selectedClass) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          ...formData,
          section_course_id: selectedClass.section_course_id,
          created_by: user.user_id
        })
      })

      if (response.ok) {
        const result = await response.json()
        setShowCreateModal(false)
        resetForm()
        loadAssessments(selectedClass.section_course_id)
        alert('Assessment created successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create assessment')
      }
    } catch (error) {
      console.error('Error creating assessment:', error)
      alert('Failed to create assessment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditAssessment = async (e) => {
    e.preventDefault()
    if (!editingAssessment) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/assessments/${editingAssessment.assessment_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowEditModal(false)
        setEditingAssessment(null)
        resetForm()
        loadAssessments(selectedClass.section_course_id)
        alert('Assessment updated successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update assessment')
      }
    } catch (error) {
      console.error('Error updating assessment:', error)
      alert('Failed to update assessment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePublishAssessment = async (assessmentId) => {
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/publish`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })

      if (response.ok) {
        loadAssessments(selectedClass.section_course_id)
        alert('Assessment published successfully!')
      } else {
        alert('Failed to publish assessment')
      }
    } catch (error) {
      console.error('Error publishing assessment:', error)
      alert('Failed to publish assessment')
    }
  }

  const handleUnpublishAssessment = async (assessmentId) => {
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/unpublish`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })

      if (response.ok) {
        loadAssessments(selectedClass.section_course_id)
        alert('Assessment unpublished successfully!')
      } else {
        alert('Failed to unpublish assessment')
      }
    } catch (error) {
      console.error('Error unpublishing assessment:', error)
      alert('Failed to unpublish assessment')
    }
  }

  const handleDeleteAssessment = async (assessmentId) => {
    if (!confirm('Are you sure you want to delete this assessment?')) return

    try {
      const response = await fetch(`/api/assessments/${assessmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })

      if (response.ok) {
        loadAssessments(selectedClass.section_course_id)
        alert('Assessment deleted successfully!')
      } else {
        alert('Failed to delete assessment')
      }
    } catch (error) {
      console.error('Error deleting assessment:', error)
      alert('Failed to delete assessment')
    }
  }

  const openEditModal = (assessment) => {
    setEditingAssessment(assessment)
    setFormData({
      title: assessment.title,
      description: assessment.description || '',
      type: assessment.type,
      category: assessment.category || 'Formative',
      total_points: assessment.total_points,
      weight_percentage: assessment.weight_percentage,
      due_date: assessment.due_date ? assessment.due_date.split('T')[0] : '',
      submission_deadline: assessment.submission_deadline ? assessment.submission_deadline.split('T')[0] : '',
      grading_method: assessment.grading_method || 'points',
      instructions: assessment.instructions || '',
      syllabus_id: assessment.syllabus_id || ''
    })
    // Load syllabi if not already loaded
    if (selectedClass && syllabi.length === 0) {
      loadSyllabiForClass(selectedClass.section_course_id)
    }
    setShowEditModal(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'Quiz',
      category: 'Formative',
      total_points: 100,
      weight_percentage: 25,
      due_date: '',
      submission_deadline: '',
      grading_method: 'points',
      instructions: '',
      syllabus_id: ''
    })
    setSelectedSyllabusDetails(null)
    setAssessmentComponents([])
  }

  const openCreateModal = () => {
    resetForm()
    // Load syllabi if not already loaded
    if (selectedClass && syllabi.length === 0) {
      loadSyllabiForClass(selectedClass.section_course_id)
    }
    setShowCreateModal(true)
  }

  // Helper function to extract surname (last word) for alphabetical sorting
  const extractSurname = (fullName) => {
    if (!fullName || typeof fullName !== 'string') return ''
    const tokens = fullName.trim().split(/\s+/)
    if (tokens.length === 0) return ''
    return tokens[tokens.length - 1].toLowerCase()
  }

  // Helper function to format name as "Last name, First name Middle"
  const formatName = (fullName) => {
    if (!fullName || typeof fullName !== 'string') return 'Unknown Student'
    const tokens = fullName.trim().split(/\s+/).filter(token => token.length > 0)
    if (tokens.length === 0) return 'Unknown Student'
    if (tokens.length === 1) return tokens[0] // Single name, return as is
    
    // Last name is the last token, first and middle names are the rest
    const lastName = tokens[tokens.length - 1]
    const firstAndMiddle = tokens.slice(0, -1).join(' ')
    
    return `${lastName}, ${firstAndMiddle}`
  }

  const filteredAssessments = assessments.filter(assessment =>
    assessment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    assessment.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'graded': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Exam': return '📝'
      case 'Quiz': return '❓'
      case 'Project': return '📋'
      case 'Assignment': return '📄'
      default: return '📊'
    }
  }

  // Grading functions - optimized with caching like attendance
  const loadGrades = useCallback(async (assessmentId) => {
    if (!assessmentId) return
    
    const currentSelectedClass = selectedClassRef.current || selectedClass
    if (!currentSelectedClass) {
      console.warn('⚠️ [GRADING] No class selected, cannot load grades')
      return
    }
    
    const currentClassId = currentSelectedClass.section_course_id
    const gradesCacheKey = `assessment_grades_${assessmentId}`
    
    // Reset images ready state when assessment changes
    setImagesReady(false)
    setError('')
    
    // Step 1: Use cached students list (instant display)
    let studentsToUse = null
    if (cachedStudentsList && cachedStudentsList.length > 0) {
      const cachedClassId = cachedStudentsList[0]?.classId || cachedStudentsList[0]?.section_course_id
      if (cachedClassId === currentClassId) {
        studentsToUse = cachedStudentsList
        console.log('✅ [GRADING] Using cached students:', studentsToUse.length, 'students')
      } else {
        console.warn('⚠️ [GRADING] Cached students do not match current class')
      }
    }
    
    // Step 2: Check cache for grades (instant display)
    const cachedGrades = safeGetItem(gradesCacheKey)
    if (cachedGrades && studentsToUse) {
      console.log('✅ [GRADING] Using cached grades for assessment:', assessmentId)
      
      // Merge cached grades with students (in case students were updated)
      const mergedGrades = {}
      studentsToUse.forEach(student => {
        const cachedGrade = cachedGrades[student.enrollment_id]
        if (cachedGrade) {
          mergedGrades[student.enrollment_id] = {
            ...cachedGrade,
            student_name: student.full_name || cachedGrade.student_name,
            student_number: student.student_number || cachedGrade.student_number,
            student_photo: student.student_photo || cachedGrade.student_photo
          }
        } else {
          // New student not in cached grades - create empty entry
          mergedGrades[student.enrollment_id] = {
            student_name: student.full_name,
            student_number: student.student_number,
            student_photo: student.student_photo,
            raw_score: '',
            late_penalty: '',
            feedback: '',
            submission_status: 'missing',
            due_date: null
          }
        }
      })
      
      setGrades(mergedGrades)
      setOriginalGrades(JSON.parse(JSON.stringify(mergedGrades)))
      
      // Delay image loading
      setTimeout(() => {
        setImagesReady(true)
        const imagesToLoad = Object.values(mergedGrades)
          .filter(g => g.student_photo)
          .map((g, idx) => ({ src: g.student_photo, id: `grade_${assessmentId}_${g.enrollment_id || idx}` }))
        if (imagesToLoad.length > 0) {
          imageLoaderService.queueImages(imagesToLoad, false)
        }
      }, 100)
    } else if (studentsToUse) {
      // No cached grades, but we have students - show students immediately
      console.log('📋 [GRADING] Showing students while grades load...')
      const initialGrades = {}
      studentsToUse.forEach(student => {
        initialGrades[student.enrollment_id] = {
          student_name: student.full_name,
          student_number: student.student_number,
          student_photo: student.student_photo,
          raw_score: '',
          late_penalty: '',
          feedback: '',
          submission_status: 'missing',
          due_date: null
        }
      })
      setGrades(initialGrades)
      setOriginalGrades(JSON.parse(JSON.stringify(initialGrades)))
      
      // Delay image loading
      setTimeout(() => {
        setImagesReady(true)
        const imagesToLoad = studentsToUse
          .filter(s => s.student_photo)
          .map((s, idx) => ({ src: s.student_photo, id: `grade_${assessmentId}_${s.enrollment_id || idx}` }))
        if (imagesToLoad.length > 0) {
          imageLoaderService.queueImages(imagesToLoad, false)
        }
      }, 100)
    }
    
    // Step 3: Fetch fresh grades asynchronously in background
    try {
      // Only show loading if no cache available
      if (!cachedGrades) {
        setGradingLoading(true)
      }
      
      const response = await fetch(`/api/grading/assessment/${assessmentId}/grades`)
      if (response.ok) {
        const text = await response.text()
        let data
        try {
          data = JSON.parse(text)
        } catch (parseError) {
          console.error('❌ [GRADING] Error parsing JSON response:', parseError)
          if (!cachedGrades) {
            setError('Failed to parse server response. The data may be corrupted.')
          }
          return
        }
        
        // Merge grades with students (use cached students if available)
        const studentsList = studentsToUse || cachedStudentsList || []
        const gradesMap = {}
        
        // First, add all students (ensures all students are shown even if no grade yet)
        studentsList.forEach(student => {
          gradesMap[student.enrollment_id] = {
            student_name: student.full_name,
            student_number: student.student_number,
            student_photo: student.student_photo,
            raw_score: '',
            late_penalty: '',
            feedback: '',
            submission_status: 'missing',
            due_date: null
          }
        })
        
        // Then, update with actual grades from API
        data.forEach(grade => {
          if (gradesMap[grade.enrollment_id]) {
            gradesMap[grade.enrollment_id] = {
              ...gradesMap[grade.enrollment_id],
              raw_score: grade.raw_score !== null ? grade.raw_score : '',
              late_penalty: grade.late_penalty !== null ? grade.late_penalty : '',
              feedback: grade.feedback || '',
              submission_status: grade.submission_status || 'missing',
              due_date: grade.due_date
            }
          } else {
            // Grade for student not in our list (shouldn't happen, but handle it)
            gradesMap[grade.enrollment_id] = {
              student_name: grade.full_name,
              student_number: grade.student_number,
              student_photo: grade.student_photo,
              raw_score: grade.raw_score !== null ? grade.raw_score : '',
              late_penalty: grade.late_penalty !== null ? grade.late_penalty : '',
              feedback: grade.feedback || '',
              submission_status: grade.submission_status || 'missing',
              due_date: grade.due_date
            }
          }
        })
        
        // Update grades (this will overwrite cached data with fresh data)
        setGrades(gradesMap)
        setOriginalGrades(JSON.parse(JSON.stringify(gradesMap)))
        
        // Cache grades (minimized - without photos)
        safeSetItem(gradesCacheKey, gradesMap, minimizeGradesData)
        console.log('💾 [GRADING] Cached grades for assessment:', assessmentId)
        
        // Load images asynchronously
        setTimeout(() => {
          setImagesReady(true)
          const imagesToLoad = Object.values(gradesMap)
            .filter(g => g.student_photo)
            .map((g, idx) => ({ src: g.student_photo, id: `grade_${assessmentId}_${g.enrollment_id || idx}` }))
          if (imagesToLoad.length > 0) {
            imageLoaderService.queueImages(imagesToLoad, false)
          }
        }, 100)
      } else {
        // Handle error response
        if (!cachedGrades) {
          try {
            const errorText = await response.text()
            let errorData
            try {
              errorData = JSON.parse(errorText)
              setError(errorData.error || 'Failed to load grades')
            } catch (parseError) {
              setError(`Failed to load grades (${response.status} ${response.statusText})`)
            }
          } catch (error) {
            setError(`Failed to load grades (${response.status} ${response.statusText})`)
          }
        }
      }
    } catch (error) {
      console.error('❌ [GRADING] Error loading grades:', error)
      if (!cachedGrades) {
        if (error.message && error.message.includes('JSON')) {
          setError('Failed to parse server response. Please try again.')
        } else if (error.message && error.message.includes('fetch')) {
          setError('Network error. Please check your connection and try again.')
        } else {
          setError('Failed to load grades')
        }
      }
    } finally {
      setGradingLoading(false)
    }
  }, [selectedClass, cachedStudentsList])

  const handleGradeChange = (enrollmentId, field, value) => {
    setGrades(prev => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        [field]: value
      }
    }))
  }

  const calculateAdjustedScore = (rawScore, latePenalty, totalPoints) => {
    const raw = parseFloat(rawScore) || 0
    const penalty = parseFloat(latePenalty) || 0
    const adjusted = Math.max(0, raw - penalty)
    return adjusted > totalPoints ? totalPoints : adjusted
  }

  const calculatePercentage = (adjustedScore, totalPoints) => {
    if (!totalPoints || totalPoints === 0) return 0
    return ((adjustedScore / totalPoints) * 100).toFixed(1)
  }

  const handleSubmitGrades = async () => {
    if (!selectedAssessment) return

    setIsSubmittingGrades(true)
    try {
      const gradesArray = Object.entries(grades).map(([enrollmentId, gradeData]) => ({
        enrollment_id: parseInt(enrollmentId),
        raw_score: gradeData.submission_status === 'missing' ? 0 : (parseFloat(gradeData.raw_score) || 0),
        late_penalty: gradeData.submission_status === 'missing' || gradeData.submission_status === 'ontime' ? 0 : (parseFloat(gradeData.late_penalty) || 0),
        feedback: gradeData.feedback || '',
        graded_by: user.user_id,
        submission_status: gradeData.submission_status || 'missing'
      }))

      const response = await fetch('/api/grading/submit-grades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ 
          assessment_id: selectedAssessment.assessment_id,
          grades: gradesArray 
        })
      })

      if (response.ok) {
        setSuccessMessage('Grades saved successfully!')
        setTimeout(() => setSuccessMessage(''), 3000)
        // Clear error message
        setError('')
        // Update original grades to reflect saved state
        setOriginalGrades(JSON.parse(JSON.stringify(grades)))
        
        // Update cache with saved grades
        if (selectedAssessment?.assessment_id) {
          const gradesCacheKey = `assessment_grades_${selectedAssessment.assessment_id}`
          safeSetItem(gradesCacheKey, grades, minimizeGradesData)
          console.log('💾 [GRADING] Updated cache after saving grades')
        }
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to save grades')
      }
    } catch (error) {
      console.error('Error submitting grades:', error)
      setError('Failed to save grades')
    } finally {
      setIsSubmittingGrades(false)
    }
  }

  // Check if there are any changes
  const hasChanges = () => {
    const currentStr = JSON.stringify(grades)
    const originalStr = JSON.stringify(originalGrades)
    return currentStr !== originalStr
  }

  const handleAssessmentSelect = (assessment) => {
    setSelectedAssessment(assessment)
    setOriginalGrades({}) // Reset original grades when selecting new assessment
    loadGrades(assessment.assessment_id)
  }

  return (
    <>
      <style>{`
        .assessment-card {
          transition: all 0.2s ease-in-out;
        }
        .assessment-card:hover {
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
          {/* Header and Navigation */}
          <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 z-40">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between bg-gray-50">
                <div className="flex space-x-4 sm:space-x-6 lg:space-x-8">
                  <button
                    onClick={() => setActiveTab('assessments')}
                    className={`py-2 px-3 sm:px-4 font-medium text-xs sm:text-sm transition-colors bg-transparent border-0 focus:outline-none focus:ring-0 ${
                      activeTab === 'assessments'
                        ? 'text-red-600 border-b-2 border-red-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Assessments
                  </button>
                  <button
                    onClick={() => setActiveTab('grading')}
                    className={`py-2 px-3 sm:px-4 font-medium text-xs sm:text-sm transition-colors bg-transparent border-0 focus:outline-none focus:ring-0 ${
                      activeTab === 'grading'
                        ? 'text-red-600 border-b-2 border-red-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Grading
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {/* Tab Content */}
            {activeTab === 'assessments' && (
              <div className="px-8 py-6 h-full overflow-y-auto">
                {/* Assessment Content with Sidebar */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
                  {/* Main Content - Assessments Table */}
                  <div className="lg:col-span-4 flex flex-col min-h-0">
                    {/* Search Bar and Create Button - Only show when subject is selected */}
                    {selectedClass && (
                      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                        <div className="relative flex-1">
                          <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" placeholder="Search assessments..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500" />
                          </div>
                        </div>
                        <button onClick={openCreateModal} className="inline-flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors">
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
                    
                    {/* Assessments Table */}
                    {selectedClass && (
                      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300 flex flex-col flex-1 min-h-0">
                        {loading ? (
                          <div className="flex-1 overflow-y-auto min-h-0">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assessment</th>
                                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-8 py-4">
                                      <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10">
                                          <div className="h-10 w-10 rounded-lg bg-gray-200 skeleton"></div>
                                        </div>
                                        <div className="ml-4">
                                          <div className="h-4 bg-gray-200 rounded w-32 skeleton mb-2"></div>
                                          <div className="h-3 bg-gray-100 rounded w-24 skeleton"></div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-8 py-4">
                                      <div className="h-6 bg-gray-200 rounded-full w-16 skeleton"></div>
                                    </td>
                                    <td className="px-8 py-4">
                                      <div className="h-4 bg-gray-200 rounded w-8 skeleton"></div>
                                    </td>
                                    <td className="px-8 py-4">
                                      <div className="h-4 bg-gray-200 rounded w-8 skeleton"></div>
                                    </td>
                                    <td className="px-8 py-4">
                                      <div className="h-4 bg-gray-200 rounded w-20 skeleton"></div>
                                    </td>
                                    <td className="px-8 py-4">
                                      <div className="h-6 bg-gray-200 rounded-full w-16 skeleton"></div>
                                    </td>
                                    <td className="px-8 py-4">
                                      <div className="flex items-center space-x-2">
                                        <div className="h-4 w-4 bg-gray-200 rounded skeleton"></div>
                                        <div className="h-4 w-4 bg-gray-200 rounded skeleton"></div>
                                        <div className="h-4 w-4 bg-gray-200 rounded skeleton"></div>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : filteredAssessments.length > 0 ? (
                          <div className="flex-1 overflow-y-auto min-h-0">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assessment</th>
                                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {filteredAssessments.map((assessment) => (
                                  <tr key={assessment.assessment_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">{assessment.title}</div>
                                        <div className="text-sm text-gray-500">{assessment.description || 'No description'}</div>
                                        {assessment.syllabus_title && (
                                          <div className="text-xs mt-1">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                              assessment.syllabus_approval_status === 'approved' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                              📋 {assessment.syllabus_title} (v{assessment.syllabus_version})
                                              {assessment.syllabus_approval_status !== 'approved' && (
                                                <span className="ml-1 text-xs">- {assessment.syllabus_approval_status || 'Pending Approval'}</span>
                                              )}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-8 py-4">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {assessment.type}
                                      </span>
                                    </td>
                                    <td className="px-8 py-4">
                                      <div className="text-sm text-gray-900">{assessment.total_points}</div>
                                    </td>
                                    <td className="px-8 py-4">
                                      <div className="text-sm text-gray-900">{assessment.weight_percentage}%</div>
                                    </td>
                                    <td className="px-8 py-4">
                                      <div className="text-sm text-gray-900">
                                        {assessment.due_date ? new Date(assessment.due_date).toLocaleDateString() : '—'}
                                      </div>
                                    </td>
                                    <td className="px-8 py-4">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(assessment.status)}`}>
                                        {assessment.status}
                                      </span>
                                    </td>
                                    <td className="px-8 py-4">
                                      <div className="flex items-center space-x-2">
                                        <button onClick={() => openEditModal(assessment)} className="text-red-600 hover:text-red-900"><PencilIcon className="h-4 w-4" /></button>
                                        {assessment.is_published ? (
                                          <button onClick={() => handleUnpublishAssessment(assessment.assessment_id)} className="text-yellow-600 hover:text-yellow-900"><XMarkIcon className="h-4 w-4" /></button>
                                        ) : (
                                          <button onClick={() => handlePublishAssessment(assessment.assessment_id)} className="text-green-600 hover:text-green-900"><CheckIcon className="h-4 w-4" /></button>
                                        )}
                                        <button onClick={() => handleDeleteAssessment(assessment.assessment_id)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-4 w-4" /></button>
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
                              <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments found</h3>
                              <p className="text-gray-500">
                                {searchQuery ? 'No assessments match your search.' : 'Create your first assessment to get started.'}
                              </p>
                              {!searchQuery && (
                                <button onClick={openCreateModal} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                                  <PlusIcon className="h-4 w-4" />
                                  Create Assessment
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
                          <ClipboardDocumentListIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Class</h3>
                          <p className="text-gray-500">Choose a class from the sidebar to view its assessments.</p>
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
              </div>
            )}

            {/* Grading Tab Content */}
            {activeTab === 'grading' && (
              <div className="px-8 py-6 h-full overflow-y-auto">
                <div className="mb-4 flex-shrink-0">
                  {error && (
                    <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs sm:text-sm text-red-800">{error}</p>
                    </div>
                  )}
                  {successMessage && (
                    <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs sm:text-sm text-green-800">{successMessage}</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full min-h-0">
                  {/* Main Content - Student List for Grading */}
                  <div className="lg:col-span-3 flex flex-col min-h-0">
                    {selectedAssessment ? (
                      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300 flex flex-col flex-1 min-h-0">
                        <div className="px-4 sm:px-6 py-3 border-b border-gray-200 flex-shrink-0">
                          <h2 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                            Grades for: {selectedAssessment.title} <span className="text-xs sm:text-sm text-gray-600">({selectedAssessment.total_points} pts)</span>
                          </h2>
                        </div>
                        {gradingLoading ? (
                          <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                            <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
                              <div className="min-w-[900px]">
                                <div className="px-4 sm:px-6 py-3 bg-gray-50 sticky top-0 z-30 border-b border-gray-200 flex items-center text-xs font-medium text-gray-600 uppercase tracking-wide">
                                  <div className="min-w-[220px] w-[220px] flex-shrink-0 sticky left-0 bg-gray-50 z-40 pr-3">Student</div>
                                  <div className="min-w-[90px] w-[90px] flex-shrink-0 px-3">Raw</div>
                                  <div className="min-w-[90px] w-[90px] flex-shrink-0 px-3">Penalty</div>
                                  <div className="min-w-[90px] w-[90px] flex-shrink-0 px-3">Adjusted</div>
                                  <div className="min-w-[220px] w-[220px] flex-shrink-0 px-3">Feedback</div>
                                  <div className="min-w-[220px] w-[220px] flex-shrink-0 px-3">Status / Percent</div>
                                </div>
                                <ul className="divide-y divide-gray-200">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <li key={i} className="flex items-center px-4 sm:px-6 py-4 hover:bg-gray-50">
                                      <div className="min-w-[220px] w-[220px] flex-shrink-0 flex items-center gap-3 sticky left-0 bg-white z-30 pr-3 border-r border-gray-100">
                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 skeleton animate-pulse"></div>
                                        <div className="flex-1 min-w-0">
                                          <div className="h-4 bg-gray-200 rounded w-28 skeleton animate-pulse mb-1.5"></div>
                                          <div className="h-3 bg-gray-100 rounded w-20 skeleton animate-pulse"></div>
                                        </div>
                                      </div>
                                      <div className="min-w-[90px] w-[90px] flex-shrink-0 px-3">
                                        <div className="h-9 bg-gray-200 rounded skeleton animate-pulse"></div>
                                      </div>
                                      <div className="min-w-[90px] w-[90px] flex-shrink-0 px-3">
                                        <div className="h-9 bg-gray-200 rounded skeleton animate-pulse"></div>
                                      </div>
                                      <div className="min-w-[90px] w-[90px] flex-shrink-0 px-3">
                                        <div className="h-5 bg-gray-200 rounded w-12 skeleton animate-pulse mx-auto"></div>
                                      </div>
                                      <div className="min-w-[220px] w-[220px] flex-shrink-0 px-3">
                                        <div className="h-14 bg-gray-200 rounded skeleton animate-pulse"></div>
                                      </div>
                                      <div className="min-w-[220px] w-[220px] flex-shrink-0 px-3">
                                        <div className="flex items-center gap-2">
                                          <div className="flex gap-1.5 flex-shrink-0">
                                            <div className="h-7 bg-gray-200 rounded w-16 skeleton animate-pulse"></div>
                                            <div className="h-7 bg-gray-200 rounded w-14 skeleton animate-pulse"></div>
                                            <div className="h-7 bg-gray-200 rounded w-16 skeleton animate-pulse"></div>
                                          </div>
                                          <div className="h-4 bg-gray-200 rounded w-12 skeleton animate-pulse"></div>
                                        </div>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        ) : Object.keys(grades).length > 0 ? (
                          <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                            <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
                              <div className="min-w-[900px]">
                                <div className="px-4 sm:px-6 py-3 bg-gray-50 sticky top-0 z-30 border-b border-gray-200 flex items-center text-xs font-medium text-gray-600 uppercase tracking-wide">
                                  <div className="min-w-[220px] w-[220px] flex-shrink-0 sticky left-0 bg-gray-50 z-40 pr-3">Student</div>
                                  <div className="min-w-[90px] w-[90px] flex-shrink-0 px-3">Raw</div>
                                  <div className="min-w-[90px] w-[90px] flex-shrink-0 px-3">Penalty</div>
                                  <div className="min-w-[90px] w-[90px] flex-shrink-0 px-3">Adjusted</div>
                                  <div className="min-w-[220px] w-[220px] flex-shrink-0 px-3">Feedback</div>
                                  <div className="min-w-[220px] w-[220px] flex-shrink-0 px-3">Status / Percent</div>
                                </div>
                                <ul className="divide-y divide-gray-200">
                                  {Object.entries(grades)
                                    .sort(([enrollmentIdA, gradeDataA], [enrollmentIdB, gradeDataB]) => {
                                      const aLast = extractSurname(gradeDataA.student_name || '')
                                      const bLast = extractSurname(gradeDataB.student_name || '')
                                      if (aLast === bLast) {
                                        // If last names are the same, sort by full name
                                        return (gradeDataA.student_name || '').localeCompare(gradeDataB.student_name || '')
                                      }
                                      return aLast.localeCompare(bLast)
                                    })
                                    .map(([enrollmentId, gradeData]) => (
                                    <li key={enrollmentId} className="flex items-center px-4 sm:px-6 py-4 hover:bg-gray-50 bg-white">
                                      <div className="min-w-[220px] w-[220px] flex-shrink-0 flex items-center gap-3 sticky left-0 bg-white z-30 pr-3 border-r border-gray-100">
                                        <LazyImage
                                          src={gradeData.student_photo} 
                                          alt={gradeData.student_name || 'Student'}
                                          size="md"
                                          shape="circle"
                                          className="border border-gray-200 flex-shrink-0"
                                          delayLoad={!imagesReady}
                                          priority={false}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-medium text-gray-900 truncate">{formatName(gradeData.student_name) || 'Student'}</div>
                                          <div className="text-xs text-gray-500 truncate">SR: {gradeData.student_number || 'N/A'}</div>
                                        </div>
                                      </div>
                                      <div className="min-w-[90px] w-[90px] flex-shrink-0 px-3">
                                        <input
                                          type="number"
                                          value={gradeData.raw_score || ''}
                                          onChange={(e) => handleGradeChange(enrollmentId, 'raw_score', e.target.value)}
                                          className="w-full p-2 text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                                          min="0"
                                          max={selectedAssessment.total_points}
                                          disabled={gradeData.submission_status === 'missing'}
                                        />
                                      </div>
                                      <div className="min-w-[90px] w-[90px] flex-shrink-0 px-3">
                                        <input
                                          type="number"
                                          value={gradeData.late_penalty || ''}
                                          onChange={(e) => handleGradeChange(enrollmentId, 'late_penalty', e.target.value)}
                                          className="w-full p-2 text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                                          min="0"
                                          disabled={gradeData.submission_status === 'missing' || gradeData.submission_status === 'ontime'}
                                        />
                                      </div>
                                      <div className="min-w-[90px] w-[90px] flex-shrink-0 px-3 text-sm font-medium text-gray-900 text-center">
                                        {gradeData.submission_status === 'missing' ? '—' : calculateAdjustedScore(gradeData.raw_score, gradeData.late_penalty, selectedAssessment.total_points).toFixed(2)}
                                      </div>
                                      <div className="min-w-[220px] w-[220px] flex-shrink-0 px-3">
                                        <textarea
                                          value={gradeData.feedback || ''}
                                          onChange={(e) => handleGradeChange(enrollmentId, 'feedback', e.target.value)}
                                          className="w-full p-2 text-xs rounded-md border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none transition-colors"
                                          rows="2"
                                          placeholder="Feedback..."
                                          maxLength={200}
                                        />
                                      </div>
                                      <div className="min-w-[220px] w-[220px] flex-shrink-0 px-3">
                                        <div className="flex items-center gap-2">
                                          <div className="flex gap-1.5 flex-shrink-0">
                                            <button
                                              onClick={() => handleGradeChange(enrollmentId, 'submission_status', 'ontime')}
                                              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                                                gradeData.submission_status === 'ontime'
                                                  ? 'bg-green-100 text-green-800 border border-green-300 shadow-sm'
                                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                                              }`}
                                              title="On Time"
                                            >
                                              On Time
                                            </button>
                                            <button
                                              onClick={() => handleGradeChange(enrollmentId, 'submission_status', 'late')}
                                              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                                                gradeData.submission_status === 'late'
                                                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-300 shadow-sm'
                                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                                              }`}
                                              title="Late"
                                            >
                                              Late
                                            </button>
                                            <button
                                              onClick={() => handleGradeChange(enrollmentId, 'submission_status', 'missing')}
                                              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                                                gradeData.submission_status === 'missing'
                                                  ? 'bg-red-100 text-red-800 border border-red-300 shadow-sm'
                                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                                              }`}
                                              title="Missing"
                                            >
                                              Missing
                                            </button>
                                          </div>
                                          <div className="text-xs font-semibold text-gray-900 whitespace-nowrap ml-1">
                                            {gradeData.submission_status === 'missing' ? '—' : calculatePercentage(calculateAdjustedScore(gradeData.raw_score, gradeData.late_penalty, selectedAssessment.total_points), selectedAssessment.total_points) + '%'}
                                          </div>
                                        </div>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center py-16">
                            <div className="text-center">
                              <UserGroupIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                              <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
                              <p className="text-gray-500">No students enrolled in this assessment yet.</p>
                            </div>
                          </div>
                        )}
                        {Object.keys(grades).length > 0 && (
                          <div className="flex-shrink-0 bg-white px-4 sm:px-6 py-3 border-t border-gray-200 flex justify-end shadow-sm z-10">
                            <button
                              onClick={handleSubmitGrades}
                              disabled={isSubmittingGrades || !selectedAssessment || Object.keys(grades).length === 0 || !hasChanges()}
                              className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors duration-300 ${
                                isSubmittingGrades || !hasChanges()
                                  ? 'bg-gray-400 cursor-not-allowed'
                                  : 'bg-red-600 hover:bg-red-700'
                              } focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-white`}
                            >
                              {isSubmittingGrades ? (
                                <span className="flex items-center justify-center">
                                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                                  <span className="hidden sm:inline">Saving...</span>
                                  <span className="sm:hidden">Saving</span>
                                </span>
                              ) : (
                                <span className="flex items-center justify-center">
                                  <CheckIcon className="h-4 w-4 mr-2" />
                                  <span className="hidden sm:inline">Save Grades</span>
                                  <span className="sm:hidden">Save</span>
                                </span>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : !selectedClass ? (
                      <div className="bg-white rounded-lg shadow-sm border border-gray-300 flex items-center justify-center flex-1 min-h-0">
                        <div className="text-center">
                          <ClipboardDocumentCheckIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Class</h3>
                          <p className="text-gray-500">Choose a class from the sidebar to start grading</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg shadow-sm border border-gray-300 flex items-center justify-center flex-1 min-h-0">
                        <div className="text-center">
                          <ClipboardDocumentCheckIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Assessment</h3>
                          <p className="text-gray-500">Choose an assessment to start grading</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Sidebar - Classes and Assessments */}
                  <div className="lg:col-span-1 flex flex-col min-h-0">
                    {!selectedClass ? (
                      // Classes Selection
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
                    ) : (
                      // Assessments Selection
                      <div className="bg-white rounded-lg shadow-sm border border-gray-300 flex flex-col h-full">
                        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                          <div className="mb-2">
                            <h3 className="text-sm font-medium text-gray-900 truncate" title={selectedClass.course_title}>{selectedClass.course_title}</h3>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedClass(null)
                              setSelectedAssessment(null)
                              setGrades({})
                              setOriginalGrades({})
                            }}
                            className="flex items-center space-x-2 text-xs text-gray-600 hover:text-red-600 transition-colors"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span>Back to Classes</span>
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto min-h-0">
                          {loading ? (
                            <div className="p-4 space-y-2">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="p-3 rounded-lg border border-gray-200 animate-pulse">
                                  <div className="flex items-center space-x-3">
                                    <div className="flex-1">
                                      <div className="h-4 bg-gray-200 rounded w-2/3 skeleton mb-1"></div>
                                      <div className="h-3 bg-gray-100 rounded w-1/3 skeleton"></div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : assessments.length > 0 ? (
                            <div className="p-4 space-y-2">
                              {assessments.map((assessment) => (
                                <div
                                  key={assessment.assessment_id}
                                  onClick={() => handleAssessmentSelect(assessment)}
                                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm border ${
                                    selectedAssessment?.assessment_id === assessment.assessment_id
                                      ? 'border-gray-300 bg-gray-50'
                                      : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                                  } group`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <p className={`font-medium text-sm truncate ${
                                        selectedAssessment?.assessment_id === assessment.assessment_id
                                          ? 'text-gray-900'
                                          : 'text-gray-900 group-hover:text-gray-900'
                                      }`}>
                                        {assessment.title}
                                      </p>
                                      <div className="flex items-center space-x-2 mt-1">
                                        <span className="text-xs text-gray-500">{assessment.type}</span>
                                        <span className="text-gray-300">•</span>
                                        <span className="text-xs text-gray-500">{assessment.total_points} pts</span>
                                      </div>
                                    </div>
                                    {selectedAssessment?.assessment_id === assessment.assessment_id && (
                                      <div className="h-2 w-2 bg-gray-500 rounded-full flex-shrink-0 ml-2"></div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex-1 flex items-center justify-center p-8">
                              <div className="text-center">
                                <ClipboardDocumentCheckIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments found</h3>
                                <p className="text-sm text-gray-500">Create assessments for this class to start grading.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Create Assessment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Assessment</h2>
              
              <form onSubmit={handleCreateAssessment} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="e.g., Midterm Exam"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assessment Type
                      {assessmentComponents.length > 0 && (
                        <span className="ml-2 text-xs text-gray-500">(from syllabus)</span>
                      )}
                    </label>
                    {/* Show assessment components dropdown if syllabus is linked and has components */}
                    {assessmentComponents.length > 0 ? (
                      <div className="space-y-2">
                        <select
                          onChange={handleAssessmentComponentChange}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50 text-sm"
                        >
                          <option value="">Select from syllabus framework...</option>
                          {assessmentComponents.map((comp, index) => (
                            <option key={index} value={index}>
                              {comp.type} - {comp.weight}% {comp.count ? `(${comp.count} ${comp.count === 1 ? 'item' : 'items'})` : ''}
                            </option>
                          ))}
                        </select>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                          required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="Quiz">Quiz</option>
                      <option value="Exam">Exam</option>
                      <option value="Project">Project</option>
                      <option value="Assignment">Assignment</option>
                      <option value="Lab">Lab</option>
                          <option value="Presentation">Presentation</option>
                          <option value="Midterm Exam">Midterm Exam</option>
                          <option value="Final Exam">Final Exam</option>
                          {/* Add custom types from syllabus if not in default list */}
                          {assessmentComponents
                            .filter(comp => !['Quiz', 'Exam', 'Project', 'Assignment', 'Lab', 'Presentation', 'Midterm Exam', 'Final Exam'].includes(comp.type))
                            .map((comp, index) => (
                              <option key={`custom-${index}`} value={comp.type}>
                                {comp.type}
                              </option>
                            ))
                          }
                    </select>
                        <p className="text-xs text-gray-500">
                          Select from syllabus framework above to auto-fill type and weight, or choose manually below.
                        </p>
                      </div>
                    ) : (
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="Quiz">Quiz</option>
                        <option value="Exam">Exam</option>
                        <option value="Project">Project</option>
                        <option value="Assignment">Assignment</option>
                        <option value="Lab">Lab</option>
                        <option value="Presentation">Presentation</option>
                        <option value="Midterm Exam">Midterm Exam</option>
                        <option value="Final Exam">Final Exam</option>
                      </select>
                    )}
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
                    placeholder="Assessment description..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Points</label>
                    <input
                      type="number"
                      name="total_points"
                      value={formData.total_points}
                      onChange={handleInputChange}
                      required
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight (%)
                      {assessmentComponents.length > 0 && formData.weight_percentage && (
                        <span className="ml-2 text-xs text-gray-500">
                          {assessmentComponents.some(comp => comp.weight === parseFloat(formData.weight_percentage))
                            ? '✓ Matches syllabus'
                            : '⚠ Different from syllabus'}
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      name="weight_percentage"
                      value={formData.weight_percentage}
                      onChange={handleInputChange}
                      required
                      min="0"
                      max="100"
                      step="0.1"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                        assessmentComponents.length > 0 && formData.weight_percentage && 
                        !assessmentComponents.some(comp => comp.weight === parseFloat(formData.weight_percentage))
                          ? 'border-yellow-300 bg-yellow-50'
                          : 'border-gray-300'
                      }`}
                    />
                    {assessmentComponents.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Syllabus weights: {assessmentComponents.map(comp => `${comp.type} (${comp.weight}%)`).join(', ')}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="Formative">Formative</option>
                      <option value="Summative">Summative</option>
                      <option value="Diagnostic">Diagnostic</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      name="due_date"
                      value={formData.due_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Submission Deadline</label>
                    <input
                      type="datetime-local"
                      name="submission_deadline"
                      value={formData.submission_deadline}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                  <textarea
                    name="instructions"
                    value={formData.instructions}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Instructions for students..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Syllabus (Optional)
                    {assessmentComponents.length > 0 && (
                      <span className="ml-2 text-xs text-green-600">✓ Framework loaded</span>
                    )}
                  </label>
                  <select
                    name="syllabus_id"
                    value={formData.syllabus_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">No syllabus linked</option>
                    {syllabi.length === 0 ? (
                      <option value="" disabled>No approved syllabi available</option>
                    ) : (
                      syllabi.map((syllabus) => (
                        <option key={syllabus.syllabus_id} value={syllabus.syllabus_id}>
                          {syllabus.title} (v{syllabus.version}) - Approved
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Link this assessment to an approved syllabus to connect it with ILOs and course outcomes. 
                    Only approved syllabi are available for linking. Selecting a syllabus will load its assessment framework.
                  </p>
                  {assessmentComponents.length > 0 && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                      <strong>Available assessment types from syllabus:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {assessmentComponents.map((comp, index) => (
                          <li key={index}>
                            {comp.type}: {comp.weight}% {comp.count ? `(${comp.count} ${comp.count === 1 ? 'item' : 'items'})` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
                    {isSubmitting ? 'Creating...' : 'Create Assessment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Assessment Modal */}
      {showEditModal && editingAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Assessment</h2>
              
              <form onSubmit={handleEditAssessment} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assessment Type
                      {assessmentComponents.length > 0 && (
                        <span className="ml-2 text-xs text-gray-500">(from syllabus)</span>
                      )}
                    </label>
                    {/* Show assessment components dropdown if syllabus is linked and has components */}
                    {assessmentComponents.length > 0 ? (
                      <div className="space-y-2">
                        <select
                          onChange={handleAssessmentComponentChange}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50 text-sm"
                        >
                          <option value="">Select from syllabus framework...</option>
                          {assessmentComponents.map((comp, index) => (
                            <option key={index} value={index}>
                              {comp.type} - {comp.weight}% {comp.count ? `(${comp.count} ${comp.count === 1 ? 'item' : 'items'})` : ''}
                            </option>
                          ))}
                        </select>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                          required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="Quiz">Quiz</option>
                      <option value="Exam">Exam</option>
                      <option value="Project">Project</option>
                      <option value="Assignment">Assignment</option>
                      <option value="Lab">Lab</option>
                          <option value="Presentation">Presentation</option>
                          <option value="Midterm Exam">Midterm Exam</option>
                          <option value="Final Exam">Final Exam</option>
                          {/* Add custom types from syllabus if not in default list */}
                          {assessmentComponents
                            .filter(comp => !['Quiz', 'Exam', 'Project', 'Assignment', 'Lab', 'Presentation', 'Midterm Exam', 'Final Exam'].includes(comp.type))
                            .map((comp, index) => (
                              <option key={`custom-${index}`} value={comp.type}>
                                {comp.type}
                              </option>
                            ))
                          }
                    </select>
                        <p className="text-xs text-gray-500">
                          Select from syllabus framework above to auto-fill type and weight, or choose manually below.
                        </p>
                      </div>
                    ) : (
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="Quiz">Quiz</option>
                        <option value="Exam">Exam</option>
                        <option value="Project">Project</option>
                        <option value="Assignment">Assignment</option>
                        <option value="Lab">Lab</option>
                        <option value="Presentation">Presentation</option>
                        <option value="Midterm Exam">Midterm Exam</option>
                        <option value="Final Exam">Final Exam</option>
                      </select>
                    )}
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Points</label>
                    <input
                      type="number"
                      name="total_points"
                      value={formData.total_points}
                      onChange={handleInputChange}
                      required
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight (%)
                      {assessmentComponents.length > 0 && formData.weight_percentage && (
                        <span className="ml-2 text-xs text-gray-500">
                          {assessmentComponents.some(comp => comp.weight === parseFloat(formData.weight_percentage))
                            ? '✓ Matches syllabus'
                            : '⚠ Different from syllabus'}
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      name="weight_percentage"
                      value={formData.weight_percentage}
                      onChange={handleInputChange}
                      required
                      min="0"
                      max="100"
                      step="0.1"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                        assessmentComponents.length > 0 && formData.weight_percentage && 
                        !assessmentComponents.some(comp => comp.weight === parseFloat(formData.weight_percentage))
                          ? 'border-yellow-300 bg-yellow-50'
                          : 'border-gray-300'
                      }`}
                    />
                    {assessmentComponents.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Syllabus weights: {assessmentComponents.map(comp => `${comp.type} (${comp.weight}%)`).join(', ')}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="Formative">Formative</option>
                      <option value="Summative">Summative</option>
                      <option value="Diagnostic">Diagnostic</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      name="due_date"
                      value={formData.due_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Submission Deadline</label>
                    <input
                      type="datetime-local"
                      name="submission_deadline"
                      value={formData.submission_deadline}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                  <textarea
                    name="instructions"
                    value={formData.instructions}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Syllabus (Optional)
                    {assessmentComponents.length > 0 && (
                      <span className="ml-2 text-xs text-green-600">✓ Framework loaded</span>
                    )}
                  </label>
                  <select
                    name="syllabus_id"
                    value={formData.syllabus_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">No syllabus linked</option>
                    {syllabi.length === 0 ? (
                      <option value="" disabled>No approved syllabi available</option>
                    ) : (
                      syllabi.map((syllabus) => (
                        <option key={syllabus.syllabus_id} value={syllabus.syllabus_id}>
                          {syllabus.title} (v{syllabus.version}) - Approved
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Link this assessment to an approved syllabus to connect it with ILOs and course outcomes. 
                    Only approved syllabi are available for linking. Selecting a syllabus will load its assessment framework.
                  </p>
                  {assessmentComponents.length > 0 && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                      <strong>Available assessment types from syllabus:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {assessmentComponents.map((comp, index) => (
                          <li key={index}>
                            {comp.type}: {comp.weight}% {comp.count ? `(${comp.count} ${comp.count === 1 ? 'item' : 'items'})` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
                    {isSubmitting ? 'Updating...' : 'Update Assessment'}
                  </button>
                </div>
              </form>
        </div>
      </div>
    </div>
      )}
    </>
  )
}

export default Assessments