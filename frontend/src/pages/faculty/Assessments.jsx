import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/UnifiedAuthContext'
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid'

const Assessments = () => {
  const { user } = useAuth()
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClass, setSelectedClass] = useState(null)
  const [classes, setClasses] = useState([])
  
  // Tab navigation
  const [activeTab, setActiveTab] = useState('assessments')
  
  // Grading states
  const [selectedAssessment, setSelectedAssessment] = useState(null)
  const [grades, setGrades] = useState({})
  const [isSubmittingGrades, setIsSubmittingGrades] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'Quiz',
    category: 'Formative',
    total_points: 100,
    weight_percentage: 25,
    due_date: '',
    submission_deadline: '',
    grading_method: 'points',
    instructions: ''
  })

  // Load faculty classes
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const response = await fetch(`/api/section-courses/faculty/${user.user_id}`)
        if (response.ok) {
          const data = await response.json()
          setClasses(Array.isArray(data) ? data : [])
          if (data.length > 0) {
            setSelectedClass(data[0])
          }
        }
      } catch (error) {
        console.error('Error loading classes:', error)
      }
    }
    
    if (user?.user_id) {
      loadClasses()
    }
  }, [user])

  // Load assessments for selected class
  useEffect(() => {
    if (selectedClass) {
      loadAssessments()
    }
  }, [selectedClass])

  const loadAssessments = async () => {
    if (!selectedClass) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/assessments/class/${selectedClass.section_course_id}`)
      if (response.ok) {
        const data = await response.json()
        setAssessments(Array.isArray(data) ? data : [])
      } else {
        setError('Failed to load assessments')
      }
    } catch (error) {
      console.error('Error loading assessments:', error)
      setError('Failed to load assessments')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCreateAssessment = async (e) => {
    e.preventDefault()
    if (!selectedClass) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          ...formData,
          section_course_id: selectedClass.section_course_id,
          created_by: user.user_id
        })
      })

      if (response.ok) {
        const result = await response.json()
        setShowCreateModal(false)
        resetForm()
        loadAssessments()
        alert('Assessment created successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create assessment')
      }
    } catch (error) {
      console.error('Error creating assessment:', error)
      alert('Failed to create assessment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditAssessment = async (e) => {
    e.preventDefault()
    if (!editingAssessment) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/assessments/${editingAssessment.assessment_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowEditModal(false)
        setEditingAssessment(null)
        resetForm()
        loadAssessments()
        alert('Assessment updated successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update assessment')
      }
    } catch (error) {
      console.error('Error updating assessment:', error)
      alert('Failed to update assessment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePublishAssessment = async (assessmentId) => {
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/publish`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })

      if (response.ok) {
        loadAssessments()
        alert('Assessment published successfully!')
      } else {
        alert('Failed to publish assessment')
      }
    } catch (error) {
      console.error('Error publishing assessment:', error)
      alert('Failed to publish assessment')
    }
  }

  const handleUnpublishAssessment = async (assessmentId) => {
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/unpublish`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })

      if (response.ok) {
        loadAssessments()
        alert('Assessment unpublished successfully!')
      } else {
        alert('Failed to unpublish assessment')
      }
    } catch (error) {
      console.error('Error unpublishing assessment:', error)
      alert('Failed to unpublish assessment')
    }
  }

  const handleDeleteAssessment = async (assessmentId) => {
    if (!confirm('Are you sure you want to delete this assessment?')) return

    try {
      const response = await fetch(`/api/assessments/${assessmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })

      if (response.ok) {
        loadAssessments()
        alert('Assessment deleted successfully!')
      } else {
        alert('Failed to delete assessment')
      }
    } catch (error) {
      console.error('Error deleting assessment:', error)
      alert('Failed to delete assessment')
    }
  }

  const openEditModal = (assessment) => {
    setEditingAssessment(assessment)
    setFormData({
      title: assessment.title,
      description: assessment.description || '',
      type: assessment.type,
      category: assessment.category || 'Formative',
      total_points: assessment.total_points,
      weight_percentage: assessment.weight_percentage,
      due_date: assessment.due_date ? assessment.due_date.split('T')[0] : '',
      submission_deadline: assessment.submission_deadline ? assessment.submission_deadline.split('T')[0] : '',
      grading_method: assessment.grading_method || 'points',
      instructions: assessment.instructions || ''
    })
    setShowEditModal(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'Quiz',
      category: 'Formative',
      total_points: 100,
      weight_percentage: 25,
      due_date: '',
      submission_deadline: '',
      grading_method: 'points',
      instructions: ''
    })
  }

  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const filteredAssessments = assessments.filter(assessment =>
    assessment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    assessment.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'graded': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Exam': return '📝'
      case 'Quiz': return '❓'
      case 'Project': return '📋'
      case 'Assignment': return '📄'
      default: return '📊'
    }
  }

  // Grading functions
  const loadGrades = async (assessmentId) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/grading/assessment/${assessmentId}/grades`)
      if (response.ok) {
        const data = await response.json()
        const gradesMap = {}
        data.forEach(grade => {
          gradesMap[grade.enrollment_id] = {
            student_name: grade.full_name,
            student_number: grade.student_number,
            student_photo: grade.student_photo,
            raw_score: grade.raw_score || '',
            late_penalty: grade.late_penalty || '',
            feedback: grade.feedback || ''
          }
        })
        setGrades(gradesMap)
      } else {
        setError('Failed to load grades')
      }
    } catch (error) {
      console.error('Error loading grades:', error)
      setError('Failed to load grades')
    } finally {
      setLoading(false)
    }
  }

  const handleGradeChange = (enrollmentId, field, value) => {
    setGrades(prev => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        [field]: value
      }
    }))
  }

  const calculateAdjustedScore = (rawScore, latePenalty, totalPoints) => {
    const raw = parseFloat(rawScore) || 0
    const penalty = parseFloat(latePenalty) || 0
    const adjusted = Math.max(0, raw - penalty)
    return adjusted > totalPoints ? totalPoints : adjusted
  }

  const calculatePercentage = (adjustedScore, totalPoints) => {
    if (!totalPoints || totalPoints === 0) return 0
    return ((adjustedScore / totalPoints) * 100).toFixed(1)
  }

  const handleSubmitGrades = async () => {
    if (!selectedAssessment) return

    setIsSubmittingGrades(true)
    try {
      const gradesArray = Object.entries(grades).map(([enrollmentId, gradeData]) => ({
        enrollment_id: parseInt(enrollmentId),
        assessment_id: selectedAssessment.assessment_id,
        raw_score: parseFloat(gradeData.raw_score) || 0,
        late_penalty: parseFloat(gradeData.late_penalty) || 0,
        feedback: gradeData.feedback || ''
      }))

      const response = await fetch('/api/grading/submit-grades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ grades: gradesArray })
      })

      if (response.ok) {
        setSuccessMessage('Grades saved successfully!')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to save grades')
      }
    } catch (error) {
      console.error('Error submitting grades:', error)
      setError('Failed to save grades')
    } finally {
      setIsSubmittingGrades(false)
    }
  }

  const handleAssessmentSelect = (assessment) => {
    setSelectedAssessment(assessment)
    loadGrades(assessment.assessment_id)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('assessments')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'assessments'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Assessments
            </button>
            <button
              onClick={() => setActiveTab('grading')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'grading'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Grading
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'assessments' && (
          <>
            {/* Controls: Class dropdown + Search + Create button */}
            <div className="flex flex-col sm:flex-row items-end gap-4 mb-6">
          {classes.length > 0 && (
            <div className="w-full sm:w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
              <select
                value={selectedClass?.section_course_id || ''}
                onChange={(e) => {
                  const classId = e.target.value
                  const selected = classes.find(c => c.section_course_id == classId)
                  setSelectedClass(selected)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                {classes.map(cls => (
                  <option key={cls.section_course_id} value={cls.section_course_id}>
                    {cls.course_title} - {cls.section_code}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2 sm:sr-only">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search assessments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>

          <div className="sm:w-auto">
            <button
              onClick={openCreateModal}
              className="w-full sm:w-auto inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Create Assessment
            </button>
          </div>
        </div>

        {/* Assessments List */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {filteredAssessments.length === 0 ? (
          <div className="text-center py-12">
            <AcademicCapIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery ? 'No assessments match your search.' : 'Create your first assessment to get started.'}
            </p>
            {!searchQuery && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                Create Assessment
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssessments.map((assessment) => (
              <div key={assessment.assessment_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getTypeIcon(assessment.type)}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{assessment.title}</h3>
                      <p className="text-sm text-gray-600">{assessment.type}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assessment.status)}`}>
                    {assessment.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Points:</span>
                    <span className="font-medium">{assessment.total_points}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Weight:</span>
                    <span className="font-medium">{assessment.weight_percentage}%</span>
                  </div>
                  {assessment.due_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Due:</span>
                      <span className="font-medium">
                        {new Date(assessment.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {assessment.total_submissions !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Submissions:</span>
                      <span className="font-medium">
                        {assessment.graded_submissions || 0}/{assessment.total_submissions || 0}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(assessment)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <PencilIcon className="h-4 w-4" />
                    Edit
                  </button>
                  
                  {assessment.is_published ? (
                    <button
                      onClick={() => handleUnpublishAssessment(assessment.assessment_id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                    >
                      <XMarkIcon className="h-4 w-4" />
                      Unpublish
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePublishAssessment(assessment.assessment_id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      <CheckIcon className="h-4 w-4" />
                      Publish
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDeleteAssessment(assessment.assessment_id)}
                    className="flex items-center justify-center px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}

        {/* Grading Tab Content */}
        {activeTab === 'grading' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content - Student List for Grading */}
            <div className="lg:col-span-3">
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

              {selectedAssessment ? (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300">
                  <div className="px-6 py-3 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">
                      Grades for: {selectedAssessment.title} <span className="text-sm text-gray-600">({selectedAssessment.total_points} pts)</span>
                    </h2>
                  </div>
                  {loading ? (
                    <div className="p-4 space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 animate-pulse">
                          <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gray-300"></div>
                          <div className="flex-1 space-y-1">
                            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                          <div className="h-8 w-16 bg-gray-200 rounded"></div>
                          <div className="h-8 w-16 bg-gray-200 rounded"></div>
                          <div className="h-8 w-24 bg-gray-200 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : Object.keys(grades).length > 0 ? (
                    <div className="max-h-[60vh] overflow-y-auto pb-32">
                      <div className="px-6 py-2 bg-gray-50 sticky top-0 z-10 border-b border-gray-200 flex items-center text-xs font-medium text-gray-600 uppercase">
                        <div className="w-48 flex-shrink-0">Student</div>
                        <div className="w-20 flex-shrink-0">Raw</div>
                        <div className="w-20 flex-shrink-0">Penalty</div>
                        <div className="w-20 flex-shrink-0">Adjusted</div>
                        <div className="w-20 flex-shrink-0">Percent</div>
                        <div className="flex-1">Feedback</div>
                      </div>
                      <ul className="divide-y divide-gray-200">
                        {Object.entries(grades).map(([enrollmentId, gradeData]) => (
                          <li key={enrollmentId} className="flex items-center px-6 py-3 hover:bg-gray-50">
                            <div className="w-48 flex-shrink-0 flex items-center space-x-3">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                                {gradeData.student_photo ? (
                                  <img 
                                    src={gradeData.student_photo} 
                                    alt={gradeData.student_name} 
                                    className="h-full w-full object-cover"
                                    onError={(e) => e.target.src = '/src/images/bsu-logo.png'}
                                  />
                                ) : (
                                  <img src="/src/images/bsu-logo.png" alt="Default Avatar" className="h-full w-full object-cover" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">{gradeData.student_name || 'Student'}</div>
                                <div className="text-xs text-gray-500">SR Code: {gradeData.student_number || 'N/A'}</div>
                              </div>
                            </div>
                            <div className="w-20 flex-shrink-0">
                              <input
                                type="number"
                                value={gradeData.raw_score || ''}
                                onChange={(e) => handleGradeChange(enrollmentId, 'raw_score', e.target.value)}
                                className="w-full p-1 text-sm rounded-md border border-gray-300 focus:ring-1 focus:ring-red-500 focus:border-red-500"
                                min="0"
                                max={selectedAssessment.total_points}
                              />
                            </div>
                            <div className="w-20 flex-shrink-0 ml-2">
                              <input
                                type="number"
                                value={gradeData.late_penalty || ''}
                                onChange={(e) => handleGradeChange(enrollmentId, 'late_penalty', e.target.value)}
                                className="w-full p-1 text-sm rounded-md border border-gray-300 focus:ring-1 focus:ring-red-500 focus:border-red-500"
                                min="0"
                              />
                            </div>
                            <div className="w-20 flex-shrink-0 ml-2 text-sm font-medium text-gray-900">
                              {calculateAdjustedScore(gradeData.raw_score, gradeData.late_penalty, selectedAssessment.total_points)}
                            </div>
                            <div className="w-20 flex-shrink-0 ml-2 text-sm font-medium text-gray-900">
                              {calculatePercentage(calculateAdjustedScore(gradeData.raw_score, gradeData.late_penalty, selectedAssessment.total_points), selectedAssessment.total_points)}%
                            </div>
                            <div className="flex-1 ml-2">
                              <textarea
                                value={gradeData.feedback || ''}
                                onChange={(e) => handleGradeChange(enrollmentId, 'feedback', e.target.value)}
                                className="w-full p-1 text-sm rounded-md border border-gray-300 focus:ring-1 focus:ring-red-500 focus:border-red-500 resize-y"
                                rows="1"
                                placeholder="Feedback..."
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-16">
                      <div className="text-center">
                        <UserGroupIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
                        <p className="text-gray-500">No students enrolled in this assessment yet.</p>
                      </div>
                    </div>
                  )}
                  {Object.keys(grades).length > 0 && (
                    <div className="sticky bottom-0 bg-white px-6 py-3 border-t border-gray-200 flex justify-end shadow-md z-10 rounded-b-lg">
                      <button
                        onClick={handleSubmitGrades}
                        disabled={isSubmittingGrades || !selectedAssessment || Object.keys(grades).length === 0}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-300 ${
                          isSubmittingGrades
                            ? 'bg-red-400 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700'
                        } focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-white`}
                      >
                        {isSubmittingGrades ? (
                          <span className="flex items-center justify-center">
                            <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center">
                            <CheckIcon className="h-4 w-4 mr-2" />
                            Save Grades
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-300 flex items-center justify-center py-16">
                  <div className="text-center">
                    <ClipboardDocumentCheckIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Assessment</h3>
                    <p className="text-gray-500">Choose a subject and assessment to start grading</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar - Subjects and Assessments */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-300">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Subjects</h3>
                {classes.length > 0 ? (
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                    {classes.map((cls) => (
                      <div
                        key={cls.section_course_id}
                        onClick={() => setSelectedClass(cls)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedClass?.section_course_id === cls.section_course_id
                            ? 'bg-red-50 border-red-200 ring-1 ring-red-100'
                            : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <p className="font-medium text-gray-900">{cls.course_title}</p>
                        <p className="text-sm text-gray-500">{cls.course_code} - {cls.section_code}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-sm text-gray-500">No subjects assigned.</p>
                  </div>
                )}

                {selectedClass && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessments for {selectedClass.course_code}</h3>
                    {assessments.length > 0 ? (
                      <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                        {assessments.map((assessment) => (
                          <div
                            key={assessment.assessment_id}
                            onClick={() => handleAssessmentSelect(assessment)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedAssessment?.assessment_id === assessment.assessment_id
                                ? 'bg-red-50 border-red-200 ring-1 ring-red-100'
                                : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                            }`}
                          >
                            <p className="font-medium text-gray-900">{assessment.title}</p>
                            <p className="text-sm text-gray-500">{assessment.type} - {assessment.total_points} pts</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                        <p className="text-sm text-gray-500">No assessments for this subject.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create Assessment Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Assessment</h2>
                
                <form onSubmit={handleCreateAssessment} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="e.g., Midterm Exam"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="Quiz">Quiz</option>
                        <option value="Exam">Exam</option>
                        <option value="Project">Project</option>
                        <option value="Assignment">Assignment</option>
                        <option value="Lab">Lab</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Assessment description..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Points</label>
                      <input
                        type="number"
                        name="total_points"
                        value={formData.total_points}
                        onChange={handleInputChange}
                        required
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Weight (%)</label>
                      <input
                        type="number"
                        name="weight_percentage"
                        value={formData.weight_percentage}
                        onChange={handleInputChange}
                        required
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="Formative">Formative</option>
                        <option value="Summative">Summative</option>
                        <option value="Diagnostic">Diagnostic</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        name="due_date"
                        value={formData.due_date}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Submission Deadline</label>
                      <input
                        type="datetime-local"
                        name="submission_deadline"
                        value={formData.submission_deadline}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                    <textarea
                      name="instructions"
                      value={formData.instructions}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Instructions for students..."
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Assessment'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Assessment Modal */}
        {showEditModal && editingAssessment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Assessment</h2>
                
                <form onSubmit={handleEditAssessment} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="Quiz">Quiz</option>
                        <option value="Exam">Exam</option>
                        <option value="Project">Project</option>
                        <option value="Assignment">Assignment</option>
                        <option value="Lab">Lab</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Points</label>
                      <input
                        type="number"
                        name="total_points"
                        value={formData.total_points}
                        onChange={handleInputChange}
                        required
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Weight (%)</label>
                      <input
                        type="number"
                        name="weight_percentage"
                        value={formData.weight_percentage}
                        onChange={handleInputChange}
                        required
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="Formative">Formative</option>
                        <option value="Summative">Summative</option>
                        <option value="Diagnostic">Diagnostic</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        name="due_date"
                        value={formData.due_date}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Submission Deadline</label>
                      <input
                        type="datetime-local"
                        name="submission_deadline"
                        value={formData.submission_deadline}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                    <textarea
                      name="instructions"
                      value={formData.instructions}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? 'Updating...' : 'Update Assessment'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Assessments