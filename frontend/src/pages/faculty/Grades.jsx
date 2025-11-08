import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/UnifiedAuthContext'
import { MagnifyingGlassIcon, UserGroupIcon } from '@heroicons/react/24/solid'
import { safeSetItem, safeGetItem, minimizeClassData, minimizeStudentData } from '../../utils/cacheUtils'
import { ImageSkeleton } from '../../components/skeletons'

const Grades = () => {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [studentGrades, setStudentGrades] = useState({}) // Map of enrollment_id to total grade
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingGrades, setLoadingGrades] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')

  // Load faculty classes - FAST initial load, show immediately
  useEffect(() => {
    const loadClasses = async () => {
      if (!user?.user_id) return
      
      // Show classes immediately if we have cached data
      const cacheKey = `classes_${user.user_id}`
      const cached = safeGetItem(cacheKey)
      if (cached) {
        setClasses(Array.isArray(cached) ? cached : [])
        setLoading(false) // Show cached data immediately
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
  }, [user])

  // Load section-specific data ONLY when class is selected (lazy loading)
  useEffect(() => {
    if (!selectedClass) {
      // Clear data when no class is selected
      setStudents([])
      setStudentGrades({})
      return
    }
    
    // Check cache first for instant display
    const sectionId = selectedClass.section_course_id
    const studentsCacheKey = `students_${sectionId}`
    const gradesCacheKey = `grades_${sectionId}`
    
    const cachedStudents = safeGetItem(studentsCacheKey)
    const cachedGrades = safeGetItem(gradesCacheKey)
    
    // Show cached data immediately if available
    if (cachedStudents) {
      setStudents(Array.isArray(cachedStudents) ? cachedStudents : [])
    }
    
    if (cachedGrades) {
      setStudentGrades(cachedGrades)
    }
    
    // Fetch fresh data in background (non-blocking if cache exists)
    loadSectionData(sectionId, studentsCacheKey, gradesCacheKey, !cachedStudents || !cachedGrades)
  }, [selectedClass])

  // Load all data for a specific section (lazy load on class selection)
  const loadSectionData = async (sectionCourseId, studentsCacheKey, gradesCacheKey, showLoading = true) => {
    if (!sectionCourseId) return
    
    try {
      if (showLoading) {
        setLoadingStudents(true)
        setLoadingGrades(true)
      }
      
      // Fetch students and grades in parallel for the selected section only
      const [studentsResponse, gradesResponse] = await Promise.all([
        fetch(`/api/section-courses/${sectionCourseId}/students`),
        fetch(`/api/grading/class/${sectionCourseId}/student-grades`)
      ])
      
      // Process students
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json()
        const studentsList = Array.isArray(studentsData) ? studentsData : []
        setStudents(studentsList)
        // Cache minimized data for next time (excludes photos)
        safeSetItem(studentsCacheKey, studentsList, minimizeStudentData)
      } else {
        console.error('Failed to load students')
        if (showLoading) setStudents([])
      }
      
      // Process grades
      if (gradesResponse.ok) {
        const gradesData = await gradesResponse.json()
        const gradesMap = {}
        gradesData.forEach(item => {
          gradesMap[item.enrollment_id] = {
            total_grade: item.total_grade,
            total_assessments: item.total_assessments,
            graded_assessments: item.graded_assessments
          }
        })
        setStudentGrades(gradesMap)
        // Cache for next time (grades are small, no need to minimize)
        safeSetItem(gradesCacheKey, gradesMap)
      } else {
        console.error('Failed to load student grades')
        if (showLoading) setStudentGrades({})
      }
    } catch (error) {
      console.error('Error loading section data:', error)
      if (showLoading) {
        setError('Failed to load section data')
        setStudents([])
        setStudentGrades({})
      }
    } finally {
      if (showLoading) {
        setLoadingStudents(false)
        setLoadingGrades(false)
      }
    }
  }

  const filteredStudents = students.filter(student =>
    student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.student_number?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="absolute top-16 bottom-0 bg-gray-50 rounded-tl-3xl overflow-hidden transition-all duration-500 ease-in-out left-64 right-0" style={{ marginTop: '0px' }}>
      <div className="w-full pr-2 pl-2 transition-all duration-500 ease-in-out" style={{ marginTop: '0px' }}>
        {/* Header */}
        <div className="absolute top-0 right-0 z-40 bg-gray-50 transition-all duration-500 ease-in-out left-0">
          <div className="px-8 bg-gray-50">
            <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200">
              <div className="py-2 px-4 font-medium text-sm text-red-600 border-b-2 border-red-600">
                Grade Management
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="pt-16 pb-6 transition-all duration-500 ease-in-out" style={{ height: 'calc(100vh - 80px)' }}>
          <div className="px-8 h-full">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-full">
              {/* Main Content - Students List */}
              <div className="lg:col-span-3">
                {/* Search Bar */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="relative flex-1">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Search students..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500" 
                      />
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}

                {/* Students List */}
                {selectedClass ? (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300">
                    {loading || loadingStudents ? (
                      <div className="p-6">
                        <div className="space-y-3">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg animate-pulse">
                              <div className="flex-shrink-0 w-6 text-center">
                                <div className="h-3 bg-gray-200 rounded w-4 mx-auto"></div>
                              </div>
                              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                              <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
                                <div className="h-3 bg-gray-100 rounded w-32"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : filteredStudents.length > 0 ? (
                      <div className="space-y-3">
                        {filteredStudents.map((student, index) => (
                          <div key={student.enrollment_id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-shrink-0 w-6 text-center">
                              <span className="text-xs font-medium text-gray-500">
                                {index + 1}
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
                                {student.full_name || 'Unknown Student'}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                SR Code: {student.student_number || 'N/A'}
                              </p>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              {loadingGrades ? (
                                <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
                              ) : studentGrades[student.enrollment_id] ? (
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-gray-900">
                                    {studentGrades[student.enrollment_id].total_grade !== null 
                                      ? `${parseFloat(studentGrades[student.enrollment_id].total_grade).toFixed(2)}%`
                                      : 'N/A'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {studentGrades[student.enrollment_id].graded_assessments || 0} / {studentGrades[student.enrollment_id].total_assessments || 0} graded
                                  </p>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400">No grades</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        <UserGroupIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
                        <p className="text-gray-500">
                          {searchQuery ? 'No students match your search.' : 'No students enrolled in this class.'}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-300 flex items-center justify-center py-16">
                    <div className="text-center">
                      <UserGroupIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Class</h3>
                      <p className="text-gray-500">Choose a class from the sidebar to view its students.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Sidebar - Classes */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm border border-gray-300 h-full flex flex-col">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900">Classes</h3>
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                    {loading ? (
                      <div className="p-4 space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="p-3 rounded-lg border border-gray-200 animate-pulse">
                            <div className="flex items-center">
                              <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-3/4 skeleton mb-1"></div>
                                <div className="h-3 bg-gray-100 rounded w-1/2 skeleton"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : classes.length > 0 ? (
                      <div className="p-4 space-y-2 overflow-y-auto h-full">
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
                          <UserGroupIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
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
        </div>
      </div>
    </div>
  )
}

export default Grades