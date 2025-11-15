import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { MagnifyingGlassIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/solid'
import { Loader2 } from 'lucide-react'
import ClassCard from '../../components/ClassCard'
import ClassCardSkeleton from '../../components/ClassCardSkeleton'
import LazyImage from '../../components/LazyImage'
import { getPrefetchedClasses } from '../../services/dataPrefetchService'
import { API_BASE_URL } from '../../utils/api'
import deanCacheService from '../../services/deanCacheService'
import { safeSetItem, safeGetItem, minimizeClassData, minimizeStudentData, createCacheGetter, createCacheSetter } from '../../utils/cacheUtils'
import attendanceService from '../../services/attendanceService'
import { StudentListSkeleton } from '../../components/skeletons'
import imageLoaderService from '../../services/imageLoaderService'

// Cache helpers
const getCachedData = createCacheGetter(deanCacheService);
const setCachedData = createCacheSetter(deanCacheService);

const MyClasses = () => {
  const [query, setQuery] = useState('')
  const [classes, setClasses] = useState([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [error, setError] = useState(null)
  const abortControllerRef = useRef(null)
  const studentsAbortControllerRef = useRef(null)
  
  // Modal states
  const [showStudentStatsModal, setShowStudentStatsModal] = useState(false)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  
  // Class selection and students
  const [selectedClass, setSelectedClass] = useState(null)
  const [students, setStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  
  // Selected student for modal
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentGrades, setStudentGrades] = useState([])
  const [loadingStudentGrades, setLoadingStudentGrades] = useState(false)
  const [studentAttendancePercent, setStudentAttendancePercent] = useState(null)
  const [studentAttendanceTotals, setStudentAttendanceTotals] = useState({ totalSessions: 0, present: 0, absent: 0, late: 0 })
  
  // Attendance modal state
  const [sessionList, setSessionList] = useState([])
  const [sessionData, setSessionData] = useState({})
  const [loadingFullAttendance, setLoadingFullAttendance] = useState(false)
  const [loadingSession, setLoadingSession] = useState({})
  const [activeSessionTab, setActiveSessionTab] = useState(0)
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const [cachedStudentsList, setCachedStudentsList] = useState(null)
  const attendanceAbortControllerRef = useRef(null)
  
  // Delete session state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState(null)
  const [deletingSession, setDeletingSession] = useState(false)

  // Helper function to enrich minimized data with images from enhanced cache
  const enrichWithImages = useCallback((minimizedClasses, fullClassesData) => {
    if (!Array.isArray(minimizedClasses) || !Array.isArray(fullClassesData)) {
      return minimizedClasses
    }
    
    // Create a map of section_course_id to full class data for quick lookup
    const fullDataMap = new Map()
    fullClassesData.forEach(cls => {
      fullDataMap.set(String(cls.section_course_id), cls)
    })
    
    // Enrich minimized classes with images from full data
    return minimizedClasses.map(item => {
      const fullData = fullDataMap.get(String(item.section_course_id))
      return {
        ...item,
        bannerImage: fullData?.banner_image || item.banner_image || null,
        avatarUrl: fullData?.faculty_avatar || item.faculty_avatar || null
      }
    })
  }, [])

  // Fetch classes with caching
  const fetchClasses = useCallback(async () => {
    console.log('🔍 [DEAN MYCLASSES] fetchClasses starting')
    setError(null)
    
    // Check sessionStorage first for instant display
    const sessionCacheKey = 'dean_classes_session'
    const sessionCached = safeGetItem(sessionCacheKey)
    
    // Check enhanced cache (may have full data with images)
    const cacheKey = 'dean_classes'
    const enhancedCachedData = getCachedData('classes', cacheKey, 5 * 60 * 1000) // 5 minute cache
    
    if (sessionCached) {
      console.log('📦 [DEAN MYCLASSES] Using session cached classes data')
      // Enrich minimized data with images from enhanced cache if available
      const enrichedClasses = enhancedCachedData 
        ? enrichWithImages(sessionCached, enhancedCachedData)
        : sessionCached
      
      const formattedClasses = enrichedClasses.map(item => {
        // If banner_type is 'image' but no banner_image, fall back to 'color'
        const hasBannerImage = item.banner_image && item.banner_image.trim() !== ''
        const bannerType = (item.banner_type === 'image' && hasBannerImage) 
          ? 'image' 
          : (item.banner_type || 'color')
        
        return {
          id: String(item.section_course_id),
          title: item.course_title,
          code: item.course_code,
          section: item.section_code,
          instructor: item.faculty_name,
          bannerType: bannerType,
          bannerColor: item.banner_color || '#3B82F6',
          bannerImage: hasBannerImage ? item.banner_image : null,
          avatarUrl: item.faculty_avatar || null
        }
      })
      setClasses(formattedClasses)
      setLoadingClasses(false)
      // Continue to fetch fresh data in background
    } else {
      setLoadingClasses(true)
    }
    
    if (enhancedCachedData && !sessionCached) {
      console.log('📦 [DEAN MYCLASSES] Using enhanced cached classes data')
      const formattedClasses = enhancedCachedData.map(item => {
        // If banner_type is 'image' but no banner_image, fall back to 'color'
        const hasBannerImage = item.banner_image && item.banner_image.trim() !== ''
        const bannerType = (item.banner_type === 'image' && hasBannerImage) 
          ? 'image' 
          : (item.banner_type || 'color')
        
        return {
          id: String(item.section_course_id),
          title: item.course_title,
          code: item.course_code,
          section: item.section_code,
          instructor: item.faculty_name,
          bannerType: bannerType,
          bannerColor: item.banner_color || '#3B82F6',
          bannerImage: hasBannerImage ? item.banner_image : null,
          avatarUrl: item.faculty_avatar || null
        }
      })
      setClasses(formattedClasses)
      setLoadingClasses(false)
      // Cache minimized data in sessionStorage for next time
      safeSetItem(sessionCacheKey, enhancedCachedData, minimizeClassData)
      // Continue to fetch fresh data in background
    }
    
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController()
    
    try {
      console.log('🔄 [DEAN MYCLASSES] Fetching fresh classes...')
      const response = await fetch(`${API_BASE_URL}/section-courses/assigned`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: abortControllerRef.current.signal
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch assigned courses: ${response.status}`)
      }
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON')
      }
      
      const data = await response.json()
      console.log(`✅ [DEAN MYCLASSES] Received ${Array.isArray(data) ? data.length : 0} classes`)
      
      const classesData = Array.isArray(data) ? data : []
      const formattedClasses = classesData.map(item => {
        // If banner_type is 'image' but no banner_image, fall back to 'color'
        const hasBannerImage = item.banner_image && item.banner_image.trim() !== ''
        const bannerType = (item.banner_type === 'image' && hasBannerImage) 
          ? 'image' 
          : (item.banner_type || 'color')
        
        return {
          id: String(item.section_course_id),
          title: item.course_title,
          code: item.course_code,
          section: item.section_code,
          instructor: item.faculty_name,
          bannerType: bannerType,
          bannerColor: item.banner_color || '#3B82F6',
          bannerImage: hasBannerImage ? item.banner_image : null,
          avatarUrl: item.faculty_avatar || null
        }
      })
      setClasses(formattedClasses)
      
      // Store minimized data in sessionStorage for instant next load
      // Always update sessionStorage with minimized data when we get fresh data
      safeSetItem(sessionCacheKey, classesData, minimizeClassData)
      
      // Store full data in enhanced cache (includes images)
      setCachedData('classes', cacheKey, classesData)
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🚫 [DEAN MYCLASSES] Request was aborted')
        return
      }
      console.error('❌ [DEAN MYCLASSES] Error fetching classes:', error)
      const sessionCached = safeGetItem(sessionCacheKey)
      const cachedData = getCachedData('classes', cacheKey, 5 * 60 * 1000)
      if (!sessionCached && !cachedData) {
        setError(error.message)
        setClasses([])
      }
    } finally {
      setLoadingClasses(false)
    }
  }, [])

  // Helper function to enrich minimized student data with photos from enhanced cache
  const enrichStudentsWithPhotos = useCallback((minimizedStudents, fullStudentsData) => {
    if (!Array.isArray(minimizedStudents) || !Array.isArray(fullStudentsData)) {
      return minimizedStudents
    }
    
    // Create a map of student_id to full student data for quick lookup
    const fullDataMap = new Map()
    fullStudentsData.forEach(student => {
      fullDataMap.set(String(student.student_id), student)
    })
    
    // Enrich minimized students with photos from full data
    return minimizedStudents.map(item => {
      const fullData = fullDataMap.get(String(item.student_id))
      return {
        ...item,
        student_photo: fullData?.student_photo || item.student_photo || null
      }
    })
  }, [])

  // Helper: extract surname (last word) for alphabetical sorting
  const extractSurname = useCallback((fullName) => {
    if (!fullName || typeof fullName !== 'string') return ''
    const tokens = fullName.trim().split(/\s+/)
    if (tokens.length === 0) return ''
    return tokens[tokens.length - 1].toLowerCase()
  }, [])

  // Helper function to format name as "Last name, First name Middle"
  const formatName = useCallback((fullName) => {
    if (!fullName || typeof fullName !== 'string') return 'Unknown Student'
    const tokens = fullName.trim().split(/\s+/).filter(token => token.length > 0)
    if (tokens.length === 0) return 'Unknown Student'
    if (tokens.length === 1) return tokens[0] // Single name, return as is
    
    // Last name is the last token, first and middle names are the rest
    const lastName = tokens[tokens.length - 1]
    const firstAndMiddle = tokens.slice(0, -1).join(' ')
    
    return `${lastName}, ${firstAndMiddle}`
  }, [])

  // Fetch student photos on-demand (asynchronous and lazy)
  const fetchStudentPhotos = useCallback(async (students) => {
    if (!students || students.length === 0) return
    
    try {
      console.log('📸 [DEAN MYCLASSES] Fetching photos for', students.length, 'students')
      
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
              // Update students with photo
              setStudents(prev => {
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
                  id: `student_${student.student_id}`
                }], false)
              }
              
              return { student_id: student.student_id, photo: data.photo }
            }
          } catch (error) {
            console.error(`❌ [DEAN MYCLASSES] Error fetching photo for student ${student.student_id}:`, error)
            return null
          }
        })
        
        await Promise.all(photoPromises)
        
        // Small delay between batches
        if (i + batchSize < students.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      console.log('✅ [DEAN MYCLASSES] Photos fetched and updated')
    } catch (error) {
      console.error('❌ [DEAN MYCLASSES] Error in fetchStudentPhotos:', error)
    }
  }, [])

  // Handle class selection - loads students in sidebar (asynchronous and lazy)
  const handleClassSelect = useCallback(async (classItem) => {
    setSelectedClass(classItem)
    
    // Check sessionStorage first for instant display
    const sectionId = classItem.id
    const sessionCacheKey = `dean_students_${sectionId}_session`
    const sessionCached = safeGetItem(sessionCacheKey)
    
    // Check enhanced cache (may have full data with photos)
    const studentsCacheKey = `dean_students_${sectionId}`
    const enhancedCachedStudents = getCachedData('students', studentsCacheKey, 10 * 60 * 1000) // 10 minute cache
    
    if (sessionCached) {
      console.log('📦 [DEAN MYCLASSES] Using session cached students data')
      // Enrich minimized data with photos from enhanced cache if available
      const enrichedStudents = enhancedCachedStudents
        ? enrichStudentsWithPhotos(sessionCached, enhancedCachedStudents)
        : sessionCached
      setStudents(enrichedStudents)
      // Continue to fetch fresh data in background
    } else if (enhancedCachedStudents) {
      console.log('📦 [DEAN MYCLASSES] Using enhanced cached students data')
      setStudents(enhancedCachedStudents)
      // Cache minimized data in sessionStorage for next time
      safeSetItem(sessionCacheKey, enhancedCachedStudents, minimizeStudentData)
      // Continue to fetch fresh data in background
    }
    
    // Only show loading if no cache available
    if (!sessionCached && !enhancedCachedStudents) {
      setLoadingStudents(true)
    }
    
    // Cancel previous request if still pending
    if (studentsAbortControllerRef.current) {
      studentsAbortControllerRef.current.abort()
    }
    
    // Create new abort controller
    studentsAbortControllerRef.current = new AbortController()
    
    // Use requestIdleCallback or setTimeout for non-blocking fetch
    const fetchStudents = async () => {
      try {
        console.log(`🔄 [DEAN MYCLASSES] Fetching students for class ${sectionId}...`)
        const response = await fetch(`${API_BASE_URL}/section-courses/${sectionId}/students`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          signal: studentsAbortControllerRef.current.signal
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch students: ${response.status}`)
        }
        
        const studentData = await response.json()
        console.log(`✅ [DEAN MYCLASSES] Received ${Array.isArray(studentData) ? studentData.length : 0} students`)
        
        const studentsData = Array.isArray(studentData) ? studentData : []
        
        // Sort students alphabetically by surname
        const sortedStudents = studentsData.sort((a, b) => {
          const aLast = extractSurname(a.full_name)
          const bLast = extractSurname(b.full_name)
          if (aLast === bLast) {
            return (a.full_name || '').localeCompare(b.full_name || '')
          }
          return aLast.localeCompare(bLast)
        })
        
        setStudents(sortedStudents)
        
        // Store minimized data in sessionStorage for instant next load
        safeSetItem(sessionCacheKey, sortedStudents, minimizeStudentData)
        
        // Store full data in enhanced cache
        setCachedData('students', studentsCacheKey, sortedStudents)
        
        // Load images asynchronously after essential data is displayed
        requestAnimationFrame(() => {
          setImagesLoaded(true) // Enable image loading in UI immediately
          // Fetch photos on-demand since API doesn't include them by default
          fetchStudentPhotos(sortedStudents)
        })
        
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('🚫 [DEAN MYCLASSES] Students request was aborted')
          return
        }
        console.error('❌ [DEAN MYCLASSES] Error loading students:', error)
        const sessionCached = safeGetItem(sessionCacheKey)
        const cachedStudents = getCachedData('students', studentsCacheKey, 10 * 60 * 1000)
        if (!sessionCached && !cachedStudents) {
          setStudents([])
        } else if (sessionCached && cachedStudents) {
          // If we have cached data, enrich it with photos
          const enrichedStudents = enrichStudentsWithPhotos(sessionCached, cachedStudents)
          setStudents(enrichedStudents)
        } else if (sessionCached) {
          setStudents(sessionCached)
        } else if (cachedStudents) {
          setStudents(cachedStudents)
        }
      } finally {
        setLoadingStudents(false)
      }
    }
    
    // Defer fetch to avoid blocking UI
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(fetchStudents, { timeout: 2000 })
    } else {
      setTimeout(fetchStudents, 0)
    }
  }, [enrichStudentsWithPhotos, extractSurname, fetchStudentPhotos])
  
  // Handle student click - opens student modal with detailed grades (like faculty interface)
  const handleStudentClick = useCallback(async (student) => {
    setSelectedStudent(student)
    setShowStudentStatsModal(true)
    setLoadingStudentGrades(true)
    setStudentGrades([])
    
    if (!student.enrollment_id) {
      setLoadingStudentGrades(false)
      return
    }
    
    try {
      // Fetch student grades asynchronously
      const response = await fetch(`/api/grading/student/${student.enrollment_id}/grades`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      
      if (response.ok) {
        const gradesData = await response.json()
        setStudentGrades(Array.isArray(gradesData) ? gradesData : [])
      } else {
        console.error('Failed to fetch student grades')
        setStudentGrades([])
      }
    } catch (error) {
      console.error('❌ [DEAN MYCLASSES] Error fetching student grades:', error)
      setStudentGrades([])
    } finally {
      setLoadingStudentGrades(false)
    }
  }, [])
  
  // Load session data - defined before handleOpenAttendanceModal to avoid dependency issues
  const loadSessionData = useCallback(async (session, tabIndex, currentSessionData, currentStudents, currentCachedStudents) => {
    if (!session || !selectedClass) return
    
    const sessionKey = session.session_key
    if (currentSessionData?.[sessionKey]?.loaded) {
      setActiveSessionTab(tabIndex)
      return
    }
    
    setLoadingSession(prev => ({ ...prev, [sessionKey]: true }))
    
    try {
      // Fetch attendance for this session
      const response = await fetch(`${API_BASE_URL}/attendance/session/${session.session_id}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch session data: ${response.status}`)
      }
      
      const result = await response.json()
      const attendanceRecords = Array.isArray(result.data) ? result.data : []
      
      // Get students list (use cached if available)
      let studentsList = currentCachedStudents || currentStudents
      if (studentsList.length === 0) {
        // Fetch students if not available
        const studentsResponse = await fetch(`${API_BASE_URL}/section-courses/${selectedClass.id}/students?includePhotos=true`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        })
        if (studentsResponse.ok) {
          const studentsData = await studentsResponse.json()
          studentsList = Array.isArray(studentsData) ? studentsData : []
        }
      }
      
      // Create attendance map
      const attendanceMap = new Map()
      attendanceRecords.forEach(record => {
        attendanceMap.set(record.enrollment_id, {
          ...record,
          session_date: record.session_date || session.session_date,
          title: record.title || session.title,
          session_type: record.session_type || session.session_type,
          meeting_type: record.meeting_type || session.meeting_type
        })
      })
      
      // Merge students with attendance data
      const sessionRecords = studentsList.map(student => {
        const attendanceRecord = attendanceMap.get(student.enrollment_id)
        if (attendanceRecord) {
          return {
            ...student,
            status: attendanceRecord.status,
            remarks: attendanceRecord.remarks || null,
            session_date: attendanceRecord.session_date,
            title: attendanceRecord.title
          }
        } else {
          return {
            ...student,
            status: null,
            remarks: null,
            session_date: session.session_date,
            title: session.title
          }
        }
      })
      
      // Calculate status counts
      const statusCounts = sessionRecords.reduce((acc, record) => {
        if (record.status) {
          acc[record.status] = (acc[record.status] || 0) + 1
        }
        return acc
      }, {})
      
      // Store session data
      setSessionData(prev => ({
        ...prev,
        [sessionKey]: {
          records: sessionRecords,
          statusCounts,
          loaded: true
        }
      }))
      
      setActiveSessionTab(tabIndex)
    } catch (error) {
      console.error('❌ [DEAN MYCLASSES] Error loading session data:', error)
    } finally {
      setLoadingSession(prev => {
        const updated = { ...prev }
        delete updated[sessionKey]
        return updated
      })
    }
  }, [selectedClass])
  
  // Handle opening attendance modal
  const handleOpenAttendanceModal = useCallback(async () => {
    if (!selectedClass) return
    
    setShowAttendanceModal(true)
    setLoadingFullAttendance(true)
    setSessionList([])
    setSessionData({})
    setActiveSessionTab(0)
    setImagesLoaded(false)
    setCachedStudentsList(students.length > 0 ? students : null)
    
    // Cancel previous request if still pending
    if (attendanceAbortControllerRef.current) {
      attendanceAbortControllerRef.current.abort()
    }
    
    attendanceAbortControllerRef.current = new AbortController()
    
    try {
      // Fetch session list
      const response = await fetch(`${API_BASE_URL}/attendance/sessions/${selectedClass.id}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: attendanceAbortControllerRef.current.signal
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.status}`)
      }
      
      const data = await response.json()
      const sessions = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])
      
      // Format sessions for display
      const formatDateSafe = (dateString) => {
        if (!dateString) return '—'
        try {
          const date = new Date(dateString)
          if (isNaN(date.getTime())) return '—'
          return date.toLocaleDateString()
        } catch (error) {
          return '—'
        }
      }
      
      const formattedSessions = sessions.map(session => ({
        session_id: session.session_id,
        session_key: `${session.session_id}_${session.session_date}`,
        session_date: session.session_date,
        title: session.title || `Session ${formatDateSafe(session.session_date)}`,
        session_type: session.session_type,
        meeting_type: session.meeting_type,
        student_count: session.student_count || 0
      }))
      
      setSessionList(formattedSessions)
      
      // Load first session data immediately
      if (formattedSessions.length > 0) {
        loadSessionData(formattedSessions[0], 0, {}, students, students.length > 0 ? students : null)
      }
      
      setImagesLoaded(true)
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🚫 [DEAN MYCLASSES] Attendance request was aborted')
        return
      }
      console.error('❌ [DEAN MYCLASSES] Error loading attendance sessions:', error)
    } finally {
      setLoadingFullAttendance(false)
    }
  }, [selectedClass, students, loadSessionData])
  
  // Handle tab change in attendance modal
  const handleTabChange = useCallback((tabIndex) => {
    if (tabIndex < 0 || tabIndex >= sessionList.length) return
    const session = sessionList[tabIndex]
    loadSessionData(session, tabIndex, sessionData, students, cachedStudentsList)
  }, [sessionList, sessionData, students, cachedStudentsList, loadSessionData])

  // Handle delete session with validation
  const handleDeleteSession = useCallback((session) => {
    // Validation: Check if session exists
    if (!session || !session.session_id) {
      alert('Invalid session. Cannot delete.')
      return
    }

    // Validation: Check if user has permission (dean can delete any session)
    if (!selectedClass) {
      alert('Permission denied. Please refresh and try again.')
      return
    }

    // Set session to delete and show confirmation
    setSessionToDelete(session)
    setShowDeleteConfirm(true)
  }, [selectedClass])

  // Confirm and execute deletion
  const confirmDeleteSession = useCallback(async () => {
    if (!sessionToDelete || !sessionToDelete.session_id) {
      setShowDeleteConfirm(false)
      setSessionToDelete(null)
      return
    }

    setDeletingSession(true)

    try {
      // Call delete API
      await attendanceService.deleteSession(sessionToDelete.session_id)

      // Remove session from sessionList
      setSessionList(prev => {
        const updated = prev.filter(s => s.session_id !== sessionToDelete.session_id)
        
        // Adjust active tab if needed
        if (activeSessionTab >= updated.length && updated.length > 0) {
          setActiveSessionTab(updated.length - 1)
        } else if (updated.length === 0) {
          setActiveSessionTab(0)
        }
        
        return updated
      })

      // Remove session data from cache
      setSessionData(prev => {
        const updated = { ...prev }
        delete updated[sessionToDelete.session_key]
        return updated
      })

      // Show success message
      alert(`Session "${sessionToDelete.title || 'Untitled'}" deleted successfully.`)

      // Close confirmation modal
      setShowDeleteConfirm(false)
      setSessionToDelete(null)
    } catch (error) {
      console.error('❌ [DEAN MYCLASSES] Error deleting session:', error)
      alert(`Failed to delete session: ${error.message || 'Unknown error'}. Please try again.`)
    } finally {
      setDeletingSession(false)
    }
  }, [sessionToDelete, activeSessionTab])

  // Cancel delete
  const cancelDeleteSession = useCallback(() => {
    setShowDeleteConfirm(false)
    setSessionToDelete(null)
  }, [])

  // Load classes when component mounts
  useEffect(() => {
    fetchClasses()
    
    // Cleanup function to abort pending requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (studentsAbortControllerRef.current) {
        studentsAbortControllerRef.current.abort()
      }
      if (attendanceAbortControllerRef.current) {
        attendanceAbortControllerRef.current.abort()
      }
    }
  }, [fetchClasses, enrichWithImages, enrichStudentsWithPhotos])

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
          {/* Header */}
          <div className="bg-gray-50 border-b border-gray-200 mb-2">
            <div className="px-0">
              <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200">
                <nav className="flex space-x-8">
                  <div className="py-2 px-4 font-medium text-sm text-red-600 border-b-2 border-red-600">
                    Classes
                  </div>
                </nav>
              </div>
            </div>
          </div>

          {/* Content Shell */}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, index) => (
                      <ClassCardSkeleton key={index} />
                    ))}
                  </div>
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
            <div 
              ref={sidebarRef}
              className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-h-[120px] overflow-hidden flex flex-col"
            >
              {selectedClass ? (
                <div className="h-full flex flex-col min-h-0">
                  {/* Class Header */}
                  <div className="mb-3 pb-3 border-b border-gray-200 flex-shrink-0">
                    <h3 className="text-base font-semibold text-gray-900 mb-2 break-words">{selectedClass.title}</h3>
                    <div className="text-xs text-gray-600 space-y-0.5">
                      <div><span className="font-medium">Code:</span> {selectedClass.code}</div>
                      <div><span className="font-medium">Section:</span> {selectedClass.section}</div>
                      <div><span className="font-medium">Instructor:</span> {selectedClass.instructor}</div>
                    </div>
                  </div>

                  {/* Students List */}
                  <div className="flex-1 overflow-auto min-h-0">
                    {loadingStudents ? (
                      <StudentListSkeleton students={5} />
                    ) : students.length > 0 ? (
                      <div className="space-y-3">
                        {students.map((student, index) => (
                          <div 
                            key={student.student_id} 
                            className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleStudentClick(student)}
                          >
                            <div className="flex-shrink-0 w-6 text-center">
                              <span className="text-xs font-medium text-gray-500">
                                {index + 1}
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
                          </div>
                        ))}
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

      {/* Student Details Modal - Aggregate Stats Only */}
      {showStudentStatsModal && selectedStudent && (() => {
        // Calculate final grade from detailed grades
        const calculateFinalGrade = () => {
          if (!studentGrades || studentGrades.length === 0) return null
          
          let totalWeightedScore = 0
          let totalWeight = 0
          
          studentGrades.forEach(grade => {
            const weight = parseFloat(grade.weight_percentage || 0)
            totalWeight += weight
            
            if (grade.adjusted_score !== null && grade.total_points > 0) {
              const percentage = (grade.adjusted_score / grade.total_points) * 100
              totalWeightedScore += (percentage * weight) / 100
            }
          })
          
          if (totalWeight === 0) return null
          
          // Final grade is the sum of weighted scores
          return totalWeightedScore
        }
        
        const finalGrade = calculateFinalGrade()
        const finalGradeDisplay = finalGrade !== null ? finalGrade.toFixed(2) : 'N/A'
        const finalGradeColor = finalGrade !== null 
          ? finalGrade >= 90 ? 'text-green-600' 
            : finalGrade >= 75 ? 'text-blue-600' 
            : finalGrade >= 60 ? 'text-yellow-600' 
            : 'text-red-600'
          : 'text-gray-500'
        
        // Format student name helper
        const formatName = (name) => {
          if (!name) return ''
          return name.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ')
        }
        
        return (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowStudentStatsModal(false)}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header with Final Score */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center space-x-4 flex-1">
                    <LazyImage
                      src={selectedStudent.student_photo}
                      alt={selectedStudent.full_name}
                      size="lg"
                      shape="circle"
                      className="border-2 border-white shadow-sm"
                      delayLoad={false}
                      priority={true}
                    />
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900">
                        {formatName(selectedStudent.full_name)}
                      </h2>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-gray-600">SR: {selectedStudent.student_number}</p>
                        {selectedStudent.contact_email && (
                          <p className="text-xs text-gray-500">{selectedStudent.contact_email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Final Score Display */}
                  <div className="flex items-center gap-6 mr-4">
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Final Grade</p>
                      <p className={`text-4xl font-bold ${finalGradeColor}`}>
                        {finalGradeDisplay}%
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setShowStudentStatsModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment Scores</h3>
                
                {loadingStudentGrades ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : studentGrades.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {studentGrades.map((grade) => {
                      const adjustedScore = grade.adjusted_score ?? null
                      const percentage = adjustedScore !== null && grade.total_points > 0 
                        ? ((adjustedScore / grade.total_points) * 100).toFixed(1)
                        : null
                      const weightedScore = adjustedScore !== null && grade.total_points > 0 && grade.weight_percentage
                        ? ((adjustedScore / grade.total_points) * parseFloat(grade.weight_percentage)).toFixed(2)
                        : null
                      
                      return (
                        <div 
                          key={grade.assessment_id} 
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          {/* Assessment Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-base font-semibold text-gray-900 truncate">
                                {grade.assessment_title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  {grade.assessment_type}
                                </span>
                                <span className="text-xs text-gray-600">{grade.total_points} pts</span>
                                <span className="text-xs text-gray-600">{parseFloat(grade.weight_percentage || 0).toFixed(2)}%</span>
                                {grade.due_date && (() => {
                                  try {
                                    const date = new Date(grade.due_date)
                                    if (!isNaN(date.getTime())) {
                                      return <span className="text-xs text-gray-500">Due: {date.toLocaleDateString()}</span>
                                    }
                                  } catch (e) {}
                                  return null
                                })()}
                              </div>
                            </div>
                          </div>
                          
                          {/* Scores Grid - More Compact */}
                          <div className="grid grid-cols-4 gap-3 mb-3">
                            <div className="bg-gray-50 rounded p-2">
                              <p className="text-xs text-gray-500 mb-0.5">Raw</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {grade.raw_score !== null ? grade.raw_score.toFixed(1) : '—'}
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                              <p className="text-xs text-gray-500 mb-0.5">Penalty</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {grade.late_penalty !== null ? grade.late_penalty.toFixed(1) : '—'}
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                              <p className="text-xs text-gray-500 mb-0.5">Adjusted</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {adjustedScore !== null ? adjustedScore.toFixed(1) : '—'}
                              </p>
                            </div>
                            <div className="bg-blue-50 rounded p-2">
                              <p className="text-xs text-gray-500 mb-0.5">%</p>
                              <p className="text-sm font-semibold text-blue-700">
                                {percentage !== null ? `${percentage}%` : '—'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Weighted Score and Status */}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                            <div className="flex items-center gap-3">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                grade.submission_status === 'ontime' 
                                  ? 'bg-green-100 text-green-800'
                                  : grade.submission_status === 'late'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {grade.submission_status === 'ontime' ? 'On Time' : 
                                 grade.submission_status === 'late' ? 'Late' : 'Missing'}
                              </span>
                              {weightedScore !== null && (
                                <span className="text-xs text-gray-600">
                                  Weighted: <span className="font-semibold">{weightedScore}%</span>
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {grade.graded_at && (() => {
                                try {
                                  const date = new Date(grade.graded_at)
                                  if (!isNaN(date.getTime())) {
                                    return <span>{date.toLocaleDateString()}</span>
                                  }
                                } catch (e) {}
                                return null
                              })()}
                            </div>
                          </div>
                          
                          {/* Feedback */}
                          {grade.feedback && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs font-medium text-gray-500 mb-1">Feedback</p>
                              <p className="text-xs text-gray-700 leading-relaxed">{grade.feedback}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <p className="text-gray-500">No assessment scores available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Attendance Records Modal */}
      {showAttendanceModal && selectedClass && (
        <div 
          data-attendance-modal
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAttendanceModal(false)
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
                  {selectedClass.title} • {
                    loadingFullAttendance ? (
                      <span className="inline-block h-4 bg-gray-200 rounded w-20 animate-pulse align-middle"></span>
                    ) : (
                      `${sessionList.reduce((sum, session) => sum + session.student_count, 0)} total records`
                    )
                  }
                </p>
              </div>
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body - Tabs for Sessions */}
            <div className="flex-1 flex flex-col min-h-0">
              {loadingFullAttendance ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                </div>
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
                          try {
                            const date = new Date(dateString)
                            if (isNaN(date.getTime())) return 'N/A'
                            return date.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric'
                            })
                          } catch (error) {
                            return 'N/A'
                          }
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
                      const sessionDataItem = sessionData[session.session_key]
                      const isLoadingSession = loadingSession[session.session_key]
                      
                      const formatDate = (dateString) => {
                        if (!dateString) return 'N/A'
                        try {
                          const date = new Date(dateString)
                          if (isNaN(date.getTime())) return 'N/A'
                          return date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })
                        } catch (error) {
                          return 'N/A'
                        }
                      }
                      
                      if (!sessionDataItem && (!cachedStudentsList || cachedStudentsList.length === 0)) {
                        return (
                          <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                          </div>
                        )
                      }
                      
                      let records, statusCounts
                      if (sessionDataItem) {
                        records = sessionDataItem.records || []
                        statusCounts = sessionDataItem.statusCounts || {}
                      } else {
                        records = (cachedStudentsList || students || []).map(student => ({
                          ...student,
                          status: null,
                          remarks: null,
                          session_date: session.session_date,
                          title: session.title
                        }))
                        statusCounts = {}
                      }
                      
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
                              <div className="flex items-center gap-2">
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
                                
                                {/* Delete Button */}
                                <button
                                  onClick={() => handleDeleteSession(session)}
                                  disabled={deletingSession || isAttendanceLoading}
                                  className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Delete this attendance session"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
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
                                          {record.full_name}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">
                                          {record.student_number}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                      {record.status ? (
                                        <span className={`px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full whitespace-nowrap ${
                                          statusColors[record.status] || 'bg-gray-100 text-gray-800'
                                        }`}>
                                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                        </span>
                                      ) : (
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
                onClick={() => setShowAttendanceModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && sessionToDelete && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              cancelDeleteSession()
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <TrashIcon className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Attendance Session</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-700 mb-2">
                Are you sure you want to delete this attendance session?
              </p>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-sm font-medium text-gray-900">
                  {sessionToDelete.title || 'Untitled Session'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {(() => {
                    try {
                      const date = new Date(sessionToDelete.session_date)
                      return date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })
                    } catch {
                      return sessionToDelete.session_date || 'N/A'
                    }
                  })()} • {sessionToDelete.student_count || 0} students
                </p>
              </div>
              <p className="text-xs text-red-600 mt-3 font-medium">
                ⚠️ All attendance records for this session will be permanently deleted.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={cancelDeleteSession}
                disabled={deletingSession}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSession}
                disabled={deletingSession}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deletingSession ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4" />
                    Delete Session
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MyClasses
