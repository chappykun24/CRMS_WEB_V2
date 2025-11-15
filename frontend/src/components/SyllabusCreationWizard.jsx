import React, { useState, useEffect } from 'react'
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
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
    // Step 1: Course Information
    course_title: '',
    course_code: '',
    course_category: '',
    semester_year: '',
    course_instructor: {
      name: '',
      qualification: '',
      contact_email: '',
      contact_phone: ''
    },
    period_of_study: '',
    credit_hours: '',
    prerequisites: '',
    id_number: '',
    reference_cmo: '',
    date_prepared: new Date().toISOString().split('T')[0],
    revision_no: '0',
    revision_date: '',
    version: '1.0',
    term_id: '',
    
    // Step 2: Course Rationale and Description
    course_rationale_paragraph1: '',
    course_rationale_paragraph2: '',
    
    // Step 3: Contact Hours and Assessment Criteria
    contact_hours: {
      lecture: 2,
      laboratory: 3
    },
    assessment_criteria: [],
    
    // Step 4: Teaching, Learning, and Assessment Strategies
    teaching_strategies: {
      general_description: '',
      assessment_components: [],
      technology_integration: {
        python: false,
        r: false,
        knime: false,
        excel: false,
        flask: false
      }
    },
    
    // Step 5: ILOs and Assessment Distribution
    // (ILOs handled separately in state)
    
    // Step 6: Books and References
    learning_resources: [],
    
    // Step 7: Grading System
    grading_policy: {
      scale: [
        { grade: '1.00', range: '98-100', description: 'Excellent' },
        { grade: '1.25', range: '94-97', description: 'Superior' },
        { grade: '1.5', range: '90-93', description: 'Very Good' },
        { grade: '1.75', range: '88-89', description: 'Good' },
        { grade: '2.00', range: '85-87', description: 'Meritorious' },
        { grade: '2.25', range: '83-84', description: 'Very Satisfactory' },
        { grade: '2.50', range: '80-82', description: 'Satisfactory' },
        { grade: '2.75', range: '78-79', description: 'Fairly Satisfactory' },
        { grade: '3.00', range: '75-77', description: 'Passing' },
        { grade: '5.00', range: 'Below 70', description: 'Failure' },
        { grade: 'INC', range: '', description: 'Incomplete' }
      ],
      remedial_note: 'Students who got a computed grade of 70-74 will be given an appropriate remedial activity in which the final grade should be either passing (3.0) or failure (5.0). No rounding off of grades shall be allowed.'
    },
    
    // Legacy fields for backward compatibility
    title: '',
    description: '',
    course_objectives: '',
    course_outline: '',
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
  const [newAssessmentCriteria, setNewAssessmentCriteria] = useState({ 
    name: '', 
    weight: '' 
  })
  const [errors, setErrors] = useState({})
  
  const totalSteps = 7
  
  const steps = [
    { number: 1, title: 'Course Information', icon: DocumentTextIcon },
    { number: 2, title: 'Course Rationale & Description', icon: BookOpenIcon },
    { number: 3, title: 'Contact Hours & Assessment', icon: ClipboardDocumentListIcon },
    { number: 4, title: 'Teaching & Learning Strategies', icon: AcademicCapIcon },
    { number: 5, title: 'ILOs & Assessment Distribution', icon: ChartBarIcon },
    { number: 6, title: 'Books & References', icon: ListBulletIcon },
    { number: 7, title: 'Grading System', icon: ChartBarIcon }
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
  
  // Assessment task options - sync with assessment framework components
  const getAssessmentTasks = () => {
    const components = formData.assessment_framework?.components || []
    const taskMap = {
      'Quiz': 'QZ',
      'Exam': 'ME',
      'Major Exam': 'ME',
      'Final Exam': 'ME',
      'Project': 'FP',
      'Final Project': 'FP',
      'Presentation': 'P',
      'Lab': 'LA',
      'Lab Activity': 'LA',
      'Assignment': 'A',
      'Homework': 'A',
      'Report': 'A'
    }
    
    // Get unique task codes from assessment framework
    const tasksFromFramework = components.map(comp => {
      const type = comp.type || ''
      return taskMap[type] || type.substring(0, 2).toUpperCase()
    }).filter((code, index, self) => self.indexOf(code) === index && code)
    
    // Default tasks
    const defaultTasks = [
      { code: 'QZ', label: 'Quiz' },
      { code: 'ME', label: 'Major Exam' },
      { code: 'FP', label: 'Final Project' },
      { code: 'P', label: 'Presentation' },
      { code: 'LA', label: 'Lab Activity' },
      { code: 'A', label: 'Assignment' }
    ]
    
    // Combine and deduplicate
    const allTasks = [...defaultTasks]
    tasksFromFramework.forEach(code => {
      if (!allTasks.find(t => t.code === code)) {
        allTasks.push({ code, label: code })
      }
    })
    
    return allTasks
  }
  
  const assessmentTasks = getAssessmentTasks()
  
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
      const gradingPolicy = typeof editingSyllabus.grading_policy === 'object' 
        ? editingSyllabus.grading_policy 
        : (editingSyllabus.grading_policy ? JSON.parse(editingSyllabus.grading_policy) : {
            scale: formData.grading_policy.scale,
            remedial_note: formData.grading_policy.remedial_note
          })
      
      const teachingStrategies = typeof editingSyllabus.teaching_strategies === 'object'
        ? editingSyllabus.teaching_strategies
        : (editingSyllabus.teaching_strategies ? JSON.parse(editingSyllabus.teaching_strategies) : formData.teaching_strategies)
      
      const contactHours = typeof editingSyllabus.contact_hours === 'object'
        ? editingSyllabus.contact_hours
        : (editingSyllabus.contact_hours ? JSON.parse(editingSyllabus.contact_hours) : formData.contact_hours)
      
      const assessmentCriteria = Array.isArray(editingSyllabus.assessment_criteria)
        ? editingSyllabus.assessment_criteria
        : (typeof editingSyllabus.assessment_criteria === 'object' && editingSyllabus.assessment_criteria
          ? (Array.isArray(editingSyllabus.assessment_criteria) 
            ? editingSyllabus.assessment_criteria 
            : Object.entries(editingSyllabus.assessment_criteria).map(([name, weight]) => ({ name, weight })))
          : (editingSyllabus.assessment_criteria ? JSON.parse(editingSyllabus.assessment_criteria) : []))
      
      setFormData(prev => ({
        ...prev,
        // Course Information
        course_title: editingSyllabus.course_title || editingSyllabus.title || '',
        course_code: editingSyllabus.course_code || selectedClass?.course_code || '',
        course_category: editingSyllabus.course_category || '',
        semester_year: editingSyllabus.semester_year || '',
        course_instructor: editingSyllabus.course_instructor || prev.course_instructor,
        period_of_study: editingSyllabus.period_of_study || '',
        credit_hours: editingSyllabus.credit_hours || '',
        prerequisites: editingSyllabus.prerequisites || '',
        id_number: editingSyllabus.id_number || '',
        reference_cmo: editingSyllabus.reference_cmo || '',
        date_prepared: editingSyllabus.date_prepared || prev.date_prepared,
        revision_no: editingSyllabus.revision_no || '0',
        revision_date: editingSyllabus.revision_date || '',
        version: editingSyllabus.version || '1.0',
        term_id: editingSyllabus.term_id || '',
        
        // Course Rationale
        course_rationale_paragraph1: editingSyllabus.course_rationale_paragraph1 || '',
        course_rationale_paragraph2: editingSyllabus.course_rationale_paragraph2 || '',
        
        // Contact Hours and Assessment
        contact_hours: contactHours,
        assessment_criteria: assessmentCriteria,
        
        // Teaching Strategies
        teaching_strategies: teachingStrategies,
        
        // Learning Resources
        learning_resources: Array.isArray(editingSyllabus.learning_resources) 
          ? editingSyllabus.learning_resources 
          : [],
        
        // Grading Policy
        grading_policy: gradingPolicy,
        
        // Legacy fields
        title: editingSyllabus.title || '',
        description: editingSyllabus.description || '',
        course_objectives: editingSyllabus.course_objectives || '',
        course_outline: editingSyllabus.course_outline || '',
        assessment_framework: typeof editingSyllabus.assessment_framework === 'object'
          ? editingSyllabus.assessment_framework
          : (editingSyllabus.assessment_framework ? JSON.parse(editingSyllabus.assessment_framework) : {
              components: []
            })
      }))
      
      // Load ILOs if editing
      if (editingSyllabus.syllabus_id) {
        loadILOs(editingSyllabus.syllabus_id)
      }
    } else if (selectedClass) {
      // Set default values from selected class
      setFormData(prev => ({
        ...prev,
        term_id: selectedClass.term_id || '',
        course_title: selectedClass.course_title || '',
        course_code: selectedClass.course_code || '',
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
        if (!formData.course_title.trim()) newErrors.course_title = 'Course title is required'
        if (!formData.course_code.trim()) newErrors.course_code = 'Course code is required'
        if (!formData.term_id) newErrors.term_id = 'School term is required'
        break
      case 2:
        if (!formData.course_rationale_paragraph1.trim()) newErrors.course_rationale_paragraph1 = 'First paragraph is required'
        if (!formData.course_rationale_paragraph2.trim()) newErrors.course_rationale_paragraph2 = 'Second paragraph is required'
        break
      case 3:
        // Require at least one assessment criterion
        if (!formData.assessment_criteria || formData.assessment_criteria.length === 0) {
          newErrors.assessment_criteria = 'At least one assessment criterion is required'
        } else {
          const assessmentTotal = Array.isArray(formData.assessment_criteria)
            ? formData.assessment_criteria.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0)
            : 0
          if (assessmentTotal !== 100) {
            newErrors.assessment_criteria = `Total assessment weight must equal 100% (currently ${assessmentTotal}%)`
          }
        }
        break
      case 4:
        if (!formData.teaching_strategies.general_description.trim()) {
          newErrors.teaching_strategies = 'General description is required'
        }
        break
      case 5:
        // ILOs validation can be added here if needed
        break
      case 6:
        // References are optional
        break
      case 7:
        // Grading system validation
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
  
  const handleAddMapping = (type, referenceId, assessmentTasks = []) => {
    const mapping = {
      [type === 'so' ? 'so_id' : type === 'iga' ? 'iga_id' : type === 'cdio' ? 'cdio_id' : 'sdg_id']: referenceId,
      assessment_tasks: Array.isArray(assessmentTasks) ? assessmentTasks : []
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
  
  const handleUpdateMappingTasks = (type, index, tasks) => {
    setIloFormData(prev => {
      const mappings = [...prev[`${type}_mappings`]]
      mappings[index] = {
        ...mappings[index],
        assessment_tasks: Array.isArray(tasks) ? tasks : []
      }
      return {
        ...prev,
        [`${type}_mappings`]: mappings
      }
    })
  }
  
  // State for mapping modal (which mapping is being edited)
  const [editingMapping, setEditingMapping] = useState({ type: null, index: null })
  const [mappingTaskSelection, setMappingTaskSelection] = useState([])
  
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
    
    // Include ILOs in the form data and set title for backward compatibility
    // Ensure assessment_criteria is properly formatted with numeric weights
    const formattedAssessmentCriteria = formData.assessment_criteria.map(item => ({
      name: item.name.trim(),
      weight: parseFloat(item.weight) || 0
    }))
    
    const syllabusData = {
      ...formData,
      title: formData.course_title || formData.title, // Use course_title as title for backward compatibility
      description: formData.course_rationale_paragraph1 + '\n\n' + formData.course_rationale_paragraph2 || formData.description,
      assessment_criteria: formattedAssessmentCriteria, // Explicitly include and format assessment criteria
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Information</h3>
              <p className="text-sm text-gray-600 mb-6">Provide the course details and instructor information</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="course_title"
                  value={formData.course_title}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    errors.course_title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Analytics Techniques and Tools"
                />
                {errors.course_title && <p className="mt-1 text-sm text-red-600">{errors.course_title}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="course_code"
                  value={formData.course_code}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    errors.course_code ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., BAT 404"
                />
                {errors.course_code && <p className="mt-1 text-sm text-red-600">{errors.course_code}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Category
                </label>
                <input
                  type="text"
                  name="course_category"
                  value={formData.course_category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g., Professional Elective"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Semester/Year
                </label>
                <input
                  type="text"
                  name="semester_year"
                  value={formData.semester_year}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g., Second Semester & A.Y 2024-2025"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credit Hours
                </label>
                <input
                  type="text"
                  name="credit_hours"
                  value={formData.credit_hours}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g., 5 hours"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prerequisite(s)
                </label>
                <input
                  type="text"
                  name="prerequisites"
                  value={formData.prerequisites}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g., BAT 402"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID No.
                </label>
                <input
                  type="text"
                  name="id_number"
                  value={formData.id_number}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g., 55609"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference CMO
                </label>
                <input
                  type="text"
                  name="reference_cmo"
                  value={formData.reference_cmo}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g., CMO 25, Series 2015"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Prepared
                </label>
                <input
                  type="date"
                  name="date_prepared"
                  value={formData.date_prepared}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Revision No.
                </label>
                <input
                  type="text"
                  name="revision_no"
                  value={formData.revision_no}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Revision Date
                </label>
                <input
                  type="date"
                  name="revision_date"
                  value={formData.revision_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period of Study
                </label>
                <input
                  type="text"
                  name="period_of_study"
                  value={formData.period_of_study}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g., Second Semester & A.Y 2024-2025"
                />
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
            
            <div className="border-t pt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Course Instructor</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instructor Name
                  </label>
                  <input
                    type="text"
                    value={formData.course_instructor.name}
                    onChange={(e) => handleNestedChange('course_instructor.name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g., Daryl Tiquio"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Qualification
                  </label>
                  <input
                    type="text"
                    value={formData.course_instructor.qualification}
                    onChange={(e) => handleNestedChange('course_instructor.qualification', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g., Master in Business Analytics (30 units/ ongoing)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.course_instructor.contact_email}
                    onChange={(e) => handleNestedChange('course_instructor.contact_email', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g., daryl.m.tiquio@g.batstate-u.edu.ph"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={formData.course_instructor.contact_phone}
                    onChange={(e) => handleNestedChange('course_instructor.contact_phone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g., 0908-877-8671"
                  />
                </div>
              </div>
            </div>
          </div>
        )
        
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Rationale and Description</h3>
              <p className="text-sm text-gray-600 mb-6">Provide a comprehensive description of the course rationale and objectives</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Paragraph <span className="text-red-500">*</span>
              </label>
              <textarea
                name="course_rationale_paragraph1"
                value={formData.course_rationale_paragraph1}
                onChange={handleInputChange}
                required
                rows={6}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.course_rationale_paragraph1 ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="The course equips students with essential skills for implementing advanced analytics techniques, addressing the growing need for data-driven decision-making in various industries..."
              />
              {errors.course_rationale_paragraph1 && <p className="mt-1 text-sm text-red-600">{errors.course_rationale_paragraph1}</p>}
              <p className="mt-1 text-xs text-gray-500">Describe the course rationale, its importance, and how it supports educational goals</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Second Paragraph <span className="text-red-500">*</span>
              </label>
              <textarea
                name="course_rationale_paragraph2"
                value={formData.course_rationale_paragraph2}
                onChange={handleInputChange}
                required
                rows={8}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.course_rationale_paragraph2 ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="This course provides a comprehensive introduction to analytics techniques and tools, with an emphasis on their practical applications in solving real-world challenges..."
              />
              {errors.course_rationale_paragraph2 && <p className="mt-1 text-sm text-red-600">{errors.course_rationale_paragraph2}</p>}
              <p className="mt-1 text-xs text-gray-500">Describe the course content, topics covered, tools used, and learning outcomes</p>
            </div>
          </div>
        )
        
      case 3:
        const assessmentTotal = formData.assessment_criteria.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0)
        
        const handleAddAssessmentCriteria = () => {
          if (newAssessmentCriteria.name && newAssessmentCriteria.weight) {
            setFormData(prev => ({
              ...prev,
              assessment_criteria: [...prev.assessment_criteria, {
                name: newAssessmentCriteria.name.trim(),
                weight: parseFloat(newAssessmentCriteria.weight) || 0
              }]
            }))
            setNewAssessmentCriteria({ name: '', weight: '' })
          }
        }
        
        const handleRemoveAssessmentCriteria = (index) => {
          setFormData(prev => ({
            ...prev,
            assessment_criteria: prev.assessment_criteria.filter((_, i) => i !== index)
          }))
        }
        
        const handleUpdateAssessmentCriteria = (index, field, value) => {
          setFormData(prev => {
            const updated = [...prev.assessment_criteria]
            updated[index] = {
              ...updated[index],
              [field]: field === 'weight' ? (parseFloat(value) || 0) : value
            }
            return {
              ...prev,
              assessment_criteria: updated
            }
          })
        }
        
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Hours and Assessment Criteria</h3>
              <p className="text-sm text-gray-600 mb-6">Define the contact hours and assessment breakdown</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lecture Hours
                </label>
                <input
                  type="number"
                  value={formData.contact_hours.lecture}
                  onChange={(e) => handleNestedChange('contact_hours.lecture', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Laboratory Hours
                </label>
                <input
                  type="number"
                  value={formData.contact_hours.laboratory}
                  onChange={(e) => handleNestedChange('contact_hours.laboratory', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  min="0"
                />
              </div>
            </div>
            
            <div className="border-t pt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Criteria for Assessment</h4>
              <p className="text-sm text-gray-600 mb-4">Total must equal 100%</p>
              
              {formData.assessment_criteria.length > 0 && (
                <div className="space-y-3 mb-4">
                  {formData.assessment_criteria.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateAssessmentCriteria(index, 'name', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Assessment Name (e.g., Problem Sets)"
                        />
                        <input
                          type="number"
                          value={item.weight}
                          onChange={(e) => handleUpdateAssessmentCriteria(index, 'weight', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Weight %"
                          min="0"
                          max="100"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAssessmentCriteria(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Remove"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={newAssessmentCriteria.name}
                    onChange={(e) => setNewAssessmentCriteria(prev => ({ ...prev, name: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Assessment Name"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddAssessmentCriteria()}
                  />
                  <input
                    type="number"
                    value={newAssessmentCriteria.weight}
                    onChange={(e) => setNewAssessmentCriteria(prev => ({ ...prev, weight: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Weight %"
                    min="0"
                    max="100"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddAssessmentCriteria()}
                  />
                  <button
                    type="button"
                    onClick={handleAddAssessmentCriteria}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-2"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Add
                  </button>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total:</span>
                  <span className={`text-lg font-bold ${assessmentTotal === 100 ? 'text-green-600' : 'text-red-600'}`}>
                    {assessmentTotal}%
                  </span>
                </div>
                {errors.assessment_criteria && (
                  <p className="mt-2 text-sm text-red-600">{errors.assessment_criteria}</p>
                )}
                {assessmentTotal !== 100 && formData.assessment_criteria.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    {assessmentTotal < 100 
                      ? `Need ${100 - assessmentTotal}% more to reach 100%`
                      : `Exceeds 100% by ${assessmentTotal - 100}%`}
                  </p>
                )}
              </div>
            </div>
          </div>
        )
        
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Teaching, Learning, and Assessment Strategies</h3>
              <p className="text-sm text-gray-600 mb-6">Describe the teaching approach, assessment components, and technology integration</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                General Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.teaching_strategies.general_description}
                onChange={(e) => handleNestedChange('teaching_strategies.general_description', e.target.value)}
                rows={8}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.teaching_strategies ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="The course uses a blended learning approach, combining online and face-to-face sessions..."
              />
              {errors.teaching_strategies && <p className="mt-1 text-sm text-red-600">{errors.teaching_strategies}</p>}
              <p className="mt-1 text-xs text-gray-500">Describe the teaching methodology, learning approach, and assessment strategy</p>
            </div>
            
            <div className="border-t pt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Technology Integration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'python', label: 'Python (Jupyter Notebook, pandas, scikit-learn)' },
                  { key: 'r', label: 'R (RStudio, dplyr, caret)' },
                  { key: 'knime', label: 'KNIME Analytics Platform' },
                  { key: 'excel', label: 'Microsoft Excel' },
                  { key: 'flask', label: 'Flask (Python Microframework)' }
                ].map(tech => (
                  <label key={tech.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.teaching_strategies.technology_integration[tech.key]}
                      onChange={(e) => handleNestedChange(`teaching_strategies.technology_integration.${tech.key}`, e.target.checked)}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">{tech.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )
        
      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Intended Learning Outcomes (ILOs) and Assessment Distribution</h3>
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
        
      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Books and Other References</h3>
              <p className="text-sm text-gray-600 mb-6">Add learning resources such as textbooks, websites, and materials</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                References
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
                  placeholder="Enter reference (e.g., Author, Title. Publisher. Retrieved date, from URL)"
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
                Press Enter or click Add to add a reference. You can add textbooks, websites, articles, etc.
              </p>
            </div>
          </div>
        )
        
      case 7:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Policies - Grading System</h3>
              <p className="text-sm text-gray-600 mb-6">Define the grading scale for the course</p>
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
                        placeholder="Grade (e.g., 1.00)"
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
                        placeholder="Range (e.g., 98-100)"
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
                        placeholder="Description (e.g., Excellent)"
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
            
            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remedial Activity Note
              </label>
              <textarea
                value={formData.grading_policy.remedial_note}
                onChange={(e) => handleNestedChange('grading_policy.remedial_note', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Students who got a computed grade of 70-74 will be given an appropriate remedial activity..."
              />
              <p className="mt-1 text-xs text-gray-500">Note about remedial activities for students with grades 70-74</p>
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
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingILO ? 'Edit ILO' : 'Create New ILO'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Define what students should be able to do after completing this course
                  </p>
                </div>
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
              
              {/* Instructions Banner */}
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AcademicCapIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">Quick Guide</h4>
                    <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                      <li><strong>ILO Code:</strong> Use a unique identifier (e.g., ILO1, ILO2)</li>
                      <li><strong>Description:</strong> Write a clear, measurable learning outcome</li>
                      <li><strong>Mapping:</strong> Link ILOs to Student Outcomes (SO), IGA, CDIO, or SDG to show alignment</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* ILO Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ILO Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={iloFormData.code}
                    onChange={(e) => setIloFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g., ILO1, ILO2"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Use a unique code to identify this learning outcome</p>
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={iloFormData.description}
                    onChange={(e) => setIloFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Example: 'Students will be able to analyze and design database systems using SQL and NoSQL technologies to solve real-world data management problems.'"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Write a clear, measurable statement. Use action verbs like "analyze", "design", "evaluate", "create"
                  </p>
                </div>
                
                {/* Mapping Section */}
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Map to Educational Goals (Optional)</h4>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                      <p className="text-xs text-amber-800">
                        <strong>Why map ILOs?</strong> Mapping connects your course learning outcomes to institutional goals (SO, IGA, CDIO, SDG). 
                        This demonstrates how your course contributes to program objectives. You can add mappings now or later in the ILO Mapping section.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div className="text-xs">
                        <p className="font-medium text-gray-700 mb-1">📋 SO (Student Outcomes)</p>
                        <p className="text-gray-600">Program-specific learning outcomes</p>
                      </div>
                      <div className="text-xs">
                        <p className="font-medium text-gray-700 mb-1">🎓 IGA (Institutional Graduate Attributes)</p>
                        <p className="text-gray-600">University-wide graduate attributes</p>
                      </div>
                      <div className="text-xs">
                        <p className="font-medium text-gray-700 mb-1">🔧 CDIO</p>
                        <p className="text-gray-600">Conceive, Design, Implement, Operate framework</p>
                      </div>
                      <div className="text-xs">
                        <p className="font-medium text-gray-700 mb-1">🌍 SDG (Sustainable Development Goals)</p>
                        <p className="text-gray-600">UN sustainability goals alignment</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* SO Mappings */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Student Outcomes (SO)
                      <span className="ml-2 text-xs font-normal text-gray-500">- Link to program outcomes</span>
                    </label>
                    <div className="space-y-2">
                      {iloFormData.so_mappings.map((mapping, index) => {
                        const so = soReferences.find(r => r.so_id === mapping.so_id)
                        const isEditing = editingMapping.type === 'so' && editingMapping.index === index
                        return (
                          <div key={index} className="p-2 bg-gray-50 rounded border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-gray-700">{so?.so_code || mapping.so_id}</span>
                              <div className="flex gap-1">
                                {!isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMapping({ type: 'so', index })
                                      setMappingTaskSelection(mapping.assessment_tasks || [])
                                    }}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Edit tasks"
                                  >
                                    <PencilIcon className="h-3 w-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingMapping({ type: null, index: null })
                                      setMappingTaskSelection([])
                                    } else {
                                      handleRemoveMapping('so', index)
                                    }
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  title={isEditing ? "Cancel" : "Remove"}
                                >
                                  {isEditing ? <XMarkIcon className="h-3 w-3" /> : <TrashIcon className="h-3 w-3" />}
                                </button>
                              </div>
                            </div>
                            {isEditing ? (
                              <div className="space-y-2">
                                <label className="block text-xs text-gray-600 mb-1">Select Assessment Tasks:</label>
                                <div className="flex flex-wrap gap-2">
                                  {assessmentTasks.map(task => (
                                    <label key={task.code} className="flex items-center gap-1 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={mappingTaskSelection.includes(task.code)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setMappingTaskSelection([...mappingTaskSelection, task.code])
                                          } else {
                                            setMappingTaskSelection(mappingTaskSelection.filter(t => t !== task.code))
                                          }
                                        }}
                                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                      />
                                      <span className="text-xs text-gray-700">{task.label}</span>
                                    </label>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleUpdateMappingTasks('so', index, mappingTaskSelection)
                                    setEditingMapping({ type: null, index: null })
                                    setMappingTaskSelection([])
                                  }}
                                  className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  Save Tasks
                                </button>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-600">
                                {mapping.assessment_tasks?.length > 0 ? (
                                  <span>Tasks: {mapping.assessment_tasks.map(code => {
                                    const task = assessmentTasks.find(t => t.code === code)
                                    return task?.label || code
                                  }).join(', ')}</span>
                                ) : (
                                  <span className="text-gray-400 italic">No assessment tasks selected - click edit to add</span>
                                )}
                              </div>
                            )}
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
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Institutional Graduate Attributes (IGA)
                      <span className="ml-2 text-xs font-normal text-gray-500">- Link to university attributes</span>
                    </label>
                    <div className="space-y-2">
                      {iloFormData.iga_mappings.map((mapping, index) => {
                        const iga = igaReferences.find(r => r.iga_id === mapping.iga_id)
                        const isEditing = editingMapping.type === 'iga' && editingMapping.index === index
                        return (
                          <div key={index} className="p-2 bg-gray-50 rounded border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-gray-700">{iga?.iga_code || mapping.iga_id}</span>
                              <div className="flex gap-1">
                                {!isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMapping({ type: 'iga', index })
                                      setMappingTaskSelection(mapping.assessment_tasks || [])
                                    }}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Edit tasks"
                                  >
                                    <PencilIcon className="h-3 w-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingMapping({ type: null, index: null })
                                      setMappingTaskSelection([])
                                    } else {
                                      handleRemoveMapping('iga', index)
                                    }
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  title={isEditing ? "Cancel" : "Remove"}
                                >
                                  {isEditing ? <XMarkIcon className="h-3 w-3" /> : <TrashIcon className="h-3 w-3" />}
                                </button>
                              </div>
                            </div>
                            {isEditing ? (
                              <div className="space-y-2">
                                <label className="block text-xs text-gray-600 mb-1">Select Assessment Tasks:</label>
                                <div className="flex flex-wrap gap-2">
                                  {assessmentTasks.map(task => (
                                    <label key={task.code} className="flex items-center gap-1 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={mappingTaskSelection.includes(task.code)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setMappingTaskSelection([...mappingTaskSelection, task.code])
                                          } else {
                                            setMappingTaskSelection(mappingTaskSelection.filter(t => t !== task.code))
                                          }
                                        }}
                                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                      />
                                      <span className="text-xs text-gray-700">{task.label}</span>
                                    </label>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleUpdateMappingTasks('iga', index, mappingTaskSelection)
                                    setEditingMapping({ type: null, index: null })
                                    setMappingTaskSelection([])
                                  }}
                                  className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  Save Tasks
                                </button>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-600">
                                {mapping.assessment_tasks?.length > 0 ? (
                                  <span>Tasks: {mapping.assessment_tasks.map(code => {
                                    const task = assessmentTasks.find(t => t.code === code)
                                    return task?.label || code
                                  }).join(', ')}</span>
                                ) : (
                                  <span className="text-gray-400 italic">No assessment tasks selected - click edit to add</span>
                                )}
                              </div>
                            )}
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
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      CDIO Framework
                      <span className="ml-2 text-xs font-normal text-gray-500">- Link to engineering framework</span>
                    </label>
                    <div className="space-y-2">
                      {iloFormData.cdio_mappings.map((mapping, index) => {
                        const cdio = cdioReferences.find(r => r.cdio_id === mapping.cdio_id)
                        const isEditing = editingMapping.type === 'cdio' && editingMapping.index === index
                        return (
                          <div key={index} className="p-2 bg-gray-50 rounded border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-gray-700">{cdio?.cdio_code || mapping.cdio_id}</span>
                              <div className="flex gap-1">
                                {!isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMapping({ type: 'cdio', index })
                                      setMappingTaskSelection(mapping.assessment_tasks || [])
                                    }}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Edit tasks"
                                  >
                                    <PencilIcon className="h-3 w-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingMapping({ type: null, index: null })
                                      setMappingTaskSelection([])
                                    } else {
                                      handleRemoveMapping('cdio', index)
                                    }
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  title={isEditing ? "Cancel" : "Remove"}
                                >
                                  {isEditing ? <XMarkIcon className="h-3 w-3" /> : <TrashIcon className="h-3 w-3" />}
                                </button>
                              </div>
                            </div>
                            {isEditing ? (
                              <div className="space-y-2">
                                <label className="block text-xs text-gray-600 mb-1">Select Assessment Tasks:</label>
                                <div className="flex flex-wrap gap-2">
                                  {assessmentTasks.map(task => (
                                    <label key={task.code} className="flex items-center gap-1 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={mappingTaskSelection.includes(task.code)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setMappingTaskSelection([...mappingTaskSelection, task.code])
                                          } else {
                                            setMappingTaskSelection(mappingTaskSelection.filter(t => t !== task.code))
                                          }
                                        }}
                                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                      />
                                      <span className="text-xs text-gray-700">{task.label}</span>
                                    </label>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleUpdateMappingTasks('cdio', index, mappingTaskSelection)
                                    setEditingMapping({ type: null, index: null })
                                    setMappingTaskSelection([])
                                  }}
                                  className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  Save Tasks
                                </button>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-600">
                                {mapping.assessment_tasks?.length > 0 ? (
                                  <span>Tasks: {mapping.assessment_tasks.map(code => {
                                    const task = assessmentTasks.find(t => t.code === code)
                                    return task?.label || code
                                  }).join(', ')}</span>
                                ) : (
                                  <span className="text-gray-400 italic">No assessment tasks selected - click edit to add</span>
                                )}
                              </div>
                            )}
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
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      SDG (Sustainable Development Goals)
                      <span className="ml-2 text-xs font-normal text-gray-500">- Link to UN sustainability goals</span>
                    </label>
                    <div className="space-y-2">
                      {iloFormData.sdg_mappings.map((mapping, index) => {
                        const sdg = sdgReferences.find(r => r.sdg_id === mapping.sdg_id)
                        const isEditing = editingMapping.type === 'sdg' && editingMapping.index === index
                        return (
                          <div key={index} className="p-2 bg-gray-50 rounded border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-gray-700">{sdg?.sdg_code || mapping.sdg_id}</span>
                              <div className="flex gap-1">
                                {!isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMapping({ type: 'sdg', index })
                                      setMappingTaskSelection(mapping.assessment_tasks || [])
                                    }}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Edit tasks"
                                  >
                                    <PencilIcon className="h-3 w-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingMapping({ type: null, index: null })
                                      setMappingTaskSelection([])
                                    } else {
                                      handleRemoveMapping('sdg', index)
                                    }
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  title={isEditing ? "Cancel" : "Remove"}
                                >
                                  {isEditing ? <XMarkIcon className="h-3 w-3" /> : <TrashIcon className="h-3 w-3" />}
                                </button>
                              </div>
                            </div>
                            {isEditing ? (
                              <div className="space-y-2">
                                <label className="block text-xs text-gray-600 mb-1">Select Assessment Tasks:</label>
                                <div className="flex flex-wrap gap-2">
                                  {assessmentTasks.map(task => (
                                    <label key={task.code} className="flex items-center gap-1 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={mappingTaskSelection.includes(task.code)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setMappingTaskSelection([...mappingTaskSelection, task.code])
                                          } else {
                                            setMappingTaskSelection(mappingTaskSelection.filter(t => t !== task.code))
                                          }
                                        }}
                                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                      />
                                      <span className="text-xs text-gray-700">{task.label}</span>
                                    </label>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleUpdateMappingTasks('sdg', index, mappingTaskSelection)
                                    setEditingMapping({ type: null, index: null })
                                    setMappingTaskSelection([])
                                  }}
                                  className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  Save Tasks
                                </button>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-600">
                                {mapping.assessment_tasks?.length > 0 ? (
                                  <span>Tasks: {mapping.assessment_tasks.map(code => {
                                    const task = assessmentTasks.find(t => t.code === code)
                                    return task?.label || code
                                  }).join(', ')}</span>
                                ) : (
                                  <span className="text-gray-400 italic">No assessment tasks selected - click edit to add</span>
                                )}
                              </div>
                            )}
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
                  
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs text-green-800">
                      <strong>💡 Tip:</strong> Click the edit icon (✏️) on any mapping to select which assessment tasks measure this ILO. 
                      Tasks are automatically synced from your Assessment Framework (Step 4).
                    </p>
                  </div>
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

