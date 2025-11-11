import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid'
import ClassCard from '../../components/ClassCard'
import ClassCardSkeleton from '../../components/ClassCardSkeleton'
import LazyImage from '../../components/LazyImage'
import { getPrefetchedClasses } from '../../services/dataPrefetchService'
import { API_BASE_URL } from '../../utils/api'
import deanCacheService from '../../services/deanCacheService'
import { safeSetItem, safeGetItem, minimizeClassData, minimizeStudentData, createCacheGetter, createCacheSetter } from '../../utils/cacheUtils'

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
  
  // Class selection and students
  const [selectedClass, setSelectedClass] = useState(null)
  const [students, setStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  // Selected student stats
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [studentStats, setStudentStats] = useState({ gradePercent: null, attendancePercent: null, gradedAssessments: 0, totalAssessments: 0 })
  const [loadingStats, setLoadingStats] = useState(false)
  const statsCacheRef = useRef(new Map()) // key: `${sectionId}:${studentId}` -> stats

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

  // Handle class selection - lazy load students ONLY when class is clicked
  const handleClassSelect = useCallback(async (classItem) => {
    setSelectedClass(classItem)
    setSelectedStudentId(null)
    setStudentStats({ gradePercent: null, attendancePercent: null, gradedAssessments: 0, totalAssessments: 0 })
    
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
    
    try {
      console.log(`🔄 [DEAN MYCLASSES] Fetching students for class ${sectionId}...`)
      // Include photos for student avatars
      const response = await fetch(`${API_BASE_URL}/section-courses/${sectionId}/students?includePhotos=true`, {
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
      setStudents(studentsData)
      
      // Store minimized data in sessionStorage for instant next load
      // Always update sessionStorage with minimized data when we get fresh data
      safeSetItem(sessionCacheKey, studentsData, minimizeStudentData)
      
      // Store full data in enhanced cache (includes photos)
      setCachedData('students', studentsCacheKey, studentsData)
      
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
  }, [enrichStudentsWithPhotos])

  // Fetch stats for a specific student in the selected class
  const fetchStudentStats = useCallback(async (sectionId, studentId) => {
    if (!sectionId || !studentId) return
    const cacheKey = `${sectionId}:${studentId}`
    const cached = statsCacheRef.current.get(cacheKey)
    if (cached) {
      setStudentStats(cached)
      return
    }
    setLoadingStats(true)
    try {
      // Fetch attendance stats for the class
      const [attendanceRes, gradesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/attendance/stats/${sectionId}`, {
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE_URL}/grading/class/${sectionId}/student-grades`, {
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
        })
      ])

      let attendancePercent = null
      if (attendanceRes.ok) {
        const attendanceJson = await attendanceRes.json().catch(() => null)
        const list = attendanceJson?.data || attendanceJson || []
        const found = Array.isArray(list) ? list.find(s => String(s.student_id) === String(studentId)) : null
        attendancePercent = found?.attendance_percentage !== undefined ? Number(found.attendance_percentage) : null
      }

      let gradePercent = null
      let gradedAssessments = 0
      let totalAssessments = 0
      if (gradesRes.ok) {
        const gradesList = await gradesRes.json().catch(() => [])
        const found = Array.isArray(gradesList) ? gradesList.find(s => String(s.student_id) === String(studentId)) : null
        gradePercent = found?.total_grade !== undefined && found?.total_grade !== null ? Number(found.total_grade) : null
        gradedAssessments = found?.graded_assessments || 0
        totalAssessments = found?.total_assessments || 0
      }

      const stats = { gradePercent, attendancePercent, gradedAssessments, totalAssessments }
      setStudentStats(stats)
      statsCacheRef.current.set(cacheKey, stats)
    } catch (e) {
      // Keep UI graceful on errors
      console.error('❌ [DEAN MYCLASSES] Error fetching student stats:', e)
    } finally {
      setLoadingStats(false)
    }
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
                        onAttendance={() => {}}
                        onAssessments={() => {}}
                        onMore={() => {}}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Section - Class Details and Students */}
            <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-h-[120px] overflow-auto">
              {selectedClass ? (
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

                  {/* Selected Student Statistics */}
                  {selectedStudentId && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">Student Statistics</span>
                        {loadingStats && <span className="text-xs text-gray-500">Loading...</span>}
                      </div>
                      {/* Grade Progress */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">Total Grade</span>
                          <span className="text-xs font-medium text-gray-900">{studentStats.gradePercent ?? '—'}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.max(0, Math.min(100, Number(studentStats.gradePercent || 0)))}%` }}
                          />
                        </div>
                        {studentStats.totalAssessments > 0 && (
                          <div className="mt-1 text-[11px] text-gray-500">
                            {studentStats.gradedAssessments}/{studentStats.totalAssessments} assessments graded
                          </div>
                        )}
                      </div>
                      {/* Attendance Progress */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">Attendance</span>
                          <span className="text-xs font-medium text-gray-900">{studentStats.attendancePercent ?? '—'}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.max(0, Math.min(100, Number(studentStats.attendancePercent || 0)))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Students List */}
                  <div className="flex-1 min-h-0">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-medium text-gray-900">Enrolled Students</h4>
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {students.length} student{students.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    {loadingStudents ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                        <span className="ml-2 text-sm text-gray-600">Loading students...</span>
                      </div>
                    ) : students.length > 0 ? (
                      <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                        {students.map((student) => (
                          <div 
                            key={student.student_id} 
                            className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedStudentId === student.student_id ? 'bg-red-50 ring-1 ring-red-200' : 'bg-gray-50 hover:bg-gray-100'}`}
                            onClick={() => {
                              setSelectedStudentId(student.student_id)
                              fetchStudentStats(selectedClass?.id, student.student_id)
                            }}
                          >
                            <div className="flex-shrink-0">
                              <LazyImage
                                src={student.student_photo}
                                alt={student.full_name}
                                size="md"
                                shape="circle"
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
    </>
  )
}

export default MyClasses
