import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { PlusIcon, MagnifyingGlassIcon, TrashIcon } from '@heroicons/react/24/solid'
import ClassCard from '../../components/ClassCard'
import { CardGridSkeleton, ClassDetailsSkeleton, StudentListItemSkeleton, StudentListSkeleton, ImageSkeleton } from '../../components/skeletons'
import LazyStudentImage from '../../components/LazyStudentImage'
import { safeGetItem, safeSetItem, minimizeClassData, createCacheGetter, createCacheSetter } from '../../utils/cacheUtils'
import staffCacheService, { resetStaffCache, clearStaffLargeCache } from '../../services/staffCacheService'

// Cache helpers for enrollment data
const getCachedData = createCacheGetter(staffCacheService)
const setCachedData = createCacheSetter(staffCacheService)



const AssignFaculty = () => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [query, setQuery] = useState('')
  const [classes, setClasses] = useState([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [courses, setCourses] = useState([])
  const [showCourseSuggestions, setShowCourseSuggestions] = useState(false)
  const [terms, setTerms] = useState([])
  const [activeTermId, setActiveTermId] = useState(null)
  const [sections, setSections] = useState([])
  const [faculty, setFaculty] = useState([])
  
  // Class selection and students
  const [selectedClass, setSelectedClass] = useState(null)
  const [students, setStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  
  // Students modal - for available students
  const [showStudentsModal, setShowStudentsModal] = useState(false)
  const [availableStudents, setAvailableStudents] = useState([])
  const [enrolledStudents, setEnrolledStudents] = useState([])
  const [loadingAvailableStudents, setLoadingAvailableStudents] = useState(false)
  const [loadingEnrolledStudents, setLoadingEnrolledStudents] = useState(false)
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [selectedStudents, setSelectedStudents] = useState(new Set())
  const [enrollingStudents, setEnrollingStudents] = useState(new Set())
  const [showEnrolledView, setShowEnrolledView] = useState(false) // Toggle between available and enrolled
  const [courseSections, setCourseSections] = useState([]) // Sections for the current course
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('') // Selected section for filtering enrolled students
  const [selectedSidebarStudents, setSelectedSidebarStudents] = useState(new Set()) // Selected students in sidebar for unenroll
  const [unenrollingStudents, setUnenrollingStudents] = useState(new Set()) // Students being unenrolled

  // Success message state
  const [successMessage, setSuccessMessage] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // Ref for sidebar to detect clicks outside
  const sidebarRef = useRef(null)

  const [formData, setFormData] = useState({
    title: '',
    code: '',
    section: '',
    instructor: '',
    instructorId: '',
    bannerType: 'color',
    bannerColor: '#3B82F6',
    bannerImage: '',
    avatarUrl: '',
    termId: ''
  })
  const [creatingClass, setCreatingClass] = useState(false)

  const openCreateModal = () => setShowCreateModal(true)
  const closeCreateModal = () => {
    setShowCreateModal(false)
    setFormData({ title: '', code: '', section: '', instructor: '', instructorId: '', bannerType: 'color', bannerColor: '#3B82F6', bannerImage: '', avatarUrl: '', termId: '' })
  }

  // Handle class selection - prioritize student data, images load lazily
  const handleClassSelect = async (classItem) => {
    setSelectedClass(classItem)
    setLoadingStudents(true)
    setSelectedSidebarStudents(new Set()) // Reset selection when class changes
    
    try {
      // Priority 1: Fetch student data WITHOUT photos for fast initial load
      // Photos will be loaded lazily via LazyStudentImage component only when:
      // - Student data is already displayed
      // - Image scrolls into viewport
      // - Browser is idle (using requestIdleCallback)
      const response = await fetch(`/api/section-courses/${classItem.id}/students`)
      if (!response.ok) throw new Error(`Failed to fetch students: ${response.status}`)
      const studentData = await response.json()
      
      // Set students immediately - images will load asynchronously via LazyStudentImage
      setStudents(Array.isArray(studentData) ? studentData : [])
    } catch (error) {
      console.error('Error loading students:', error)
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  // Handle toggling student selection in sidebar
  const handleToggleSidebarStudent = (enrollmentId) => {
    setSelectedSidebarStudents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(enrollmentId)) {
        newSet.delete(enrollmentId)
      } else {
        newSet.add(enrollmentId)
      }
      return newSet
    })
  }

  // Handle selecting/deselecting all students in sidebar
  const handleSelectAllSidebar = () => {
    if (selectedSidebarStudents.size === students.length) {
      setSelectedSidebarStudents(new Set())
    } else {
      setSelectedSidebarStudents(new Set(students.map(s => s.enrollment_id)))
    }
  }

  // Handle bulk unenroll
  const handleBulkUnenroll = async () => {
    if (!selectedClass || selectedSidebarStudents.size === 0) return
    
    if (!confirm(`Are you sure you want to unenroll ${selectedSidebarStudents.size} student(s)?`)) {
      return
    }
    
    const enrollmentIds = Array.from(selectedSidebarStudents)
    setUnenrollingStudents(new Set(enrollmentIds))
    
    try {
      // Unenroll students one by one
      const unenrollPromises = enrollmentIds.map(async (enrollmentId) => {
        const response = await fetch(`/api/students/unenroll/${enrollmentId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || `Failed to unenroll student: ${response.status}`)
        }
        
        return { success: true, enrollmentId }
      })
      
      const results = await Promise.allSettled(unenrollPromises)
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
      const failed = results.length - successful
      
      // Clear selected students
      setSelectedSidebarStudents(new Set())
      
      // Clear relevant caches
      if (selectedClass) {
        staffCacheService.clear('students', `available_students_${selectedClass.id}`)
        // Clear all section caches for this course
        courseSections.forEach(section => {
          staffCacheService.clear('students', `section_students_${section.section_id}`)
        })
        staffCacheService.clear('students', `all_sections_students_${selectedClass.id}`)
      }
      
      // Refresh the enrolled students list
      await handleClassSelect(selectedClass)
      
      // Show success message
      if (successful > 0) {
        setSuccessMessage(
          failed > 0 
            ? `${successful} student(s) unenrolled successfully. ${failed} student(s) failed to unenroll.`
            : `${successful} student(s) unenrolled successfully!`
        )
        setShowSuccessModal(true)
      } else {
        alert('No students were unenrolled. Please try again.')
      }
      
    } catch (error) {
      console.error('Error unenrolling students:', error)
      alert(`Failed to unenroll students: ${error.message}`)
    } finally {
      setUnenrollingStudents(new Set())
    }
  }

  // Handle opening students modal - fetch available students
  const handleOpenStudentsModal = async () => {
    if (!selectedClass) return
    
    setShowStudentsModal(true)
    setShowEnrolledView(false)
    setStudentSearchQuery('')
    setSelectedStudents(new Set()) // Reset selected students when opening modal
    setSelectedSectionFilter('') // Reset section filter when opening modal
    
    // Load available students by default
    await loadAvailableStudents()
  }

  // Load available students (not enrolled) with caching and async fetching
  const loadAvailableStudents = useCallback(async (forceRefresh = false) => {
    if (!selectedClass) return
    
    const cacheKey = `available_students_${selectedClass.id}`
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedData('students', cacheKey, 5 * 60 * 1000) // 5 min TTL
      if (cached) {
        console.log('📦 [ENROLLMENT] Using cached available students')
        setAvailableStudents(Array.isArray(cached) ? cached : [])
        setLoadingAvailableStudents(false)
        return
      }
    }
    
    setLoadingAvailableStudents(true)
    
    // Use requestIdleCallback for async fetching when browser is idle
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/students/available-for-section/${selectedClass.id}`)
        if (!response.ok) throw new Error(`Failed to fetch available students: ${response.status}`)
        const data = await response.json()
        const students = Array.isArray(data.students) ? data.students : []
        
        // Cache the results
        setCachedData('students', cacheKey, students)
        
        setAvailableStudents(students)
      } catch (error) {
        console.error('Error loading available students:', error)
        setAvailableStudents([])
      } finally {
        setLoadingAvailableStudents(false)
      }
    }
    
    // Fetch asynchronously when browser is idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(fetchData, { timeout: 1000 })
    } else {
      // Fallback: use setTimeout for async behavior
      setTimeout(fetchData, 0)
    }
  }, [selectedClass])

  // Load enrolled students and sections for the course (all sections)
  const loadEnrolledStudents = async () => {
    if (!selectedClass) return
    
    setLoadingEnrolledStudents(true)
    try {
      // Get course_id and section_id from classes array or assigned endpoint
      const matchingClass = classes.find(cls => String(cls.id) === String(selectedClass.id))
      let courseId = matchingClass?.course_id
      let currentSectionId = null
      let currentSectionCode = selectedClass.section
      
      // If not found in classes, try to get from the assigned endpoint
      if (!courseId) {
        const sectionsResponse = await fetch(`/api/section-courses/assigned`)
        if (sectionsResponse.ok) {
          const allSectionCourses = await sectionsResponse.json()
          const matchingSectionCourse = Array.isArray(allSectionCourses)
            ? allSectionCourses.find(sc => String(sc.section_course_id) === String(selectedClass.id))
            : null
          if (matchingSectionCourse) {
            courseId = matchingSectionCourse.course_id
            currentSectionId = matchingSectionCourse.section_id
            currentSectionCode = matchingSectionCourse.section_code
          }
        }
      }
      
      if (courseId) {
        // Fetch all section_courses for this course to get unique sections
        const sectionsResponse = await fetch(`/api/section-courses/assigned`)
        if (sectionsResponse.ok) {
          const allSectionCourses = await sectionsResponse.json()
          // Filter by course_id to get all sections for this course
          const courseSectionCourses = Array.isArray(allSectionCourses) 
            ? allSectionCourses.filter(sc => String(sc.course_id) === String(courseId))
            : []
          
          // Extract unique sections
          const uniqueSections = []
          const seenSectionIds = new Set()
          courseSectionCourses.forEach(sc => {
            if (sc.section_id && !seenSectionIds.has(sc.section_id)) {
              seenSectionIds.add(sc.section_id)
              uniqueSections.push({
                section_id: sc.section_id,
                section_code: sc.section_code
              })
            }
          })
          
          const sortedSections = uniqueSections.sort((a, b) => 
            (a.section_code || '').localeCompare(b.section_code || '')
          )
          setCourseSections(sortedSections)
          
          // Set default section filter to current class's section
          if (selectedClass && selectedClass.section) {
            const matchingSection = sortedSections.find(s => s.section_code === selectedClass.section)
            if (matchingSection) {
              const sectionIdToUse = String(matchingSection.section_id)
              setSelectedSectionFilter(sectionIdToUse)
              // Fetch students for this section
              await loadStudentsBySection(sectionIdToUse)
            } else if (currentSectionId) {
              // Fallback: use section_id from API response
              const sectionIdToUse = String(currentSectionId)
              setSelectedSectionFilter(sectionIdToUse)
              await loadStudentsBySection(sectionIdToUse)
            }
          } else if (currentSectionId) {
            // Fallback: use section_id from API response
            const sectionIdToUse = String(currentSectionId)
            setSelectedSectionFilter(sectionIdToUse)
            await loadStudentsBySection(sectionIdToUse)
          }
        }
      } else {
        // Fallback: try to get section_id from current class
        setCourseSections([])
        setEnrolledStudents([])
      }
    } catch (error) {
      console.error('Error loading enrolled students:', error)
      setEnrolledStudents([])
      setCourseSections([])
    } finally {
      setLoadingEnrolledStudents(false)
    }
  }

  // Load students by section_id with caching and async fetching
  const loadStudentsBySection = useCallback(async (sectionId, forceRefresh = false) => {
    if (!sectionId) {
      setEnrolledStudents([])
      return
    }
    
    const cacheKey = `section_students_${sectionId}`
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedData('students', cacheKey, 5 * 60 * 1000) // 5 min TTL
      if (cached) {
        console.log('📦 [ENROLLMENT] Using cached section students')
        setEnrolledStudents(Array.isArray(cached) ? cached : [])
        return
      }
    }
    
    // Use requestIdleCallback for async fetching when browser is idle
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/sections/${sectionId}/students`)
        if (response.ok) {
          const studentsData = await response.json()
          const students = Array.isArray(studentsData) ? studentsData : []
          
          // Cache the results
          setCachedData('students', cacheKey, students)
          
          setEnrolledStudents(students)
        } else {
          console.error('Failed to fetch students for section:', sectionId)
          setEnrolledStudents([])
        }
      } catch (error) {
        console.error('Error fetching students for section:', error)
        setEnrolledStudents([])
      }
    }
    
    // Fetch asynchronously when browser is idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(fetchData, { timeout: 1000 })
    } else {
      // Fallback: use setTimeout for async behavior
      setTimeout(fetchData, 0)
    }
  }, [])

  // Load all students from all sections of the course with caching and async fetching
  const loadAllStudentsFromAllSections = useCallback(async () => {
    if (!selectedClass || courseSections.length === 0) {
      setEnrolledStudents([])
      return
    }
    
    const cacheKey = `all_sections_students_${selectedClass.id}`
    
    // Check cache first
    const cached = getCachedData('students', cacheKey, 5 * 60 * 1000) // 5 min TTL
    if (cached) {
      console.log('📦 [ENROLLMENT] Using cached all sections students')
      setEnrolledStudents(Array.isArray(cached) ? cached : [])
      return
    }
    
    // Use requestIdleCallback for async fetching when browser is idle
    const fetchData = async () => {
      try {
        // Fetch students from all sections and combine them
        const allStudents = []
        const seenStudentIds = new Set()
        
        // Fetch sections in parallel with batching for better performance
        const sectionPromises = courseSections.map(async (section) => {
          try {
            // Check individual section cache first
            const sectionCacheKey = `section_students_${section.section_id}`
            const sectionCached = getCachedData('students', sectionCacheKey, 5 * 60 * 1000)
            
            if (sectionCached) {
              return Array.isArray(sectionCached) ? sectionCached : []
            }
            
            const response = await fetch(`/api/sections/${section.section_id}/students`)
            if (response.ok) {
              const studentsData = await response.json()
              if (Array.isArray(studentsData)) {
                // Cache individual section
                setCachedData('students', sectionCacheKey, studentsData)
                return studentsData
              }
            }
            return []
          } catch (err) {
            console.error(`Error fetching students for section ${section.section_code}:`, err)
            return []
          }
        })
        
        // Wait for all sections to load (with batching to avoid overwhelming)
        const batchSize = 5
        for (let i = 0; i < sectionPromises.length; i += batchSize) {
          const batch = sectionPromises.slice(i, i + batchSize)
          const batchResults = await Promise.all(batch)
          
          // Combine results
          batchResults.forEach(students => {
            if (Array.isArray(students)) {
              students.forEach(student => {
                if (!seenStudentIds.has(student.student_id)) {
                  seenStudentIds.add(student.student_id)
                  allStudents.push(student)
                }
              })
            }
          })
          
          // Yield to browser between batches
          if (i + batchSize < sectionPromises.length && 'requestIdleCallback' in window) {
            await new Promise(resolve => requestIdleCallback(resolve, { timeout: 100 }))
          }
        }
        
        // Cache combined results
        setCachedData('students', cacheKey, allStudents)
        
        setEnrolledStudents(allStudents)
      } catch (error) {
        console.error('Error loading all students from all sections:', error)
        setEnrolledStudents([])
      }
    }
    
    // Fetch asynchronously when browser is idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(fetchData, { timeout: 1000 })
    } else {
      // Fallback: use setTimeout for async behavior
      setTimeout(fetchData, 0)
    }
  }, [selectedClass, courseSections])

  // Toggle between available and enrolled students view
  const handleToggleView = async (showEnrolled) => {
    setShowEnrolledView(showEnrolled)
    setSelectedStudents(new Set())
    setStudentSearchQuery('')
    
    if (showEnrolled) {
      // Reset filter first, then load enrolled students (which will set the filter to current class's section)
      setSelectedSectionFilter('')
      await loadEnrolledStudents()
    } else {
      setSelectedSectionFilter('') // Reset section filter when switching to available view
      await loadAvailableStudents()
    }
  }

  // Handle toggling student selection
  const handleToggleStudent = (studentId) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(studentId)) {
        newSet.delete(studentId)
      } else {
        newSet.add(studentId)
      }
      return newSet
    })
  }

  // Handle selecting/deselecting all students
  const handleSelectAll = () => {
    const studentsToSelect = showEnrolledView ? filteredEnrolledStudents : filteredAvailableStudents
    if (selectedStudents.size === studentsToSelect.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(studentsToSelect.map(s => s.student_id)))
    }
  }

  // Handle enrolling multiple students
  const handleBulkEnroll = async () => {
    if (!selectedClass || selectedStudents.size === 0) return
    
    const studentIds = Array.from(selectedStudents)
    setEnrollingStudents(new Set(studentIds))
    
    try {
      // Enroll students one by one (or you could create a bulk endpoint)
      const enrollPromises = studentIds.map(async (studentId) => {
        const response = await fetch('/api/students/enroll', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            section_course_id: selectedClass.id,
            student_id: studentId
          })
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          if (response.status === 409) {
            console.warn(`Student ${studentId} is already enrolled`)
            return { success: false, studentId, error: 'already_enrolled' }
          } else {
            throw new Error(data.error || `Failed to enroll student: ${response.status}`)
          }
        }
        
        return { success: true, studentId }
      })
      
      const results = await Promise.allSettled(enrollPromises)
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
      const failed = results.length - successful
      
      // Remove successfully enrolled students from available list
      const enrolledIds = results
        .filter(r => r.status === 'fulfilled' && r.value.success)
        .map(r => r.value.studentId)
      
      setAvailableStudents(prev => prev.filter(s => !enrolledIds.includes(s.student_id)))
      
      // Clear selected students
      setSelectedStudents(new Set())
      
      // Clear relevant caches
      if (selectedClass) {
        staffCacheService.clear('students', `available_students_${selectedClass.id}`)
        // Clear all section caches for this course
        courseSections.forEach(section => {
          staffCacheService.clear('students', `section_students_${section.section_id}`)
        })
        staffCacheService.clear('students', `all_sections_students_${selectedClass.id}`)
      }
      
      // Refresh the enrolled students list
      await handleClassSelect(selectedClass)
      
      // Show success message
      if (successful > 0) {
        setSuccessMessage(
          failed > 0 
            ? `${successful} student(s) enrolled successfully. ${failed} student(s) were already enrolled or failed.`
            : `${successful} student(s) enrolled successfully!`
        )
        setShowSuccessModal(true)
      } else {
        alert('No students were enrolled. They may already be enrolled in this class.')
      }
      
    } catch (error) {
      console.error('Error enrolling students:', error)
      alert(`Failed to enroll students: ${error.message}`)
    } finally {
      setEnrollingStudents(new Set())
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    try {
      setCreatingClass(true)
      
      // Validate required fields
      if (!formData.title || !formData.section || !formData.instructorId || !formData.termId) {
        alert('Please fill in all required fields: Course Title, Section, Instructor, and Semester')
        return
      }

      // Find the selected course, section, and instructor
      const selectedCourse = courses.find(c => 
        `${c.course_code} ${c.title}`.trim() === formData.title.trim()
      )
      
      if (!selectedCourse) {
        alert('Please select a valid course from the suggestions')
        return
      }

      // Find section by section_id (more reliable than section_code which might have duplicates)
      // formData.section should contain section_id if we update the dropdown to use it
      const selectedSection = availableSections.find(s => 
        String(s.section_id) === String(formData.section) || 
        s.section_code === formData.section
      )
      if (!selectedSection) {
        alert('Please select a valid section')
        return
      }
      
      // Verify the section belongs to the selected term
      if (String(selectedSection.term_id) !== String(formData.termId)) {
        alert(`Section "${selectedSection.section_code}" does not belong to the selected semester. Please select a different section.`)
        return
      }

      // Prepare the data for the API
      const sectionCourseData = {
        section_id: selectedSection.section_id,
        course_id: selectedCourse.course_id,
        instructor_id: formData.instructorId,
        term_id: formData.termId,
        banner_type: formData.bannerType,
        banner_color: formData.bannerType === 'color' ? formData.bannerColor : null,
        banner_image: formData.bannerType === 'image' ? formData.bannerImage : null,
        created_at: new Date().toISOString()
      }

      console.log('Creating section course with data:', sectionCourseData)
      console.log('Selected course:', selectedCourse)
      console.log('Selected section:', selectedSection)
      console.log('Available sections with same code:', sections.filter(s => s.section_code === formData.section))

      // Make API call to create section course
      const response = await fetch(`${API_BASE_URL}/section-courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sectionCourseData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 409) {
          // Use the detailed error message from backend which shows the exact conflicting combination
          throw new Error(errorData.error || 'This class already exists! Please choose a different course, section, or semester combination.')
        }
        throw new Error(errorData.error || errorData.message || `Failed to create class: ${response.status}`)
      }

      const createdSectionCourse = await response.json()
      console.log('Section course created successfully:', createdSectionCourse)

      // Add to local state for immediate display
      const newClass = {
        id: String(createdSectionCourse.section_course_id),
        title: formData.title,
        code: formData.code,
        section: formData.section,
        instructor: formData.instructor,
        bannerType: formData.bannerType,
        bannerColor: formData.bannerColor,
        bannerImage: formData.bannerImage,
        avatarUrl: formData.avatarUrl
      }
      
      setClasses(prev => [newClass, ...prev])
      closeCreateModal()
      
      // Show success message
      setSuccessMessage('Class created successfully!')
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Error creating class:', error)
      alert(`Failed to create class: ${error.message}`)
    } finally {
      setCreatingClass(false)
    }
  }

  // Compute API base URL similar to other services
  const API_BASE_URL = '/api'

  // Load data when create modal opens - with prioritization (on-demand, no prefetching)
  useEffect(() => {
    if (!showCreateModal) return
    
    let isMounted = true
    
    // Priority 1: Load critical data immediately (courses and terms - needed for form)
    ;(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/catalog/courses`)
        if (!response.ok) throw new Error(`Failed to fetch courses: ${response.status}`)
        const data = await response.json()
        if (isMounted) setCourses(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error loading courses:', error)
      }
    })()
    
    ;(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/school-terms`)
        if (!response.ok) throw new Error(`Failed to fetch school terms: ${response.status}`)
        const data = await response.json()
        if (isMounted) {
          const termsData = Array.isArray(data) ? data : []
          setTerms(termsData)
          // Find and set active term
          const activeTerm = termsData.find(t => t.is_active)
          if (activeTerm) {
            setActiveTermId(activeTerm.term_id)
            console.log('✅ [ASSIGN FACULTY] Active term found:', activeTerm.term_id, activeTerm.school_year, activeTerm.semester)
          }
        }
      } catch (error) {
        console.error('Error loading school terms:', error)
      }
    })()
    
    // Priority 2: Load secondary data (sections and faculty - needed for dropdowns)
    // Load after critical data starts loading
    const loadSecondaryData = () => {
      ;(async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/section-courses/sections`)
          if (!response.ok) throw new Error(`Failed to fetch sections: ${response.status}`)
          const data = await response.json()
          if (isMounted) setSections(Array.isArray(data) ? data : [])
        } catch (error) {
          console.error('Error loading sections:', error)
        }
      })()
      
      ;(async () => {
        try {
          // Fetch all approved faculty (not filtered by term) so staff can assign any faculty to new classes
          const response = await fetch(`${API_BASE_URL}/section-courses/faculty`)
          if (!response.ok) throw new Error(`Failed to fetch faculty: ${response.status}`)
          const data = await response.json()
          if (isMounted) {
            setFaculty(Array.isArray(data) ? data : [])
            console.log(`✅ [ASSIGN FACULTY] Loaded ${data.length} approved faculty`)
          }
        } catch (error) {
          console.error('Error loading faculty:', error)
        }
      })()
    }
    
    // Load secondary data after a short delay
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadSecondaryData, { timeout: 300 })
    } else {
      setTimeout(loadSecondaryData, 200)
    }
    
    return () => {
      isMounted = false
    }
  }, [showCreateModal])

  // Fetch active term on component mount
  useEffect(() => {
    const fetchActiveTerm = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/school-terms`)
        if (response.ok) {
          const terms = await response.json()
          const activeTerm = Array.isArray(terms) ? terms.find(t => t.is_active) : null
          if (activeTerm) {
            setActiveTermId(activeTerm.term_id)
            console.log('✅ [ASSIGN FACULTY] Active term found on mount:', activeTerm.term_id, activeTerm.school_year, activeTerm.semester)
          }
        }
      } catch (error) {
        console.error('❌ [ASSIGN FACULTY] Error fetching active term:', error)
      }
    }
    fetchActiveTerm()
  }, [])

  // Load existing section courses when component mounts - with caching
  useEffect(() => {
    // Check cache first for instant display
    const cacheKey = 'staff_classes_session'
    const cached = safeGetItem(cacheKey)
    
    if (cached) {
      console.log('📦 [STAFF ASSIGN FACULTY] Using cached classes')
      // Restore classes - handle both minimized and full format
      const restoredClasses = Array.isArray(cached) ? cached.map(cls => {
        // Check if it's already in the formatted structure
        if (cls.id) {
          return cls
        }
        // Otherwise, restore from minimized format
        return {
          id: String(cls.section_course_id || ''),
          title: cls.course_title || '',
          code: cls.course_code || '',
          section: cls.section_code || '',
          instructor: cls.faculty_name || '',
          bannerType: cls.banner_type || 'color',
          bannerColor: cls.banner_color || '#3B82F6',
          bannerImage: null, // Images not cached in minimized format
          avatarUrl: null // Images not cached in minimized format
        }
      }) : []
      setClasses(restoredClasses)
      setLoadingClasses(false)
      // Continue to fetch fresh data in background
    } else {
      setLoadingClasses(true)
    }
    
    let isMounted = true
    ;(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/section-courses/assigned`)
        if (!response.ok) throw new Error(`Failed to fetch assigned courses: ${response.status}`)
        const data = await response.json()
        if (isMounted) {
          const formattedClasses = data.map(item => ({
            id: String(item.section_course_id),
            title: item.course_title,
            code: item.course_code,
            section: item.section_code,
            instructor: item.faculty_name,
            bannerType: item.banner_type || 'color',
            bannerColor: item.banner_color || '#3B82F6',
            bannerImage: item.banner_image,
            avatarUrl: item.faculty_avatar,
            course_id: item.course_id // Include course_id for section filtering
          }))
          setClasses(formattedClasses)
          
          // Cache the formatted classes for next load - use minimizeClassData to reduce size
          if (!cached) {
            // Use minimizeClassData to exclude large base64 images
            const minimized = minimizeClassData(formattedClasses.map(cls => ({
              section_course_id: cls.id,
              section_id: null,
              section_code: cls.section,
              course_id: null,
              course_code: cls.code,
              course_title: cls.title,
              instructor_id: null,
              faculty_name: cls.instructor,
              term_id: null,
              semester: null,
              school_year: null,
              banner_type: cls.bannerType,
              banner_color: cls.bannerColor,
              banner_image: cls.bannerImage,
              faculty_avatar: cls.avatarUrl
            })))
            
            // Try to cache minimized data
            const cached = safeSetItem(cacheKey, minimized)
            if (!cached) {
              // If still too large, clear large staff cache entries
              clearStaffLargeCache()
              // Try again with minimized data
              safeSetItem(cacheKey, minimized)
            }
          }
        }
      } catch (error) {
        console.error('Error loading assigned courses:', error)
        if (isMounted) {
          // If we have cached data, use it even on error
          if (!cached) {
            setClasses([])
          }
        }
      } finally {
        if (isMounted) setLoadingClasses(false)
      }
    })()
    
    return () => {
      isMounted = false
    }
  }, [])

  const titleInputRef = useRef(null)

  // Filtered course suggestions based on the title input
  const matchingCourses = useMemo(() => {
    const query = (formData.title || '').trim().toLowerCase()
    if (!query) return []
    return courses
      .filter(c =>
        (c.title || '').toLowerCase().includes(query) ||
        (c.course_code || '').toLowerCase().includes(query)
      )
      .slice(0, 8)
  }, [formData.title, courses])

  const handleSelectCourse = (course) => {
    setFormData(prev => ({
      ...prev,
      title: `${course.course_code || ''} ${course.title || ''}`.trim(),
      code: course.course_code || prev.code
    }))
    setShowCourseSuggestions(false)
    // refocus input after selection for smoother UX
    if (titleInputRef.current) titleInputRef.current.focus()
  }

  const activeTerms = useMemo(() => terms.filter(t => t.is_active), [terms])

  // Helper function to extract last name (last word) for sorting
  const extractLastName = (fullName) => {
    if (!fullName || typeof fullName !== 'string') return ''
    const tokens = fullName.trim().split(/\s+/).filter(token => token.length > 0)
    if (tokens.length === 0) return ''
    return tokens[tokens.length - 1].toLowerCase()
  }

  // Helper function to format name as "Last name, First name Middle"
  const formatStudentName = (fullName) => {
    if (!fullName || typeof fullName !== 'string') return 'Unknown Student'
    const tokens = fullName.trim().split(/\s+/).filter(token => token.length > 0)
    if (tokens.length === 0) return 'Unknown Student'
    if (tokens.length === 1) return tokens[0] // Single name, return as is
    
    // Last name is the last token, first and middle names are the rest
    const lastName = tokens[tokens.length - 1]
    const firstAndMiddle = tokens.slice(0, -1).join(' ')
    
    return `${lastName}, ${firstAndMiddle}`
  }

  // Filter and sort available students based on search query
  const filteredAvailableStudents = useMemo(() => {
    let filtered = availableStudents
    
    // Filter by search query
    if (studentSearchQuery.trim()) {
      const query = studentSearchQuery.toLowerCase()
      filtered = filtered.filter(student =>
        (student.full_name || '').toLowerCase().includes(query) ||
        (student.student_number || '').toLowerCase().includes(query)
      )
    }
    
    // Sort by last name (last word), then by full name
    filtered.sort((a, b) => {
      const aLastName = extractLastName(a.full_name || '')
      const bLastName = extractLastName(b.full_name || '')
      
      if (aLastName !== bLastName) {
        return aLastName.localeCompare(bLastName)
      }
      
      // If last names are the same, sort by full name
      return (a.full_name || '').localeCompare(b.full_name || '')
    })
    
    return filtered
  }, [availableStudents, studentSearchQuery])

  // Filter and sort enrolled students based on search query
  // Students are already filtered by section_id from the API, so we only need to filter by search query
  const filteredEnrolledStudents = useMemo(() => {
    let filtered = enrolledStudents
    
    // Filter by search query
    if (studentSearchQuery.trim()) {
      const query = studentSearchQuery.toLowerCase()
      filtered = filtered.filter(student =>
        (student.full_name || '').toLowerCase().includes(query) ||
        (student.student_number || '').toLowerCase().includes(query)
      )
    }
    
    // Sort by last name (last word), then by full name
    filtered.sort((a, b) => {
      const aLastName = extractLastName(a.full_name || '')
      const bLastName = extractLastName(b.full_name || '')
      
      if (aLastName !== bLastName) {
        return aLastName.localeCompare(bLastName)
      }
      
      // If last names are the same, sort by full name
      return (a.full_name || '').localeCompare(b.full_name || '')
    })
    
    return filtered
  }, [enrolledStudents, studentSearchQuery])

  // Filter sections based on selected semester
  const availableSections = useMemo(() => {
    if (!formData.termId) return []
    return sections.filter(s => String(s.term_id) === String(formData.termId))
  }, [formData.termId, sections])

  const filtered = useMemo(() => {
    if (!query) return classes
    return classes.filter(c =>
      (c.title || '').toLowerCase().includes(query.toLowerCase()) ||
      (c.code || '').toLowerCase().includes(query.toLowerCase()) ||
      (c.instructor || '').toLowerCase().includes(query.toLowerCase())
    )
  }, [query, classes])

  // Handle click outside sidebar to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only close if sidebar is open and click is outside the sidebar
      if (selectedClass && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        // Don't close if clicking on a modal or its backdrop
        const target = event.target
        const isModal = target.closest('.fixed.inset-0')
        if (!isModal) {
          setSelectedClass(null)
          setSelectedSidebarStudents(new Set())
        }
      }
    }

    // Add event listener when sidebar is open
    if (selectedClass) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [selectedClass])

  return (
    <>
      <div className="pt-0 pb-4 overflow-hidden">
        <div className="w-full">
          {/* Tabs and Add Button */}
          <div className="bg-gray-50 border-b border-gray-200 mb-2">
            <div className="px-0">
              <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200">
                <nav className="flex space-x-8">
                  <div className="py-2 px-4 font-medium text-sm text-red-600 border-b-2 border-red-600">
                    Classes
                  </div>
                </nav>

                {/* Add Button aligned with navigation */}
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  title="Add Class"
                >
                  <PlusIcon className="h-5 w-5 stroke-[3]" />
                </button>
              </div>
            </div>
          </div>

          {/* Content Shell with search to mirror StudentManagement */}
          <div className="flex gap-6 h-[calc(100vh-150px)]">
            {/* Left Section - Classes Grid */}
            <div className={`flex flex-col transition-[width] duration-300 ease-in-out ${selectedClass ? 'w-0 overflow-hidden' : 'w-full'}`}>
              {/* Classes Grid */}
              <div className="flex-1 p-6">
                {/* Search Bar */}
                <div className="mb-6">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search classes or faculty..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  </div>
                </div>

                {loadingClasses ? (
                  <CardGridSkeleton cards={6} />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filtered.map(cls => (
                      <ClassCard
                        key={cls.id}
                        title={cls.title}
                        code={cls.code}
                        section={cls.section}
                        instructor={cls.instructor}
                        bannerType={cls.bannerType}
                        bannerColor={cls.bannerColor}
                        bannerImage={cls.bannerImage}
                        avatarUrl={cls.avatarUrl}
                        isSelected={selectedClass?.id === cls.id}
                        onClick={() => handleClassSelect(cls)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Section - Class Details and Students (Expanded) - Only show when class is selected */}
            {selectedClass && (
              <div 
                ref={sidebarRef}
                key="student-list-sidebar"
                className="bg-white flex flex-col p-4 rounded-lg shadow-sm border border-gray-200 overflow-hidden min-h-0 slide-in-from-right expand-from-right transition-[width] duration-300 ease-in-out w-full">
              {loadingStudents ? (
                <ClassDetailsSkeleton />
              ) : (
                <div className="h-full flex flex-col">
                  {/* Class Header */}
                  <div className="mb-3 pb-3 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h2 className="text-base font-semibold text-gray-900 whitespace-normal break-words">
                            {selectedClass.title}
                          </h2>
                          <button
                            onClick={handleOpenStudentsModal}
                            className="ml-2 inline-flex items-center justify-center w-6 h-6 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors flex-shrink-0"
                            title="Add students to class"
                          >
                            <PlusIcon className="h-3 w-3 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enrolled Students Section */}
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Select All and Unenroll Button */}
                    {students.length > 0 && (
                      <div className="mb-3 shrink-0 flex items-center justify-between">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedSidebarStudents.size === students.length && students.length > 0}
                            onChange={handleSelectAllSidebar}
                            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Select All ({students.length} students)
                          </span>
                        </label>
                        {selectedSidebarStudents.size > 0 && (
                          <button
                            onClick={handleBulkUnenroll}
                            disabled={unenrollingStudents.size > 0}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {unenrollingStudents.size > 0 ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                <span>Unenrolling...</span>
                              </>
                            ) : (
                              <>
                                <TrashIcon className="h-4 w-4" />
                                <span>Unenroll ({selectedSidebarStudents.size})</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Students List - Grid Layout matching Faculty interface */}
                    <div className="flex-1 overflow-auto min-h-0">
                      {loadingStudents ? (
                        <StudentListSkeleton students={5} />
                      ) : students.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {students.map((student, index) => {
                            // Calculate sequential number for grid layout
                            const sequentialNumber = index + 1
                            
                            return (
                              <div 
                                key={student.enrollment_id || student.student_id} 
                                className={`flex items-center space-x-3 p-3 rounded-lg transition-colors cursor-pointer ${
                                  selectedSidebarStudents.has(student.enrollment_id)
                                    ? 'bg-red-50 border-2 border-red-300'
                                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                                }`}
                                onClick={() => handleToggleSidebarStudent(student.enrollment_id)}
                              >
                                <div className="flex-shrink-0 w-6 text-center">
                                  <span className="text-xs font-medium text-gray-500">
                                    {sequentialNumber}
                                  </span>
                                </div>
                                <div className="flex-shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={selectedSidebarStudents.has(student.enrollment_id)}
                                    onChange={() => handleToggleSidebarStudent(student.enrollment_id)}
                                    disabled={unenrollingStudents.has(student.enrollment_id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 disabled:opacity-50"
                                  />
                                </div>
                                <div className="flex-shrink-0">
                                  <LazyStudentImage
                                    studentId={student.student_id}
                                    alt={student.full_name}
                                    size="md"
                                    shape="circle"
                                    className="border border-gray-200"
                                    priority={false}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {formatStudentName(student.full_name)}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {student.student_number}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-8 text-center">
                          <div>
                            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                              </svg>
                            </div>
                            <h3 className="text-sm font-medium text-gray-900 mb-1">No students enrolled</h3>
                            <p className="text-xs text-gray-500">This class has no enrolled students yet.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-5xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create Class</h3>
              <button onClick={closeCreateModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form */}
              <div>
                <div className="space-y-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
                    <input
                      ref={titleInputRef}
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={(e) => { handleInputChange(e); setShowCourseSuggestions(true) }}
                      onFocus={() => setShowCourseSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowCourseSuggestions(false), 150)}
                      placeholder="e.g., IT 111 Introduction to Computing"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    {showCourseSuggestions && matchingCourses.length > 0 && (
                      <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow">
                        {matchingCourses.map(course => (
                          <li
                            key={course.course_id}
                            className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-50"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectCourse(course)}
                          >
                            <div className="font-medium text-gray-900">{course.course_code || '—'}</div>
                            <div className="text-gray-600">{course.title}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                      <select
                        name="termId"
                        value={formData.termId || ''}
                        onChange={(e) => {
                          setFormData(prev => ({ 
                            ...prev, 
                            termId: e.target.value,
                            section: '' // Clear section when semester changes
                          }))
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                      >
                        <option value="">Select semester</option>
                        {activeTerms.map(term => (
                          <option key={term.term_id} value={term.term_id}>
                            {`${term.school_year} - ${term.semester}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                      <select
                        name="section"
                        value={formData.section}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                        disabled={!formData.termId}
                      >
                        <option value="">
                          {formData.termId ? 'Select section' : 'Select semester first'}
                        </option>
                        {availableSections.map(section => (
                          <option key={section.section_id} value={section.section_id}>
                            {section.section_code}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
                    <select
                      name="instructorId"
                      value={formData.instructorId}
                      onChange={(e) => {
                        const selectedFaculty = faculty.find(f => String(f.user_id) === String(e.target.value))
                        setFormData(prev => ({
                          ...prev,
                          instructorId: e.target.value,
                          instructor: selectedFaculty ? selectedFaculty.name : '',
                          avatarUrl: selectedFaculty ? selectedFaculty.profile_pic : ''
                        }))
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                    >
                      <option value="">Select instructor</option>
                      {faculty.map(f => (
                        <option key={f.user_id} value={f.user_id} className="flex items-center gap-2">
                          {f.name}
                        </option>
                      ))}
                    </select>
                    {formData.instructorId && (
                      <div className="mt-2 flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                        {formData.avatarUrl && (
                          <div className="w-8 h-8 rounded-full overflow-hidden">
                            <img 
                              src={formData.avatarUrl} 
                              alt={formData.instructor}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <span className="text-sm text-gray-700">{formData.instructor}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Banner</label>
                    
                    {/* Banner Type Selection */}
                    <div className="flex gap-4 mb-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="bannerType"
                          value="color"
                          checked={formData.bannerType === 'color'}
                          onChange={(e) => setFormData(prev => ({ ...prev, bannerType: e.target.value }))}
                          className="mr-2"
                        />
                        <span className="text-sm">Color</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="bannerType"
                          value="image"
                          checked={formData.bannerType === 'image'}
                          onChange={(e) => setFormData(prev => ({ ...prev, bannerType: e.target.value }))}
                          className="mr-2"
                        />
                        <span className="text-sm">Image</span>
                      </label>
                    </div>

                    {/* Color Palette */}
                    {formData.bannerType === 'color' && (
                      <div className="flex flex-wrap gap-1">
                        {[
                          '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
                          '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6', '#F43F5E'
                        ].map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, bannerColor: color }))}
                            className={`w-6 h-6 rounded border ${
                              formData.bannerColor === color 
                                ? 'border-gray-800' 
                                : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    )}

                    {/* Image Upload */}
                    {formData.bannerType === 'image' && (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setFormData(prev => ({ 
                                  ...prev, 
                                  bannerImage: event.target.result 
                                }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        {formData.bannerImage && (
                          <div className="mt-2">
                            <img 
                              src={formData.bannerImage} 
                              alt="Banner preview" 
                              className="w-full h-20 object-cover rounded-md"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>


                </div>
              </div>

              {/* Live Preview */}
              <div>
                <div className="text-sm text-gray-500 mb-2">Preview</div>
                <ClassCard
                  title={formData.title || 'Course Title'}
                  code={formData.code || 'CODE-1234'}
                  section={formData.section || 'SECTION'}
                  instructor={formData.instructor || 'Instructor Name'}
                  bannerType={formData.bannerType}
                  bannerColor={formData.bannerColor}
                  bannerImage={formData.bannerImage}
                  avatarUrl={formData.avatarUrl}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button 
                onClick={closeCreateModal} 
                disabled={creatingClass}
                className="px-3 py-1.5 text-sm bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                disabled={creatingClass}
                className="px-3 py-1.5 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creatingClass ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Students Modal */}
      {showStudentsModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {showEnrolledView ? 'Existing Class List' : 'Add Students'} - {selectedClass.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedClass.code} • {selectedClass.section} • {selectedClass.instructor}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {/* Toggle Buttons */}
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => handleToggleView(false)}
                    className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                      !showEnrolledView
                        ? 'bg-white text-red-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Available
                  </button>
                  <button
                    onClick={() => handleToggleView(true)}
                    className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                      showEnrolledView
                        ? 'bg-white text-red-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Existing Class List
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowStudentsModal(false)
                    setSelectedStudents(new Set())
                    setShowEnrolledView(false)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Search Bar and Students Count */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search students by name or student code..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  {/* Section Filter Dropdown - Only show in Enrolled view */}
                  {showEnrolledView && courseSections.length > 0 && (
                    <div className="flex-shrink-0">
                      <select
                        value={selectedSectionFilter}
                        onChange={async (e) => {
                          const sectionId = e.target.value
                          setSelectedSectionFilter(sectionId)
                          setLoadingEnrolledStudents(true)
                          // Load students for the selected section
                          if (sectionId) {
                            await loadStudentsBySection(sectionId)
                          } else {
                            // Load all students from all sections of the course
                            await loadAllStudentsFromAllSections()
                          }
                          setLoadingEnrolledStudents(false)
                        }}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 bg-white"
                      >
                        <option value="">All Sections</option>
                        {courseSections.map(section => (
                          <option key={section.section_id} value={section.section_id}>
                            {section.section_code}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      {showEnrolledView ? 'Existing Class List' : 'Available Students'}
                    </h4>
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full border">
                      {showEnrolledView 
                        ? `${filteredEnrolledStudents.length} student${filteredEnrolledStudents.length !== 1 ? 's' : ''}`
                        : `${filteredAvailableStudents.length} student${filteredAvailableStudents.length !== 1 ? 's' : ''}`
                      }
                    </span>
                    {selectedStudents.size > 0 && (
                      <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200 font-medium">
                        {selectedStudents.size} selected
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Students List */}
              <div className="flex-1 overflow-y-auto p-3">
                {(showEnrolledView ? loadingEnrolledStudents : loadingAvailableStudents) ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading...</span>
                  </div>
                ) : (showEnrolledView ? filteredEnrolledStudents : filteredAvailableStudents).length > 0 ? (
                  <div>
                    {/* Select All Checkbox */}
                    <div className="mb-3 px-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            showEnrolledView
                              ? selectedStudents.size === filteredEnrolledStudents.length && filteredEnrolledStudents.length > 0
                              : selectedStudents.size === filteredAvailableStudents.length && filteredAvailableStudents.length > 0
                          }
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Select All ({showEnrolledView ? filteredEnrolledStudents.length : filteredAvailableStudents.length} students)
                        </span>
                      </label>
                    </div>
                    
                    {/* Students Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {(showEnrolledView ? filteredEnrolledStudents : filteredAvailableStudents).map((student, index) => (
                        <div 
                          key={student.student_id} 
                          className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${
                            selectedStudents.has(student.student_id)
                              ? 'bg-red-50 border-2 border-red-300'
                              : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                          }`}
                        >
                          <div className="flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={selectedStudents.has(student.student_id)}
                              onChange={() => handleToggleStudent(student.student_id)}
                              disabled={enrollingStudents.has(student.student_id)}
                              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 disabled:opacity-50"
                            />
                          </div>
                          <div className="flex-shrink-0">
                            <div className="flex items-center justify-center w-6 h-6 bg-gray-200 rounded-full text-xs font-medium text-gray-600">
                              {index + 1}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <LazyStudentImage
                              studentId={student.student_id}
                              alt={student.full_name}
                              size="sm"
                              shape="circle"
                              className="border-2 border-gray-200"
                              priority={false}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">
                              {formatStudentName(student.full_name)}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {student.student_number}
                            </p>
                            {showEnrolledView && student.section_code && (
                              <p className="text-xs text-blue-600 font-medium truncate">
                                Section: {student.section_code}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12 text-center">
                    <div>
                      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500">
                        {studentSearchQuery 
                          ? 'No students found matching your search' 
                          : showEnrolledView 
                            ? 'No students in existing classes' 
                            : 'No available students to enroll'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {selectedStudents.size > 0 && (
                    <span>{selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''} selected</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setShowStudentsModal(false)
                      setSelectedStudents(new Set())
                      setShowEnrolledView(false)
                    }}
                    className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleBulkEnroll}
                    disabled={selectedStudents.size === 0 || enrollingStudents.size > 0}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {enrollingStudents.size > 0 ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Enrolling...</span>
                      </>
                    ) : (
                      <>
                        <PlusIcon className="h-4 w-4" />
                        <span>Enroll Selected ({selectedStudents.size})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-center mb-4">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Success!</h3>
              <p className="text-sm text-gray-500 mb-6">{successMessage}</p>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessMessage('');
                }}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AssignFaculty


