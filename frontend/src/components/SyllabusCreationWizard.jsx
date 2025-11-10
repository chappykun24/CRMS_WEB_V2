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
  TrashIcon,
  PencilIcon
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
  
  const totalSteps = 6
  
  const steps = [
    { number: 1, title: 'Basic Information', icon: DocumentTextIcon },
    { number: 2, title: 'Course Details', icon: BookOpenIcon },
    { number: 3, title: 'Grading Policy', icon: ChartBarIcon },
    { number: 4, title: 'Assessment Framework', icon: ClipboardDocumentListIcon },
    { number: 5, title: 'Learning Resources', icon: ListBulletIcon },
    { number: 6, title: 'ILOs & Mapping', icon: AcademicCapIcon }
  ]
  
  // ILOs state
  const [ilos, setIlos] = useState([])
  const [showILOModal, setShowILOModal] = useState(false)
  const [editingILO, setEditingILO] = useState(null)
  const [iloFormData, setIloFormData] = useState({
    code: '',
    description: '',
    category: '',
    level: '',
    weight_percentage: '',
    assessment_methods: '',
    learning_activities: '',
    so_mappings: [],
    iga_mappings: [],
    cdio_mappings: [],
    sdg_mappings: []
  })
  
  // Reference data for mappings
  const [soReferences, setSoReferences] = useState([])
  const [igaReferences, setIgaReferences] = useState([])
  const [cdioReferences, setCdioReferences] = useState([])
  const [sdgReferences, setSdgReferences] = useState([])
  
  // Assessment task options
  const assessmentTasks = [
    { code: 'QZ', label: 'Quiz' },
    { code: 'ME', label: 'Major Exam' },
    { code: 'FP', label: 'Final Project' },
    { code: 'P', label: 'Presentation' },
    { code: 'LA', label: 'Lab Activity' },
    { code: 'A', label: 'Assignment' }
  ]
  
  // Load reference data for ILO mappings
  useEffect(() => {
    const loadReferences = async () => {
      try {
        const [soRes, igaRes, cdioRes, sdgRes] = await Promise.all([
          fetch('/api/ilos/references/so'),
          fetch('/api/ilos/references/iga'),
          fetch('/api/ilos/references/cdio'),
          fetch('/api/ilos/references/sdg')
        ])
        
        if (soRes.ok) {
          const soData = await soRes.json()
          setSoReferences(soData)
        }
        if (igaRes.ok) {
          const igaData = await igaRes.json()
          setIgaReferences(igaData)
        }
        if (cdioRes.ok) {
          const cdioData = await cdioRes.json()
          setCdioReferences(cdioData)
        }
        if (sdgRes.ok) {
          const sdgData = await sdgRes.json()
          setSdgReferences(sdgData)
        }
      } catch (error) {
        console.error('Error loading reference data:', error)
      }
    }
    
    loadReferences()
  }, [])
  
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
      
      // Load ILOs if editing
      if (editingSyllabus.syllabus_id) {
        loadILOs(editingSyllabus.syllabus_id)
      }
    } else if (selectedClass) {
      // Set default term_id from selected class
      setFormData(prev => ({
        ...prev,
        term_id: selectedClass.term_id || '',
        title: selectedClass.course_title ? `${selectedClass.course_title} Syllabus` : ''
      }))
    }
  }, [editingSyllabus, selectedClass])
  
  const loadILOs = async (syllabusId) => {
    if (!syllabusId) return
    
    try {
      const response = await fetch(`/api/ilos/syllabus/${syllabusId}`)
      if (response.ok) {
        const data = await response.json()
        setIlos(data)
      }
    } catch (error) {
      console.error('Error loading ILOs:', error)
    }
  }
  
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
  
  // ILO Management Functions
  const resetILOForm = () => {
    setIloFormData({
      code: '',
      description: '',
      category: '',
      level: '',
      weight_percentage: '',
      assessment_methods: '',
      learning_activities: '',
      so_mappings: [],
      iga_mappings: [],
      cdio_mappings: [],
      sdg_mappings: []
    })
    setEditingILO(null)
  }
  
  const openILOModal = (ilo = null) => {
    if (ilo) {
      setEditingILO(ilo)
      setIloFormData({
        code: ilo.code || '',
        description: ilo.description || '',
        category: ilo.category || '',
        level: ilo.level || '',
        weight_percentage: ilo.weight_percentage || '',
        assessment_methods: Array.isArray(ilo.assessment_methods) 
          ? ilo.assessment_methods.join(', ') 
          : ilo.assessment_methods || '',
        learning_activities: Array.isArray(ilo.learning_activities) 
          ? ilo.learning_activities.join(', ') 
          : ilo.learning_activities || '',
        so_mappings: ilo.so_mappings || [],
        iga_mappings: ilo.iga_mappings || [],
        cdio_mappings: ilo.cdio_mappings || [],
        sdg_mappings: ilo.sdg_mappings || []
      })
    } else {
      resetILOForm()
    }
    setShowILOModal(true)
  }
  
  const handleSaveILO = () => {
    const newILO = {
      ...iloFormData,
      assessment_methods: iloFormData.assessment_methods 
        ? iloFormData.assessment_methods.split(',').map(s => s.trim()).filter(s => s)
        : [],
      learning_activities: iloFormData.learning_activities
        ? iloFormData.learning_activities.split(',').map(s => s.trim()).filter(s => s)
        : [],
      weight_percentage: iloFormData.weight_percentage ? parseFloat(iloFormData.weight_percentage) : null
    }
    
    if (editingILO) {
      setIlos(prev => prev.map(ilo => 
        ilo.ilo_id === editingILO.ilo_id ? { ...editingILO, ...newILO } : ilo
      ))
    } else {
      setIlos(prev => [...prev, { ...newILO, ilo_id: `temp_${Date.now()}` }])
    }
    
    setShowILOModal(false)
    resetILOForm()
  }
  
  const handleDeleteILO = (iloId) => {
    if (confirm('Are you sure you want to delete this ILO?')) {
      setIlos(prev => prev.filter(ilo => ilo.ilo_id !== iloId))
    }
  }
  
  const handleAddMapping = (type, referenceId, assessmentTasks) => {
    const mapping = {
      [type === 'so' ? 'so_id' : type === 'iga' ? 'iga_id' : type === 'cdio' ? 'cdio_id' : 'sdg_id']: referenceId,
      assessment_tasks: assessmentTasks
    }
    
    setIloFormData(prev => ({
      ...prev,
      [`${type}_mappings`]: [...prev[`${type}_mappings`], mapping]
    }))
  }
  
  const handleRemoveMapping = (type, index) => {
    setIloFormData(prev => ({
      ...prev,
      [`${type}_mappings`]: prev[`${type}_mappings`].filter((_, i) => i !== index)
    }))
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
    
    // Include ILOs in the form data
    const syllabusData = {
      ...formData,
      ilos: ilos // Include ILOs to be saved
    }
    
    await onSave(syllabusData)
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
        
      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Intended Learning Outcomes (ILOs)</h3>
              <p className="text-sm text-gray-600 mb-6">
                Define the learning outcomes for this course and optionally map them to educational goals (SO, IGA, CDIO, SDG).
              </p>
            </div>
            
            <div className="mb-4">
              <button
                type="button"
                onClick={() => openILOModal()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <PlusIcon className="h-5 w-5" />
                Add ILO
              </button>
            </div>
            
            {ilos.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-500 mb-2">No ILOs added yet.</p>
                <p className="text-sm text-gray-400">Click "Add ILO" to create learning outcomes for this course.</p>
                <p className="text-xs text-gray-400 mt-2">Note: ILOs are optional but recommended for outcome-based education.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ilos.map((ilo, index) => (
                  <div key={ilo.ilo_id || index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-gray-900">{ilo.code}</span>
                          {ilo.category && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">{ilo.category}</span>
                          )}
                          {ilo.level && (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">{ilo.level}</span>
                          )}
                          {ilo.weight_percentage && (
                            <span className="text-xs text-gray-600">Weight: {ilo.weight_percentage}%</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{ilo.description}</p>
                        {ilo.assessment_methods?.length > 0 && (
                          <p className="text-xs text-gray-600 mb-1">
                            <strong>Assessment Methods:</strong> {Array.isArray(ilo.assessment_methods) ? ilo.assessment_methods.join(', ') : ilo.assessment_methods}
                          </p>
                        )}
                        {ilo.learning_activities?.length > 0 && (
                          <p className="text-xs text-gray-600 mb-2">
                            <strong>Learning Activities:</strong> {Array.isArray(ilo.learning_activities) ? ilo.learning_activities.join(', ') : ilo.learning_activities}
                          </p>
                        )}
                        
                        {/* Show mappings if any */}
                        {(ilo.so_mappings?.length > 0 || ilo.iga_mappings?.length > 0 || 
                          ilo.cdio_mappings?.length > 0 || ilo.sdg_mappings?.length > 0) && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs font-medium text-gray-700 mb-2">Mappings:</p>
                            <div className="space-y-1">
                              {ilo.so_mappings?.length > 0 && (
                                <div className="text-xs text-gray-600">
                                  <strong>SO:</strong> {' '}
                                  {ilo.so_mappings.map((m, i) => {
                                    const so = soReferences.find(r => r.so_id === m.so_id)
                                    return (
                                      <span key={i}>
                                        {so?.so_code || m.so_id}
                                        {m.assessment_tasks?.length > 0 && ` [${m.assessment_tasks.join(', ')}]`}
                                        {i < ilo.so_mappings.length - 1 && ', '}
                                      </span>
                                    )
                                  })}
                                </div>
                              )}
                              {ilo.iga_mappings?.length > 0 && (
                                <div className="text-xs text-gray-600">
                                  <strong>IGA:</strong> {' '}
                                  {ilo.iga_mappings.map((m, i) => {
                                    const iga = igaReferences.find(r => r.iga_id === m.iga_id)
                                    return (
                                      <span key={i}>
                                        {iga?.iga_code || m.iga_id}
                                        {m.assessment_tasks?.length > 0 && ` [${m.assessment_tasks.join(', ')}]`}
                                        {i < ilo.iga_mappings.length - 1 && ', '}
                                      </span>
                                    )
                                  })}
                                </div>
                              )}
                              {ilo.cdio_mappings?.length > 0 && (
                                <div className="text-xs text-gray-600">
                                  <strong>CDIO:</strong> {' '}
                                  {ilo.cdio_mappings.map((m, i) => {
                                    const cdio = cdioReferences.find(r => r.cdio_id === m.cdio_id)
                                    return (
                                      <span key={i}>
                                        {cdio?.cdio_code || m.cdio_id}
                                        {m.assessment_tasks?.length > 0 && ` [${m.assessment_tasks.join(', ')}]`}
                                        {i < ilo.cdio_mappings.length - 1 && ', '}
                                      </span>
                                    )
                                  })}
                                </div>
                              )}
                              {ilo.sdg_mappings?.length > 0 && (
                                <div className="text-xs text-gray-600">
                                  <strong>SDG:</strong> {' '}
                                  {ilo.sdg_mappings.map((m, i) => {
                                    const sdg = sdgReferences.find(r => r.sdg_id === m.sdg_id)
                                    return (
                                      <span key={i}>
                                        {sdg?.sdg_code || m.sdg_id}
                                        {m.assessment_tasks?.length > 0 && ` [${m.assessment_tasks.join(', ')}]`}
                                        {i < ilo.sdg_mappings.length - 1 && ', '}
                                      </span>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openILOModal(ilo)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit ILO"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteILO(ilo.ilo_id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Delete ILO"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> ILOs will be saved when you create/update the syllabus. 
                You can add mappings to Student Outcomes (SO), Institutional Graduate Attributes (IGA), 
                CDIO Skills, and SDG Skills when editing an ILO. 
                After the syllabus is created, you can also manage mappings in the ILO Mapping section.
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
      
      {/* ILO Creation/Edit Modal */}
      {showILOModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingILO ? 'Edit ILO' : 'Create New ILO'}
                </h3>
                <button
                  onClick={() => {
                    setShowILOModal(false)
                    resetILOForm()
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ILO Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={iloFormData.code}
                      onChange={(e) => setIloFormData(prev => ({ ...prev, code: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="e.g., ILO1"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={iloFormData.category}
                      onChange={(e) => setIloFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">Select category</option>
                      <option value="Knowledge">Knowledge</option>
                      <option value="Skills">Skills</option>
                      <option value="Attitudes">Attitudes</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Level
                    </label>
                    <select
                      value={iloFormData.level}
                      onChange={(e) => setIloFormData(prev => ({ ...prev, level: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">Select level</option>
                      <option value="Basic">Basic</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight Percentage
                    </label>
                    <input
                      type="number"
                      value={iloFormData.weight_percentage}
                      onChange={(e) => setIloFormData(prev => ({ ...prev, weight_percentage: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="0-100"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={iloFormData.description}
                    onChange={(e) => setIloFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Describe the intended learning outcome..."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assessment Methods (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={iloFormData.assessment_methods}
                    onChange={(e) => setIloFormData(prev => ({ ...prev, assessment_methods: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g., Quiz, Exam, Project"
                  />
                  <p className="mt-1 text-xs text-gray-500">Separate multiple methods with commas</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Learning Activities (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={iloFormData.learning_activities}
                    onChange={(e) => setIloFormData(prev => ({ ...prev, learning_activities: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g., Lecture, Lab, Assignment"
                  />
                  <p className="mt-1 text-xs text-gray-500">Separate multiple activities with commas</p>
                </div>
                
                {/* Mapping Section */}
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Map to Educational Goals (Optional)</h4>
                  <p className="text-xs text-gray-600 mb-4">
                    Optionally map this ILO to educational goals. You can also do this later in the ILO Mapping section.
                  </p>
                  
                  {/* SO Mappings */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 mb-2">Student Outcomes (SO)</label>
                    <div className="space-y-2">
                      {iloFormData.so_mappings.map((mapping, index) => {
                        const so = soReferences.find(r => r.so_id === mapping.so_id)
                        return (
                          <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <span className="text-xs text-gray-700 flex-1">{so?.so_code || mapping.so_id}</span>
                            <span className="text-xs text-gray-500">
                              {mapping.assessment_tasks?.length > 0 ? `[${mapping.assessment_tasks.join(', ')}]` : 'No tasks'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMapping('so', index)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <TrashIcon className="h-3 w-3" />
                            </button>
                          </div>
                        )
                      })}
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddMapping('so', parseInt(e.target.value), [])
                            e.target.value = ''
                          }
                        }}
                        className="w-full text-xs px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="">Add SO mapping...</option>
                        {soReferences.filter(so => !iloFormData.so_mappings.some(m => m.so_id === so.so_id)).map(so => (
                          <option key={so.so_id} value={so.so_id}>{so.so_code} - {so.description}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* IGA Mappings */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 mb-2">Institutional Graduate Attributes (IGA)</label>
                    <div className="space-y-2">
                      {iloFormData.iga_mappings.map((mapping, index) => {
                        const iga = igaReferences.find(r => r.iga_id === mapping.iga_id)
                        return (
                          <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <span className="text-xs text-gray-700 flex-1">{iga?.iga_code || mapping.iga_id}</span>
                            <span className="text-xs text-gray-500">
                              {mapping.assessment_tasks?.length > 0 ? `[${mapping.assessment_tasks.join(', ')}]` : 'No tasks'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMapping('iga', index)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <TrashIcon className="h-3 w-3" />
                            </button>
                          </div>
                        )
                      })}
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddMapping('iga', parseInt(e.target.value), [])
                            e.target.value = ''
                          }
                        }}
                        className="w-full text-xs px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="">Add IGA mapping...</option>
                        {igaReferences.filter(iga => !iloFormData.iga_mappings.some(m => m.iga_id === iga.iga_id)).map(iga => (
                          <option key={iga.iga_id} value={iga.iga_id}>{iga.iga_code} - {iga.description}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* CDIO Mappings */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 mb-2">CDIO Skills</label>
                    <div className="space-y-2">
                      {iloFormData.cdio_mappings.map((mapping, index) => {
                        const cdio = cdioReferences.find(r => r.cdio_id === mapping.cdio_id)
                        return (
                          <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <span className="text-xs text-gray-700 flex-1">{cdio?.cdio_code || mapping.cdio_id}</span>
                            <span className="text-xs text-gray-500">
                              {mapping.assessment_tasks?.length > 0 ? `[${mapping.assessment_tasks.join(', ')}]` : 'No tasks'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMapping('cdio', index)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <TrashIcon className="h-3 w-3" />
                            </button>
                          </div>
                        )
                      })}
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddMapping('cdio', parseInt(e.target.value), [])
                            e.target.value = ''
                          }
                        }}
                        className="w-full text-xs px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="">Add CDIO mapping...</option>
                        {cdioReferences.filter(cdio => !iloFormData.cdio_mappings.some(m => m.cdio_id === cdio.cdio_id)).map(cdio => (
                          <option key={cdio.cdio_id} value={cdio.cdio_id}>{cdio.cdio_code} - {cdio.description}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* SDG Mappings */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 mb-2">SDG Skills</label>
                    <div className="space-y-2">
                      {iloFormData.sdg_mappings.map((mapping, index) => {
                        const sdg = sdgReferences.find(r => r.sdg_id === mapping.sdg_id)
                        return (
                          <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <span className="text-xs text-gray-700 flex-1">{sdg?.sdg_code || mapping.sdg_id}</span>
                            <span className="text-xs text-gray-500">
                              {mapping.assessment_tasks?.length > 0 ? `[${mapping.assessment_tasks.join(', ')}]` : 'No tasks'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMapping('sdg', index)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <TrashIcon className="h-3 w-3" />
                            </button>
                          </div>
                        )
                      })}
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddMapping('sdg', parseInt(e.target.value), [])
                            e.target.value = ''
                          }
                        }}
                        className="w-full text-xs px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="">Add SDG mapping...</option>
                        {sdgReferences.filter(sdg => !iloFormData.sdg_mappings.some(m => m.sdg_id === sdg.sdg_id)).map(sdg => (
                          <option key={sdg.sdg_id} value={sdg.sdg_id}>{sdg.sdg_code} - {sdg.description}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Assessment tasks can be added later in the ILO Mapping section for more detailed mapping.
                  </p>
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowILOModal(false)
                      resetILOForm()
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveILO}
                    disabled={!iloFormData.code || !iloFormData.description}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingILO ? 'Update ILO' : 'Add ILO'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SyllabusCreationWizard

