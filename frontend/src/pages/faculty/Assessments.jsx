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
  ClipboardDocumentListIcon
} from '@heroicons/react/24/solid'

const Assessments = () => {
  const { user } = useAuth()
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClass, setSelectedClass] = useState(null)
  const [classes, setClasses] = useState([])
  
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

  if (loading) {
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
            <div className="pt-16 pb-6 transition-all duration-500 ease-in-out" style={{ height: 'calc(100vh - 80px)' }}>
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading assessments...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
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

          {/* Header and Add Assessment Button */}
          <div className="absolute top-0 right-0 z-40 bg-gray-50 transition-all duration-500 ease-in-out left-0">
            <div className="px-8 bg-gray-50">
              <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200">
                <div className="py-2 px-4 font-medium text-sm text-red-600 border-b-2 border-red-600">
                  Assessment Management
                </div>
                
                {/* Add Assessment Button */}
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                >
                  <PlusIcon className="h-5 w-5 stroke-[3]" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="pt-16 pb-6 transition-all duration-500 ease-in-out" style={{ height: 'calc(100vh - 80px)' }}>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 px-8 h-full">
              {/* Main Content */}
              <div className="lg:col-span-3 h-full">
                {/* Controls */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative flex-1">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search assessments..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  </div>
                  
                  {/* Class Selection */}
                  {classes.length > 0 && (
                    <select
                      value={selectedClass?.section_course_id || ''}
                      onChange={(e) => {
                        const classId = e.target.value
                        const selected = classes.find(c => c.section_course_id == classId)
                        setSelectedClass(selected)
                      }}
                      className="px-2 py-2 border rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 border-gray-300 text-sm w-48"
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls.section_course_id} value={cls.section_course_id}>
                          {cls.course_title} - {cls.section_code}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}

                {/* Assessments Table */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300">
                  {filteredAssessments.length > 0 ? (
                    <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Assessment
                            </th>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Points
                            </th>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Weight
                            </th>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Due Date
                            </th>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredAssessments.map((assessment) => (
                            <tr key={assessment.assessment_id} className="hover:bg-gray-50">
                              <td className="px-8 py-4">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                                      <DocumentTextIcon className="h-5 w-5 text-red-600" />
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{assessment.title}</div>
                                    <div className="text-sm text-gray-500">{assessment.description || 'No description'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {assessment.type}
                                </span>
                              </td>
                              <td className="px-8 py-4">
                                <div className="text-sm text-gray-900">{assessment.total_points}</div>
                              </td>
                              <td className="px-8 py-4">
                                <div className="text-sm text-gray-900">{assessment.weight_percentage}%</div>
                              </td>
                              <td className="px-8 py-4">
                                <div className="text-sm text-gray-900">
                                  {assessment.due_date ? new Date(assessment.due_date).toLocaleDateString() : '—'}
                                </div>
                              </td>
                              <td className="px-8 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(assessment.status)}`}>
                                  {assessment.status}
                                </span>
                              </td>
                              <td className="px-8 py-4">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => openEditModal(assessment)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                  </button>
                                  
                                  {assessment.is_published ? (
                                    <button
                                      onClick={() => handleUnpublishAssessment(assessment.assessment_id)}
                                      className="text-yellow-600 hover:text-yellow-900"
                                    >
                                      <XMarkIcon className="h-4 w-4" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handlePublishAssessment(assessment.assessment_id)}
                                      className="text-green-600 hover:text-green-900"
                                    >
                                      <CheckIcon className="h-4 w-4" />
                                    </button>
                                  )}
                                  
                                  <button
                                    onClick={() => handleDeleteAssessment(assessment.assessment_id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center py-16">
                      <div className="text-center">
                        <ClipboardDocumentListIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments found</h3>
                        <p className="text-gray-500">
                          {searchQuery ? 'No assessments match your search.' : 'Create your first assessment to get started.'}
                        </p>
                        {!searchQuery && (
                          <button
                            onClick={openCreateModal}
                            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <PlusIcon className="h-4 w-4" />
                            Create Assessment
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Side Panel - Assessment Details */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-300 h-[calc(100vh-200px)] overflow-y-auto">
                  <div className="text-center py-8">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Assessment Details</h3>
                    <p className="text-gray-500">Select an assessment to view details</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Midterm Exam"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Submission Deadline</label>
                      <input
                        type="datetime-local"
                        name="submission_deadline"
                        value={formData.submission_deadline}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Submission Deadline</label>
                      <input
                        type="datetime-local"
                        name="submission_deadline"
                        value={formData.submission_deadline}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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
