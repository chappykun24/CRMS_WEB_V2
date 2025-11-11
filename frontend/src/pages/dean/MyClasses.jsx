import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid'
import ClassCard from '../../components/ClassCard'
import ClassCardSkeleton from '../../components/ClassCardSkeleton'
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

  // Fetch classes with caching
  const fetchClasses = useCallback(async () => {
    console.log('🔍 [DEAN MYCLASSES] fetchClasses starting')
    setError(null)
    
    // Check sessionStorage first for instant display
    const sessionCacheKey = 'dean_classes_session'
    const sessionCached = safeGetItem(sessionCacheKey)
    
    if (sessionCached) {
      console.log('📦 [DEAN MYCLASSES] Using session cached classes data')
      const formattedClasses = sessionCached.map(item => ({
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
      setLoadingClasses(false)
      // Continue to fetch fresh data in background
    } else {
      setLoadingClasses(true)
    }
    
    // Check enhanced cache
    const cacheKey = 'dean_classes'
    const cachedData = getCachedData('classes', cacheKey, 5 * 60 * 1000) // 5 minute cache
    if (cachedData && !sessionCached) {
      console.log('📦 [DEAN MYCLASSES] Using enhanced cached classes data')
      const formattedClasses = cachedData.map(item => ({
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
      setLoadingClasses(false)
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
      const formattedClasses = classesData.map(item => ({
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
      
      // Store minimized data in sessionStorage for instant next load
      if (!sessionCached) {
        safeSetItem(sessionCacheKey, classesData, minimizeClassData)
      }
      
      // Store full data in enhanced cache
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

  // Handle class selection - lazy load students ONLY when class is clicked
  const handleClassSelect = useCallback(async (classItem) => {
    setSelectedClass(classItem)
    
    // Check sessionStorage first for instant display
    const sectionId = classItem.id
    const sessionCacheKey = `dean_students_${sectionId}_session`
    const sessionCached = safeGetItem(sessionCacheKey)
    
    if (sessionCached) {
      console.log('📦 [DEAN MYCLASSES] Using session cached students data')
      setStudents(sessionCached)
      // Continue to fetch fresh data in background
    }
    
    // Check enhanced cache
    const studentsCacheKey = `dean_students_${sectionId}`
    const cachedStudents = getCachedData('students', studentsCacheKey, 10 * 60 * 1000) // 10 minute cache
    
    if (cachedStudents && !sessionCached) {
      console.log('📦 [DEAN MYCLASSES] Using enhanced cached students data')
      setStudents(cachedStudents)
      // Cache minimized data in sessionStorage for next time
      safeSetItem(sessionCacheKey, cachedStudents, minimizeStudentData)
      // Continue to fetch fresh data in background
    }
    
    // Only show loading if no cache available
    if (!sessionCached && !cachedStudents) {
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
      const response = await fetch(`/api/section-courses/${sectionId}/students`, {
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
      if (!sessionCached) {
        safeSetItem(sessionCacheKey, studentsData, minimizeStudentData)
      }
      
      // Store full data in enhanced cache
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
      }
    } finally {
      setLoadingStudents(false)
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
  }, [fetchClasses])

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
                          <div key={student.student_id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
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
