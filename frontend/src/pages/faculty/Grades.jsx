import React, { useState, useEffect } from 'react'
import defaultAvatar from '../../images/bsu-logo.png'

// Normalize possible image paths coming from backend
const normalizeImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  if (url.startsWith('data:')) return url
  return url
}
import { useAuth } from '../../contexts/UnifiedAuthContext'
import { 
  MagnifyingGlassIcon, 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon, 
  ArrowPathIcon,
  AcademicCapIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/solid'

const Grades = () => {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [selectedAssessment, setSelectedAssessment] = useState(null)
  const [grades, setGrades] = useState({}) // { enrollment_id: { raw_score, late_penalty, feedback } }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (user?.user_id) {
      fetchClasses()
    }
  }, [user])

  useEffect(() => {
    if (selectedClass) {
      fetchAssessments(selectedClass.section_course_id)
    } else {
      setAssessments([])
      setSelectedAssessment(null)
      setGrades({})
    }
  }, [selectedClass])

  useEffect(() => {
    if (selectedAssessment) {
      fetchGradesForAssessment(selectedAssessment.assessment_id)
    } else {
      setGrades({})
    }
  }, [selectedAssessment])

  const fetchClasses = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/section-courses/faculty/${user.user_id}`)
      if (response.ok) {
        const data = await response.json()
        setClasses(Array.isArray(data) ? data : [])
        if (data.length > 0) {
          setSelectedClass(data[0]) // Select the first class by default
        }
      }
    } catch (err) {
      setError('Failed to fetch classes.')
      console.error('Error fetching classes:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAssessments = async (sectionCourseId) => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/assessments/class/${sectionCourseId}`)
      if (response.ok) {
        const data = await response.json()
        setAssessments(Array.isArray(data) ? data : [])
        // Do not auto-select an assessment; wait for user to choose
        setSelectedAssessment(null)
        setGrades({})
      }
    } catch (err) {
      setError('Failed to fetch assessments.')
      console.error('Error fetching assessments:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchGradesForAssessment = async (assessmentId) => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/grading/assessment/${assessmentId}/grades`)
      if (response.ok) {
        const data = await response.json()
        const initialGrades = {}
        data.forEach(grade => {
          initialGrades[grade.enrollment_id] = {
            raw_score: grade.raw_score || '',
            late_penalty: grade.late_penalty || 0,
            feedback: grade.feedback || '',
            grade_id: grade.submission_id, // Keep submission_id for updates
            // Student info (if API provides). Fallbacks keep UI usable.
            student_name: grade.student_name || grade.full_name || 'Student',
            student_id: grade.student_id || grade.student_number || grade.enrollment_id,
            sr_code: grade.sr_code || grade.student_number || grade.student_id || '',
            profile_image_url: normalizeImageUrl(grade.student_photo || grade.profile_image_url || grade.photo_url || '')
          }
        })
        setGrades(initialGrades)
      }
    } catch (err) {
      setError('Failed to fetch grades for this assessment.')
      console.error('Error fetching grades:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGradeChange = (enrollmentId, field, value) => {
    setGrades(prevGrades => ({
      ...prevGrades,
      [enrollmentId]: {
        ...prevGrades[enrollmentId],
        [field]: value
      }
    }))
  }

  const handleSubmitGrades = async () => {
    setIsSubmitting(true)
    setError('')
    setSuccessMessage('')
    try {
      const gradesToSubmit = Object.entries(grades).map(([enrollment_id, gradeData]) => ({
        enrollment_id: parseInt(enrollment_id),
        raw_score: parseFloat(gradeData.raw_score) || 0,
        late_penalty: parseFloat(gradeData.late_penalty) || 0,
        feedback: gradeData.feedback || '',
        graded_by: user.user_id
      }))

      const response = await fetch('/api/grading/submit-grades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          assessment_id: selectedAssessment.assessment_id,
          grades: gradesToSubmit
        })
      })

      if (response.ok) {
        setSuccessMessage('Grades submitted successfully!')
        // Re-fetch grades to ensure UI is updated
        fetchGradesForAssessment(selectedAssessment.assessment_id)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to submit grades.')
      }
    } catch (err) {
      setError('Failed to submit grades. Please try again.')
      console.error('Error submitting grades:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const calculateAdjustedScore = (rawScore, latePenalty, totalPoints) => {
    if (isNaN(rawScore) || isNaN(totalPoints) || totalPoints === 0) return 'N/A'
    const score = parseFloat(rawScore) - parseFloat(latePenalty || 0)
    return Math.max(0, score) // Score cannot be negative
  }

  const calculatePercentage = (adjustedScore, totalPoints) => {
    if (isNaN(adjustedScore) || isNaN(totalPoints) || totalPoints === 0) return 'N/A'
    return ((adjustedScore / totalPoints) * 100).toFixed(2)
  }

  // Initial app skeleton removed per request; keep only in-list skeleton later
  if (false && loading && !classes.length) {
    return (
      <div className="absolute top-16 bottom-0 bg-gray-50 rounded-tl-3xl overflow-hidden left-64 right-0" style={{ marginTop: '0px' }}>
        <div className="w-full pr-2 pl-2" style={{ marginTop: '0px' }}>
          <div className="pt-16 pb-6" style={{ height: 'calc(100vh - 80px)' }}>
            <div className="px-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
                <div className="h-5 w-56 bg-gray-200 rounded mb-6" />
                <ul className="space-y-4">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <li key={idx} className="px-4 py-3 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gray-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-48 bg-gray-200 rounded" />
                          <div className="h-3 w-28 bg-gray-200 rounded" />
                        </div>
                        <div className="h-9 w-24 bg-gray-200 rounded" />
                        <div className="h-9 w-24 bg-gray-200 rounded" />
                        <div className="h-4 w-16 bg-gray-200 rounded" />
                        <div className="h-9 w-64 bg-gray-200 rounded" />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        input[type="text"], input[type="search"], select {
          border-color: #d1d5db !important;
          outline: none !important;
          box-shadow: none !important;
        }
        
        input[type="text"]:focus, input[type="search"]:focus, select:focus {
          border-color: #9ca3af !important;
          outline: none !important;
          box-shadow: none !important;
        }
        
        select {
          appearance: none !important;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e") !important;
          background-position: right 8px center !important;
          background-repeat: no-repeat !important;
          background-size: 16px !important;
          padding-right: 40px !important;
          cursor: pointer !important;
        }
      `}</style>
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
          <div className="pt-16 pb-28 transition-all duration-500 ease-in-out" style={{ height: 'calc(100vh - 80px)' }}>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 px-8 h-full">
              {/* Main Content */}
              <div className="lg:col-span-3 h-full">
                {/* Controls removed; selection handled in right sidebar */}
                <div className="mb-3" />

                {/* Error and Success Messages */}
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}
                {successMessage && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800">{successMessage}</p>
                  </div>
                )}

                {/* Selection UI in main panel until an assessment is selected */}
                {!selectedAssessment && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-2">Subjects</h3>
                        <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                          {classes.map((cls) => (
                            <button
                              key={cls.section_course_id}
                              onClick={() => setSelectedClass(cls)}
                              className={`text-left p-3 rounded-lg border transition-colors ${selectedClass && selectedClass.section_course_id === cls.section_course_id ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:bg-gray-50'}`}
                            >
                              <div className="text-sm font-medium text-gray-900 truncate">{cls.course_title}</div>
                              <div className="text-xs text-gray-500">{cls.section_code}</div>
                            </button>
                          ))}
                          {classes.length === 0 && (
                            <div className="text-xs text-gray-500 p-2">No subjects found.</div>
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-2">Assessments</h3>
                        {selectedClass ? (
                          <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto pl-1">
                            {assessments.map((assessment) => (
                              <button
                                key={assessment.assessment_id}
                                onClick={() => setSelectedAssessment(assessment)}
                                className={`text-left p-3 rounded-lg border transition-colors ${selectedAssessment && selectedAssessment.assessment_id === assessment.assessment_id ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:bg-gray-50'}`}
                              >
                                <div className="text-sm font-medium text-gray-900 truncate">{assessment.title}</div>
                                <div className="text-xs text-gray-500">{assessment.type} • {assessment.total_points} pts</div>
                              </button>
                            ))}
                            {assessments.length === 0 && (
                              <div className="text-xs text-gray-500 p-2">No assessments yet.</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 p-2">Select a subject to view assessments.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Grades Table */}
                {selectedAssessment && (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300">
                    <div className="px-6 py-3 border-b border-gray-200">
                      <h2 className="text-base font-medium text-gray-900">
                        Grades for: <span className="font-semibold">{selectedAssessment.title}</span>
                        <span className="ml-2 text-xs text-gray-500">({selectedAssessment.total_points} Total Points)</span>
                      </h2>
                    </div>

                    {Object.keys(grades).length === 0 && !loading ? (
                      <div className="flex-1 flex items-center justify-center py-16">
                        <div className="text-center">
                          <UserGroupIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
                          <p className="text-gray-500">No students or grades found for this assessment yet.</p>
                        </div>
                      </div>
                    ) : loading ? (
                      <div className="p-4">
                        <ul className="space-y-3">
                          {Array.from({ length: 8 }).map((_, idx) => (
                            <li key={idx} className="px-4 py-2">
                              <div className="flex items-center gap-3 animate-pulse">
                                <div className="h-9 w-9 rounded-full bg-gray-200" />
                                <div className="flex-1 space-y-2">
                                  <div className="h-3 w-40 bg-gray-200 rounded" />
                                  <div className="h-2 w-24 bg-gray-200 rounded" />
                                </div>
                                <div className="h-8 w-20 bg-gray-200 rounded" />
                                <div className="h-8 w-20 bg-gray-200 rounded" />
                                <div className="h-4 w-16 bg-gray-200 rounded" />
                                <div className="h-8 w-56 bg-gray-200 rounded" />
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : Object.keys(grades).length > 0 ? (
                      <div className="overflow-x-auto">
                        {/* Sticky header matching card layout widths */}
                        <div className="hidden md:flex items-center text-[10px] uppercase text-gray-500 tracking-wider bg-gray-50 px-4 py-2 rounded-t">
                          <div className="flex-1">Student</div>
                          <div className="w-20 text-left mr-2">Raw</div>
                          <div className="w-20 text-left mr-2">Penalty</div>
                          <div className="w-24 text-left mr-2">Adjusted</div>
                          <div className="w-16 text-left mr-2">%</div>
                          <div className="w-56 md:w-72">Feedback</div>
                        </div>
                        <div className="max-h-[50vh] overflow-y-auto pb-32">
                          <ul className="divide-y divide-gray-200">
                            {Object.entries(grades).map(([enrollmentId, gradeData]) => (
                              <li key={enrollmentId} className="px-4 py-2">
                                <div className="flex items-center gap-3">
                                  {/* Student info */}
                                  <div className="flex items-center flex-1 min-w-0">
                                    <img
                                      src={gradeData.profile_image_url || defaultAvatar}
                                      alt="Student"
                                      className="h-9 w-9 rounded-full object-cover bg-gray-100"
                                      onError={(e) => {
                                        e.currentTarget.onerror = null
                                        e.currentTarget.src = defaultAvatar
                                      }}
                                    />
                                    <div className="ml-3 truncate">
                                      <div className="text-[13px] font-medium text-gray-900 truncate">{gradeData.student_name || 'Student'}</div>
                                      <div className="text-[11px] text-gray-500 truncate">SR Code: {gradeData.sr_code || '-'}</div>
                                    </div>
                                  </div>

                                  {/* Controls */}
                                  <div className="w-20">
                                    <input
                                      type="number"
                                      value={gradeData.raw_score || ''}
                                      onChange={(e) => handleGradeChange(enrollmentId, 'raw_score', e.target.value)}
                                      className="w-20 px-2 py-1 rounded-md border border-gray-300 focus:ring-1 focus:ring-red-500 focus:border-red-500 text-sm"
                                      min="0"
                                      max={selectedAssessment.total_points}
                                    />
                                  </div>
                                  <div className="w-20">
                                    <input
                                      type="number"
                                      value={gradeData.late_penalty || ''}
                                      onChange={(e) => handleGradeChange(enrollmentId, 'late_penalty', e.target.value)}
                                      className="w-20 px-2 py-1 rounded-md border border-gray-300 focus:ring-1 focus:ring-red-500 focus:border-red-500 text-sm"
                                      min="0"
                                    />
                                  </div>
                                  <div className="w-24 text-sm font-medium text-gray-900">
                                    {calculateAdjustedScore(gradeData.raw_score, gradeData.late_penalty, selectedAssessment.total_points)}
                                  </div>
                                  <div className="w-16 text-sm font-medium text-gray-900">
                                    {calculatePercentage(
                                      calculateAdjustedScore(gradeData.raw_score, gradeData.late_penalty, selectedAssessment.total_points),
                                      selectedAssessment.total_points
                                    )}%
                                  </div>
                                  <div className="w-56 md:w-72">
                                    <input
                                      type="text"
                                      value={gradeData.feedback || ''}
                                      onChange={(e) => handleGradeChange(enrollmentId, 'feedback', e.target.value)}
                                      className="w-full px-2 py-1 rounded-md border border-gray-300 focus:ring-1 focus:ring-red-500 focus:border-red-500 text-sm"
                                      placeholder="Add feedback..."
                                    />
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : null}

                    {Object.keys(grades).length > 0 && (
                      <div className="px-6 py-3 border-t border-gray-200 sticky bottom-0 bg-white z-10 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] rounded-b-lg flex justify-end">
                        <button
                          onClick={handleSubmitGrades}
                          disabled={isSubmitting || !selectedAssessment || Object.keys(grades).length === 0}
                          className={`w-full sm:w-auto py-2 px-4 rounded-md text-sm font-medium transition-colors duration-300
                            ${isSubmitting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}
                            focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-white`}
                        >
                          {isSubmitting ? (
                            <span className="flex items-center justify-center">
                              <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" /> Submitting...
                            </span>
                          ) : (
                            <span className="flex items-center justify-center">
                              <CheckIcon className="h-4 w-4 mr-2" /> Submit Grades
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* No Assessment Selected */}
                {selectedClass && !selectedAssessment && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-300">
                    <div className="flex-1 flex items-center justify-center py-16">
                      <div className="text-center">
                        <ClipboardDocumentCheckIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Assessment</h3>
                        <p className="text-gray-500">Choose a class and assessment to start grading</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Sidebar: Subjects and Assessments */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-300 h-[calc(100vh-200px)] overflow-hidden">
                  <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Subjects column */}
                    <div className="overflow-y-auto pr-1">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Subjects</h3>
                      <div className="space-y-2">
                        {classes.map((cls) => (
                          <button
                            key={cls.section_course_id}
                            onClick={() => setSelectedClass(cls)}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedClass && selectedClass.section_course_id === cls.section_course_id ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:bg-gray-50'}`}
                          >
                            <div className="text-sm font-medium text-gray-900 truncate">{cls.course_title}</div>
                            <div className="text-xs text-gray-500">{cls.section_code}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Assessments column */}
                    <div className="overflow-y-auto pl-1">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Assessments</h4>
                      {selectedClass ? (
                        <div className="grid grid-cols-1 gap-2">
                          {assessments.map((assessment) => (
                            <button
                              key={assessment.assessment_id}
                              onClick={() => setSelectedAssessment(assessment)}
                              className={`text-left p-3 rounded-lg border transition-colors ${selectedAssessment && selectedAssessment.assessment_id === assessment.assessment_id ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:bg-gray-50'}`}
                            >
                              <div className="text-sm font-medium text-gray-900 truncate">{assessment.title}</div>
                              <div className="text-xs text-gray-500">{assessment.type} • {assessment.total_points} pts</div>
                            </button>
                          ))}
                          {assessments.length === 0 && (
                            <div className="text-xs text-gray-500 p-2">No assessments yet.</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 p-2">Select a subject to view assessments.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

export default Grades
