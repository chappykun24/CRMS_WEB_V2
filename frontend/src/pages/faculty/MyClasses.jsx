import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/UnifiedAuthContext'
import facultyCacheService from '../../services/facultyCacheService'
import { Loader2 } from 'lucide-react'
// Removed prefetchFacultyData - data is now fetched per section
import { setSelectedClass as saveSelectedClass, removeLocalStorageItem } from '../../utils/localStorageManager'
import { safeSetItem, safeGetItem, minimizeClassData, minimizeStudentData } from '../../utils/cacheUtils'

import ClassCard from '../../components/ClassCard'
import { CardGridSkeleton, StudentListSkeleton, ImageSkeleton } from '../../components/skeletons'

const MyClasses = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
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
  const [attendanceRecords, setAttendanceRecords] = useState({}) // {enrollmentId: {date: {status, remarks}}}
  const [togglingAttendance, setTogglingAttendance] = useState(false)
  const [submittingAttendance, setSubmittingAttendance] = useState(false)
  const [loadingAttendanceData, setLoadingAttendanceData] = useState(false)
  
  // Full attendance list modal state
  const [showFullAttendanceModal, setShowFullAttendanceModal] = useState(false)
  const [fullAttendanceList, setFullAttendanceList] = useState([])
  const [loadingFullAttendance, setLoadingFullAttendance] = useState(false)
  const [activeSessionTab, setActiveSessionTab] = useState(0)

  // Session details state - matching SQL requirements
  const [sessionDetails, setSessionDetails] = useState({
    title: '',           // Required for sessions table
    session_date: new Date().toISOString().split('T')[0],    // Default to today's date
    session_type: 'Lecture',  // Optional for sessions table
    meeting_type: 'Face-to-Face'  // Optional for sessions table
  })
  const [sessionDetailsValid, setSessionDetailsValid] = useState(false)
  const [attemptedSessionSubmit, setAttemptedSessionSubmit] = useState(false)

  // Validate session details - only title and session_date are required per SQL
  const validateSessionDetails = useCallback(() => {
    const { title, session_date } = sessionDetails
    const isValid = title.trim() !== '' && session_date !== ''
    console.log('🔍 [VALIDATION] Validating session details:', { title, session_date, isValid })
    setSessionDetailsValid(isValid)
    return isValid
  }, [sessionDetails])

  // Update session details and validate
  const updateSessionDetails = useCallback((field, value) => {
    console.log('🔍 [UPDATE] Updating session details:', { field, value })
    setSessionDetails(prev => {
      const updated = { ...prev, [field]: value }
      console.log('🔍 [UPDATE] New session details:', updated)
      return updated
    })
    if (attemptedSessionSubmit) {
      // Re-validate live after an attempted submit
      validateSessionDetails()
    }
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

  // Load existing attendance data for a specific date
  const loadExistingAttendanceForDate = useCallback(async (date) => {
    if (!selectedClass || !date) return
    
    try {
      setLoadingAttendanceData(true)
      console.log('🔍 [MYCLASSES] Loading attendance for date:', date)
      const response = await fetch(`/api/attendance/class/${selectedClass.section_course_id}?date=${date}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to load attendance data for date')
      }
      
      const data = await response.json()
      const attendanceRecords = data.data || []
      console.log('✅ [MYCLASSES] Received attendance data:', attendanceRecords)
      
      // Restore session details from the first record if available
      if (attendanceRecords.length > 0) {
        const firstRecord = attendanceRecords[0]
        console.log('🔄 [MYCLASSES] Restoring session details from:', firstRecord)
        
        // Update session details with restored data
        setSessionDetails(prev => ({
          ...prev,
          title: firstRecord.title || prev.title,
          session_type: firstRecord.session_type || prev.session_type,
          meeting_type: firstRecord.meeting_type || prev.meeting_type
        }))
      } else {
        // Reset session details if no data found for this date
        console.log('🔄 [MYCLASSES] No attendance data found for date, resetting session details')
        setSessionDetails(prev => ({
          ...prev,
          title: '',
          session_type: 'Lecture',
          meeting_type: 'Face-to-Face'
        }))
      }
      
      // Convert attendance records to form format
      const newAttendanceRecords = {}
      attendanceRecords.forEach(record => {
        if (!newAttendanceRecords[record.enrollment_id]) {
          newAttendanceRecords[record.enrollment_id] = {}
        }
        newAttendanceRecords[record.enrollment_id][date] = {
          status: record.status,
          remarks: record.remarks || ''
        }
      })
      
      console.log('💾 [MYCLASSES] Setting attendance records:', newAttendanceRecords)
      setAttendanceRecords(prev => ({ ...prev, ...newAttendanceRecords }))
      
    } catch (error) {
      console.error('❌ [MYCLASSES] Error loading attendance for date:', error)
    } finally {
      setLoadingAttendanceData(false)
    }
  }, [selectedClass])

  // Attendance functions with memoization
  const markAttendance = useCallback((enrollmentId, status, remarks = '') => {
    const currentDate = sessionDetails.session_date
    console.log('🔍 [ATTENDANCE DEBUG] Marking attendance:', { enrollmentId, status, remarks, currentDate })
    setAttendanceRecords(prev => {
      const newRecords = {
        ...prev,
        [enrollmentId]: {
          ...prev[enrollmentId],
          [currentDate]: { status, remarks }
        }
      }
      console.log('🔍 [ATTENDANCE DEBUG] New attendance records:', newRecords)
      return newRecords
    })
  }, [sessionDetails.session_date])

  const markAllPresent = useCallback(() => {
    console.log('🔍 [ATTENDANCE DEBUG] Marking all students present...')
    students.forEach(student => {
      markAttendance(student.enrollment_id, 'present')
    })
  }, [students, markAttendance])

  const getAttendanceStatus = useCallback((enrollmentId) => {
    return attendanceRecords[enrollmentId]?.[sessionDetails.session_date]?.status || null
  }, [attendanceRecords, sessionDetails.session_date])

  const getAttendanceRemarks = useCallback((enrollmentId) => {
    return attendanceRecords[enrollmentId]?.[sessionDetails.session_date]?.remarks || ''
  }, [attendanceRecords, sessionDetails.session_date])

  // Load full attendance list for the class
  const loadFullAttendanceList = useCallback(async () => {
    if (!selectedClass) return
    
    // Show modal immediately with skeleton loading
    setShowFullAttendanceModal(true)
    setLoadingFullAttendance(true)
    setFullAttendanceList([])
    setActiveSessionTab(0)
    
    try {
      console.log('🔍 [MYCLASSES] Loading full attendance list for class:', selectedClass.section_course_id)
      
      const response = await fetch(`/api/attendance/class/${selectedClass.section_course_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch attendance list')
      }
      
      const result = await response.json()
      console.log('✅ [MYCLASSES] Loaded full attendance list:', result.data.length, 'records')
      
      // Group attendance by session/date
      const groupedBySession = {}
      result.data.forEach(record => {
        const sessionKey = `${record.session_date}_${record.title || 'Untitled'}`
        if (!groupedBySession[sessionKey]) {
          groupedBySession[sessionKey] = {
            session_date: record.session_date,
            title: record.title || 'Untitled Session',
            session_type: record.session_type || 'Lecture',
            meeting_type: record.meeting_type || 'Face-to-Face',
            records: []
          }
        }
        groupedBySession[sessionKey].records.push(record)
      })
      
      // Convert to array and sort by date (descending)
      const sessionsArray = Object.values(groupedBySession).sort((a, b) => {
        const dateA = new Date(a.session_date)
        const dateB = new Date(b.session_date)
        return dateB - dateA // Most recent first
      })
      
      // Sort students within each session alphabetically by last name
      sessionsArray.forEach(session => {
        session.records.sort((a, b) => {
          const lastNameA = extractSurname(a.full_name)
          const lastNameB = extractSurname(b.full_name)
          if (lastNameA !== lastNameB) {
            return lastNameA.localeCompare(lastNameB)
          }
          // If last names are the same, sort by full name
          return a.full_name.localeCompare(b.full_name)
        })
      })
      
      setFullAttendanceList(sessionsArray)
    } catch (error) {
      console.error('❌ [MYCLASSES] Error loading full attendance list:', error)
      alert('Failed to load attendance list. Please try again.')
      setShowFullAttendanceModal(false)
    } finally {
      setLoadingFullAttendance(false)
    }
  }, [selectedClass, extractSurname])

  // Submit attendance data
  const submitAttendance = useCallback(async () => {
    if (!selectedClass) return

    // Validate session details before submitting
    setAttemptedSessionSubmit(true)
    console.log('🔍 [SUBMIT] Current session details before validation:', sessionDetails)
    if (!validateSessionDetails()) {
      console.log('❌ [SUBMIT] Validation failed, current values:', { title: sessionDetails.title, session_date: sessionDetails.session_date })
      alert('Please fill in all required session details (Title and Date)')
      return
    }

    setSubmittingAttendance(true)
    try {
      console.log('🔍 [FRONTEND DEBUG] Starting attendance submission...')
      console.log('🔍 [FRONTEND DEBUG] Selected class:', selectedClass)
      console.log('🔍 [FRONTEND DEBUG] Session details:', sessionDetails)
      console.log('🔍 [FRONTEND DEBUG] Attendance records:', attendanceRecords)
      console.log('🔍 [FRONTEND DEBUG] Session date:', sessionDetails.session_date)
      
      // First create a session
      console.log('🔍 [FRONTEND DEBUG] Creating session...')
      const sessionResponse = await fetch('/api/attendance/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          section_course_id: selectedClass.section_course_id,
          title: sessionDetails.title,
          session_date: sessionDetails.session_date,
          session_type: sessionDetails.session_type,
          meeting_type: sessionDetails.meeting_type
        })
      })

      console.log('🔍 [FRONTEND DEBUG] Session response status:', sessionResponse.status)
      
      if (!sessionResponse.ok) {
        const errorText = await sessionResponse.text()
        console.log('❌ [FRONTEND DEBUG] Session creation failed:', errorText)
        throw new Error(`Failed to create session: ${sessionResponse.status}`)
      }

      const sessionData = await sessionResponse.json()
      console.log('✅ [FRONTEND DEBUG] Session created successfully:', sessionData)
      const sessionId = sessionData.data.session_id

      // Then mark attendance for the session
      console.log('🔍 [FRONTEND DEBUG] Building attendance records list...')
      console.log('🔍 [FRONTEND DEBUG] attendanceRecords object:', attendanceRecords)
      console.log('🔍 [FRONTEND DEBUG] session_date:', sessionDetails.session_date)
      console.log('🔍 [FRONTEND DEBUG] Object.keys(attendanceRecords):', Object.keys(attendanceRecords))
      
      const attendanceRecordsList = Object.keys(attendanceRecords).map(enrollmentId => {
        const student = students.find(s => s.enrollment_id === enrollmentId)
        const record = {
          enrollment_id: enrollmentId,
          status: attendanceRecords[enrollmentId]?.[sessionDetails.session_date]?.status || 'present',
          remarks: attendanceRecords[enrollmentId]?.[sessionDetails.session_date]?.remarks || ''
        }
        console.log('🔍 [FRONTEND DEBUG] Processing student:', { enrollmentId, student, record })
        return record
      }).filter(record => record.enrollment_id) // Only include records with valid enrollment_id

      console.log('🔍 [FRONTEND DEBUG] Students data:', students)
      console.log('📤 [FRONTEND DEBUG] Submitting attendance data:', { sessionId, attendanceRecordsList })

      console.log('🔍 [FRONTEND DEBUG] Submitting attendance records...')
      const response = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          attendance_records: attendanceRecordsList
        })
      })

      console.log('🔍 [FRONTEND DEBUG] Attendance response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.log('❌ [FRONTEND DEBUG] Attendance submission failed:', errorText)
        throw new Error(`Failed to submit attendance: ${response.status}`)
      }
      
      const responseData = await response.json()
      console.log('✅ [FRONTEND DEBUG] Attendance submitted successfully:', responseData)

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
  }, [selectedClass, sessionDetails.session_date, attendanceRecords])

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
        removeLocalStorageItem('selectedClass')
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
          removeLocalStorageItem('selectedClass')
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

  // Fetch faculty's assigned classes - FAST initial load, show immediately
  const fetchClasses = useCallback(async () => {
    if (!facultyId) {
      console.log('🔍 [FACULTY] fetchClasses called but no facultyId')
      return
    }
    
    console.log('🔍 [FACULTY] fetchClasses starting - facultyId:', facultyId)
    setError(null)
    
    // Check sessionStorage first for instant display
    const sessionCacheKey = `classes_${facultyId}`
    const sessionCached = safeGetItem(sessionCacheKey)
    
    if (sessionCached) {
      console.log('📦 [FACULTY] Using session cached classes data')
      setClasses(sessionCached)
      setLoading(false)
    setInitialLoad(false)
      // Continue to fetch fresh data in background
    } else {
      setLoading(true)
      setInitialLoad(false)
    }
    
    // Check enhanced cache
    const cacheKey = `classes_${facultyId}`
    const cachedData = getCachedData('classes', cacheKey, 300000) // 5 minute cache
    if (cachedData && !sessionCached) {
      console.log('📦 [FACULTY] Using enhanced cached classes data')
      setClasses(cachedData)
      setLoading(false)
      setInitialLoad(false)
      // Cache minimized data in sessionStorage for next time
      safeSetItem(sessionCacheKey, cachedData, minimizeClassData)
      // Continue to fetch fresh data in background
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
      
      // Store minimized data in sessionStorage for instant next load (excludes large images)
      // Only store if we don't already have cached data (to avoid quota issues)
      if (!sessionCached) {
        safeSetItem(sessionCacheKey, classesData, minimizeClassData)
      }
      
      // Store full data in enhanced cache (can handle larger data)
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
      if (!sessionCached && !cachedData) {
      setError(error.message)
      setClasses([])
      }
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [facultyId])

  // Handle class selection - lazy load students ONLY when class is clicked
  const handleClassSelect = useCallback(async (classItem) => {
    setSelectedClass(classItem)
    setIsAttendanceMode(false) // Reset attendance mode when selecting different class
    
    // Reset session details when selecting different class
    setSessionDetails({
      title: '',
      session_date: '',
      session_type: 'Lecture',
      meeting_type: 'Face-to-Face'
    })
    
    // Save selected class to localStorage for Header breadcrumb (using safe storage)
    saveSelectedClass(classItem)
    
    // Dispatch custom event to notify Header of change
    window.dispatchEvent(new CustomEvent('selectedClassChanged'))
    
    // Check sessionStorage first for instant display
    const sectionId = classItem.section_course_id
    const sessionCacheKey = `students_${sectionId}`
    const sessionCached = safeGetItem(sessionCacheKey)
    
    if (sessionCached) {
      console.log('📦 [FACULTY] Using session cached students data')
      setStudents(sessionCached)
      // Continue to fetch fresh data in background
    }
    
    // Check enhanced cache
    const studentsCacheKey = `students_${sectionId}`
    const cachedStudents = getCachedData('students', studentsCacheKey, 600000) // 10 minute cache
    
    if (cachedStudents && !sessionCached) {
      console.log('📦 [FACULTY] Using enhanced cached students data')
      setStudents(cachedStudents)
      // Cache minimized data in sessionStorage for next time (excludes photos)
      safeSetItem(sessionCacheKey, cachedStudents, minimizeStudentData)
      // Continue to fetch fresh data in background
    }
    
    // Only show loading if no cache available
    if (!sessionCached && !cachedStudents) {
    setLoadingStudents(true)
    }
    
    try {
      const response = await fetch(`/api/section-courses/${sectionId}/students`)
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
      
      // Store minimized data in sessionStorage for instant next load (excludes photos)
      safeSetItem(sessionCacheKey, sortedStudents, minimizeStudentData)
      
      // Store full data in enhanced cache
      setCachedData('students', studentsCacheKey, sortedStudents)
      
      // Also store in legacy cache for compatibility
      classesCacheRef.current.set(studentsCacheKey, {
        data: sortedStudents,
        timestamp: Date.now()
      })
      
    } catch (error) {
      console.error('Error fetching students:', error)
      if (!sessionCached && !cachedStudents) {
      setStudents([])
      }
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
      // Only fetch classes list - no bulk data prefetching
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

  // Removed preloadFacultyData - data is now fetched per section on demand
  // No bulk data prefetching to improve performance and reduce unnecessary API calls

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
                  avatarUrl={null}
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
                        // Then toggle attendance mode
                        setIsAttendanceMode(!isAttendanceMode)
                      } finally {
                        setTogglingAttendance(false)
                      }
                    }}
                  onAssessments={() => {
                    // Navigate to assessments page with class pre-selected and grading tab active
                    // Use /faculty/assessments which properly uses nested routes
                    navigate('/faculty/assessments', { 
                      state: { 
                        selectedClassId: cls.section_course_id,
                        defaultTab: 'grading'
                      } 
                    })
                  }}
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
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={loadFullAttendanceList}
                          disabled={loadingFullAttendance}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors border-none outline-none focus:outline-none focus:ring-0 focus:border-none active:border-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          style={{ border: 'none', outline: 'none' }}
                        >
                          {loadingFullAttendance ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-800"></div>
                              Loading...
                            </>
                          ) : (
                            'View Full List'
                          )}
                        </button>
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
                  {/* Session Details Inputs in the middle space - Only in attendance mode */}
                  {isAttendanceMode && (
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={sessionDetails.session_date}
                          onChange={async (e) => {
                            const selectedDate = e.target.value
                            console.log('📅 Date selected:', selectedDate)
                            updateSessionDetails('session_date', selectedDate)
                            
                            // Load attendance data for the selected date
                            if (selectedDate && selectedClass) {
                              console.log('🔄 Loading attendance for date:', selectedDate)
                              await loadExistingAttendanceForDate(selectedDate)
                            }
                          }}
                          className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {loadingAttendanceData && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        )}
                      </div>
                      <input
                        type="text"
                        value={sessionDetails.title}
                        onChange={(e) => updateSessionDetails('title', e.target.value)}
                        placeholder="Session Title"
                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400"
                      />
                      <input
                        type="text"
                        value={sessionDetails.session_type}
                        onChange={(e) => updateSessionDetails('session_type', e.target.value)}
                        placeholder="Session Type"
                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400"
                      />
                      <input
                        type="text"
                        value={sessionDetails.meeting_type}
                        onChange={(e) => updateSessionDetails('meeting_type', e.target.value)}
                        placeholder="Meeting Type"
                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400"
                      />
                    </div>
                  )}
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
                          <ImageSkeleton
                              src={student.student_photo} 
                              alt={student.full_name}
                            size="md"
                            shape="circle"
                            className="border border-gray-200"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {formatName(student.full_name)}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {student.student_number}
                          </p>
                        </div>
                        {isAttendanceMode && (
                        <div className="flex-shrink-0">
                            <div className="flex items-center space-x-1">
                              <button 
                                onClick={() => markAttendance(student.enrollment_id, 'present')}
                                className={`px-2 py-1 text-xs rounded transition-colors border-none outline-none focus:outline-none focus:ring-0 focus:border-none active:border-none ${
                                  getAttendanceStatus(student.enrollment_id) === 'present' 
                                    ? 'bg-green-200 text-green-900' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-800'
                                }`}
                                style={{ border: 'none', outline: 'none' }}
                              >
                                Present
                              </button>
                              <button 
                                onClick={() => markAttendance(student.enrollment_id, 'absent')}
                                className={`px-2 py-1 text-xs rounded transition-colors border-none outline-none focus:outline-none focus:ring-0 focus:border-none active:border-none ${
                                  getAttendanceStatus(student.enrollment_id) === 'absent' 
                                    ? 'bg-gray-300 text-gray-900' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                                }`}
                                style={{ border: 'none', outline: 'none' }}
                              >
                                Absent
                              </button>
                              <button 
                                onClick={() => markAttendance(student.enrollment_id, 'late')}
                                className={`px-2 py-1 text-xs rounded transition-colors border-none outline-none focus:outline-none focus:ring-0 focus:border-none active:border-none ${
                                  getAttendanceStatus(student.enrollment_id) === 'late' 
                                    ? 'bg-yellow-200 text-yellow-900' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-yellow-100 hover:text-yellow-800'
                                }`}
                                style={{ border: 'none', outline: 'none' }}
                              >
                                Late
                              </button>
                              <button 
                                onClick={() => markAttendance(student.enrollment_id, 'excuse')}
                                className={`px-2 py-1 text-xs rounded transition-colors border-none outline-none focus:outline-none focus:ring-0 focus:border-none active:border-none ${
                                  getAttendanceStatus(student.enrollment_id) === 'excuse' 
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
                                value={getAttendanceRemarks(student.enrollment_id)}
                                onChange={(e) => {
                                  const currentStatus = getAttendanceStatus(student.enrollment_id)
                                  markAttendance(student.enrollment_id, currentStatus || 'present', e.target.value)
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
                  avatarUrl={null}
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

      {/* Full Attendance List Modal */}
      {showFullAttendanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Attendance Records</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedClass?.course_title} • {
                    loadingFullAttendance ? (
                      <span className="inline-block h-4 bg-gray-200 rounded w-20 animate-pulse align-middle"></span>
                    ) : (
                      `${fullAttendanceList.reduce((sum, session) => sum + session.records.length, 0)} total records`
                    )
                  }
                </p>
              </div>
              <button
                onClick={() => setShowFullAttendanceModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body - Tabs for Sessions */}
            <div className="flex-1 flex flex-col min-h-0">
              {loadingFullAttendance ? (
                // Full Skeleton Loading State
                <>
                  {/* Session Tabs Skeleton */}
                  <div className="border-b border-gray-200 px-4 pt-2">
                    <div className="flex space-x-1 overflow-x-auto">
                      {[...Array(8)].map((_, index) => (
                        <div
                          key={`skeleton-tab-${index}`}
                          className="px-4 py-2 border-b-2 border-transparent"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                            <div className="h-3 bg-gray-200 rounded w-8 animate-pulse"></div>
                            <div className="h-2 w-2 bg-gray-200 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Session Content Skeleton */}
                  <div className="flex-1 overflow-auto p-4">
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Session Header Skeleton */}
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse mb-2"></div>
                            <div className="flex items-center gap-2">
                              <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                              <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                              <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div>
                            <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div>
                            <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Students Grid Skeleton - 3 Columns */}
                      <div className="p-4">
                        <div className="grid grid-cols-3 gap-3">
                          {[...Array(15)].map((_, index) => (
                            <div 
                              key={`skeleton-student-${index}`} 
                              className="flex items-center justify-between p-2.5 border border-gray-200 rounded-lg"
                            >
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="flex-shrink-0">
                                  <div className="h-6 w-6 bg-gray-200 rounded-full animate-pulse"></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse mb-1"></div>
                                  <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                <div className="h-5 bg-gray-200 rounded-full w-16 animate-pulse"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : fullAttendanceList.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <p>No attendance records found.</p>
                </div>
              ) : (
                <>
                  {/* Session Tabs */}
                  <div className="border-b border-gray-200 px-4 pt-2">
                    <div className="flex space-x-1 overflow-x-auto">
                      {fullAttendanceList.map((session, sessionIndex) => {
                        const formatDate = (dateString) => {
                          if (!dateString) return 'N/A'
                          const date = new Date(dateString)
                          return date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric'
                          })
                        }
                        
                        const statusCounts = session.records.reduce((acc, record) => {
                          acc[record.status] = (acc[record.status] || 0) + 1
                          return acc
                        }, {})
                        
                        const totalAbsent = statusCounts.absent || 0
                        
                        return (
                          <button
                            key={`tab-${sessionIndex}`}
                            onClick={() => setActiveSessionTab(sessionIndex)}
                            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                              activeSessionTab === sessionIndex
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{formatDate(session.session_date)}</span>
                              <span className="text-xs text-gray-400">({session.records.length})</span>
                              {totalAbsent > 0 && (
                                <span className="w-2 h-2 bg-red-500 rounded-full" title={`${totalAbsent} absent`}></span>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  
                  {/* Active Session Content */}
                  <div className="flex-1 overflow-auto p-4">
                    {fullAttendanceList[activeSessionTab] && (() => {
                      const session = fullAttendanceList[activeSessionTab]
                      const formatDate = (dateString) => {
                        if (!dateString) return 'N/A'
                        const date = new Date(dateString)
                        return date.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })
                      }
                      
                      const statusCounts = session.records.reduce((acc, record) => {
                        acc[record.status] = (acc[record.status] || 0) + 1
                        return acc
                      }, {})
                      
                      return (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* Session Header */}
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-sm font-semibold text-gray-900">
                                  {session.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-xs text-gray-500">
                                    {formatDate(session.session_date)} • {session.records.length} students
                                  </p>
                                  {session.session_type && (
                                    <>
                                      <span className="text-xs text-gray-400">•</span>
                                      <span className="text-xs text-gray-500">{session.session_type}</span>
                                    </>
                                  )}
                                  {session.meeting_type && (
                                    <>
                                      <span className="text-xs text-gray-400">•</span>
                                      <span className="text-xs text-gray-500">{session.meeting_type}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                {statusCounts.present && (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                                    {statusCounts.present} Present
                                  </span>
                                )}
                                {statusCounts.absent && (
                                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                                    {statusCounts.absent} Absent
                                  </span>
                                )}
                                {statusCounts.late && (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                    {statusCounts.late} Late
                                  </span>
                                )}
                                {statusCounts.excuse && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                    {statusCounts.excuse} Excuse
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Students Grid - 3 Columns */}
                          <div className="overflow-x-auto p-4">
                            <div className="grid grid-cols-3 gap-3">
                              {session.records.map((record, recordIndex) => {
                                const statusColors = {
                                  present: 'bg-green-100 text-green-800',
                                  absent: 'bg-red-100 text-red-800',
                                  late: 'bg-yellow-100 text-yellow-800',
                                  excuse: 'bg-blue-100 text-blue-800'
                                }
                                
                                return (
                                  <div 
                                    key={`record-${recordIndex}`} 
                                    className="flex items-center justify-between p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                      <div className="flex-shrink-0">
                                        <ImageSkeleton
                                          src={record.student_photo}
                                          alt={record.full_name}
                                          size="xs"
                                          shape="circle"
                                          className="border border-gray-200"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 truncate">
                                          {formatName(record.full_name)}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">
                                          {record.student_number}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                      <span className={`px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full whitespace-nowrap ${
                                        statusColors[record.status] || 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'N/A'}
                                      </span>
                                      {record.remarks && (
                                        <span 
                                          className="text-xs text-gray-400 cursor-help flex-shrink-0" 
                                          title={record.remarks}
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                {loadingFullAttendance ? (
                  <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                ) : (
                  <>
                    {fullAttendanceList.length} session{fullAttendanceList.length !== 1 ? 's' : ''} recorded
                  </>
                )}
              </div>
              <button
                onClick={() => setShowFullAttendanceModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyClasses