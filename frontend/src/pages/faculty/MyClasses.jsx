import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/UnifiedAuthContext'
import facultyCacheService from '../../services/facultyCacheService'
import { Loader2 } from 'lucide-react'
// Removed prefetchFacultyData - data is now fetched per section
import { setSelectedClass as saveSelectedClass, removeLocalStorageItem } from '../../utils/localStorageManager'
import { safeSetItem, safeGetItem, minimizeClassData, minimizeStudentData } from '../../utils/cacheUtils'

import ClassCard from '../../components/ClassCard'
import { CardGridSkeleton, StudentListSkeleton } from '../../components/skeletons'
import LazyImage from '../../components/LazyImage'
import imageLoaderService from '../../services/imageLoaderService'

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
  const loadingSessionsRef = useRef(new Set()) // Track which sessions are currently loading
  
  // Enhanced caching for faculty data
  const facultyCacheRef = useRef({
    classes: new Map(),
    students: new Map(),
    departments: new Map(),
    lastUpdated: new Map()
  })
  
  // Selected class and students
  const [selectedClass, setSelectedClass] = useState(null)
  const selectedClassRef = useRef(null) // Ref to track selectedClass for closures
  const [students, setStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const cachedClassIdRef = useRef(null) // Ref to track which class ID is cached (prevents loops)
  
  // Keep ref in sync with state
  useEffect(() => {
    selectedClassRef.current = selectedClass
  }, [selectedClass])

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
  const [sessionList, setSessionList] = useState([]) // List of sessions (dates/titles only)
  const [sessionData, setSessionData] = useState({}) // {sessionKey: {records, statusCounts, ...}}
  const [loadingFullAttendance, setLoadingFullAttendance] = useState(false)
  const [loadingSession, setLoadingSession] = useState({}) // Track which sessions are loading
  const [activeSessionTab, setActiveSessionTab] = useState(0)
  const [imagesLoaded, setImagesLoaded] = useState(false) // Track if images should start loading
  const [cachedStudentsList, setCachedStudentsList] = useState(null) // Cached students from attendance mode

  // Cache students list when attendance mode is enabled and students are loaded
  // IMPORTANT: Only cache students that belong to the currently selected class
  // This ensures we don't show stale data from a different class
  useEffect(() => {
    // Only run if attendance mode is enabled and we have students
    if (!isAttendanceMode || !selectedClass || !students || students.length === 0) {
      // If attendance mode is disabled, clear the cached class ID ref
      if (!isAttendanceMode) {
        cachedClassIdRef.current = null
      }
      return
    }
    
    const currentClassId = selectedClass.section_course_id
    
    // Use ref to prevent infinite loops - only cache if we haven't cached for this class yet
    if (cachedClassIdRef.current === currentClassId) {
      // Already cached for this class - skip to prevent infinite loops
      return
    }
    
    console.log('💾 [MYCLASSES] Caching students list from attendance form:', students.length, 'students')
    console.log('  Class ID:', currentClassId, selectedClass?.course_title)
    console.log('  Previous cache class ID (ref):', cachedClassIdRef.current || 'none')
    
    // Update ref IMMEDIATELY before setting state to prevent re-running
    cachedClassIdRef.current = currentClassId
    
    // Store students with class ID for verification
    const studentsWithClassId = students.map(student => ({
      ...student,
      classId: currentClassId // Add class ID to each student for verification
    }))
    setCachedStudentsList(studentsWithClassId)
  }, [isAttendanceMode, selectedClass?.section_course_id, students?.length]) // Use students.length instead of students array to prevent loops

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

  // Get list of sessions (dates/titles only) - fast initial load using sessions endpoint
  const loadSessionList = useCallback(async () => {
    if (!selectedClass) return []
    
    try {
      console.log('🔍 [MYCLASSES] Loading session list for class:', selectedClass.section_course_id)
      
      // Use sessions endpoint to get only session metadata (much faster)
      const response = await fetch(`/api/attendance/sessions/${selectedClass.section_course_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch session list')
      }
      
      const result = await response.json()
      console.log('✅ [MYCLASSES] Loaded session list:', result.data.length, 'sessions')
      
      // Map sessions to our format
      const sessionsArray = result.data.map(session => ({
        session_id: session.session_id,
        session_key: `${session.session_date}_${session.title || 'Untitled'}`,
        session_date: session.session_date,
        title: session.title || 'Untitled Session',
        session_type: session.session_type || 'Lecture',
        meeting_type: session.meeting_type || 'Face-to-Face',
        student_count: parseInt(session.attendance_count) || 0
      }))
      
      // Sessions are already sorted by date DESC from the API
      return sessionsArray
    } catch (error) {
      console.error('❌ [MYCLASSES] Error loading session list:', error)
      throw error
    }
  }, [selectedClass])

  // Load attendance data for a specific session - async, uses cached students, then fetches attendance
  const loadSessionData = useCallback(async (sessionKey, sessionDate, sessionTitle, sessionId, sessionType = null, meetingType = null) => {
    // Use ref to get current selectedClass (avoids closure issues when modal is open)
    const currentSelectedClass = selectedClassRef.current || selectedClass
    if (!currentSelectedClass) {
      console.warn('⚠️ [MYCLASSES] No selected class (ref:', !!selectedClassRef.current, 'state:', !!selectedClass, '), skipping session data load')
      return
    }
    
    console.log('🚀 [MYCLASSES] loadSessionData called for:', sessionKey, 'sessionId:', sessionId)
    
    // Check if already loading using ref (avoids closure issues)
    if (loadingSessionsRef.current.has(sessionKey)) {
      console.log('⏳ [MYCLASSES] Session already loading, skipping duplicate:', sessionKey)
      return
    }
    
    // Mark as loading immediately using ref (prevents duplicate calls)
    loadingSessionsRef.current.add(sessionKey)
    setLoadingSession(prev => ({ ...prev, [sessionKey]: true }))
    
    try {
      console.log('🔍 [MYCLASSES] Starting to load session data:', sessionKey, 'sessionId:', sessionId)
      
      // Check if already loaded by reading current state synchronously
      // We'll check this by reading the state in the render, but for now, just proceed
      // The worst case is we update already-loaded data, which is fine
      
      // Step 1: Use cached students list if available (from attendance mode)
      // IMPORTANT: Verify cached students belong to current class
      let studentsList = null
      if (cachedStudentsList && cachedStudentsList.length > 0) {
        const cachedClassId = cachedStudentsList[0]?.classId || cachedStudentsList[0]?.section_course_id
        if (cachedClassId === currentSelectedClass.section_course_id) {
          studentsList = cachedStudentsList
          console.log('✅ [MYCLASSES] Using verified cached students for session:', sessionKey)
        } else {
          console.warn('⚠️ [MYCLASSES] Cached students do not match current class, fetching fresh')
          console.log('  Cached class ID:', cachedClassId)
          console.log('  Current class ID:', currentSelectedClass.section_course_id)
          studentsList = null // Force fetch
        }
      }
      
      // Fallback to current students if no valid cache
      if (!studentsList) {
        studentsList = students
      }
      
      // If no cached students, fetch them (fallback)
      if (!studentsList || studentsList.length === 0) {
        console.log('⚠️ [MYCLASSES] No cached students, fetching...')
        try {
          const studentsResponse = await fetch(`/api/section-courses/${currentSelectedClass.section_course_id}/students`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          })
          if (studentsResponse.ok) {
            const studentsData = await studentsResponse.json()
            studentsList = Array.isArray(studentsData) ? studentsData : []
            // Sort by last name
            studentsList.sort((a, b) => {
              const lastNameA = extractSurname(a.full_name)
              const lastNameB = extractSurname(b.full_name)
              if (lastNameA !== lastNameB) {
                return lastNameA.localeCompare(lastNameB)
              }
              return a.full_name.localeCompare(b.full_name)
            })
            // Add class ID to students for verification
            const studentsWithClassId = studentsList.map(student => ({
              ...student,
              classId: currentSelectedClass.section_course_id
            }))
            setCachedStudentsList(studentsWithClassId)
          }
        } catch (err) {
          console.error('❌ [MYCLASSES] Error fetching students:', err)
        }
      }
      
      // Step 2: Fetch attendance for this specific session using session_id (much faster)
      // Use session_id endpoint for direct, efficient query
      let attendanceMap = new Map()
      
      if (sessionId) {
        // Use session ID endpoint - direct query, much faster
        try {
          const response = await fetch(`/api/attendance/session/${sessionId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          })
          
          if (response.ok) {
            const result = await response.json()
            // Map attendance records by enrollment_id
            result.data.forEach(record => {
              attendanceMap.set(record.enrollment_id, {
                ...record,
                session_date: record.session_date || sessionDate,
                title: record.title || sessionTitle,
                session_type: record.session_type || sessionType,
                meeting_type: record.meeting_type || meetingType
              })
            })
            console.log('✅ [MYCLASSES] Loaded attendance via session ID:', sessionId, attendanceMap.size, 'records')
          } else {
            throw new Error('Session endpoint failed, falling back to date query')
          }
        } catch (sessionError) {
          console.warn('⚠️ [MYCLASSES] Session ID endpoint failed, using date filter:', sessionError)
          // Fallback to date-based query
          const response = await fetch(`/api/attendance/class/${currentSelectedClass.section_course_id}?date=${sessionDate}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          })
          
          if (!response.ok) {
            throw new Error('Failed to fetch session data')
          }
          
          const result = await response.json()
          
          // Filter records for this session (matching date and title)
          result.data
            .filter(record => 
              record.session_date === sessionDate && 
              (record.title || 'Untitled') === (sessionTitle || 'Untitled')
            )
            .forEach(record => {
              attendanceMap.set(record.enrollment_id, record)
            })
        }
      } else {
        // Fallback: no session ID, use date filter
        const response = await fetch(`/api/attendance/class/${currentSelectedClass.section_course_id}?date=${sessionDate}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch session data')
        }
        
        const result = await response.json()
        
        // Filter records for this session (matching date and title)
        result.data
          .filter(record => 
            record.session_date === sessionDate && 
            (record.title || 'Untitled') === (sessionTitle || 'Untitled')
          )
          .forEach(record => {
            attendanceMap.set(record.enrollment_id, record)
          })
      }
      
      // Step 4: Merge cached students with attendance data
      const sessionRecords = studentsList.map(student => {
        const attendanceRecord = attendanceMap.get(student.enrollment_id)
        if (attendanceRecord) {
          // Student has attendance record - use attendance data
          return {
            ...student,
            status: attendanceRecord.status,
            remarks: attendanceRecord.remarks || null,
            session_date: attendanceRecord.session_date,
            title: attendanceRecord.title
          }
        } else {
          // Student has no attendance record - mark as absent or null
          return {
            ...student,
            status: null, // or 'absent' if you want to default
            remarks: null,
            session_date: sessionDate,
            title: sessionTitle
          }
        }
      })
      
      // Step 5: Calculate status counts
      const statusCounts = sessionRecords.reduce((acc, record) => {
        if (record.status) {
          acc[record.status] = (acc[record.status] || 0) + 1
        }
        return acc
      }, {})
      
      // Step 6: Store session data (photos included but loading deferred)
      // Use functional update to ensure we're updating the correct session
      setSessionData(prev => {
        const updated = {
          ...prev,
          [sessionKey]: {
            records: sessionRecords,
            statusCounts,
            loaded: true
          }
        }
        console.log('💾 [MYCLASSES] Storing session data for:', sessionKey, 'total sessions in state:', Object.keys(updated).length, 'all keys:', Object.keys(updated))
        return updated
      })
      
      console.log('✅ [MYCLASSES] Loaded session data:', sessionKey, sessionRecords.length, 'students')
      
      // Step 7: Load images immediately after essential data is displayed
      requestAnimationFrame(() => {
        setImagesLoaded(true) // Enable image loading in UI immediately
        const imagesToLoad = sessionRecords
          .filter(r => r.student_photo)
          .map(r => ({ src: r.student_photo, id: `attendance_${sessionKey}_${r.student_id}` }))
        if (imagesToLoad.length > 0) {
          // Load images immediately in parallel (no batching delay)
          imageLoaderService.queueImages(imagesToLoad, true)
        }
      })
      
    } catch (error) {
      console.error('❌ [MYCLASSES] Error loading session data:', error)
      setSessionData(prev => ({
        ...prev,
        [sessionKey]: {
          records: [],
          statusCounts: {},
          loaded: true,
          error: error.message
        }
      }))
    } finally {
      setLoadingSession(prev => ({ ...prev, [sessionKey]: false }))
    }
  }, [selectedClass, extractSurname, cachedStudentsList, students]) // selectedClass is required for API calls

  // Load full attendance list for the class - show modal immediately, load sessions progressively
  // Uses cached students from attendance mode for instant display
  const loadFullAttendanceList = useCallback(async () => {
    // Use ref to get current selectedClass (avoids closure issues)
    const currentSelectedClass = selectedClassRef.current || selectedClass
    if (!currentSelectedClass) {
      alert('Please select a class first')
      return
    }
    
    const currentClassId = currentSelectedClass.section_course_id
    
    console.log('📋 [MYCLASSES] Loading full attendance list for class:', currentClassId, currentSelectedClass.course_title)
    
    // IMPORTANT: Verify cached students belong to current class
    // If cached students belong to a different class, clear them
    if (cachedStudentsList && cachedStudentsList.length > 0) {
      const cachedClassId = cachedStudentsList[0]?.classId || cachedStudentsList[0]?.section_course_id
      if (cachedClassId && cachedClassId !== currentClassId) {
        console.warn('⚠️ [MYCLASSES] Cached students belong to different class, clearing cache')
        console.log('  Cached class ID:', cachedClassId)
        console.log('  Current class ID:', currentClassId)
        setCachedStudentsList(null)
      } else if (cachedClassId === currentClassId) {
        console.log('✅ [MYCLASSES] Cached students verified for class:', currentClassId)
      }
    }
    
    // Step 0: Cache students list if available (from attendance mode) and belongs to current class
    if (students && students.length > 0) {
      // Verify students belong to current class before caching
      const studentsClassId = students[0]?.section_course_id
      if (studentsClassId === currentClassId) {
        // Only cache if not already cached or if cache belongs to different class
        if (!cachedStudentsList || cachedStudentsList[0]?.classId !== currentClassId) {
          console.log('💾 [MYCLASSES] Caching students list for current class:', currentClassId)
          const studentsWithClassId = students.map(student => ({
            ...student,
            classId: currentClassId // Add class ID for verification
          }))
          setCachedStudentsList(studentsWithClassId)
        }
      } else {
        console.warn('⚠️ [MYCLASSES] Students do not belong to current class, not caching')
        console.log('  Students class ID:', studentsClassId)
        console.log('  Current class ID:', currentClassId)
      }
    }
    
    // IMPORTANT: Clear all session-related state when opening modal
    // This ensures we don't show stale data from a previously selected class
    setSessionList([])
    setSessionData({})
    setActiveSessionTab(0)
    setImagesLoaded(false)
    setLoadingSession({})
    loadingSessionsRef.current.clear() // Clear any pending loading sessions
    
    // Show modal immediately with skeleton loading
    setShowFullAttendanceModal(true)
    setLoadingFullAttendance(true) // Keep loading true to show skeletons until data loads
    
    try {
      // Step 1: Load session list (fast - just metadata)
      const sessions = await loadSessionList()
      setSessionList(sessions)
      
      // Step 2: Verify and use cached students (only if they belong to current class)
      let studentsToUse = null
      if (cachedStudentsList && cachedStudentsList.length > 0) {
        const cachedClassId = cachedStudentsList[0]?.classId || cachedStudentsList[0]?.section_course_id
        if (cachedClassId === currentClassId) {
          studentsToUse = cachedStudentsList
          console.log('✅ [MYCLASSES] Using verified cached students:', studentsToUse.length, 'students')
        } else {
          console.warn('⚠️ [MYCLASSES] Cached students do not match current class, will use fresh students')
        }
      }
      
      // Fallback to current students if no valid cache
      if (!studentsToUse && students && students.length > 0) {
        const studentsClassId = students[0]?.section_course_id
        if (studentsClassId === currentClassId) {
          studentsToUse = students
          console.log('✅ [MYCLASSES] Using current students:', studentsToUse.length, 'students')
        }
      }
      
      // Step 3: Hide main loading skeleton, but keep session skeletons if no students yet
      setLoadingFullAttendance(false)
      
      // Step 4: If we have valid students, show them immediately (even without attendance data yet)
      // This provides instant display while attendance loads in background
      if (studentsToUse && studentsToUse.length > 0 && sessions.length > 0) {
        const firstSession = sessions[0]
        // Create initial session data with students (no attendance yet - will be fetched)
        // Status will show skeleton loader until attendance data loads
        setSessionData(prev => ({
          ...prev,
          [firstSession.session_key]: {
            records: studentsToUse.map(student => ({
              ...student,
              status: null, // Will be updated when attendance loads - shows skeleton
              remarks: null,
              session_date: firstSession.session_date,
              title: firstSession.title
            })),
            statusCounts: {},
            loaded: false // Mark as not fully loaded yet - will show skeleton for status
          }
        }))
        console.log('📊 [MYCLASSES] Created initial session data with', studentsToUse.length, 'students (skeleton for status)')
      } else {
        console.log('⏳ [MYCLASSES] No students available yet, showing full skeleton loading')
        // Keep loadingFullAttendance true to show full skeleton
        setLoadingFullAttendance(true)
      }
      
      // Step 5: Load first session (latest) attendance data immediately asynchronously
      if (sessions.length > 0) {
        const firstSession = sessions[0]
        // Load asynchronously without blocking - status will show skeleton until loaded
        loadSessionData(
          firstSession.session_key,
          firstSession.session_date,
          firstSession.title,
          firstSession.session_id,
          firstSession.session_type,
          firstSession.meeting_type
        ).catch(error => {
          console.error('❌ [MYCLASSES] Error loading first session:', error)
        })
      }
    } catch (error) {
      console.error('❌ [MYCLASSES] Error loading attendance list:', error)
      alert('Failed to load attendance list. Please try again.')
      setShowFullAttendanceModal(false)
      setLoadingFullAttendance(false)
    }
  }, [selectedClass, loadSessionList, loadSessionData, students, cachedStudentsList])

  // Handle tab change - show cached students immediately, load attendance data asynchronously
  const handleTabChange = useCallback(async (sessionIndex) => {
    setActiveSessionTab(sessionIndex)
    setImagesLoaded(false) // Reset image loading state
    
    const session = sessionList[sessionIndex]
    if (!session) return
    
    // Use ref to get current selectedClass (avoids closure issues)
    const currentSelectedClass = selectedClassRef.current || selectedClass
    if (!currentSelectedClass) {
      console.warn('⚠️ [MYCLASSES] No selected class in handleTabChange, cannot load session data')
      return
    }
    
    // Get cached students list - verify they belong to current class
    let studentsToUse = null
    if (cachedStudentsList && cachedStudentsList.length > 0) {
      const cachedClassId = cachedStudentsList[0]?.classId || cachedStudentsList[0]?.section_course_id
      if (cachedClassId === currentSelectedClass.section_course_id) {
        studentsToUse = cachedStudentsList
        console.log('✅ [MYCLASSES] Using verified cached students for tab:', session.session_key)
      } else {
        console.warn('⚠️ [MYCLASSES] Cached students do not match current class in tab change')
        console.log('  Cached class ID:', cachedClassId)
        console.log('  Current class ID:', currentSelectedClass.section_course_id)
      }
    }
    
    // Fallback to current students if no valid cache
    if (!studentsToUse) {
      studentsToUse = students
    }
    
    // Step 1: Show cached students immediately (even if session data not loaded yet)
    // Use functional update to check current state
    setSessionData(currentSessionData => {
      const existingData = currentSessionData[session.session_key]
      const isFullyLoaded = existingData && existingData.loaded === true
      
      if (isFullyLoaded) {
        // Session already loaded, enable images immediately
        console.log('✅ [MYCLASSES] Session already fully loaded:', session.session_key)
        setTimeout(() => setImagesLoaded(true), 50)
        return currentSessionData // No change needed
      }
      
      // Show cached students immediately if available
      if (studentsToUse && studentsToUse.length > 0) {
        console.log('📋 [MYCLASSES] Showing cached students immediately for session:', session.session_key)
        // Enable images immediately since we have student data
        setTimeout(() => setImagesLoaded(true), 100)
        
        // Create session data entry with cached students
        // IMPORTANT: Always create a new entry for this specific session key
        // to ensure each session has its own isolated data
        const newSessionData = {
          ...currentSessionData,
          [session.session_key]: {
            records: studentsToUse.map(student => ({
              ...student,
              status: null, // Will be updated when attendance loads
              remarks: null,
              session_date: session.session_date,
              title: session.title
            })),
            statusCounts: {},
            loaded: false, // Mark as not fully loaded yet
            session_key: session.session_key // Store session key for verification
          }
        }
        console.log('📝 [MYCLASSES] Created session data entry for:', session.session_key, 'with', studentsToUse.length, 'students')
        return newSessionData
      }
      
      return currentSessionData
    })
    
    // Step 2: Always try to load attendance data asynchronously
    // Use ref to ensure we have the current selectedClass
    console.log('🔄 [MYCLASSES] Calling loadSessionData for session:', session.session_key, 'sessionId:', session.session_id, 'selectedClass:', currentSelectedClass?.section_course_id)
    
    // Call immediately - loadSessionData uses selectedClass from its closure/ref
    loadSessionData(
      session.session_key,
      session.session_date,
      session.title,
      session.session_id,
      session.session_type,
      session.meeting_type
    ).catch(error => {
      console.error('❌ [MYCLASSES] Error loading session:', error)
    })
  }, [sessionList, loadSessionData, cachedStudentsList, students, selectedClass])

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

  // Prevent body scroll when modal is open (prevents background shrinking)
  useEffect(() => {
    if (showFullAttendanceModal) {
      // Save current scroll position
      const scrollY = window.scrollY
      // Get scrollbar width before hiding it
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      
      // Apply styles to prevent scroll and maintain layout
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.left = '0'
      document.body.style.right = '0'
      document.body.style.overflow = 'hidden'
      
      // Add padding to compensate for scrollbar on the sidebar container
      // This prevents the sidebar from shrinking when scrollbar disappears
      const sidebarContainer = document.querySelector('[data-sidebar-container]')
      if (sidebarContainer && scrollbarWidth > 0) {
        sidebarContainer.style.paddingRight = `${scrollbarWidth}px`
      }
      
      return () => {
        // Restore scroll position and styles
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.left = ''
        document.body.style.right = ''
        document.body.style.overflow = ''
        
        // Remove padding from sidebar container
        if (sidebarContainer) {
          sidebarContainer.style.paddingRight = ''
        }
        
        window.scrollTo(0, scrollY)
      }
    }
  }, [showFullAttendanceModal])

  // Handle clicks outside sidebar to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close sidebar if modal is open
      if (showFullAttendanceModal) {
        return
      }
      
      if (sidebarRef.current && !sidebarRef.current.contains(event.target) && selectedClass) {
        // Check if the click is not on a class card
        const isClassCard = event.target.closest('[data-class-card]')
        // Check if click is on modal
        const isModal = event.target.closest('[data-attendance-modal]')
        if (!isClassCard && !isModal) {
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
  }, [selectedClass, showFullAttendanceModal])

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
    // Check if this is a different class than the currently selected one
    const previousClassId = selectedClass?.section_course_id
    const newClassId = classItem?.section_course_id
    const isDifferentClass = previousClassId !== newClassId
    
    // If switching to a different class, reset all attendance-related cached data
    if (isDifferentClass && selectedClass) {
      console.log('🔄 [FACULTY] Switching classes - resetting attendance cache')
      console.log('  Old class:', previousClassId, selectedClass.course_title)
      console.log('  New class:', newClassId, classItem.course_title)
      
      // Reset all attendance-related state to prevent stale data
      setSessionData({}) // Clear all cached session attendance data
      setCachedStudentsList(null) // Clear cached students from attendance mode (IMPORTANT: prevent old class data)
      setSessionList([]) // Clear session list
      setActiveSessionTab(0) // Reset to first tab
      setLoadingSession({}) // Clear loading state
      setImagesLoaded(false) // Reset image loading state
      setShowFullAttendanceModal(false) // Close modal if open
      setLoadingFullAttendance(false) // Reset loading state
      
      // Clear loading sessions ref
      loadingSessionsRef.current.clear()
      
      // Clear cached class ID ref to allow caching for new class
      cachedClassIdRef.current = null
      
      console.log('✅ [FACULTY] Attendance cache reset complete - all cached data cleared for new class')
    }
    
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
      
      // Load images immediately after essential data is displayed
      requestAnimationFrame(() => {
        setImagesLoaded(true) // Enable image loading in UI immediately
        const imagesToLoad = sortedStudents
          .filter(s => s.student_photo)
          .map(s => ({ src: s.student_photo, id: `student_${s.student_id}` }))
        if (imagesToLoad.length > 0) {
          // Load images immediately in parallel (no batching delay)
          imageLoaderService.queueImages(imagesToLoad, true)
        }
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
    <div className="h-full flex overflow-auto">
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
                        const newAttendanceMode = !isAttendanceMode
                        setIsAttendanceMode(newAttendanceMode)
                        
                        // Cache students list when entering attendance mode
                        if (newAttendanceMode && students && students.length > 0) {
                          console.log('💾 [MYCLASSES] Caching students list for full view:', students.length, 'students')
                          setCachedStudentsList(students)
                        }
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
                    {/* Old attendance controls removed; kept exit button below */}
                   </div>
                   {/* Session Details Inputs in the middle space - Only in attendance mode */}
                   {/* Old input row removed */}

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
              {isAttendanceMode && selectedClass && (
                <div className="mb-3 bg-white border border-gray-200 rounded-lg p-3 sticky top-0 z-20">
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Meta only (no title) */}
                    <div className="min-w-0">
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-600">
                        <span className="truncate">{selectedClass.course_code} • {selectedClass.section_code}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="truncate">{selectedClass.semester} {selectedClass.school_year}</span>
                        <span
                          className="ml-2 inline-block bg-gray-100 text-gray-700 rounded-full px-1.5 py-0.5 shrink-0 text-[10px]"
                          title={`${students.length} student${students.length !== 1 ? 's' : ''}`}
                        >
                          {students.length}
                        </span>
                      </div>
                    </div>

                    {/* Right: Controls */}
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <button
                        onClick={loadFullAttendanceList}
                        disabled={loadingFullAttendance}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingFullAttendance ? 'Loading...' : 'Attendance History'}
                      </button>
                      <input
                        type="date"
                        value={sessionDetails.session_date}
                        onChange={async (e) => {
                          const selectedDate = e.target.value
                          updateSessionDetails('session_date', selectedDate)
                          if (selectedDate && selectedClass) {
                            await loadExistingAttendanceForDate(selectedDate)
                          }
                        }}
                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={sessionDetails.title}
                        onChange={(e) => updateSessionDetails('title', e.target.value)}
                        placeholder="Session Title"
                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400"
                        style={{ minWidth: 140 }}
                      />
                      <select
                        value={sessionDetails.session_type}
                        onChange={(e) => updateSessionDetails('session_type', e.target.value)}
                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      >
                        <option>Lecture</option>
                        <option>Laboratory</option>
                        <option>Recitation</option>
                        <option>Seminar</option>
                      </select>
                      <select
                        value={sessionDetails.meeting_type}
                        onChange={(e) => updateSessionDetails('meeting_type', e.target.value)}
                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      >
                        <option>Face-to-Face</option>
                        <option>Online</option>
                        <option>Hybrid</option>
                      </select>
                      <button
                        onClick={markAllPresent}
                        className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                      >
                        Mark All Present
                      </button>
                      <button
                        onClick={submitAttendance}
                        disabled={submittingAttendance || !sessionDetailsValid}
                        className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submittingAttendance ? 'Submitting...' : 'Submit'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
                          <LazyImage
                            src={student.student_photo} 
                            alt={student.full_name}
                            size="md"
                            shape="circle"
                            className="border border-gray-200"
                            delayLoad={!imagesLoaded}
                            priority={false}
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
                                    ? 'bg-red-200 text-red-900' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-800'
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
        <div 
          data-attendance-modal
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Close modal if clicking on backdrop (not modal content)
            if (e.target === e.currentTarget) {
              setShowFullAttendanceModal(false)
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Attendance Records</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedClass?.course_title} • {
                    loadingFullAttendance ? (
                      <span className="inline-block h-4 bg-gray-200 rounded w-20 animate-pulse align-middle"></span>
                    ) : (
                      `${sessionList.reduce((sum, session) => sum + session.student_count, 0)} total records`
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
              ) : sessionList.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <p>No attendance records found.</p>
                </div>
              ) : (
                <>
                  {/* Session Tabs */}
                  <div className="border-b border-gray-200 px-4 pt-2">
                    <div className="flex space-x-1 overflow-x-auto">
                      {sessionList.map((session, sessionIndex) => {
                        const formatDate = (dateString) => {
                          if (!dateString) return 'N/A'
                          const date = new Date(dateString)
                          return date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric'
                          })
                        }
                        
                        const sessionDataItem = sessionData[session.session_key]
                        const statusCounts = sessionDataItem?.statusCounts || {}
                        const totalAbsent = statusCounts.absent || 0
                        const isLoading = loadingSession[session.session_key]
                        
                        return (
                          <button
                            key={`tab-${sessionIndex}`}
                            onClick={() => handleTabChange(sessionIndex)}
                            disabled={isLoading}
                            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                              activeSessionTab === sessionIndex
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{formatDate(session.session_date)}</span>
                              <span className="text-xs text-gray-400">({session.student_count})</span>
                              {isLoading && (
                                <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                              )}
                              {!isLoading && totalAbsent > 0 && (
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
                    {sessionList[activeSessionTab] && (() => {
                      const session = sessionList[activeSessionTab]
                      // CRITICAL: Always get session data using the current active session's key
                      const sessionDataItem = sessionData[session.session_key]
                      const isLoadingSession = loadingSession[session.session_key]
                      
                      // Debug: Log which session we're displaying
                      console.log('🎯 [MYCLASSES] Displaying session:', session.session_key, 'tab index:', activeSessionTab, 'has data:', !!sessionDataItem, 'loaded:', sessionDataItem?.loaded, 'available keys:', Object.keys(sessionData))
                      
                      const formatDate = (dateString) => {
                        if (!dateString) return 'N/A'
                        const date = new Date(dateString)
                        return date.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })
                      }
                      
                      // Show cached students immediately, even if attendance data is still loading
                      // Only show skeleton if we have no session data AND no cached students
                      if (!sessionDataItem && (!cachedStudentsList || cachedStudentsList.length === 0)) {
                        return (
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
                        )
                      }
                      
                      // Show session data (students from cache, attendance status from data)
                      // IMPORTANT: Always use the session data for the CURRENT active session
                      // If sessionDataItem exists, use it (even if loaded: false, it has the right students)
                      // Only fallback to cached students if no sessionDataItem exists
                      let records, statusCounts
                      if (sessionDataItem) {
                        // Use the session data for this specific session
                        records = sessionDataItem.records || []
                        statusCounts = sessionDataItem.statusCounts || {}
                        console.log('📊 [MYCLASSES] Using session data for:', session.session_key, 'records:', records.length, 'loaded:', sessionDataItem.loaded)
                      } else {
                        // Fallback: show cached students with null status (will be updated when data loads)
                        records = (cachedStudentsList || students || []).map(student => ({
                          ...student,
                          status: null,
                          remarks: null,
                          session_date: session.session_date,
                          title: session.title
                        }))
                        statusCounts = {}
                        console.log('📋 [MYCLASSES] Using fallback cached students for:', session.session_key, 'records:', records.length)
                      }
                      
                      // Show loading indicator if attendance data is still loading
                      // Also show loading if we have session data but it's marked as not fully loaded
                      const isAttendanceLoading = isLoadingSession || (sessionDataItem && !sessionDataItem.loaded)
                      
                      return (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* Session Header */}
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-semibold text-gray-900">
                                    {session.title}
                                  </h3>
                                  {isAttendanceLoading && (
                                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" title="Loading attendance data..."></div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-xs text-gray-500">
                                    {formatDate(session.session_date)} • {records.length} students
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
                                {isAttendanceLoading ? (
                                  // Show skeleton loaders for status badges
                                  <>
                                    <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                                    <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                                    <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                                  </>
                                ) : (
                                  <>
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
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Students Grid - 3 Columns */}
                          <div className="overflow-x-auto p-4">
                            <div className="grid grid-cols-3 gap-3">
                              {records.map((record, recordIndex) => {
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
                                        <LazyImage
                                          src={record.student_photo || null}
                                          alt={record.full_name}
                                          size="xs"
                                          shape="circle"
                                          className="border border-gray-200"
                                          delayLoad={!imagesLoaded}
                                          priority={false}
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
                                      {record.status ? (
                                        <>
                                          <span className={`px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full whitespace-nowrap ${
                                            statusColors[record.status] || 'bg-gray-100 text-gray-800'
                                          }`}>
                                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
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
                                        </>
                                      ) : (
                                        // Show skeleton loader for status badge when attendance is loading
                                        <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" title="Loading attendance..."></div>
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
                    {sessionList.length} session{sessionList.length !== 1 ? 's' : ''} recorded
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