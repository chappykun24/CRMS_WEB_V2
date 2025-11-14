import React, { useEffect, useMemo, useRef, useState } from 'react'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid'
import ClassCard from '../../components/ClassCard'
import { CardGridSkeleton, ClassDetailsSkeleton, StudentListItemSkeleton, ImageSkeleton } from '../../components/skeletons'
import { safeGetItem, safeSetItem, minimizeClassData } from '../../utils/cacheUtils'
import staffCacheService, { resetStaffCache, clearStaffLargeCache } from '../../services/staffCacheService'



const AssignFaculty = () => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [query, setQuery] = useState('')
  const [classes, setClasses] = useState([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [courses, setCourses] = useState([])
  const [showCourseSuggestions, setShowCourseSuggestions] = useState(false)
  const [terms, setTerms] = useState([])
  const [sections, setSections] = useState([])
  const [faculty, setFaculty] = useState([])
  
  // Class selection and students
  const [selectedClass, setSelectedClass] = useState(null)
  const [students, setStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  
  // Students modal - for available students
  const [showStudentsModal, setShowStudentsModal] = useState(false)
  const [availableStudents, setAvailableStudents] = useState([])
  const [loadingAvailableStudents, setLoadingAvailableStudents] = useState(false)
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [enrollingStudents, setEnrollingStudents] = useState(new Set())

  // Success message state
  const [successMessage, setSuccessMessage] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)

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

  // Handle class selection
  const handleClassSelect = async (classItem) => {
    setSelectedClass(classItem)
    setLoadingStudents(true)
    
    try {
      const response = await fetch(`/api/section-courses/${classItem.id}/students`)
      if (!response.ok) throw new Error(`Failed to fetch students: ${response.status}`)
      const studentData = await response.json()
      setStudents(Array.isArray(studentData) ? studentData : [])
    } catch (error) {
      console.error('Error loading students:', error)
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  // Handle opening students modal - fetch available students
  const handleOpenStudentsModal = async () => {
    if (!selectedClass) return
    
    setShowStudentsModal(true)
    setLoadingAvailableStudents(true)
    setStudentSearchQuery('')
    
    try {
      const response = await fetch(`/api/students/available-for-section/${selectedClass.id}`)
      if (!response.ok) throw new Error(`Failed to fetch available students: ${response.status}`)
      const data = await response.json()
      setAvailableStudents(Array.isArray(data.students) ? data.students : [])
    } catch (error) {
      console.error('Error loading available students:', error)
      setAvailableStudents([])
    } finally {
      setLoadingAvailableStudents(false)
    }
  }

  // Handle enrolling a student
  const handleEnrollStudent = async (studentId) => {
    if (!selectedClass) return
    
    // Add to loading set
    setEnrollingStudents(prev => new Set(prev).add(studentId))
    
    try {
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
          alert('Student is already enrolled in this class.')
        } else {
          throw new Error(data.error || `Failed to enroll student: ${response.status}`)
        }
        return
      }
      
      if (data.success) {
        // Remove the enrolled student from available list
        setAvailableStudents(prev => prev.filter(s => s.student_id !== studentId))
        
        // Refresh the enrolled students list
        await handleClassSelect(selectedClass)
        
        // Show success message
        setSuccessMessage('Student enrolled successfully!')
        setShowSuccessModal(true)
      }
      
    } catch (error) {
      console.error('Error enrolling student:', error)
      alert(`Failed to enroll student: ${error.message}`)
    } finally {
      // Remove from loading set
      setEnrollingStudents(prev => {
        const newSet = new Set(prev)
        newSet.delete(studentId)
        return newSet
      })
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

      const selectedSection = sections.find(s => s.section_code === formData.section)
      if (!selectedSection) {
        alert('Please select a valid section')
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
          throw new Error('This class already exists! Please choose a different course, section, or semester combination.')
        }
        throw new Error(errorData.message || `Failed to create class: ${response.status}`)
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
        const response = await fetch(`${API_BASE_URL}/courses`)
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
        if (isMounted) setTerms(Array.isArray(data) ? data : [])
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
          const response = await fetch(`${API_BASE_URL}/section-courses/faculty`)
          if (!response.ok) throw new Error(`Failed to fetch faculty: ${response.status}`)
          const data = await response.json()
          if (isMounted) setFaculty(Array.isArray(data) ? data : [])
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
            avatarUrl: item.faculty_avatar
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

  // Filter available students based on search query
  const filteredAvailableStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return availableStudents
    
    const query = studentSearchQuery.toLowerCase()
    return availableStudents.filter(student =>
      (student.full_name || '').toLowerCase().includes(query) ||
      (student.student_number || '').toLowerCase().includes(query)
    )
  }, [availableStudents, studentSearchQuery])

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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-150px)]">
            {/* Left Section */}
            <div className="lg:col-span-3 flex flex-col h-full min-h-0">
              {/* Search Bar */}
              <div className="mb-6 shrink-0">
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

              {/* Classes Grid */}
              <div className="flex-1 min-h-0 overflow-auto">
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

            {/* Right Section - Class Details and Students */}
            <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-h-[120px] overflow-auto">
              {loadingStudents && !selectedClass ? (
                <ClassDetailsSkeleton />
              ) : selectedClass ? (
                <div className="h-full flex flex-col">
                  {/* Class Header */}
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedClass.title}</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><span className="font-medium">Code:</span> {selectedClass.code}</div>
                      <div><span className="font-medium">Section:</span> {selectedClass.section}</div>
                      <div><span className="font-medium">Instructor:</span> {selectedClass.instructor}</div>
                    </div>
                  </div>

                  {/* Students List */}
                  <div className="flex-1 min-h-0">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-medium text-gray-900">Enrolled Students</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {loadingStudents ? '...' : `${students.length} student${students.length !== 1 ? 's' : ''}`}
                        </span>
                        <button
                          onClick={handleOpenStudentsModal}
                          className="inline-flex items-center justify-center w-6 h-6 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                          title="Add students to class"
                        >
                          <PlusIcon className="h-3 w-3 stroke-[3]" />
                        </button>
                      </div>
                    </div>
                    
                    {loadingStudents ? (
                      <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                        <StudentListItemSkeleton count={6} />
                      </div>
                    ) : students.length > 0 ? (
                      <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                        {students.map((student) => (
                          <div key={student.student_id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex-shrink-0">
                              <ImageSkeleton
                                src={student.student_photo}
                                alt={student.full_name}
                                size="md"
                                shape="circle"
                                className="border-2 border-gray-200"
                                priority={false}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {student.full_name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {student.student_number}
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                student.status === 'enrolled' 
                                  ? 'bg-green-100 text-green-800' 
                                  : student.status === 'dropped'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {student.status || 'enrolled'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8 text-center">
                        <div>
                          <div className="mx-auto mb-2 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                          </div>
                          <p className="text-sm text-gray-500">No students enrolled</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center text-gray-500 py-10">
                  <div>
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <p className="text-sm">Select a class to view students here.</p>
                  </div>
                </div>
              )}
            </div>
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
                          <option key={section.section_id} value={section.section_code}>
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
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Add Students to {selectedClass.title}</h3>
                <p className="text-sm text-gray-600">
                  {selectedClass.code} • {selectedClass.section} • {selectedClass.instructor}
                </p>
              </div>
              <button
                onClick={() => setShowStudentsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-900">Available Students</h4>
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full border">
                      {filteredAvailableStudents.length} student{filteredAvailableStudents.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Students List */}
              <div className="flex-1 overflow-y-auto p-3">
                {loadingAvailableStudents ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading...</span>
                  </div>
                ) : filteredAvailableStudents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {filteredAvailableStudents.map((student, index) => (
                      <div key={student.student_id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                        <div className="flex-shrink-0">
                          <div className="flex items-center justify-center w-6 h-6 bg-gray-200 rounded-full text-xs font-medium text-gray-600">
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {student.student_photo ? (
                            <img 
                              src={student.student_photo} 
                              alt={student.full_name}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {student.full_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {student.student_number}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => handleEnrollStudent(student.student_id)}
                            disabled={enrollingStudents.has(student.student_id)}
                            className="inline-flex items-center px-2 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {enrollingStudents.has(student.student_id) ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                Enrolling...
                              </>
                            ) : (
                              <>
                                <PlusIcon className="h-3 w-3 mr-1" />
                                Enroll
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
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
                        {studentSearchQuery ? 'No students found matching your search' : 'No available students to enroll'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowStudentsModal(false)}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                >
                  Close
                </button>
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


