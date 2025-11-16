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
  ArrowPathIcon,
  EllipsisVerticalIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/solid'

const Assessments = () => {
  const { user } = useAuth()
  const location = useLocation()
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all') // Filter by assessment type
  const [selectedClass, setSelectedClass] = useState(null)
  const [classes, setClasses] = useState([])
  const [activeTermId, setActiveTermId] = useState(null)
  
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
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorModalMessage, setErrorModalMessage] = useState('')
  const [savedGradesCount, setSavedGradesCount] = useState(0)
  const [gradingLoading, setGradingLoading] = useState(false)
  const [imagesReady, setImagesReady] = useState(false) // Controls when images start loading
  
  // Assessment menu state
  const [openMenuId, setOpenMenuId] = useState(null)
  const menuRefs = useRef({})
  const [expandedGroups, setExpandedGroups] = useState(new Set())
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && menuRefs.current[openMenuId]) {
        if (!menuRefs.current[openMenuId].contains(event.target)) {
          setOpenMenuId(null)
        }
      }
    }
    
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId])
  
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
  // Assessment criteria from selected syllabus
  const [assessmentCriteria, setAssessmentCriteria] = useState([])

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
            console.log('✅ [ASSESSMENTS] Active term found:', activeTerm.term_id, activeTerm.school_year, activeTerm.semester)
          } else {
            console.warn('⚠️ [ASSESSMENTS] No active term found')
          }
        }
      } catch (error) {
        console.error('❌ [ASSESSMENTS] Error fetching active term:', error)
      }
    }
    fetchActiveTerm()
  }, [])

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

  // Filter classes by active term
  const filteredClasses = React.useMemo(() => {
    if (activeTermId === null) {
      // Wait for active term to be determined
      return []
    }
    const filtered = classes.filter(cls => cls.term_id === activeTermId)
    console.log(`🔍 [ASSESSMENTS] Filtered by active term (${activeTermId}): ${filtered.length} of ${classes.length} classes`)
    return filtered
  }, [classes, activeTermId])

  // Validate selected class is from active term
  useEffect(() => {
    if (selectedClass && activeTermId !== null && selectedClass.term_id !== activeTermId) {
      console.warn('⚠️ [ASSESSMENTS] Selected class is not from active term, clearing selection')
      setSelectedClass(null)
      setAssessments([])
      setSyllabi([])
      setCachedStudentsList(null)
    }
  }, [activeTermId, selectedClass])

  // Cache students list when class is selected (for fast assessment switching)
  useEffect(() => {
    if (!selectedClass) {
      // Clear cache when no class is selected
      setCachedStudentsList(null)
      cachedClassIdRef.current = null
      return
    }
    
    // Ensure selected class is from active term
    if (activeTermId !== null && selectedClass.term_id !== activeTermId) {
      console.warn('⚠️ [ASSESSMENTS] Selected class is not from active term, skipping student load')
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
  // Cache students WITHOUT photos to save memory, fetch photos on-demand
  const loadStudentsForClass = async (sectionCourseId, cacheKey) => {
    if (!sectionCourseId) return
    
    try {
      // Don't include photos in initial fetch (saves memory)
      // Photos will be fetched on-demand when needed
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
        
        // Cache students WITHOUT photos (minimized to save memory)
        // Photos will be fetched separately when needed
        safeSetItem(cacheKey, studentsWithClassId, minimizeStudentData)
        console.log('💾 [GRADING] Cached students (without photos):', studentsWithClassId.length, 'students')
        
        // Fetch photos on-demand after a delay (load last)
        setTimeout(() => {
          fetchStudentPhotos(studentsWithClassId)
        }, 500)
      }
    } catch (error) {
      console.error('❌ [GRADING] Error fetching students:', error)
    }
  }

  // Fetch student photos on-demand for grades (memory-efficient)
  const fetchStudentPhotosForGrades = async (students, assessmentId) => {
    if (!students || students.length === 0) return
    
    try {
      console.log('📸 [GRADING] Fetching photos for', students.length, 'students in grades')
      
      // Fetch photos in batches to avoid overwhelming the server
      const batchSize = 5
      for (let i = 0; i < students.length; i += batchSize) {
        const batch = students.slice(i, i + batchSize)
        
        const photoPromises = batch.map(async (student) => {
          try {
            const response = await fetch(`/api/students/${student.student_id}/photo`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              }
            })
            
            if (response.ok) {
              const data = await response.json()
              // Update grades with photo
              setGrades(prev => {
                if (prev[student.enrollment_id]) {
                  return {
                    ...prev,
                    [student.enrollment_id]: {
                      ...prev[student.enrollment_id],
                      student_photo: data.photo
                    }
                  }
                }
                return prev
              })
              
              // Update cached students list
              setCachedStudentsList(prev => {
                if (!prev) return prev
                return prev.map(s => 
                  s.student_id === student.student_id 
                    ? { ...s, student_photo: data.photo }
                    : s
                )
              })
              
              // Queue image for loading
              if (data.photo) {
                imageLoaderService.queueImages([{
                  src: data.photo,
                  id: `grade_${assessmentId}_${student.enrollment_id}`
                }], false)
              }
              
              return { student_id: student.student_id, photo: data.photo }
            }
          } catch (error) {
            console.error(`❌ [GRADING] Error fetching photo for student ${student.student_id}:`, error)
            return null
          }
        })
        
        await Promise.all(photoPromises)
        // Small delay between batches
        if (i + batchSize < students.length) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
      
      console.log('✅ [GRADING] Photos fetched and updated for grades')
    } catch (error) {
      console.error('❌ [GRADING] Error in fetchStudentPhotosForGrades:', error)
    }
  }

  // Fetch student photos on-demand (memory-efficient)
  const fetchStudentPhotos = async (students) => {
    if (!students || students.length === 0) return
    
    try {
      // Fetch photos for students that don't have them
      const studentsNeedingPhotos = students.filter(s => !s.student_photo && s.student_id)
      
      if (studentsNeedingPhotos.length === 0) return
      
      console.log('📸 [GRADING] Fetching photos for', studentsNeedingPhotos.length, 'students')
      
      // Fetch photos in parallel (but limit concurrency to avoid overwhelming)
      const photoPromises = studentsNeedingPhotos.slice(0, 10).map(async (student) => {
        try {
          const response = await fetch(`/api/students/${student.student_id}/photo`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            // Update the student in cachedStudentsList
            setCachedStudentsList(prev => {
              if (!prev) return prev
              return prev.map(s => 
                s.student_id === student.student_id 
                  ? { ...s, student_photo: data.photo }
                  : s
              )
            })
            // Update grades if they exist
            setGrades(prev => {
              const enrollmentId = student.enrollment_id
              if (prev[enrollmentId]) {
                return {
                  ...prev,
                  [enrollmentId]: {
                    ...prev[enrollmentId],
                    student_photo: data.photo
                  }
                }
              }
              return prev
            })
            return { student_id: student.student_id, photo: data.photo }
          }
        } catch (error) {
          console.error(`❌ [GRADING] Error fetching photo for student ${student.student_id}:`, error)
          return null
        }
      })
      
      await Promise.all(photoPromises)
      console.log('✅ [GRADING] Photos fetched and updated')
    } catch (error) {
      console.error('❌ [GRADING] Error in fetchStudentPhotos:', error)
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
    
    // Ensure selected class is from active term
    if (activeTermId !== null && selectedClass.term_id !== activeTermId) {
      console.warn('⚠️ [ASSESSMENTS] Selected class is not from active term, skipping assessment load')
      setAssessments([])
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
    
    // If syllabus_id changes, load the syllabus details to get assessment framework and criteria
    if (name === 'syllabus_id') {
      if (value) {
        loadSyllabusDetails(value)
      } else {
        setSelectedSyllabusDetails(null)
        setAssessmentComponents([])
        setAssessmentCriteria([])
        // Reset type and weight when syllabus is unlinked
        setFormData(prev => ({
          ...prev,
          type: 'Quiz',
          weight_percentage: 25
        }))
      }
    }
  }
  
  // Load syllabus details to get assessment framework and assessment criteria
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
        
        // Extract assessment_criteria from grading_policy or syllabus data
        let criteria = []
        if (syllabus.assessment_criteria) {
          // If assessment_criteria is directly in syllabus
          if (Array.isArray(syllabus.assessment_criteria)) {
            criteria = syllabus.assessment_criteria
          } else if (typeof syllabus.assessment_criteria === 'string') {
            try {
              criteria = JSON.parse(syllabus.assessment_criteria)
            } catch (e) {
              console.error('Error parsing assessment_criteria:', e)
            }
          } else if (typeof syllabus.assessment_criteria === 'object') {
            // Convert object format {name: weight} to array format [{name, weight}]
            criteria = Object.entries(syllabus.assessment_criteria).map(([name, weight]) => ({ name, weight }))
          }
        } else if (syllabus.grading_policy) {
          // Check if assessment_criteria is stored within grading_policy
          let gradingPolicy = syllabus.grading_policy
          if (typeof gradingPolicy === 'string') {
            try {
              gradingPolicy = JSON.parse(gradingPolicy)
            } catch (e) {
              console.error('Error parsing grading_policy:', e)
            }
          }
          if (gradingPolicy && gradingPolicy.assessment_criteria) {
            if (Array.isArray(gradingPolicy.assessment_criteria)) {
              criteria = gradingPolicy.assessment_criteria
            } else if (typeof gradingPolicy.assessment_criteria === 'object') {
              criteria = Object.entries(gradingPolicy.assessment_criteria).map(([name, weight]) => ({ name, weight }))
            }
          }
        }
        setAssessmentCriteria(criteria)
      }
    } catch (error) {
      console.error('Error loading syllabus details:', error)
      setAssessmentComponents([])
      setAssessmentCriteria([])
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
  
  // Handle assessment criteria selection
  const handleAssessmentCriteriaChange = (e) => {
    const selectedIndex = e.target.value
    if (selectedIndex === '' || !assessmentCriteria[selectedIndex]) {
      return
    }
    
    const criterion = assessmentCriteria[selectedIndex]
    setFormData(prev => ({
      ...prev,
      type: criterion.name || prev.type,
      weight_percentage: criterion.weight || prev.weight_percentage
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

  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = assessment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assessment.type.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || assessment.type === typeFilter
    return matchesSearch && matchesType
  })

  // Calculate totals
  const totalWeight = filteredAssessments.reduce((sum, assessment) => {
    return sum + (parseFloat(assessment.weight_percentage) || 0)
  }, 0)
  
  const totalPoints = filteredAssessments.reduce((sum, assessment) => {
    return sum + (parseFloat(assessment.total_points) || 0)
  }, 0)

  // Get unique assessment types for filter dropdown
  const assessmentTypes = ['all', ...new Set(assessments.map(a => a.type).filter(Boolean))]

  // Group assessments by parent criterion
  const groupAssessmentsByCriterion = (assessmentsList) => {
    const groups = {}
    const ungrouped = []
    
    assessmentsList.forEach(assessment => {
      // Extract parent criterion from description
      const description = assessment.description || ''
      const match = description.match(/Sub-assessment from (.+)/)
      
      if (match && match[1]) {
        const parentCriterion = match[1].trim()
        if (!groups[parentCriterion]) {
          groups[parentCriterion] = []
        }
        groups[parentCriterion].push(assessment)
      } else {
        // If no parent criterion found, add to ungrouped
        ungrouped.push(assessment)
      }
    })
    
    return { groups, ungrouped }
  }

  const toggleGroup = (criterionName) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(criterionName)) {
        newSet.delete(criterionName)
      } else {
        newSet.add(criterionName)
      }
      return newSet
    })
  }

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
    
    // Step 2: Check cache for grades
    const cachedGrades = safeGetItem(gradesCacheKey)
    
    // Step 3: Show students immediately (if available) - load data first, images last
    if (studentsToUse && studentsToUse.length > 0) {
      console.log('📋 [GRADING] Showing students immediately (data first, images last)')
      
      let initialGrades = {}
      
      if (cachedGrades) {
        console.log('✅ [GRADING] Merging cached grades with students')
        // Merge cached grades with students
        studentsToUse.forEach(student => {
          const cachedGrade = cachedGrades[student.enrollment_id]
          if (cachedGrade) {
            initialGrades[student.enrollment_id] = {
              ...cachedGrade,
              student_name: student.full_name || cachedGrade.student_name,
              student_number: student.student_number || cachedGrade.student_number,
              student_photo: student.student_photo || cachedGrade.student_photo
            }
          } else {
            // New student not in cached grades - create empty entry
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
          }
        })
      } else {
        // No cached grades - create empty entries for all students
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
      }
      
      // Show students data immediately (without images)
      setGrades(initialGrades)
      setOriginalGrades(JSON.parse(JSON.stringify(initialGrades)))
      setImagesReady(false) // Keep images disabled initially
      
      // Load images asynchronously after a delay (load last)
      setTimeout(() => {
        setImagesReady(true)
        const imagesToLoad = Object.values(initialGrades)
          .filter(g => g.student_photo)
          .map((g, idx) => ({ src: g.student_photo, id: `grade_${assessmentId}_${g.enrollment_id || idx}` }))
        if (imagesToLoad.length > 0) {
          console.log('🖼️ [GRADING] Loading images asynchronously (last):', imagesToLoad.length, 'images')
          imageLoaderService.queueImages(imagesToLoad, false)
        }
      }, 500) // Delay image loading to show data first
    }
    
    // Step 4: Fetch fresh grades asynchronously in background
    try {
      // Only show loading if no cache available
      if (!cachedGrades) {
        setGradingLoading(true)
      }
      
      // Don't include photos in grades fetch (saves memory)
      // Photos will be fetched on-demand via fetchStudentPhotos
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
            student_id: student.student_id,
            student_name: student.full_name,
            student_number: student.student_number,
            student_photo: student.student_photo,
            enrollment_id: student.enrollment_id,
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
              student_id: grade.student_id,
              student_name: grade.full_name,
              student_number: grade.student_number,
              student_photo: grade.student_photo,
              enrollment_id: grade.enrollment_id,
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
        
        // Fetch photos on-demand for students in grades
        setTimeout(() => {
          const studentsNeedingPhotos = Object.values(gradesMap)
            .filter(g => g.student_id && !g.student_photo)
            .map(g => ({ 
              student_id: g.student_id, 
              enrollment_id: g.enrollment_id 
            }))
          
          if (studentsNeedingPhotos.length > 0) {
            fetchStudentPhotosForGrades(studentsNeedingPhotos, assessmentId)
          }
          
          // Enable image loading after photos are fetched
          setImagesReady(true)
        }, 300)
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

  // Grading Computation Functions (Non-zero based)
  
  /**
   * Transmutation: Raw Score → Actual Score
   * Formula: (Raw Score / Max Score) × 62.5 + 37.5
   * Non-zero based: Minimum score is 37.5 (not 0)
   */
  const calculateActualScore = (rawScore, maxScore) => {
    if (!maxScore || maxScore === 0) return 0
    const raw = parseFloat(rawScore) || 0
    // Non-zero based computation: minimum is 37.5
    return (raw / maxScore) * 62.5 + 37.5
  }

  /**
   * Weighting: Actual Score → Transmuted Score
   * Formula: Actual Score × (Weight Percentage / 100)
   */
  const calculateTransmutedScore = (actualScore, weightPercentage) => {
    const actual = parseFloat(actualScore) || 0
    const weight = parseFloat(weightPercentage) || 0
    return (actual * weight) / 100
  }

  /**
   * Group assessments by parent criterion and calculate aggregated scores
   */
  const calculateGroupedScores = (assessments, studentGrades, enrollmentId) => {
    const { groups } = groupAssessmentsByCriterion(assessments)
    const groupedScores = {}
    
    Object.entries(groups).forEach(([criterionName, groupAssessments]) => {
      let groupTransmutedTotal = 0
      
      groupAssessments.forEach(assessment => {
        const gradeData = studentGrades[assessment.assessment_id]?.[enrollmentId]
        if (!gradeData) return
        
        const adjustedScore = calculateAdjustedScore(
          gradeData.raw_score || 0,
          gradeData.late_penalty || 0,
          assessment.total_points
        )
        
        const actualScore = calculateActualScore(adjustedScore, assessment.total_points)
        const transmutedScore = calculateTransmutedScore(
          actualScore,
          assessment.weight_percentage || 0
        )
        
        groupTransmutedTotal += transmutedScore
      })
      
      groupedScores[criterionName] = {
        totalTransmuted: groupTransmutedTotal,
        assessmentCount: groupAssessments.length
      }
    })
    
    return groupedScores
  }

  /**
   * Calculate final grade by summing all aggregated transmuted scores
   */
  const calculateFinalGrade = (groupedScores) => {
    return Object.values(groupedScores).reduce((sum, group) => {
      return sum + (group.totalTransmuted || 0)
    }, 0)
  }

  /**
   * Convert final percentage grade to numeric grade using grading scale
   */
  const convertToNumericGrade = (finalPercentage) => {
    if (finalPercentage >= 98) return { numeric: 1, status: 'PASSED' }
    if (finalPercentage >= 94) return { numeric: 1.25, status: 'PASSED' }
    if (finalPercentage >= 90) return { numeric: 1.5, status: 'PASSED' }
    if (finalPercentage >= 88) return { numeric: 1.75, status: 'PASSED' }
    if (finalPercentage >= 85) return { numeric: 2, status: 'PASSED' }
    if (finalPercentage >= 83) return { numeric: 2.25, status: 'PASSED' }
    if (finalPercentage >= 80) return { numeric: 2.5, status: 'PASSED' }
    if (finalPercentage >= 78) return { numeric: 2.75, status: 'PASSED' }
    if (finalPercentage >= 75) return { numeric: 3, status: 'PASSED' }
    if (finalPercentage > 0) return { numeric: 5, status: 'FAILED' }
    return { numeric: 5, status: 'FAILED' }
  }

  const handleSubmitGrades = async () => {
    if (!selectedAssessment) return

    setIsSubmittingGrades(true)
    try {
      const gradesArray = Object.entries(grades).map(([enrollmentId, gradeData]) => {
        const rawScore = gradeData.submission_status === 'missing' ? 0 : (parseFloat(gradeData.raw_score) || 0)
        const latePenalty = gradeData.submission_status === 'missing' ? 0 : (parseFloat(gradeData.late_penalty) || 0)
        const adjustedScore = calculateAdjustedScore(rawScore, latePenalty, selectedAssessment.total_points)
        const actualScore = gradeData.submission_status === 'missing' ? 0 : calculateActualScore(adjustedScore, selectedAssessment.total_points)
        const transmutedScore = gradeData.submission_status === 'missing' ? 0 : calculateTransmutedScore(actualScore, selectedAssessment.weight_percentage || 0)
        
        return {
          enrollment_id: parseInt(enrollmentId),
          raw_score: rawScore,
          late_penalty: latePenalty,
          adjusted_score: adjustedScore,
          actual_score: actualScore,
          transmuted_score: transmutedScore,
          feedback: gradeData.feedback || '',
          graded_by: user.user_id,
          submission_status: gradeData.submission_status || 'missing'
        }
      })

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
        const result = await response.json()
        const savedCount = result.total_graded || gradesArray.length
        
        // Show success modal
        setSavedGradesCount(savedCount)
        setShowSuccessModal(true)
        
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
        const errorData = await response.json()
        const errorMsg = errorData.error || 'Failed to save grades'
        setError(errorMsg)
        setErrorModalMessage(errorMsg)
        setShowErrorModal(true)
      }
    } catch (error) {
      console.error('Error submitting grades:', error)
      const errorMsg = error.message || 'Failed to save grades. Please check your connection and try again.'
      setError(errorMsg)
      setErrorModalMessage(errorMsg)
      setShowErrorModal(true)
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
    // Switch to grading tab when assessment is selected
    setActiveTab('grading')
  }

  return (
    <>
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowSuccessModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <CheckIcon className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Grades Saved Successfully!
            </h3>
            <p className="text-sm text-gray-600 text-center mb-4">
              Successfully saved grades for <span className="font-semibold text-gray-900">{savedGradesCount}</span> {savedGradesCount === 1 ? 'student' : 'students'}
            </p>
            {selectedAssessment && (
              <p className="text-xs text-gray-500 text-center mb-6">
                Assessment: <span className="font-medium">{selectedAssessment.title}</span>
              </p>
            )}
            <div className="flex justify-center">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowErrorModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
                <XMarkIcon className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Failed to Save Grades
            </h3>
            <p className="text-sm text-gray-600 text-center mb-6">
              {errorModalMessage}
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setShowErrorModal(false)
                  setErrorModalMessage('')
                }}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      
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
                    {/* Search Bar, Filter, and Create Button - Only show when subject is selected */}
                    {selectedClass && (
                      <>
                        <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                          <div className="relative flex-1">
                            <div className="relative">
                              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input type="text" placeholder="Search assessments..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500" />
                            </div>
                          </div>
                          <select 
                            value={typeFilter} 
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 text-sm min-w-[140px]"
                          >
                            <option value="all">All Types</option>
                            {assessmentTypes.filter(type => type !== 'all').map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          {/* Create Assessment button removed - logic and route kept for future use */}
                          {/* <button onClick={openCreateModal} className="inline-flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors">
                            <PlusIcon className="h-5 w-5" />
                          </button> */}
                        </div>
                      </>
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
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <table className="min-w-full">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 sticky top-0 z-10">
                                  <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Assessment</th>
                                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                      Points {filteredAssessments.length > 0 && <span className="text-gray-400 font-normal">({totalPoints})</span>}
                                    </th>
                                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                      Weight {filteredAssessments.length > 0 && <span className="text-gray-400 font-normal">({totalWeight.toFixed(2)}%)</span>}
                                    </th>
                                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Transmuted</th>
                                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Due Date</th>
                                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-12"></th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="border-b border-gray-100 last:border-b-0">
                                      <td className="px-6 py-5">
                                        <div className="flex items-start">
                                          <div className="flex-1 min-w-0">
                                            <div className="h-4 bg-gray-200 rounded w-40 skeleton mb-2"></div>
                                            <div className="h-3 bg-gray-100 rounded w-32 skeleton"></div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-5">
                                        <div className="flex justify-center">
                                          <div className="h-4 bg-gray-200 rounded w-16 skeleton"></div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-5">
                                        <div className="h-4 bg-gray-200 rounded w-12 skeleton mx-auto"></div>
                                      </td>
                                      <td className="px-4 py-5">
                                        <div className="h-4 bg-gray-200 rounded w-12 skeleton mx-auto"></div>
                                      </td>
                                      <td className="px-4 py-5">
                                        <div className="h-4 bg-gray-200 rounded w-12 skeleton mx-auto"></div>
                                      </td>
                                      <td className="px-4 py-5">
                                        <div className="h-4 bg-gray-200 rounded w-20 skeleton mx-auto"></div>
                                      </td>
                                      <td className="px-4 py-5">
                                        <div className="flex justify-center">
                                          <div className="h-6 bg-gray-200 rounded-md w-16 skeleton"></div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-5">
                                        <div className="flex items-center justify-center">
                                          <div className="h-5 w-5 bg-gray-200 rounded skeleton"></div>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : filteredAssessments.length > 0 ? (
                          <div className="flex-1 overflow-y-auto min-h-0">
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <table className="min-w-full">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 sticky top-0 z-10">
                                  <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Assessment</th>
                                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Points</th>
                                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Weight</th>
                                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Due Date</th>
                                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                  {(() => {
                                    const { groups, ungrouped } = groupAssessmentsByCriterion(filteredAssessments)
                                    const result = []
                                    
                                    // Render grouped assessments
                                    Object.entries(groups).forEach(([criterionName, groupAssessments]) => {
                                      const isExpanded = expandedGroups.has(criterionName)
                                      const groupTotalPoints = groupAssessments.reduce((sum, a) => sum + (parseFloat(a.total_points) || 0), 0)
                                      const groupTotalWeight = groupAssessments.reduce((sum, a) => sum + (parseFloat(a.weight_percentage) || 0), 0)
                                      
                                      // Group header row
                                      result.push(
                                        <tr 
                                          key={`group-${criterionName}`}
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            toggleGroup(criterionName)
                                          }}
                                          className="bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors border-b-2 border-gray-300"
                                        >
                                          <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                              {isExpanded ? (
                                                <ChevronUpIcon className="h-5 w-5 text-gray-600" />
                                              ) : (
                                                <ChevronDownIcon className="h-5 w-5 text-gray-600" />
                                              )}
                                              <h3 className="text-sm font-bold text-gray-900">{criterionName}</h3>
                                              <span className="text-xs text-gray-500">({groupAssessments.length} {groupAssessments.length === 1 ? 'assessment' : 'assessments'})</span>
                                            </div>
                                          </td>
                                          <td className="px-4 py-4 text-center">
                                            <span className="text-xs text-gray-500">—</span>
                                          </td>
                                          <td className="px-4 py-4 text-center">
                                            <span className="text-sm font-semibold text-gray-900">{groupTotalPoints}</span>
                                            <span className="text-xs text-gray-500 ml-1">pts</span>
                                          </td>
                                          <td className="px-4 py-4 text-center">
                                            <span className="text-sm font-semibold text-gray-900">{groupTotalWeight.toFixed(2)}</span>
                                            <span className="text-xs text-gray-500 ml-1">%</span>
                                          </td>
                                          <td className="px-4 py-4 text-center">
                                            <span className="text-sm font-semibold text-green-600" title="Average Transmuted Score">
                                              {(() => {
                                                // Calculate average transmuted score for the group
                                                let totalTransmuted = 0
                                                let count = 0
                                                groupAssessments.forEach(assessment => {
                                                  const gradesCacheKey = `assessment_grades_${assessment.assessment_id}`
                                                  const cachedGrades = safeGetItem(gradesCacheKey)
                                                  if (cachedGrades && Object.keys(cachedGrades).length > 0) {
                                                    Object.values(cachedGrades).forEach(gradeData => {
                                                      if (gradeData.raw_score !== null && gradeData.raw_score !== '' && gradeData.submission_status !== 'missing') {
                                                        const rawScore = parseFloat(gradeData.raw_score) || 0
                                                        const latePenalty = parseFloat(gradeData.late_penalty) || 0
                                                        const adjustedScore = calculateAdjustedScore(rawScore, latePenalty, assessment.total_points)
                                                        const actualScore = calculateActualScore(adjustedScore, assessment.total_points)
                                                        const transmutedScore = calculateTransmutedScore(actualScore, assessment.weight_percentage || 0)
                                                        totalTransmuted += transmutedScore
                                                        count++
                                                      }
                                                    })
                                                  }
                                                })
                                                return count > 0 ? (totalTransmuted / count).toFixed(2) : '—'
                                              })()}
                                            </span>
                                          </td>
                                          <td className="px-4 py-4 text-center">
                                            <span className="text-sm text-gray-500">—</span>
                                          </td>
                                          <td className="px-6 py-4 text-center">
                                            <span className="text-sm text-gray-500">—</span>
                                          </td>
                                        </tr>
                                      )
                                      
                                      // Sub-assessments (shown when expanded)
                                      if (isExpanded) {
                                        groupAssessments.forEach((assessment) => {
                                          result.push(
                                            <tr 
                                              key={assessment.assessment_id} 
                                              onClick={() => handleAssessmentSelect(assessment)}
                                              className="hover:bg-red-50/30 cursor-pointer transition-colors duration-150 border-b border-gray-100 last:border-b-0 bg-gray-50/50"
                                            >
                                              <td className="px-6 py-4 pl-12">
                                                <div className="flex items-start">
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <h3 className="text-sm font-semibold text-gray-900 truncate">{assessment.title}</h3>
                                                      {assessment.syllabus_version && (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                                                          assessment.syllabus_approval_status === 'approved' 
                                                            ? 'bg-green-100 text-green-700 border border-green-200' 
                                                            : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                                        }`}>
                                                          v{assessment.syllabus_version}
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              </td>
                                              <td className="px-4 py-4">
                                                <div className="flex justify-center">
                                                  <span className="text-xs text-gray-700 font-medium">
                                                    {assessment.type}
                                                  </span>
                                                </div>
                                              </td>
                                              <td className="px-4 py-4">
                                                <div className="text-center">
                                                  <span className="text-sm font-semibold text-gray-900">{assessment.total_points}</span>
                                                  <span className="text-xs text-gray-500 ml-1">pts</span>
                                                </div>
                                              </td>
                                              <td className="px-4 py-4">
                                                <div className="text-center">
                                                  <span className="text-sm font-semibold text-gray-900">{parseFloat(assessment.weight_percentage || 0).toFixed(2)}</span>
                                                  <span className="text-xs text-gray-500 ml-1">%</span>
                                                </div>
                                              </td>
                                              <td className="px-4 py-4">
                                                <div className="text-center">
                                                  <span className="text-sm font-semibold text-green-600" title="Transmuted Score = (Adjusted / Max) × 62.5 + 37.5, then × (Weight / 100)">
                                                    {(() => {
                                                      // Calculate transmuted score from cached grades if available
                                                      const gradesCacheKey = `assessment_grades_${assessment.assessment_id}`
                                                      const cachedGrades = safeGetItem(gradesCacheKey)
                                                      if (cachedGrades && Object.keys(cachedGrades).length > 0) {
                                                        let totalTransmuted = 0
                                                        let count = 0
                                                        Object.values(cachedGrades).forEach(gradeData => {
                                                          if (gradeData.raw_score !== null && gradeData.raw_score !== '' && gradeData.submission_status !== 'missing') {
                                                            const rawScore = parseFloat(gradeData.raw_score) || 0
                                                            const latePenalty = parseFloat(gradeData.late_penalty) || 0
                                                            const adjustedScore = calculateAdjustedScore(rawScore, latePenalty, assessment.total_points)
                                                            const actualScore = calculateActualScore(adjustedScore, assessment.total_points)
                                                            const transmutedScore = calculateTransmutedScore(actualScore, assessment.weight_percentage || 0)
                                                            totalTransmuted += transmutedScore
                                                            count++
                                                          }
                                                        })
                                                        if (count > 0) {
                                                          return (totalTransmuted / count).toFixed(2)
                                                        }
                                                      }
                                                      return '—'
                                                    })()}
                                                  </span>
                                                </div>
                                              </td>
                                              <td className="px-4 py-4">
                                                <div className="text-center">
                                                  <span className="text-sm text-gray-700">
                                                    {assessment.due_date ? (() => {
                                                      try {
                                                        const date = new Date(assessment.due_date)
                                                        if (!isNaN(date.getTime())) {
                                                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                        }
                                                      } catch (e) {}
                                                      return '—'
                                                    })() : '—'}
                                                  </span>
                                                </div>
                                              </td>
                                              <td className="px-4 py-4">
                                                <div className="flex justify-center">
                                                  <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium ${getStatusColor(assessment.status)}`}>
                                                    {assessment.status}
                                                  </span>
                                                </div>
                                              </td>
                                              <td className="px-6 py-4">
                                                <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                                                  <div className="relative" ref={el => menuRefs.current[assessment.assessment_id] = el}>
                                                    <button
                                                      onClick={() => setOpenMenuId(openMenuId === assessment.assessment_id ? null : assessment.assessment_id)}
                                                      className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                                                      title="More options"
                                                    >
                                                      <EllipsisVerticalIcon className="h-5 w-5" />
                                                    </button>
                                                    {openMenuId === assessment.assessment_id && (
                                                      <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-20 overflow-hidden">
                                                        <button
                                                          onClick={() => {
                                                            setOpenMenuId(null)
                                                            openEditModal(assessment)
                                                          }}
                                                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                        >
                                                          <PencilIcon className="h-4 w-4" />
                                                          Edit
                                                        </button>
                                                        {assessment.is_published ? (
                                                          <button
                                                            onClick={() => {
                                                              setOpenMenuId(null)
                                                              handleUnpublishAssessment(assessment.assessment_id)
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                          >
                                                            <XMarkIcon className="h-4 w-4" />
                                                            Unpublish
                                                          </button>
                                                        ) : (
                                                          <button
                                                            onClick={() => {
                                                              setOpenMenuId(null)
                                                              handlePublishAssessment(assessment.assessment_id)
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                          >
                                                            <CheckIcon className="h-4 w-4" />
                                                            Publish
                                                          </button>
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </td>
                                            </tr>
                                          )
                                        })
                                      }
                                    })
                                    
                                    // Render ungrouped assessments
                                    ungrouped.forEach((assessment) => {
                                      result.push(
                                        <tr 
                                          key={assessment.assessment_id} 
                                          onClick={() => handleAssessmentSelect(assessment)}
                                          className="hover:bg-red-50/30 cursor-pointer transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                                        >
                                          <td className="px-6 py-5">
                                            <div className="flex items-start">
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <h3 className="text-sm font-semibold text-gray-900 truncate">{assessment.title}</h3>
                                                  {assessment.syllabus_version && (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                                                      assessment.syllabus_approval_status === 'approved' 
                                                        ? 'bg-green-100 text-green-700 border border-green-200' 
                                                        : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                                    }`}>
                                                      v{assessment.syllabus_version}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                          <td className="px-4 py-5">
                                            <div className="flex justify-center">
                                              <span className="text-xs text-gray-700 font-medium">
                                                {assessment.type}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-4 py-5">
                                            <div className="text-center">
                                              <span className="text-sm font-semibold text-gray-900">{assessment.total_points}</span>
                                              <span className="text-xs text-gray-500 ml-1">pts</span>
                                            </div>
                                          </td>
                                          <td className="px-4 py-5">
                                            <div className="text-center">
                                              <span className="text-sm font-semibold text-gray-900">{parseFloat(assessment.weight_percentage || 0).toFixed(2)}</span>
                                              <span className="text-xs text-gray-500 ml-1">%</span>
                                            </div>
                                          </td>
                                          <td className="px-4 py-5">
                                            <div className="text-center">
                                              <span className="text-sm font-semibold text-green-600" title="Transmuted Score = (Adjusted / Max) × 62.5 + 37.5, then × (Weight / 100)">
                                                {(() => {
                                                  // Calculate transmuted score from cached grades if available
                                                  const gradesCacheKey = `assessment_grades_${assessment.assessment_id}`
                                                  const cachedGrades = safeGetItem(gradesCacheKey)
                                                  if (cachedGrades && Object.keys(cachedGrades).length > 0) {
                                                    let totalTransmuted = 0
                                                    let count = 0
                                                    Object.values(cachedGrades).forEach(gradeData => {
                                                      if (gradeData.raw_score !== null && gradeData.raw_score !== '' && gradeData.submission_status !== 'missing') {
                                                        const rawScore = parseFloat(gradeData.raw_score) || 0
                                                        const latePenalty = parseFloat(gradeData.late_penalty) || 0
                                                        const adjustedScore = calculateAdjustedScore(rawScore, latePenalty, assessment.total_points)
                                                        const actualScore = calculateActualScore(adjustedScore, assessment.total_points)
                                                        const transmutedScore = calculateTransmutedScore(actualScore, assessment.weight_percentage || 0)
                                                        totalTransmuted += transmutedScore
                                                        count++
                                                      }
                                                    })
                                                    if (count > 0) {
                                                      return (totalTransmuted / count).toFixed(2)
                                                    }
                                                  }
                                                  return '—'
                                                })()}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-4 py-5">
                                            <div className="text-center">
                                              <span className="text-sm text-gray-700">
                                                {assessment.due_date ? (() => {
                                                  try {
                                                    const date = new Date(assessment.due_date)
                                                    if (!isNaN(date.getTime())) {
                                                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                    }
                                                  } catch (e) {}
                                                  return '—'
                                                })() : '—'}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-4 py-5">
                                            <div className="flex justify-center">
                                              <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium ${getStatusColor(assessment.status)}`}>
                                                {assessment.status}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-6 py-5">
                                            <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                                              <div className="relative" ref={el => menuRefs.current[assessment.assessment_id] = el}>
                                                <button
                                                  onClick={() => setOpenMenuId(openMenuId === assessment.assessment_id ? null : assessment.assessment_id)}
                                                  className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                                                  title="More options"
                                                >
                                                  <EllipsisVerticalIcon className="h-5 w-5" />
                                                </button>
                                                {openMenuId === assessment.assessment_id && (
                                                  <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-20 overflow-hidden">
                                                    <button
                                                      onClick={() => {
                                                        setOpenMenuId(null)
                                                        openEditModal(assessment)
                                                      }}
                                                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                    >
                                                      <PencilIcon className="h-4 w-4" />
                                                      Edit
                                                    </button>
                                                    {assessment.is_published ? (
                                                      <button
                                                        onClick={() => {
                                                          setOpenMenuId(null)
                                                          handleUnpublishAssessment(assessment.assessment_id)
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                      >
                                                        <XMarkIcon className="h-4 w-4" />
                                                        Unpublish
                                                      </button>
                                                    ) : (
                                                      <button
                                                        onClick={() => {
                                                          setOpenMenuId(null)
                                                          handlePublishAssessment(assessment.assessment_id)
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                      >
                                                        <CheckIcon className="h-4 w-4" />
                                                        Publish
                                                      </button>
                                                    )}
                                                    <button
                                                      onClick={() => {
                                                        setOpenMenuId(null)
                                                        handleDeleteAssessment(assessment.assessment_id)
                                                      }}
                                                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                    >
                                                      <TrashIcon className="h-4 w-4" />
                                                      Delete
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      )
                                    })
                                    
                                    return result
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center py-16">
                            <div className="text-center">
                              <ClipboardDocumentListIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                              <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments found</h3>
                              <p className="text-gray-500">
                                {searchQuery ? 'No assessments match your search.' : 'Create your first assessment to get started.'}
                              </p>
                              {/* Create Assessment button removed - logic and route kept for future use */}
                              {/* {!searchQuery && (
                                <button onClick={openCreateModal} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                                  <PlusIcon className="h-4 w-4" />
                                  Create Assessment
                                </button>
                              )} */}
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
            )}

            {/* Grading Tab Content */}
            {activeTab === 'grading' && (
              <div className="px-6 py-4 h-full overflow-y-auto">
                <div className="mb-4 flex-shrink-0">
                  {error && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-full min-h-0">
                  {/* Main Content - Student List for Grading */}
                  <div className="lg:col-span-4 flex flex-col min-h-0">
                    {selectedAssessment ? (
                      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300 flex flex-col flex-1 min-h-0">
                        <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
                          <h2 className="text-sm font-semibold text-gray-900 truncate">
                            Grades for: {selectedAssessment.title} <span className="text-xs text-gray-600 font-normal">({selectedAssessment.total_points} pts)</span>
                          </h2>
                          {Object.keys(grades).length > 0 && (
                            <button
                              onClick={handleSubmitGrades}
                              disabled={isSubmittingGrades || !selectedAssessment || Object.keys(grades).length === 0 || !hasChanges()}
                              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors duration-300 ${
                                isSubmittingGrades || !hasChanges()
                                  ? 'bg-gray-400 cursor-not-allowed'
                                  : 'bg-red-600 hover:bg-red-700'
                              } focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-white`}
                            >
                              {isSubmittingGrades ? (
                                <span className="flex items-center justify-center">
                                  <ArrowPathIcon className="h-3 w-3 mr-1.5 animate-spin" />
                                  <span>Saving...</span>
                                </span>
                              ) : (
                                <span className="flex items-center justify-center">
                                  <CheckIcon className="h-3 w-3 mr-1.5" />
                                  <span>Save Grades</span>
                                </span>
                              )}
                            </button>
                          )}
                        </div>
                        {(gradingLoading && Object.keys(grades).length === 0) ? (
                          <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                            <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
                              <div className="w-full">
                                <div className="px-2 py-2 bg-gray-50 sticky top-0 z-50 border-b border-gray-200 flex items-center text-[10px] font-semibold text-gray-700 uppercase tracking-wider">
                                  <div className="w-[140px] flex-shrink-0 sticky left-0 bg-gray-50 z-50 pr-1">Student</div>
                                  <div className="w-[50px] flex-shrink-0 px-0.5">Raw</div>
                                  <div className="w-[50px] flex-shrink-0 px-0.5">Penalty</div>
                                  <div className="w-[55px] flex-shrink-0 px-0.5">Adj</div>
                                  <div className="w-[50px] flex-shrink-0 px-0.5">Actual</div>
                                  <div className="w-[60px] flex-shrink-0 px-0.5">Trans</div>
                                  <div className="w-[80px] flex-shrink-0 px-0.5">Feedback</div>
                                  <div className="flex-1 min-w-0 px-1">Status / %</div>
                                </div>
                                <ul className="divide-y divide-gray-100">
                                  {Array.from({ length: 8 }).map((_, i) => (
                                    <li key={i} className="flex items-center px-2 py-2 hover:bg-gray-50 transition-colors">
                                      <div className="w-[140px] flex-shrink-0 flex items-center gap-1.5 sticky left-0 bg-white z-20 pr-1 border-r border-gray-200">
                                        <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gray-200 animate-pulse"></div>
                                        <div className="flex-1 min-w-0 overflow-hidden">
                                          <div className="h-3 bg-gray-200 rounded w-20 animate-pulse mb-0.5"></div>
                                          <div className="h-2 bg-gray-100 rounded w-16 animate-pulse"></div>
                                        </div>
                                      </div>
                                      <div className="w-[50px] flex-shrink-0 px-0.5">
                                        <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                                      </div>
                                      <div className="w-[50px] flex-shrink-0 px-0.5">
                                        <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                                      </div>
                                      <div className="w-[55px] flex-shrink-0 px-0.5">
                                        <div className="h-3 bg-gray-200 rounded w-10 animate-pulse mx-auto"></div>
                                      </div>
                                      <div className="w-[50px] flex-shrink-0 px-0.5">
                                        <div className="h-3 bg-gray-200 rounded w-10 animate-pulse mx-auto"></div>
                                      </div>
                                      <div className="w-[60px] flex-shrink-0 px-0.5">
                                        <div className="h-3 bg-gray-200 rounded w-10 animate-pulse mx-auto"></div>
                                      </div>
                                      <div className="w-[80px] flex-shrink-0 px-0.5">
                                        <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                                      </div>
                                      <div className="flex-1 min-w-0 px-1">
                                        <div className="flex items-center gap-3">
                                          <div className="flex gap-2 flex-shrink-0">
                                            <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                                            <div className="h-8 bg-gray-200 rounded w-14 animate-pulse"></div>
                                            <div className="h-8 bg-gray-200 rounded w-18 animate-pulse"></div>
                                          </div>
                                          <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
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
                              <div className="w-full">
                                <div className="px-2 py-2 bg-gray-50 sticky top-0 z-30 border-b border-gray-200 flex items-center text-[10px] font-semibold text-gray-700 uppercase tracking-wider">
                                  <div className="w-[140px] flex-shrink-0 sticky left-0 bg-gray-50 z-40 pr-1">Student</div>
                                  <div className="w-[50px] flex-shrink-0 px-0.5">Raw</div>
                                  <div className="w-[50px] flex-shrink-0 px-0.5">Penalty</div>
                                  <div className="w-[55px] flex-shrink-0 px-0.5">Adj</div>
                                  <div className="w-[50px] flex-shrink-0 px-0.5">Actual</div>
                                  <div className="w-[60px] flex-shrink-0 px-0.5">Trans</div>
                                  <div className="w-[80px] flex-shrink-0 px-0.5">Feedback</div>
                                  <div className="flex-1 min-w-0 px-1 whitespace-nowrap">Status / %</div>
                                </div>
                                <ul className="divide-y divide-gray-100">
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
                                    <li key={enrollmentId} className="flex items-center px-2 py-2 hover:bg-gray-50 bg-white transition-colors">
                                      <div className="w-[140px] flex-shrink-0 flex items-center gap-1.5 sticky left-0 bg-white z-20 pr-1 border-r border-gray-200">
                                        {!imagesReady ? (
                                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
                                        ) : (
                                          <LazyImage
                                            src={gradeData.student_photo} 
                                            alt={gradeData.student_name || 'Student'}
                                            size="sm"
                                            shape="circle"
                                            className="border border-gray-200 flex-shrink-0"
                                            delayLoad={false}
                                            priority={false}
                                          />
                                        )}
                                        <div className="flex-1 min-w-0 overflow-hidden">
                                          <div className="text-[11px] font-medium text-gray-900 truncate leading-tight" title={formatName(gradeData.student_name) || 'Student'}>
                                            {formatName(gradeData.student_name) || 'Student'}
                                          </div>
                                          <div className="text-[10px] text-gray-500 truncate leading-tight mt-0.5">SR: {gradeData.student_number || 'N/A'}</div>
                                        </div>
                                      </div>
                                      <div className="w-[50px] flex-shrink-0 px-0.5">
                                        <input
                                          type="number"
                                          value={gradeData.raw_score || ''}
                                          onChange={(e) => handleGradeChange(enrollmentId, 'raw_score', e.target.value)}
                                          className="w-full px-1 py-0.5 text-[10px] rounded border border-gray-300 focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-colors"
                                          min="0"
                                          max={selectedAssessment.total_points}
                                          disabled={gradeData.submission_status === 'missing'}
                                        />
                                      </div>
                                      <div className="w-[50px] flex-shrink-0 px-0.5">
                                        <input
                                          type="number"
                                          value={gradeData.late_penalty || ''}
                                          onChange={(e) => handleGradeChange(enrollmentId, 'late_penalty', e.target.value)}
                                          className="w-full px-1 py-0.5 text-[10px] rounded border border-gray-300 focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-colors"
                                          min="0"
                                          disabled={gradeData.submission_status === 'missing'}
                                        />
                                      </div>
                                      <div className="w-[55px] flex-shrink-0 px-0.5 text-[10px] font-semibold text-gray-900 text-center">
                                        {gradeData.submission_status === 'missing' ? '—' : calculateAdjustedScore(gradeData.raw_score, gradeData.late_penalty, selectedAssessment.total_points).toFixed(1)}
                                      </div>
                                      <div className="w-[50px] flex-shrink-0 px-0.5 text-[10px] font-semibold text-blue-600 text-center" title="Actual Score = (Adjusted / Max) × 62.5 + 37.5">
                                        {gradeData.submission_status === 'missing' ? '—' : (() => {
                                          const adjusted = calculateAdjustedScore(gradeData.raw_score, gradeData.late_penalty, selectedAssessment.total_points)
                                          return calculateActualScore(adjusted, selectedAssessment.total_points).toFixed(2)
                                        })()}
                                      </div>
                                      <div className="w-[60px] flex-shrink-0 px-0.5 text-[10px] font-semibold text-green-600 text-center" title="Transmuted Score = Actual × (Weight / 100)">
                                        {gradeData.submission_status === 'missing' ? '—' : (() => {
                                          const adjusted = calculateAdjustedScore(gradeData.raw_score, gradeData.late_penalty, selectedAssessment.total_points)
                                          const actual = calculateActualScore(adjusted, selectedAssessment.total_points)
                                          return calculateTransmutedScore(actual, selectedAssessment.weight_percentage || 0).toFixed(2)
                                        })()}
                                      </div>
                                      <div className="w-[80px] flex-shrink-0 px-0.5">
                                        <textarea
                                          value={gradeData.feedback || ''}
                                          onChange={(e) => handleGradeChange(enrollmentId, 'feedback', e.target.value)}
                                          className="w-full px-1 py-0.5 text-[10px] rounded border border-gray-300 focus:ring-1 focus:ring-red-500 focus:border-red-500 resize-none transition-colors"
                                          rows="1"
                                          placeholder="Feedback..."
                                          maxLength={200}
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0 px-1 flex-shrink-0">
                                        <div className="flex items-center gap-1.5 justify-start">
                                          <div className="flex gap-1 flex-shrink-0">
                                            <button
                                              onClick={() => handleGradeChange(enrollmentId, 'submission_status', 'ontime')}
                                              className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors whitespace-nowrap ${
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
                                              className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors whitespace-nowrap ${
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
                                              className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors whitespace-nowrap ${
                                                gradeData.submission_status === 'missing'
                                                  ? 'bg-red-100 text-red-800 border border-red-300 shadow-sm'
                                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                                              }`}
                                              title="Missing"
                                            >
                                              Missing
                                            </button>
                                          </div>
                                          <div className="text-[11px] font-semibold text-gray-900 whitespace-nowrap ml-1.5">
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
                          <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                              <UserGroupIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                              <h3 className="text-base font-medium text-gray-900 mb-2">No students found</h3>
                              <p className="text-sm text-gray-500">No students enrolled in this assessment yet.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : !selectedClass ? (
                      <div className="bg-white rounded-lg shadow-sm border border-gray-300 flex items-center justify-center flex-1 min-h-0">
                        <div className="text-center">
                          <ClipboardDocumentCheckIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                          <h3 className="text-base font-medium text-gray-900 mb-2">Select a Class</h3>
                          <p className="text-sm text-gray-500">Choose a class from the sidebar to start grading</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg shadow-sm border border-gray-300 flex items-center justify-center flex-1 min-h-0">
                        <div className="text-center">
                          <ClipboardDocumentCheckIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                          <h3 className="text-base font-medium text-gray-900 mb-2">Select an Assessment</h3>
                          <p className="text-sm text-gray-500">Choose an assessment to start grading</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Sidebar - Classes and Assessments */}
                  <div className="lg:col-span-1 flex flex-col min-h-0">
                    {!selectedClass ? (
                      // Classes Selection
                      <div className="bg-white rounded-lg shadow-sm border border-gray-300 flex flex-col h-full">
                        <div className="px-4 py-4 border-b border-gray-200 flex-shrink-0">
                          <h3 className="text-sm font-semibold text-gray-900">Classes</h3>
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
                    ) : (
                      // Assessments Selection
                      <div className="bg-white rounded-lg shadow-sm border border-gray-300 flex flex-col h-full">
                        <div className="px-4 py-4 border-b border-gray-200 flex-shrink-0">
                          <div className="mb-2">
                            <h3 className="text-sm font-semibold text-gray-900 truncate" title={selectedClass.course_title}>{selectedClass.course_title}</h3>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Syllabus (Optional)
                    {assessmentComponents.length > 0 && (
                      <span className="ml-2 text-xs text-green-600">✓ Framework loaded</span>
                    )}
                    {assessmentCriteria.length > 0 && (
                      <span className="ml-2 text-xs text-green-600">✓ Criteria loaded</span>
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
                    Only approved syllabi are available for linking. Selecting a syllabus will load its assessment framework and criteria.
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
                  {assessmentCriteria.length > 0 && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                      <strong>Assessment Criteria from syllabus (Step 3):</strong>
                      <ul className="list-disc list-inside mt-1">
                        {assessmentCriteria.map((criterion, index) => (
                          <li key={index}>
                            {criterion.name}: {criterion.weight}%
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 font-medium">Select from assessment criteria below to auto-fill the assessment type and weight.</p>
                    </div>
                  )}
                </div>

                {/* Assessment Criteria Selection */}
                {assessmentCriteria.length > 0 && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Assessment Criteria (from Syllabus Step 3)
                      <span className="ml-2 text-xs text-green-600">✓ Criteria loaded</span>
                    </label>
                    <select
                      onChange={handleAssessmentCriteriaChange}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-sm"
                    >
                      <option value="">Select from assessment criteria...</option>
                      {assessmentCriteria.map((criterion, index) => (
                        <option key={index} value={index}>
                          {criterion.name} - {criterion.weight}%
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-600 mt-2">
                      Selecting a criterion will automatically fill the assessment type (title) and weight percentage.
                    </p>
                  </div>
                )}

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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            ? '✓ Matches syllabus framework'
                            : '⚠ Different from syllabus framework'}
                        </span>
                      )}
                      {assessmentCriteria.length > 0 && formData.weight_percentage && (
                        <span className="ml-2 text-xs text-green-600">
                          {assessmentCriteria.some(criterion => criterion.weight === parseFloat(formData.weight_percentage))
                            ? '✓ Matches assessment criteria'
                            : ''}
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
                        Syllabus framework weights: {assessmentComponents.map(comp => `${comp.type} (${comp.weight}%)`).join(', ')}
                      </p>
                    )}
                    {assessmentCriteria.length > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        Assessment criteria weights: {assessmentCriteria.map(criterion => `${criterion.name} (${criterion.weight}%)`).join(', ')}
                      </p>
                    )}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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