import React, { useState, useEffect } from 'react'
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
        if (data.length > 0) {
          setSelectedAssessment(data[0]) // Select the first assessment by default
        }
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

  if (loading && !classes.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading grade management...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Grade Management</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md mb-6">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Class Selection */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <label htmlFor="class-select" className="block text-lg font-medium text-gray-700 mb-3">
              <AcademicCapIcon className="h-6 w-6 inline-block mr-2 text-blue-600" />
              Select Class:
            </label>
            <select
              id="class-select"
              className="w-full p-3 rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              value={selectedClass ? selectedClass.section_course_id : ''}
              onChange={(e) => setSelectedClass(classes.find(c => c.section_course_id === parseInt(e.target.value)))}
            >
              <option value="">-- Select a Class --</option>
              {classes.map((cls) => (
                <option key={cls.section_course_id} value={cls.section_course_id}>
                  {cls.course_title} - {cls.section_code}
                </option>
              ))}
            </select>
          </div>

          {/* Assessment Selection */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <label htmlFor="assessment-select" className="block text-lg font-medium text-gray-700 mb-3">
              <ClipboardDocumentCheckIcon className="h-6 w-6 inline-block mr-2 text-blue-600" />
              Select Assessment:
            </label>
            <select
              id="assessment-select"
              className="w-full p-3 rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              value={selectedAssessment ? selectedAssessment.assessment_id : ''}
              onChange={(e) => setSelectedAssessment(assessments.find(a => a.assessment_id === parseInt(e.target.value)))}
              disabled={!selectedClass || assessments.length === 0}
            >
              <option value="">-- Select an Assessment --</option>
              {assessments.map((assessment) => (
                <option key={assessment.assessment_id} value={assessment.assessment_id}>
                  {assessment.title} ({assessment.type}) - {assessment.total_points} pts
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedAssessment && (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-3xl font-semibold mb-6 text-gray-900 flex items-center">
              <DocumentTextIcon className="h-7 w-7 inline-block mr-3 text-blue-600" />
              Grades for: {selectedAssessment.title}
              <span className="ml-4 text-xl text-gray-600">({selectedAssessment.total_points} Total Points)</span>
            </h2>

            {Object.keys(grades).length === 0 && !loading && (
              <p className="text-gray-500 text-center py-8">No students or grades found for this assessment yet.</p>
            )}

            {Object.keys(grades).length > 0 && (
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full bg-white rounded-lg overflow-hidden border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Student Name</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Raw Score</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Late Penalty</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Adjusted Score</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Percentage</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Object.entries(grades).map(([enrollmentId, gradeData]) => (
                      <tr key={enrollmentId} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="py-3 px-4 whitespace-nowrap text-gray-900">
                          {gradeData.student_name || 'Student'}
                          <span className="block text-xs text-gray-500">ID: {gradeData.student_id || enrollmentId}</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={gradeData.raw_score || ''}
                            onChange={(e) => handleGradeChange(enrollmentId, 'raw_score', e.target.value)}
                            className="w-24 p-2 rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                            min="0"
                            max={selectedAssessment.total_points}
                          />
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={gradeData.late_penalty || ''}
                            onChange={(e) => handleGradeChange(enrollmentId, 'late_penalty', e.target.value)}
                            className="w-24 p-2 rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                            min="0"
                          />
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-gray-900 font-medium">
                          {calculateAdjustedScore(gradeData.raw_score, gradeData.late_penalty, selectedAssessment.total_points)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-gray-900 font-medium">
                          {calculatePercentage(
                            calculateAdjustedScore(gradeData.raw_score, gradeData.late_penalty, selectedAssessment.total_points),
                            selectedAssessment.total_points
                          )}%
                        </td>
                        <td className="py-3 px-4">
                          <textarea
                            value={gradeData.feedback || ''}
                            onChange={(e) => handleGradeChange(enrollmentId, 'feedback', e.target.value)}
                            className="w-full p-2 rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500 resize-y"
                            rows="2"
                            placeholder="Add feedback..."
                          ></textarea>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              onClick={handleSubmitGrades}
              disabled={isSubmitting || !selectedAssessment || Object.keys(grades).length === 0}
              className={`w-full py-3 px-6 rounded-md text-lg font-semibold transition-colors duration-300
                ${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-white`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" /> Submitting Grades...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <CheckIcon className="h-5 w-5 mr-2" /> Submit All Grades
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Grades
