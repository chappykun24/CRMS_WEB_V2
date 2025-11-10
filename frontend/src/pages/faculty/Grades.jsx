import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/UnifiedAuthContext'
import { MagnifyingGlassIcon, UserGroupIcon } from '@heroicons/react/24/solid'
import { safeSetItem, safeGetItem, minimizeClassData, minimizeStudentData } from '../../utils/cacheUtils'
import LazyImage from '../../components/LazyImage'
import imageLoaderService from '../../services/imageLoaderService'

const Grades = () => {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [studentGrades, setStudentGrades] = useState({}) // Map of enrollment_id to total grade
  const [assessmentScores, setAssessmentScores] = useState({}) // Map of enrollment_id to array of assessment scores
  const [assessments, setAssessments] = useState([]) // List of all assessments for the class
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingGrades, setLoadingGrades] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [imagesReady, setImagesReady] = useState(false) // Controls when images start loading

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
      setAssessments([])
      setAssessmentScores({})
      return
    }
    
    // Check cache first for instant display
    const sectionId = selectedClass.section_course_id
    const studentsCacheKey = `students_${sectionId}`
    const gradesCacheKey = `grades_${sectionId}`
    const scoresCacheKey = `assessment_scores_${sectionId}`
    
    const cachedStudents = safeGetItem(studentsCacheKey)
    const cachedGrades = safeGetItem(gradesCacheKey)
    const cachedScores = safeGetItem(scoresCacheKey)
    
    // Reset images ready state when class changes
    setImagesReady(false)
    
    // Show cached data immediately if available
    if (cachedStudents) {
      const studentsList = Array.isArray(cachedStudents) ? cachedStudents : []
      setStudents(studentsList)
      // Delay image loading - show names and grades first, then load images
      setTimeout(() => {
        setImagesReady(true)
        const imagesToLoad = studentsList
          .filter(s => s.student_photo)
          .map(s => ({ src: s.student_photo, id: `student_${s.student_id}` }))
        if (imagesToLoad.length > 0) {
          // Load images with lazy loading (not immediate)
          imageLoaderService.queueImages(imagesToLoad, false)
        }
      }, 300) // Small delay to ensure names/grades render first
    }
    
    if (cachedGrades) {
      setStudentGrades(cachedGrades)
    }
    
    if (cachedScores) {
      setAssessmentScores(cachedScores.scores || {})
      setAssessments(cachedScores.assessments || [])
    }
    
    // Fetch fresh data in background (non-blocking if cache exists)
    loadSectionData(sectionId, studentsCacheKey, gradesCacheKey, scoresCacheKey, !cachedStudents || !cachedGrades || !cachedScores)
  }, [selectedClass])

  // Load all data for a specific section (lazy load on class selection)
  const loadSectionData = async (sectionCourseId, studentsCacheKey, gradesCacheKey, scoresCacheKey, showLoading = true) => {
    if (!sectionCourseId) return
    
    try {
      if (showLoading) {
        setLoadingStudents(true)
        setLoadingGrades(true)
      }
      
      // Fetch students, grades, and assessment scores in parallel
      const [studentsResponse, gradesResponse, scoresResponse] = await Promise.all([
        fetch(`/api/section-courses/${sectionCourseId}/students`),
        fetch(`/api/grading/class/${sectionCourseId}/student-grades`),
        fetch(`/api/grading/class/${sectionCourseId}/assessment-scores`)
      ])
      
      // Process students - Load essential data first, images later
      if (studentsResponse.ok) {
        let studentsData
        try {
          const text = await studentsResponse.text()
          studentsData = JSON.parse(text)
        } catch (parseError) {
          console.error('Error parsing students JSON:', parseError)
          if (showLoading) {
            setError('Failed to parse students data. The response may be corrupted.')
            setStudents([])
          }
          studentsData = [] // Set to empty array on parse error
        }
        const studentsList = Array.isArray(studentsData) ? studentsData : []
        // Set students first (names and data) - this renders immediately
        setStudents(studentsList)
        // Cache minimized data for next time (excludes photos)
        safeSetItem(studentsCacheKey, studentsList, minimizeStudentData)
        
        // Delay image loading - show names and grades first, then load images asynchronously
        setTimeout(() => {
          setImagesReady(true) // Enable image loading in UI after essential data is displayed
          const imagesToLoad = studentsList
            .filter(s => s.student_photo)
            .map(s => ({ src: s.student_photo, id: `student_${s.student_id}` }))
          // Load images with lazy loading (not immediate) - images load last
          imageLoaderService.queueImages(imagesToLoad, false)
        }, 300) // Small delay to ensure names/grades render first
      } else {
        console.error('Failed to load students')
        if (showLoading) setStudents([])
      }
      
      // Process grades
      if (gradesResponse.ok) {
        let gradesData
        try {
          const text = await gradesResponse.text()
          gradesData = JSON.parse(text)
        } catch (parseError) {
          console.error('Error parsing grades JSON:', parseError)
          if (showLoading) {
            setError('Failed to parse grades data. The response may be corrupted.')
            setStudentGrades({})
          }
          gradesData = [] // Set to empty array on parse error
        }
        if (gradesData && Array.isArray(gradesData)) {
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
        }
      } else {
        console.error('Failed to load student grades')
        if (showLoading) setStudentGrades({})
      }
      
      // Process assessment scores
      if (scoresResponse.ok) {
        let scoresData
        try {
          const text = await scoresResponse.text()
          scoresData = JSON.parse(text)
        } catch (parseError) {
          console.error('Error parsing assessment scores JSON:', parseError)
          if (showLoading) {
            setError('Failed to parse assessment scores. The response may be corrupted.')
            setAssessments([])
            setAssessmentScores({})
          }
          scoresData = [] // Set to empty array on parse error
        }
        
        if (scoresData && Array.isArray(scoresData)) {
          // Extract unique assessments
          const assessmentsMap = new Map()
          const scoresByStudent = {}
          
          scoresData.forEach(row => {
          // Collect assessments
          if (row.assessment_id && !assessmentsMap.has(row.assessment_id)) {
            assessmentsMap.set(row.assessment_id, {
              assessment_id: row.assessment_id,
              title: row.assessment_title,
              type: row.assessment_type,
              total_points: row.total_points,
              weight_percentage: row.weight_percentage,
              due_date: row.due_date
            })
          }
          
          // Collect scores by student
          if (!scoresByStudent[row.enrollment_id]) {
            scoresByStudent[row.enrollment_id] = []
          }
          
          if (row.assessment_id) {
            scoresByStudent[row.enrollment_id].push({
              assessment_id: row.assessment_id,
              total_score: row.total_score,
              raw_score: row.raw_score,
              adjusted_score: row.adjusted_score,
              late_penalty: row.late_penalty,
              submission_status: row.submission_status
            })
          }
        })
        
          setAssessments(Array.from(assessmentsMap.values()).sort((a, b) => 
            new Date(a.due_date || 0) - new Date(b.due_date || 0)
          ))
          setAssessmentScores(scoresByStudent)
          
          // Cache assessment scores
          safeSetItem(scoresCacheKey, {
            assessments: Array.from(assessmentsMap.values()),
            scores: scoresByStudent
          })
        }
      } else {
        console.error('Failed to load assessment scores')
        if (showLoading) {
          setAssessments([])
          setAssessmentScores({})
        }
      }
    } catch (error) {
      console.error('Error loading section data:', error)
      if (showLoading) {
        if (error.message && error.message.includes('JSON')) {
          setError('Failed to parse server response. Please try again.')
        } else if (error.message && error.message.includes('fetch') || error.message && error.message.includes('Network')) {
          setError('Network error. Please check your connection and try again.')
        } else {
          setError('Failed to load section data')
        }
        setStudents([])
        setStudentGrades({})
        setAssessments([])
        setAssessmentScores({})
      }
    } finally {
      if (showLoading) {
        setLoadingStudents(false)
        setLoadingGrades(false)
    }
  }
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

  // Filter and sort students alphabetically by last name
  const filteredStudents = students
    .filter(student =>
    student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.student_number?.toLowerCase().includes(searchQuery.toLowerCase())
  )
    .sort((a, b) => {
      const aLast = extractSurname(a.full_name)
      const bLast = extractSurname(b.full_name)
      if (aLast === bLast) {
        // If last names are the same, sort by full name
        return (a.full_name || '').localeCompare(b.full_name || '')
      }
      return aLast.localeCompare(bLast)
    })

  return (
    <div className="h-full w-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
        <div className="px-8">
          <div className="flex items-center justify-between bg-gray-50">
            <div className="py-2 px-4 font-medium text-sm text-red-600 border-b-2 border-red-600">
              Grade Management
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-8 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
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
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-hidden px-8 pb-6">
          <div className="h-full grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Main Content - Students List */}
              <div className="lg:col-span-3 flex flex-col h-full">
                {/* Students Grades Table */}
                {selectedClass ? (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300 flex flex-col h-full">
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
                      <div className="flex-1 overflow-y-auto min-h-0">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0 z-30">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-40 border-r border-gray-200">
                                #
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-12 bg-gray-50 z-40 border-r border-gray-200 min-w-[200px]">
                                Student
                              </th>
                              {assessments.map((assessment) => (
                                <th 
                                  key={assessment.assessment_id} 
                                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]"
                                  title={`${assessment.title} (${assessment.total_points} pts, ${assessment.weight_percentage}%)`}
                                >
                                  <div className="flex flex-col">
                                    <span className="truncate">{assessment.title}</span>
                                    <span className="text-xs text-gray-400 font-normal">
                                      {assessment.total_points}pts
                              </span>
                            </div>
                                </th>
                              ))}
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-40 border-l border-gray-200 min-w-[100px]">
                                Total Grade
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredStudents.map((student, index) => {
                              const studentScores = assessmentScores[student.enrollment_id] || []
                              const scoreMap = new Map()
                              studentScores.forEach(score => {
                                scoreMap.set(score.assessment_id, score)
                              })
                              
                              return (
                                <tr key={student.enrollment_id} className="hover:bg-gray-50 bg-white">
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 sticky left-0 bg-white z-30 border-r border-gray-100">
                                    {index + 1}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap sticky left-12 bg-white z-30 border-r border-gray-100">
                                    <div className="flex items-center space-x-3">
                                      <LazyImage
                                        src={student.student_photo} 
                                        alt={student.full_name}
                                        size="md"
                                        shape="circle"
                                        className="border border-gray-200"
                                        delayLoad={!imagesReady}
                                        priority={false}
                                      />
                                      <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                          {formatName(student.full_name)}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                          {student.student_number || 'N/A'}
                              </p>
                            </div>
                          </div>
                                  </td>
                                  {assessments.map((assessment) => {
                                    const score = scoreMap.get(assessment.assessment_id)
                                    const percentage = score && assessment.total_points > 0 
                                      ? ((score.total_score || 0) / assessment.total_points * 100).toFixed(1)
                                      : null
                                    
                                    return (
                                      <td 
                                        key={assessment.assessment_id} 
                                        className="px-4 py-3 whitespace-nowrap text-center text-sm"
                                      >
                                        {score && score.total_score !== null ? (
                                          <div className="flex flex-col items-center">
                                            <span className="font-semibold text-gray-900">
                                              {score.total_score}/{assessment.total_points}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                              {percentage}%
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-gray-400 text-xs">-</span>
                                        )}
                                      </td>
                                    )
                                  })}
                                  <td className="px-4 py-3 whitespace-nowrap text-center sticky right-0 bg-white z-30 border-l border-gray-100">
                                    {loadingGrades ? (
                                      <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mx-auto"></div>
                                    ) : studentGrades[student.enrollment_id] ? (
                                      <div className="flex flex-col items-center">
                                        <span className="text-sm font-semibold text-gray-900">
                                          {studentGrades[student.enrollment_id].total_grade !== null 
                                            ? `${parseFloat(studentGrades[student.enrollment_id].total_grade).toFixed(2)}%`
                                            : 'N/A'}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {studentGrades[student.enrollment_id].graded_assessments || 0}/{studentGrades[student.enrollment_id].total_assessments || 0}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400">N/A</span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
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
              <div className="lg:col-span-1 flex flex-col h-full">
                <div className="bg-white rounded-lg shadow-sm border border-gray-300 flex flex-col h-full">
                  <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                    <h3 className="text-sm font-medium text-gray-900">Classes</h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto min-h-0">
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
  )
}

export default Grades