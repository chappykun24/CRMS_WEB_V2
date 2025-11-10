import React, { useState, useEffect } from 'react'
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  ListBulletIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/solid'

const SyllabusCreationWizard = ({ 
  selectedClass, 
  schoolTerms, 
  onClose, 
  onSave,
  editingSyllabus = null 
}) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    title: '',
    version: '1.0',
    term_id: '',
    description: '',
    course_objectives: '',
    prerequisites: '',
    course_outline: '',
    learning_resources: [],
    grading_policy: {
      scale: [
        { grade: 'A', range: '90-100', description: 'Excellent' },
        { grade: 'B', range: '80-89', description: 'Good' },
        { grade: 'C', range: '70-79', description: 'Satisfactory' },
        { grade: 'D', range: '60-69', description: 'Passing' },
        { grade: 'F', range: '0-59', description: 'Failing' }
      ],
      components: []
    },
    assessment_framework: {
      components: []
    }
  })
  
  const [newResource, setNewResource] = useState('')
  const [newGradeItem, setNewGradeItem] = useState({ grade: '', range: '', description: '' })
  const [newAssessmentComponent, setNewAssessmentComponent] = useState({ 
    type: '', 
    weight: '', 
    description: '',
    count: 1
  })
  const [errors, setErrors] = useState({})
  
  const totalSteps = 5
  
  const steps = [
    { number: 1, title: 'Basic Information', icon: DocumentTextIcon },
    { number: 2, title: 'Course Details', icon: BookOpenIcon },
    { number: 3, title: 'Grading Policy', icon: ChartBarIcon },
    { number: 4, title: 'Assessment Framework', icon: ClipboardDocumentListIcon },
    { number: 5, title: 'Learning Resources', icon: ListBulletIcon }
  ]
  
  useEffect(() => {
    if (editingSyllabus) {
      setFormData({
        title: editingSyllabus.title || '',
        version: editingSyllabus.version || '1.0',
        term_id: editingSyllabus.term_id || '',
        description: editingSyllabus.description || '',
        course_objectives: editingSyllabus.course_objectives || '',
        prerequisites: editingSyllabus.prerequisites || '',
        course_outline: editingSyllabus.course_outline || '',
        learning_resources: Array.isArray(editingSyllabus.learning_resources) 
          ? editingSyllabus.learning_resources 
          : [],
        grading_policy: typeof editingSyllabus.grading_policy === 'object' 
          ? editingSyllabus.grading_policy 
          : (editingSyllabus.grading_policy ? JSON.parse(editingSyllabus.grading_policy) : {
              scale: [
                { grade: 'A', range: '90-100', description: 'Excellent' },
                { grade: 'B', range: '80-89', description: 'Good' },
                { grade: 'C', range: '70-79', description: 'Satisfactory' },
                { grade: 'D', range: '60-69', description: 'Passing' },
                { grade: 'F', range: '0-59', description: 'Failing' }
              ],
              components: []
            }),
        assessment_framework: typeof editingSyllabus.assessment_framework === 'object'
          ? editingSyllabus.assessment_framework
          : (editingSyllabus.assessment_framework ? JSON.parse(editingSyllabus.assessment_framework) : {
              components: []
            })
      })
    } else if (selectedClass) {
      // Set default term_id from selected class
      setFormData(prev => ({
        ...prev,
        term_id: selectedClass.term_id || '',
        title: selectedClass.course_title ? `${selectedClass.course_title} Syllabus` : ''
      }))
    }
  }, [editingSyllabus, selectedClass])
  
  const validateStep = (step) => {
    const newErrors = {}
    
    switch(step) {
      case 1:
        if (!formData.title.trim()) newErrors.title = 'Title is required'
        if (!formData.term_id) newErrors.term_id = 'School term is required'
        break
      case 2:
        if (!formData.description.trim()) newErrors.description = 'Description is required'
        if (!formData.course_objectives.trim()) newErrors.course_objectives = 'Course objectives are required'
        break
      case 3:
        const totalWeight = formData.grading_policy.components.reduce((sum, comp) => sum + (parseFloat(comp.weight) || 0), 0)
        if (totalWeight !== 100 && formData.grading_policy.components.length > 0) {
          newErrors.grading_policy = `Total weight must equal 100% (currently ${totalWeight}%)`
        }
        break
      case 4:
        const assessmentTotal = formData.assessment_framework.components.reduce((sum, comp) => sum + (parseFloat(comp.weight) || 0), 0)
        if (assessmentTotal !== 100 && formData.assessment_framework.components.length > 0) {
          newErrors.assessment_framework = `Total assessment weight must equal 100% (currently ${assessmentTotal}%)`
        }
        break
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }
  
  const handleNestedChange = (path, value) => {
    setFormData(prev => {
      const newData = { ...prev }
      const keys = path.split('.')
      let current = newData
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value
      return newData
    })
  }
  
  const handleAddResource = () => {
    if (newResource.trim()) {
      setFormData(prev => ({
        ...prev,
        learning_resources: [...prev.learning_resources, newResource.trim()]
      }))
      setNewResource('')
    }
  }
  
  const handleRemoveResource = (index) => {
    setFormData(prev => ({
      ...prev,
      learning_resources: prev.learning_resources.filter((_, i) => i !== index)
    }))
  }
  
  const handleAddGradeItem = () => {
    if (newGradeItem.grade && newGradeItem.range) {
      setFormData(prev => ({
        ...prev,
        grading_policy: {
          ...prev.grading_policy,
          scale: [...prev.grading_policy.scale, { ...newGradeItem }]
        }
      }))
      setNewGradeItem({ grade: '', range: '', description: '' })
    }
  }
  
  const handleRemoveGradeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      grading_policy: {
        ...prev.grading_policy,
        scale: prev.grading_policy.scale.filter((_, i) => i !== index)
      }
    }))
  }
  
  const handleAddAssessmentComponent = () => {
    if (newAssessmentComponent.type && newAssessmentComponent.weight) {
      const newComponent = { ...newAssessmentComponent }
      setFormData(prev => {
        const updatedFramework = {
          ...prev.assessment_framework,
          components: [...prev.assessment_framework.components, newComponent]
        }
        // Sync with grading policy
        return {
          ...prev,
          assessment_framework: updatedFramework,
          grading_policy: {
            ...prev.grading_policy,
            components: updatedFramework.components.map(comp => ({
              type: comp.type,
              weight: comp.weight,
              description: comp.description
            }))
          }
        }
      })
      setNewAssessmentComponent({ type: '', weight: '', description: '', count: 1 })
    }
  }
  
  const handleRemoveAssessmentComponent = (index) => {
    setFormData(prev => {
      const updatedComponents = prev.assessment_framework.components.filter((_, i) => i !== index)
      return {
        ...prev,
        assessment_framework: {
          ...prev.assessment_framework,
          components: updatedComponents
        },
        grading_policy: {
          ...prev.grading_policy,
          components: updatedComponents.map(comp => ({
            type: comp.type,
            weight: comp.weight,
            description: comp.description
          }))
        }
      }
    })
  }
  
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    }
  }
  
  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }
  
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return
    
    // Validate all steps before submitting
    let allValid = true
    for (let i = 1; i <= totalSteps; i++) {
      if (!validateStep(i)) {
        allValid = false
        break
      }
    }
    
    if (!allValid) {
      setCurrentStep(1)
      return
    }
    
    await onSave(formData)
  }
  
  const renderStepContent = () => {
    switch(currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <p className="text-sm text-gray-600 mb-6">Provide the basic details for your syllabus</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Syllabus Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Introduction to Computer Science"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Version
                </label>
                <input
                  type="text"
                  name="version"
                  value={formData.version}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="1.0"
                />
                <p className="mt-1 text-xs text-gray-500">Syllabus version number</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  School Term <span className="text-red-500">*</span>
                </label>
                <select
                  name="term_id"
                  value={formData.term_id}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    errors.term_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select term</option>
                  {schoolTerms.filter(term => term.is_active).map(term => (
                    <option key={term.term_id} value={term.term_id}>
                      {term.school_year} - {term.semester}
                    </option>
                  ))}
                </select>
                {errors.term_id && <p className="mt-1 text-sm text-red-600">{errors.term_id}</p>}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Brief description of the course..."
              />
            </div>
          </div>
        )
        
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Details</h3>
              <p className="text-sm text-gray-600 mb-6">Define the course objectives, outline, and prerequisites</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Objectives <span className="text-red-500">*</span>
              </label>
              <textarea
                name="course_objectives"
                value={formData.course_objectives}
                onChange={handleInputChange}
                required
                rows={6}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.course_objectives ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="List the learning objectives for this course. You can use bullet points or numbered lists."
              />
              {errors.course_objectives && <p className="mt-1 text-sm text-red-600">{errors.course_objectives}</p>}
              <p className="mt-1 text-xs text-gray-500">Describe what students will learn in this course</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Outline
              </label>
              <textarea
                name="course_outline"
                value={formData.course_outline}
                onChange={handleInputChange}
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Week 1: Introduction&#10;Week 2: Fundamentals&#10;..."
              />
              <p className="mt-1 text-xs text-gray-500">Provide a detailed course outline or schedule</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prerequisites
              </label>
              <textarea
                name="prerequisites"
                value={formData.prerequisites}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="List any prerequisites or recommended prior knowledge"
              />
            </div>
          </div>
        )
        
      case 3:
        const gradingTotal = formData.grading_policy.components.reduce((sum, comp) => sum + (parseFloat(comp.weight) || 0), 0)
        
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Grading Policy</h3>
              <p className="text-sm text-gray-600 mb-6">Define the grading scale and assessment component weights</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Grade Scale
              </label>
              <div className="space-y-2">
                {formData.grading_policy.scale.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={item.grade}
                        onChange={(e) => {
                          const newScale = [...formData.grading_policy.scale]
                          newScale[index].grade = e.target.value
                          handleNestedChange('grading_policy.scale', newScale)
                        }}
                        className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Grade"
                      />
                      <input
                        type="text"
                        value={item.range}
                        onChange={(e) => {
                          const newScale = [...formData.grading_policy.scale]
                          newScale[index].range = e.target.value
                          handleNestedChange('grading_policy.scale', newScale)
                        }}
                        className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Range (e.g., 90-100)"
                      />
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const newScale = [...formData.grading_policy.scale]
                          newScale[index].description = e.target.value
                          handleNestedChange('grading_policy.scale', newScale)
                        }}
                        className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Description"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveGradeItem(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newGradeItem.grade}
                  onChange={(e) => setNewGradeItem(prev => ({ ...prev, grade: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Grade"
                />
                <input
                  type="text"
                  value={newGradeItem.range}
                  onChange={(e) => setNewGradeItem(prev => ({ ...prev, range: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Range"
                />
                <input
                  type="text"
                  value={newGradeItem.description}
                  onChange={(e) => setNewGradeItem(prev => ({ ...prev, description: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Description"
                />
                <button
                  type="button"
                  onClick={handleAddGradeItem}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Assessment Components Weight
                {formData.grading_policy.components.length > 0 && (
                  <span className={`ml-2 text-sm ${gradingTotal === 100 ? 'text-green-600' : 'text-red-600'}`}>
                    (Total: {gradingTotal}%)
                  </span>
                )}
              </label>
              
              {formData.grading_policy.components.length === 0 ? (
                <p className="text-sm text-gray-500 mb-3">No components added yet. Add components in the Assessment Framework step.</p>
              ) : (
                <div className="space-y-2">
                  {formData.grading_policy.components.map((comp, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-900">{comp.type}: {comp.weight}%</span>
                    </div>
                  ))}
                </div>
              )}
              
              {errors.grading_policy && (
                <p className="mt-2 text-sm text-red-600">{errors.grading_policy}</p>
              )}
              
              <p className="mt-2 text-xs text-gray-500">
                Assessment components are defined in the next step. Total weight must equal 100%.
              </p>
            </div>
          </div>
        )
        
      case 4:
        const assessmentTotal = formData.assessment_framework.components.reduce((sum, comp) => sum + (parseFloat(comp.weight) || 0), 0)
        
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment Framework</h3>
              <p className="text-sm text-gray-600 mb-6">Define the assessment components and their weights</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Assessment Components
                {formData.assessment_framework.components.length > 0 && (
                  <span className={`ml-2 text-sm ${assessmentTotal === 100 ? 'text-green-600' : 'text-red-600'}`}>
                    (Total: {assessmentTotal}%)
                  </span>
                )}
              </label>
              
              <div className="space-y-3">
                {formData.assessment_framework.components.map((comp, index) => (
                  <div key={index} className="p-4 border border-gray-300 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-medium text-gray-900">{comp.type}</span>
                          <span className="text-sm text-gray-600">({comp.count} {comp.count === 1 ? 'item' : 'items'})</span>
                          <span className="text-sm font-medium text-gray-700">{comp.weight}%</span>
                        </div>
                        {comp.description && (
                          <p className="text-sm text-gray-600">{comp.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAssessmentComponent(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <select
                    value={newAssessmentComponent.type}
                    onChange={(e) => setNewAssessmentComponent(prev => ({ ...prev, type: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Type</option>
                    <option value="Quiz">Quiz</option>
                    <option value="Exam">Exam</option>
                    <option value="Project">Project</option>
                    <option value="Assignment">Assignment</option>
                    <option value="Lab">Lab</option>
                    <option value="Presentation">Presentation</option>
                    <option value="Participation">Participation</option>
                  </select>
                  
                  <input
                    type="number"
                    value={newAssessmentComponent.weight}
                    onChange={(e) => setNewAssessmentComponent(prev => ({ ...prev, weight: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Weight %"
                    min="0"
                    max="100"
                  />
                  
                  <input
                    type="number"
                    value={newAssessmentComponent.count}
                    onChange={(e) => setNewAssessmentComponent(prev => ({ ...prev, count: parseInt(e.target.value) || 1 }))}
                    className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Count"
                    min="1"
                  />
                  
                  <button
                    type="button"
                    onClick={handleAddAssessmentComponent}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-2"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Add
                  </button>
                </div>
                
                <input
                  type="text"
                  value={newAssessmentComponent.description}
                  onChange={(e) => setNewAssessmentComponent(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Description (optional)"
                />
              </div>
              
              {errors.assessment_framework && (
                <p className="mt-2 text-sm text-red-600">{errors.assessment_framework}</p>
              )}
              
              <p className="mt-2 text-xs text-gray-500">
                Add assessment components and their weights. Total must equal 100%.
              </p>
            </div>
            
            {/* Sync with grading policy */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Assessment components added here will be synced with the grading policy. 
                Make sure the total weight equals 100%.
              </p>
            </div>
          </div>
        )
        
      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Resources</h3>
              <p className="text-sm text-gray-600 mb-6">Add learning resources such as textbooks, websites, and materials</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Resources
              </label>
              
              {formData.learning_resources.length > 0 && (
                <div className="space-y-2 mb-4">
                  {formData.learning_resources.map((resource, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-900">{resource}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveResource(index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newResource}
                  onChange={(e) => setNewResource(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddResource())}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter resource (e.g., Textbook name, URL, etc.)"
                />
                <button
                  type="button"
                  onClick={handleAddResource}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add
                </button>
              </div>
              
              <p className="mt-2 text-xs text-gray-500">
                Press Enter or click Add to add a resource. You can add textbooks, websites, articles, etc.
              </p>
            </div>
          </div>
        )
        
      default:
        return null
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-5xl w-full my-8 shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {editingSyllabus ? 'Edit Syllabus' : 'Create New Syllabus'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {selectedClass && `${selectedClass.course_code} - ${selectedClass.course_title}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>
        
        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number
              
              return (
                <React.Fragment key={step.number}>
                  <div className="flex items-center">
                    <div className={`flex flex-col items-center ${isActive ? 'text-red-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                        isActive ? 'border-red-600 bg-red-50' : 
                        isCompleted ? 'border-green-600 bg-green-50' : 
                        'border-gray-300 bg-white'
                      }`}>
                        {isCompleted ? (
                          <CheckCircleIcon className="h-6 w-6" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <span className={`mt-2 text-xs font-medium ${isActive ? 'text-red-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                        {step.title}
                      </span>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`} />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>
        
        {/* Content */}
        <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
          {renderStepContent()}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Step {currentStep} of {totalSteps}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <ChevronLeftIcon className="h-5 w-5" />
                Previous
              </button>
            )}
            
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                Next
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <CheckCircleIcon className="h-5 w-5" />
                {editingSyllabus ? 'Update Syllabus' : 'Create Syllabus'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SyllabusCreationWizard

