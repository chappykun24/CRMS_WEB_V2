import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '../../contexts/UnifiedAuthContext'
import facultyCacheService from '../../services/facultyCacheService'
 
import ClassCard from '../../components/ClassCard'
import { CardGridSkeleton, StudentListSkeleton } from '../../components/skeletons'
import AttendanceDashboard from '../../components/AttendanceDashboard'

const MyClasses = () => {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState(null)
  const [initialLoad, setInitialLoad] = useState(true)
  
  // Force loading to be visible for testing
  const [forceLoading, setForceLoading] = useState(true)
  
  // Normalize faculty ID from user context
  const facultyId = user?.user_id ?? user?.id
  
  // Refs for cleanup and optimization
  const abortControllerRef = useRef(null)
  const classesCacheRef = useRef(new Map())
  const sidebarRef = useRef(null)
  
  // Enhanced caching for faculty data
  const facultyCacheRef = useRef({
    classes: new Map(),
    students: new Map(),
    departments: new Map(),
    lastUpdated: new Map()
  })
  
  // Selected class and students
  const [selectedClass, setSelectedClass] = useState(null)
  const [students, setStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  
  // Attendance view state
  const [showAttendanceDashboard, setShowAttendanceDashboard] = useState(false)

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingClass, setEditingClass] = useState(null)
  const [editFormData, setEditFormData] = useState({
    bannerType: 'color',
    bannerColor: '#3B82F6',
    bannerImage: ''
  })
  const [savingEdit, setSavingEdit] = useState(false)

  // Success message state
  const [successMessage, setSuccessMessage] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // Attendance mode state
  const [isAttendanceMode, setIsAttendanceMode] = useState(false)
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0])
  const [attendanceRecords, setAttendanceRecords] = useState({}) // {studentId: {date: status}}
  const [togglingAttendance, setTogglingAttendance] = useState(false)
  const [submittingAttendance, setSubmittingAttendance] = useState(false)

  // Session details state
  const [sessionDetails, setSessionDetails] = useState({
    sessionNumber: '',
    topic: '',
    description: '',
    startTime: '',
    endTime: ''
  })
  const [sessionDetailsValid, setSessionDetailsValid] = useState(false)

  // Validate session details
  const validateSessionDetails = useCallback(() => {
    const { sessionNumber, topic, startTime, endTime } = sessionDetails
    const isValid = sessionNumber.trim() !== '' && 
                   topic.trim() !== '' && 
                   startTime !== '' && 
                   endTime !== ''
    setSessionDetailsValid(isValid)
    return isValid
  }, [sessionDetails])

  // Update session details and validate
  const updateSessionDetails = useCallback((field, value) => {
    setSessionDetails(prev => {
      const updated = { ...prev, [field]: value }
      return updated
    })
  }, [])

  // Validate session details when they change
  useEffect(() => {
    validateSessionDetails()
  }, [sessionDetails, validateSessionDetails])

  // Helpers: extract surname (last word) for alphabetical sorting
  const extractSurname = (fullName) => {
    if (!fullName || typeof fullName !== 'string') return ''
    const tokens = fullName.trim().split(/\s+/)
    if (tokens.length === 0) return ''
    return tokens[tokens.length - 1].toLowerCase()
  }

  // Attendance functions with memoization
  const markAttendance = useCallback((studentId, status, remarks = '') => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [attendanceDate]: { status, remarks }
      }
    }))
  }, [attendanceDate])

  const markAllPresent = useCallback(() => {
    students.forEach(student => {
      markAttendance(student.student_id, 'present')
    })
  }, [students, markAttendance])

  const getAttendanceStatus = useCallback((studentId) => {
    return attendanceRecords[studentId]?.[attendanceDate]?.status || null
  }, [attendanceRecords, attendanceDate])

  const getAttendanceRemarks = useCallback((studentId) => {
    return attendanceRecords[studentId]?.[attendanceDate]?.remarks || ''
  }, [attendanceRecords, attendanceDate])

  // Submit attendance data
  const submitAttendance = useCallback(async () => {
    if (!selectedClass) return

    // Validate session details before submitting
    if (!validateSessionDetails()) {
      alert('Please fill in all required session details (Session Number, Topic, Start Time, End Time)')
      return
    }

    setSubmittingAttendance(true)
    try {
      // Prepare attendance data for submission
      const attendanceData = {
        section_course_id: selectedClass.section_course_id,
        date: attendanceDate,
        session_details: sessionDetails,
        records: Object.keys(attendanceRecords).map(studentId => ({
          student_id: studentId,
          status: attendanceRecords[studentId]?.[attendanceDate]?.status || 'present',
          remarks: attendanceRecords[studentId]?.[attendanceDate]?.remarks || ''
        }))
      }

      console.log('📤 [ATTENDANCE] Submitting attendance data:', attendanceData)

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(attendanceData)
      })

      if (!response.ok) {
        throw new Error(`Failed to submit attendance: ${response.status}`)
      }

      // Show success message
      setSuccessMessage('Attendance submitted successfully!')
      setShowSuccessModal(true)

      // Exit attendance mode
      setIsAttendanceMode(false)

    } catch (error) {
      console.error('❌ [ATTENDANCE] Error submitting attendance:', error)
      alert(`Failed to submit attendance: ${error.message}`)
    } finally {
      setSubmittingAttendance(false)
    }
  }, [selectedClass, attendanceDate, attendanceRecords])

  // Edit modal handlers
  const handleEditClass = (classItem) => {
    setEditingClass(classItem)
    setEditFormData({
      bannerType: classItem.banner_type || 'color',
      bannerColor: classItem.banner_color || '#3B82F6',
      bannerImage: classItem.banner_image || ''
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editingClass) return

    setSavingEdit(true)
    try {
      const response = await fetch(`/api/section-courses/${editingClass.section_course_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          banner_type: editFormData.bannerType,
          banner_color: editFormData.bannerType === 'color' ? editFormData.bannerColor : null,
          banner_image: editFormData.bannerType === 'image' ? editFormData.bannerImage : null
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to update class: ${response.status}`)
      }

      // Update local state
      setClasses(prev => prev.map(cls => 
        cls.section_course_id === editingClass.section_course_id
          ? {
              ...cls,
              banner_type: editFormData.bannerType,
              banner_color: editFormData.bannerColor,
              banner_image: editFormData.bannerImage
            }
          : cls
      ))

      // Update selected class if it's the one being edited
      if (selectedClass?.section_course_id === editingClass.section_course_id) {
        setSelectedClass(prev => ({
          ...prev,
          banner_type: editFormData.bannerType,
          banner_color: editFormData.bannerColor,
          banner_image: editFormData.bannerImage
        }))
      }

      setShowEditModal(false)
      setEditingClass(null)
      setSuccessMessage('Class banner updated successfully!')
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Error updating class:', error)
      alert(`Failed to update class: ${error.message}`)
    } finally {
      setSavingEdit(false)
    }
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setEditingClass(null)
    setEditFormData({
      bannerType: 'color',
      bannerColor: '#3B82F6',
      bannerImage: ''
    })
  }

  // Clear selected class from localStorage when component unmounts or no class selected
  useEffect(() => {
    return () => {
      if (!selectedClass) {
        localStorage.removeItem('selectedClass')
        window.dispatchEvent(new CustomEvent('selectedClassChanged'))
      }
    }
  }, [selectedClass])

  // Handle clicks outside sidebar to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target) && selectedClass) {
        // Check if the click is not on a class card
        const isClassCard = event.target.closest('[data-class-card]')
        if (!isClassCard) {
          setSelectedClass(null)
          setIsAttendanceMode(false)
          localStorage.removeItem('selectedClass')
          window.dispatchEvent(new CustomEvent('selectedClassChanged'))
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [selectedClass])

  // Ensure loading state is shown immediately on mount/reload
  useEffect(() => {
    console.log('🔍 [FACULTY] Component mounted, setting initial loading state')
    setLoading(true)
    setError(null)
    setInitialLoad(true)
    setForceLoading(true)
    
    // Force loading to show for at least 2 seconds
    const timer = setTimeout(() => {
      console.log('🔍 [FACULTY] Initial load timer completed')
      setInitialLoad(false)
      setForceLoading(false)
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [])

  

  // Enhanced cache management using dedicated service
  const getCachedData = useCallback((cacheType, key, maxAge = 300000) => {
    return facultyCacheService.get(cacheType, key, maxAge)
  }, [])

  const setCachedData = useCallback((cacheType, key, data) => {
    return facultyCacheService.set(cacheType, key, data)
  }, [])

  // Clear specific cache
  const clearCache = useCallback((cacheType, key = null) => {
    return facultyCacheService.clear(cacheType, key)
  }, [])

  // Fetch faculty's assigned classes with enhanced caching
  const fetchClasses = useCallback(async () => {
    if (!facultyId) {
      console.log('🔍 [FACULTY] fetchClasses called but no facultyId')
      return
    }
    
    console.log('🔍 [FACULTY] fetchClasses starting - facultyId:', facultyId)
    setLoading(true)
    setError(null)
    setInitialLoad(false)
    
    // Check enhanced cache first
    const cacheKey = `classes_${facultyId}`
    const cachedData = getCachedData('classes', cacheKey, 300000) // 5 minute cache
    if (cachedData) {
      console.log('📦 [FACULTY] Using enhanced cached classes data')
      setClasses(cachedData)
      setLoading(false)
      setInitialLoad(false)
      return
    }
    
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController()
    
    try {
      console.log(`🔍 [FACULTY] Fetching classes for user ID: ${facultyId}`)
      
      const response = await fetch(`/api/section-courses/faculty/${facultyId}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=300' // 5 minutes browser cache
        },
        signal: abortControllerRef.current.signal
      })
      
      console.log(`📡 [FACULTY] Response status: ${response.status}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch classes: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log(`✅ [FACULTY] Received ${Array.isArray(data) ? data.length : 0} classes`)
      
      const classesData = Array.isArray(data) ? data : []
      setClasses(classesData)
      
      // Store in enhanced cache
      setCachedData('classes', cacheKey, classesData)
      
      // Also store in legacy cache for compatibility
      classesCacheRef.current.set(cacheKey, {
        data: classesData,
        timestamp: Date.now()
      })
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🚫 [FACULTY] Request was aborted')
        return
      }
      console.error('❌ [FACULTY] Error fetching classes:', error)
      setError(error.message)
      setClasses([])
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [facultyId])

  // Handle class selection with enhanced caching
  const handleClassSelect = useCallback(async (classItem) => {
    setSelectedClass(classItem)
    setIsAttendanceMode(false) // Reset attendance mode when selecting different class
    
    // Reset session details when selecting different class
    setSessionDetails({
      sessionNumber: '',
      topic: '',
      description: '',
      startTime: '',
      endTime: ''
    })
    
    // Save selected class to localStorage for Header breadcrumb
    localStorage.setItem('selectedClass', JSON.stringify(classItem))
    
    // Dispatch custom event to notify Header of change
    window.dispatchEvent(new CustomEvent('selectedClassChanged'))
    
    // Check enhanced cache for students
    const studentsCacheKey = `students_${classItem.section_course_id}`
    const cachedStudents = getCachedData('students', studentsCacheKey, 600000) // 10 minute cache
    
    if (cachedStudents) {
      console.log('📦 [FACULTY] Using enhanced cached students data')
      setStudents(cachedStudents)
      return
    }
    
    setLoadingStudents(true)
    try {
      const response = await fetch(`/api/section-courses/${classItem.section_course_id}/students`)
      if (!response.ok) throw new Error('Failed to fetch students')
      const data = await response.json()
      const list = Array.isArray(data) ? data : []
      
      // Sort students alphabetically by surname
      const sortedStudents = list.sort((a, b) => {
        const aLast = extractSurname(a.full_name)
        const bLast = extractSurname(b.full_name)
        if (aLast === bLast) {
          return (a.full_name || '').localeCompare(b.full_name || '')
        }
        return aLast.localeCompare(bLast)
      })
      
      setStudents(sortedStudents)
      
      // Store in enhanced cache
      setCachedData('students', studentsCacheKey, sortedStudents)
      
      // Also store in legacy cache for compatibility
      classesCacheRef.current.set(studentsCacheKey, {
        data: sortedStudents,
        timestamp: Date.now()
      })
      
    } catch (error) {
      console.error('Error fetching students:', error)
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }, [])

  // Filter classes based on search query
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return classes
    const query = searchQuery.toLowerCase()
    return classes.filter(cls => 
      cls.course_title?.toLowerCase().includes(query) ||
      cls.course_code?.toLowerCase().includes(query) ||
      cls.section_code?.toLowerCase().includes(query)
    )
  }, [classes, searchQuery])

  useEffect(() => {
    console.log('🔍 [FACULTY] useEffect triggered - facultyId:', facultyId, 'loading:', loading, 'initialLoad:', initialLoad)
    if (facultyId) {
      fetchClasses()
    } else {
      // If no facultyId, stop loading after a delay
      console.log('🔍 [FACULTY] No facultyId, stopping loading after delay')
      setTimeout(() => {
        setLoading(false)
        setInitialLoad(false)
      }, 1000) // Give time for user context to load
    }
    
    // Cleanup function to abort pending requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [facultyId, fetchClasses])

  // Cache management functions
  const refreshCache = useCallback(() => {
    facultyCacheService.clearAll()
    fetchClasses()
    console.log('🔄 [FACULTY] Cache refreshed')
  }, [fetchClasses])

  // Preload faculty data for better performance
  const preloadFacultyData = useCallback(async () => {
    if (!facultyId) return
    
    try {
      console.log('🚀 [FACULTY] Preloading faculty data...')
      
      // Preload classes
      const classesData = await fetch(`/api/section-courses/faculty/${facultyId}`)
        .then(r => r.json())
        .then(data => Array.isArray(data) ? data : [])
      
      setCachedData('classes', `classes_${facultyId}`, classesData)
      
      // Preload departments
      const departmentsData = await fetch('/api/departments')
        .then(r => r.json())
        .then(data => Array.isArray(data) ? data : [])
      
      setCachedData('departments', 'all_departments', departmentsData)
      
      console.log('✅ [FACULTY] Preloading completed')
    } catch (error) {
      console.error('❌ [FACULTY] Preloading failed:', error)
    }
  }, [facultyId, setCachedData])

  const getCacheStats = useCallback(() => {
    const stats = facultyCacheService.getStats()
    console.log('📊 [FACULTY] Cache stats:', stats)
    return stats
  }, [])

  return (
    <div className="h-full flex overflow-hidden">
      {/* Main Content - Classes List */}
      <div className={`flex flex-col transition-all duration-300 ${isAttendanceMode ? 'w-0 overflow-hidden' : selectedClass ? 'flex-1' : 'w-full'}`}>


        {/* Classes Grid */}
        <div className="flex-1 p-6">
          {console.log('🔍 [FACULTY] Render - loading:', loading, 'initialLoad:', initialLoad, 'error:', error, 'classes.length:', classes.length, 'filteredClasses.length:', filteredClasses.length)}
          {(loading || initialLoad || forceLoading) ? (
            <CardGridSkeleton cards={6} />
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Classes</h3>
                <p className="text-gray-500 mb-4">{error}</p>
                <button
                  onClick={fetchClasses}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : filteredClasses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.map((cls) => (
                <div key={cls.section_course_id} data-class-card>
                <ClassCard
                  id={cls.section_course_id}
                  title={cls.course_title}
                  code={cls.course_code}
                  section={cls.section_code}
                  instructor={cls.faculty_name}
                  avatarUrl={cls.faculty_avatar}
                  bannerColor={cls.banner_color}
                  bannerImage={cls.banner_image}
                  bannerType={cls.banner_type}
                  isSelected={selectedClass?.section_course_id === cls.section_course_id}
                  onClick={() => handleClassSelect(cls)}
                    onAttendance={async () => {
                      setTogglingAttendance(true)
                      try {
                        // Select the class first if it's not already selected
                        if (selectedClass?.section_course_id !== cls.section_course_id) {
                          await handleClassSelect(cls)
                        }
                        // Show attendance dashboard instead of old mode
                        setShowAttendanceDashboard(true)
                      } finally {
                        setTogglingAttendance(false)
                      }
                    }}
                  onAssessments={() => console.log('Assessments clicked')}
                  onMore={() => console.log('More clicked')}
                  onEdit={() => handleEditClass(cls)}
                  onArchive={() => console.log('Archive clicked')}
                />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Right Sidebar - Class Details and Students - Only show when class is selected */}
      {selectedClass && (
        <div 
          ref={sidebarRef}
          className={`bg-white flex flex-col p-4 rounded-lg shadow-sm border border-gray-200 overflow-hidden min-h-0 transition-all duration-300 ${
            isAttendanceMode ? 'w-full' : 'w-80'
          }`}
        >
          <div className="h-full flex flex-col">
            {/* Class Header */}
            <div className="mb-3 pb-3 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900 whitespace-normal break-words">
                    {selectedClass.course_title}
                  </h2>
                    {isAttendanceMode && (
                      <div className="flex items-center space-x-3 ml-4">
                        <div className="flex items-center space-x-2">
                          <label className="text-xs text-gray-600">Date:</label>
                          <input
                            type="date"
                            value={attendanceDate}
                            onChange={(e) => setAttendanceDate(e.target.value)}
                            className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <button
                          onClick={markAllPresent}
                          className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors border-none outline-none focus:outline-none focus:ring-0 focus:border-none active:border-none"
                          style={{ border: 'none', outline: 'none' }}
                        >
                          Mark All Present
                        </button>
                        <button
                          onClick={submitAttendance}
                          disabled={submittingAttendance || !sessionDetailsValid}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 border-none outline-none focus:outline-none focus:ring-0 focus:border-none active:border-none"
                          style={{ border: 'none', outline: 'none' }}
                        >
                          {submittingAttendance && (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          )}
                          {submittingAttendance ? 'Submitting...' : 'Submit'}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-600 space-y-0.5">
                    <p className="truncate">{selectedClass.course_code} • {selectedClass.section_code}</p>
                    <div className="flex items-center justify-between">
                      <p className="truncate">{selectedClass.semester} {selectedClass.school_year}</p>
                      <span className="ml-2 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                        {students.length} student{students.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                {isAttendanceMode && (
                  <button
                    onClick={() => setIsAttendanceMode(false)}
                    className="ml-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Session Details Section - Only show in attendance mode */}
            {isAttendanceMode && (
              <div className="mb-3 p-3 bg-gray-50 rounded border">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    value={sessionDetails.sessionNumber}
                    onChange={(e) => updateSessionDetails('sessionNumber', e.target.value)}
                    placeholder="Session #"
                    className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={sessionDetails.topic}
                    onChange={(e) => updateSessionDetails('topic', e.target.value)}
                    placeholder="Topic"
                    className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={sessionDetails.startTime}
                    onChange={(e) => updateSessionDetails('startTime', e.target.value)}
                    className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="time"
                    value={sessionDetails.endTime}
                    onChange={(e) => updateSessionDetails('endTime', e.target.value)}
                    className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                {!sessionDetailsValid && (
                  <div className="mt-1 text-xs text-red-600">Fill required fields</div>
                )}
              </div>
            )}

            {/* Enrolled Students Section */}
            <div className="flex-1 flex flex-col min-h-0">
              

              {/* Students List */}
              <div className="flex-1 overflow-auto min-h-0">
                {loadingStudents ? (
                  <StudentListSkeleton students={5} />
                ) : students.length > 0 ? (
                  <div className={isAttendanceMode ? "grid grid-cols-2 gap-3" : "space-y-3"}>
                    {students.map((student, index) => {
                      // Calculate sequential number for grid layout
                      const sequentialNumber = index + 1
                      
                      return (
                      <div key={student.student_id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0 w-6 text-center">
                          <span className="text-xs font-medium text-gray-500">
                            {sequentialNumber}
                          </span>
                        </div>
                        <div className="flex-shrink-0">
                          {student.student_photo ? (
                            <img 
                              src={student.student_photo} 
                              alt={student.full_name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {student.full_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {student.student_number}
                          </p>
                        </div>
                        {isAttendanceMode && (
                        <div className="flex-shrink-0">
                            <div className="flex items-center space-x-1">
                              <button 
                                onClick={() => markAttendance(student.student_id, 'present')}
                                className={`px-2 py-1 text-xs rounded transition-colors border-none outline-none focus:outline-none focus:ring-0 focus:border-none active:border-none ${
                                  getAttendanceStatus(student.student_id) === 'present' 
                                    ? 'bg-green-200 text-green-900' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-800'
                                }`}
                                style={{ border: 'none', outline: 'none' }}
                              >
                                Present
                              </button>
                              <button 
                                onClick={() => markAttendance(student.student_id, 'absent')}
                                className={`px-2 py-1 text-xs rounded transition-colors border-none outline-none focus:outline-none focus:ring-0 focus:border-none active:border-none ${
                                  getAttendanceStatus(student.student_id) === 'absent' 
                                    ? 'bg-gray-300 text-gray-900' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                                }`}
                                style={{ border: 'none', outline: 'none' }}
                              >
                                Absent
                              </button>
                              <button 
                                onClick={() => markAttendance(student.student_id, 'late')}
                                className={`px-2 py-1 text-xs rounded transition-colors border-none outline-none focus:outline-none focus:ring-0 focus:border-none active:border-none ${
                                  getAttendanceStatus(student.student_id) === 'late' 
                                    ? 'bg-yellow-200 text-yellow-900' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-yellow-100 hover:text-yellow-800'
                                }`}
                                style={{ border: 'none', outline: 'none' }}
                              >
                                Late
                              </button>
                              <button 
                                onClick={() => markAttendance(student.student_id, 'excuse')}
                                className={`px-2 py-1 text-xs rounded transition-colors border-none outline-none focus:outline-none focus:ring-0 focus:border-none active:border-none ${
                                  getAttendanceStatus(student.student_id) === 'excuse' 
                                    ? 'bg-blue-200 text-blue-900' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-800'
                                }`}
                                style={{ border: 'none', outline: 'none' }}
                              >
                                Excuse
                              </button>
                              <input 
                                type="text" 
                                placeholder="Remarks" 
                                value={getAttendanceRemarks(student.student_id)}
                                onChange={(e) => {
                                  const currentStatus = getAttendanceStatus(student.student_id)
                                  markAttendance(student.student_id, currentStatus || 'present', e.target.value)
                                }}
                                className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-20"
                              />
                            </div>
                        </div>
                        )}
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
          </div>
        )}

      {/* Edit Modal */}
      {showEditModal && editingClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Class Banner</h3>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form */}
              <div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Banner</label>
                    
                    {/* Banner Type Selection */}
                    <div className="flex gap-4 mb-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="bannerType"
                          value="color"
                          checked={editFormData.bannerType === 'color'}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, bannerType: e.target.value }))}
                          className="mr-2"
                        />
                        <span className="text-sm">Color</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="bannerType"
                          value="image"
                          checked={editFormData.bannerType === 'image'}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, bannerType: e.target.value }))}
                          className="mr-2"
                        />
                        <span className="text-sm">Image</span>
                      </label>
                    </div>

                    {/* Color Palette */}
                    {editFormData.bannerType === 'color' && (
                      <div className="flex flex-wrap gap-1">
                        {[
                          '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
                          '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6', '#F43F5E'
                        ].map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditFormData(prev => ({ ...prev, bannerColor: color }))}
                            className={`w-6 h-6 rounded border ${
                              editFormData.bannerColor === color 
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
                    {editFormData.bannerType === 'image' && (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setEditFormData(prev => ({ 
                                  ...prev, 
                                  bannerImage: event.target.result 
                                }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        {editFormData.bannerImage && (
                          <div className="mt-2">
                            <img 
                              src={editFormData.bannerImage} 
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
                  title={editingClass.course_title}
                  code={editingClass.course_code}
                  section={editingClass.section_code}
                  instructor={editingClass.faculty_name}
                  bannerType={editFormData.bannerType}
                  bannerColor={editFormData.bannerColor}
                  bannerImage={editFormData.bannerImage}
                  avatarUrl={editingClass.faculty_avatar}
                  onAttendance={() => {}}
                  onAssessments={() => {}}
                  onMore={() => {}}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button 
                onClick={closeEditModal} 
                disabled={savingEdit}
                className="px-3 py-1.5 text-sm bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit} 
                disabled={savingEdit}
                className="px-3 py-1.5 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingEdit && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {savingEdit ? 'Saving...' : 'Save'}
              </button>
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

      {/* Attendance Dashboard Modal */}
      {showAttendanceDashboard && selectedClass && (
        <AttendanceDashboard
          selectedClass={selectedClass}
          onClassChange={setSelectedClass}
          onClose={() => setShowAttendanceDashboard(false)}
        />
      )}
    </div>
  )
}

export default MyClasses