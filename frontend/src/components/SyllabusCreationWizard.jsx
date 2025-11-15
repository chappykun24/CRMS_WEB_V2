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
    course_rationale: '',
    
    // Step 3: Contact Hours and Assessment Criteria
    contact_hours: [
      { name: 'Lecture', hours: 2 },
      { name: 'Laboratory', hours: 3 }
    ],
    assessment_criteria: [],
    sub_assessments: {}, // { criterionIndex: [{ abbreviation, name, weight_percentage }] }
    
    // Step 4: Teaching, Learning, and Assessment Strategies
    teaching_strategies: {
      general_description: '',
      assessment_components: []
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
    abbreviation: '',
    name: '', 
    weight: '' 
  })
  const [newSubAssessment, setNewSubAssessment] = useState({ 
    abbreviation: '',
    name: '', 
    weight_percentage: '',
    score: '' 
  })
  const [editingSubAssessmentFor, setEditingSubAssessmentFor] = useState(null) // criterion index
  const [newContactHour, setNewContactHour] = useState({ 
    name: '', 
    hours: '' 
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
  const [showILOForm, setShowILOForm] = useState(false)
  const [newILO, setNewILO] = useState({
    code: '',
    description: '',
    selectedSO: '',
    selectedIGA: '',
    selectedCDIO: '',
    selectedSDG: '',
    selectedSubAssessments: []
  })
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
    const allTasks = []
    
    // Primary source: Get tasks from sub-assessments with scores and weights
    if (formData.sub_assessments) {
      Object.keys(formData.sub_assessments).forEach(criterionIndex => {
        const subAssessments = formData.sub_assessments[criterionIndex] || []
        subAssessments.forEach(sub => {
          if (sub.abbreviation || sub.name) {
            const code = sub.abbreviation || sub.name.substring(0, 2).toUpperCase()
            const label = sub.abbreviation && sub.name 
              ? `${sub.abbreviation} - ${sub.name}` 
              : (sub.abbreviation || sub.name)
            const existingTask = allTasks.find(t => t.code === code)
            
            // Include weight and score information
            if (!existingTask) {
              allTasks.push({
                code,
                label,
                name: sub.name,
                weight: parseFloat(sub.weight_percentage) || 0,
                score: parseFloat(sub.score) || 0,
                type: 'sub-assessment'
              })
            } else {
              // If duplicate code exists, prefer the one with actual data
              if ((parseFloat(sub.score) || 0) > 0 || (parseFloat(sub.weight_percentage) || 0) > 0) {
                const index = allTasks.indexOf(existingTask)
                allTasks[index] = {
                  code,
                  label,
                  name: sub.name,
                  weight: parseFloat(sub.weight_percentage) || 0,
                  score: parseFloat(sub.score) || 0,
                  type: 'sub-assessment'
                }
              }
            }
          }
        })
      })
    }
    
    // Fallback: Get tasks from assessment criteria if no sub-assessments
    if (allTasks.length === 0 && formData.assessment_criteria) {
      formData.assessment_criteria.forEach((criterion, idx) => {
        if (criterion.abbreviation || criterion.name) {
          const code = criterion.abbreviation || criterion.name.substring(0, 2).toUpperCase()
          const label = criterion.abbreviation && criterion.name 
            ? `${criterion.abbreviation} - ${criterion.name}` 
            : (criterion.abbreviation || criterion.name)
          
          if (!allTasks.find(t => t.code === code)) {
            allTasks.push({
              code,
              label,
              name: criterion.name,
              weight: parseFloat(criterion.weight) || 0,
              score: 0,
              type: 'criterion'
            })
          }
        }
      })
    }
    
    // Legacy fallback: Get from assessment framework if still no tasks
    if (allTasks.length === 0) {
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
      
      const tasksFromFramework = components.map(comp => {
        const type = comp.type || ''
        return taskMap[type] || type.substring(0, 2).toUpperCase()
      }).filter((code, index, self) => self.indexOf(code) === index && code)
      
      const defaultTasks = [
        { code: 'QZ', label: 'Quiz', weight: 0, score: 0, type: 'default' },
        { code: 'ME', label: 'Major Exam', weight: 0, score: 0, type: 'default' },
        { code: 'FP', label: 'Final Project', weight: 0, score: 0, type: 'default' },
        { code: 'P', label: 'Presentation', weight: 0, score: 0, type: 'default' },
        { code: 'LA', label: 'Lab Activity', weight: 0, score: 0, type: 'default' },
        { code: 'A', label: 'Assignment', weight: 0, score: 0, type: 'default' }
      ]
      
      tasksFromFramework.forEach(code => {
        if (!defaultTasks.find(t => t.code === code)) {
          defaultTasks.push({ code, label: code, weight: 0, score: 0, type: 'default' })
        }
      })
      
      return defaultTasks
    }
    
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
      
      // Handle contact hours - convert old object format to new array format
      let contactHours = formData.contact_hours
      if (editingSyllabus.contact_hours) {
        if (Array.isArray(editingSyllabus.contact_hours)) {
          contactHours = editingSyllabus.contact_hours
        } else if (typeof editingSyllabus.contact_hours === 'string') {
          try {
            const parsed = JSON.parse(editingSyllabus.contact_hours)
            contactHours = Array.isArray(parsed) ? parsed : 
              (parsed.lecture || parsed.laboratory ? [
                { name: 'Lecture', hours: parsed.lecture || 0 },
                { name: 'Laboratory', hours: parsed.laboratory || 0 }
              ] : formData.contact_hours)
          } catch {
            contactHours = formData.contact_hours
          }
        } else if (editingSyllabus.contact_hours.lecture || editingSyllabus.contact_hours.laboratory) {
          // Old object format - convert to array
          contactHours = [
            { name: 'Lecture', hours: editingSyllabus.contact_hours.lecture || 0 },
            { name: 'Laboratory', hours: editingSyllabus.contact_hours.laboratory || 0 }
          ]
        }
      }
      
      // Extract assessment_criteria - check both direct field and within grading_policy
      let assessmentCriteria = []
      if (editingSyllabus.assessment_criteria) {
        // If assessment_criteria is directly on the syllabus
        if (Array.isArray(editingSyllabus.assessment_criteria)) {
          assessmentCriteria = editingSyllabus.assessment_criteria
        } else if (typeof editingSyllabus.assessment_criteria === 'object') {
          assessmentCriteria = Array.isArray(editingSyllabus.assessment_criteria) 
            ? editingSyllabus.assessment_criteria 
            : Object.entries(editingSyllabus.assessment_criteria).map(([name, weight]) => ({ abbreviation: '', name, weight }))
        } else if (typeof editingSyllabus.assessment_criteria === 'string') {
          try {
            assessmentCriteria = JSON.parse(editingSyllabus.assessment_criteria)
          } catch {
            assessmentCriteria = []
          }
        }
      } else if (gradingPolicy && gradingPolicy.assessment_criteria) {
        // If assessment_criteria is stored within grading_policy
        if (Array.isArray(gradingPolicy.assessment_criteria)) {
          assessmentCriteria = gradingPolicy.assessment_criteria
        } else if (typeof gradingPolicy.assessment_criteria === 'object') {
          assessmentCriteria = Object.entries(gradingPolicy.assessment_criteria).map(([name, weight]) => ({ abbreviation: '', name, weight }))
        }
      }
      
      setFormData(prev => ({
        ...prev,
        // Course Information
        course_title: editingSyllabus.course_title || editingSyllabus.title || '',
        course_code: editingSyllabus.course_code || selectedClass?.course_code || '',
        course_category: editingSyllabus.course_category || '',
        semester_year: editingSyllabus.semester_year || '',
        course_instructor: editingSyllabus.course_instructor || prev.course_instructor,
        credit_hours: editingSyllabus.credit_hours || '',
        prerequisites: editingSyllabus.prerequisites || '',
        id_number: editingSyllabus.id_number || '',
        reference_cmo: editingSyllabus.reference_cmo || '',
        date_prepared: editingSyllabus.date_prepared || prev.date_prepared,
        revision_no: editingSyllabus.revision_no || '0',
        revision_date: editingSyllabus.revision_date || '',
        version: editingSyllabus.version || '1.0',
        term_id: editingSyllabus.term_id || '',
        
        // Course Rationale - handle both old format (paragraph1 + paragraph2) and new format (single field)
        course_rationale: editingSyllabus.course_rationale || 
          (editingSyllabus.course_rationale_paragraph1 && editingSyllabus.course_rationale_paragraph2
            ? `${editingSyllabus.course_rationale_paragraph1}\n\n${editingSyllabus.course_rationale_paragraph2}`
            : editingSyllabus.description || ''),
        
        // Contact Hours and Assessment
        contact_hours: contactHours,
        assessment_criteria: assessmentCriteria,
        sub_assessments: editingSyllabus.sub_assessments || 
          (gradingPolicy && gradingPolicy.sub_assessments ? gradingPolicy.sub_assessments : {}),
        
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
        if (!formData.term_id) newErrors.term_id = 'Period of study is required'
        break
      case 2:
        if (!formData.course_rationale.trim()) newErrors.course_rationale = 'Course rationale is required'
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
  
  const handleAddContactHour = () => {
    if (newContactHour.name && newContactHour.hours) {
      setFormData(prev => ({
        ...prev,
        contact_hours: [...prev.contact_hours, {
          name: newContactHour.name.trim(),
          hours: parseInt(newContactHour.hours) || 0
        }]
      }))
      setNewContactHour({ name: '', hours: '' })
    }
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
  
  // Helper function to check if there's unsaved form data
  const hasUnsavedChanges = () => {
    return formData.course_title || 
           formData.course_code || 
           formData.course_rationale || 
           formData.contact_hours?.length > 0 ||
           formData.assessment_criteria?.length > 0 ||
           formData.ilos?.length > 0 ||
           formData.learning_resources?.length > 0 ||
           Object.keys(formData.grading_policy || {}).length > 0
  }

  // Handler for closing the wizard with validation
  const handleClose = () => {
    if (hasUnsavedChanges()) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close? Your progress will be saved if you click "Save Draft" before leaving.'
      )
      if (!confirmed) {
        return
      }
    }
    onClose()
  }

  const handlePrevious = () => {
    if (hasUnsavedChanges() && currentStep > 1) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to go back? Your progress will be saved if you click "Save Draft" before leaving.'
      )
      if (!confirmed) {
        return
      }
    }
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
    // editingILO removed - no edit functionality
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
    // This function is no longer used - ILOs are added via inline form
    // Keeping for backward compatibility but should not be called
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
    
    setIlos(prev => [...prev, { ...newILO, ilo_id: `temp_${Date.now()}` }])
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
  
  const prepareSyllabusData = (isDraft = false) => {
    // Include ILOs in the form data and set title for backward compatibility
    // Ensure assessment_criteria is properly formatted with numeric weights
    const formattedAssessmentCriteria = formData.assessment_criteria.map(item => ({
      abbreviation: (item.abbreviation || '').trim(),
      name: item.name.trim(),
      weight: parseFloat(item.weight) || 0
    }))
    
    // Format sub-assessments for saving
    const formattedSubAssessments = {}
    Object.keys(formData.sub_assessments || {}).forEach(criterionIndex => {
      formattedSubAssessments[criterionIndex] = formData.sub_assessments[criterionIndex].map(sub => ({
        abbreviation: (sub.abbreviation || '').trim(),
        name: sub.name.trim(),
        weight_percentage: parseFloat(sub.weight_percentage) || 0,
        score: parseFloat(sub.score) || 0
      }))
    })
    
    return {
      ...formData,
      title: formData.course_title || formData.title, // Use course_title as title for backward compatibility
      description: formData.course_rationale || formData.description,
      assessment_criteria: formattedAssessmentCriteria, // Explicitly include and format assessment criteria
      sub_assessments: formattedSubAssessments, // Include sub-assessments
      ilos: ilos, // Include ILOs to be saved
      status: isDraft ? 'draft' : 'published' // Add status field
    }
  }

  const handleSaveDraft = async () => {
    // Save as draft without validation
    const syllabusData = prepareSyllabusData(true)
    await onSave(syllabusData)
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
    
    const syllabusData = prepareSyllabusData(false)
    await onSave(syllabusData)
  }
  
  const renderStepContent = () => {
    switch(currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Course Information</h3>
              <p className="text-xs text-gray-600 mb-2">Provide the course details and instructor information</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Course Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="course_title"
                  value={formData.course_title}
                  onChange={handleInputChange}
                  required
                  readOnly
                  disabled
                  className={`w-full px-2.5 py-1 text-xs border rounded-lg bg-gray-100 cursor-not-allowed ${
                    errors.course_title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Analytics Techniques and Tools"
                />
                {errors.course_title && <p className="mt-1 text-sm text-red-600">{errors.course_title}</p>}
                <p className="mt-1 text-xs text-gray-500">Predefined from selected class</p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Course Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="course_code"
                  value={formData.course_code}
                  onChange={handleInputChange}
                  required
                  readOnly
                  disabled
                  className={`w-full px-2.5 py-1 text-xs border rounded-lg bg-gray-100 cursor-not-allowed ${
                    errors.course_code ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., BAT 404"
                />
                {errors.course_code && <p className="mt-1 text-sm text-red-600">{errors.course_code}</p>}
                <p className="mt-1 text-xs text-gray-500">Predefined from selected class</p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Course Category
                </label>
                <input
                  type="text"
                  name="course_category"
                  value={formData.course_category}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g., Professional Elective"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Semester/Year
                </label>
                <input
                  type="text"
                  name="semester_year"
                  value={formData.semester_year}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g., Second Semester & A.Y 2024-2025"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Credit Hours
                </label>
                <input
                  type="text"
                  name="credit_hours"
                  value={formData.credit_hours}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g., 5 hours"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Prerequisite(s)
                </label>
                <input
                  type="text"
                  name="prerequisites"
                  value={formData.prerequisites}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g., BAT 402"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  ID No.
                </label>
                <input
                  type="text"
                  name="id_number"
                  value={formData.id_number}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g., 55609"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reference CMO
                </label>
                <input
                  type="text"
                  name="reference_cmo"
                  value={formData.reference_cmo}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g., CMO 25, Series 2015"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Date Prepared
                </label>
                <input
                  type="date"
                  name="date_prepared"
                  value={formData.date_prepared}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Revision No.
                </label>
                <input
                  type="text"
                  name="revision_no"
                  value={formData.revision_no}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Revision Date
                </label>
                <input
                  type="date"
                  name="revision_date"
                  value={formData.revision_date}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Period of Study <span className="text-red-500">*</span>
                </label>
                <select
                  name="term_id"
                  value={formData.term_id}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-2.5 py-1 text-xs border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
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
            
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Course Instructor</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Instructor Name
                  </label>
                  <input
                    type="text"
                    value={formData.course_instructor.name}
                    onChange={(e) => handleNestedChange('course_instructor.name', e.target.value)}
                    className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g., Daryl Tiquio"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Qualification
                  </label>
                  <input
                    type="text"
                    value={formData.course_instructor.qualification}
                    onChange={(e) => handleNestedChange('course_instructor.qualification', e.target.value)}
                    className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g., Master in Business Analytics (30 units/ ongoing)"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.course_instructor.contact_email}
                    onChange={(e) => handleNestedChange('course_instructor.contact_email', e.target.value)}
                    className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g., daryl.m.tiquio@g.batstate-u.edu.ph"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={formData.course_instructor.contact_phone}
                    onChange={(e) => handleNestedChange('course_instructor.contact_phone', e.target.value)}
                    className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g., 0908-877-8671"
                  />
                </div>
              </div>
            </div>
          </div>
        )
        
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Course Rationale and Description</h3>
              <p className="text-xs text-gray-600 mb-2">Provide a comprehensive description of the course rationale and objectives</p>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Course Rationale and Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="course_rationale"
                value={formData.course_rationale}
                onChange={handleInputChange}
                required
                rows={8}
                className={`w-full px-2.5 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.course_rationale ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="The course equips students with essential skills for implementing advanced analytics techniques, addressing the growing need for data-driven decision-making in various industries. This course provides a comprehensive introduction to analytics techniques and tools, with an emphasis on their practical applications in solving real-world challenges..."
              />
              {errors.course_rationale && <p className="mt-1 text-sm text-red-600">{errors.course_rationale}</p>}
              <p className="mt-1 text-xs text-gray-500">Describe the course rationale, its importance, course content, topics covered, tools used, and learning outcomes</p>
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
                abbreviation: newAssessmentCriteria.abbreviation.trim() || '',
                name: newAssessmentCriteria.name.trim(),
                weight: parseFloat(newAssessmentCriteria.weight) || 0
              }]
            }))
            setNewAssessmentCriteria({ abbreviation: '', name: '', weight: '' })
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
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Contact Hours and Assessment Criteria</h3>
              <p className="text-xs text-gray-600 mb-2">Define the contact hours and assessment breakdown</p>
            </div>
            
            <div className="border-b pb-4 mb-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Contact Hours</h4>
              
              {formData.contact_hours.length > 0 && (
                <div className="space-y-2 mb-2">
                  {formData.contact_hours.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const updated = [...formData.contact_hours]
                            updated[index] = { ...updated[index], name: e.target.value }
                            setFormData(prev => ({ ...prev, contact_hours: updated }))
                          }}
                          className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Type (e.g., Lecture, Laboratory)"
                        />
                        <input
                          type="number"
                          value={item.hours}
                          onChange={(e) => {
                            const updated = [...formData.contact_hours]
                            updated[index] = { ...updated[index], hours: parseInt(e.target.value) || 0 }
                            setFormData(prev => ({ ...prev, contact_hours: updated }))
                          }}
                          className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Hours"
                          min="0"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            contact_hours: prev.contact_hours.filter((_, i) => i !== index)
                          }))
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Remove"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="p-2 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newContactHour.name}
                    onChange={(e) => setNewContactHour(prev => ({ ...prev, name: e.target.value }))}
                    className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Type (e.g., Lecture)"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddContactHour()}
                  />
                  <input
                    type="number"
                    value={newContactHour.hours}
                    onChange={(e) => setNewContactHour(prev => ({ ...prev, hours: e.target.value }))}
                    className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Hours"
                    min="0"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddContactHour()}
                  />
                  <button
                    type="button"
                    onClick={handleAddContactHour}
                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-1.5"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Add
                  </button>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Criteria for Assessment</h4>
              <p className="text-xs text-gray-600 mb-2">Total must equal 100%</p>
              
              {formData.assessment_criteria.length > 0 && (
                <div className="space-y-2 mb-2">
                  {formData.assessment_criteria.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateAssessmentCriteria(index, 'name', e.target.value)}
                          className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Assessment Name (e.g., Quiz, Midterm Exam)"
                        />
                        <input
                          type="text"
                          value={item.abbreviation || ''}
                          onChange={(e) => handleUpdateAssessmentCriteria(index, 'abbreviation', e.target.value)}
                          className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Abbreviation (e.g., QZ, ME)"
                          maxLength="10"
                        />
                        <input
                          type="number"
                          value={item.weight}
                          onChange={(e) => handleUpdateAssessmentCriteria(index, 'weight', e.target.value)}
                          className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
              
              <div className="p-2 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={newAssessmentCriteria.name}
                    onChange={(e) => setNewAssessmentCriteria(prev => ({ ...prev, name: e.target.value }))}
                    className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Assessment Name (e.g., Quiz, Midterm Exam)"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddAssessmentCriteria()}
                  />
                  <input
                    type="text"
                    value={newAssessmentCriteria.abbreviation}
                    onChange={(e) => setNewAssessmentCriteria(prev => ({ ...prev, abbreviation: e.target.value }))}
                    className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Abbreviation (e.g., QZ, ME)"
                    maxLength="10"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddAssessmentCriteria()}
                  />
                  <input
                    type="number"
                    value={newAssessmentCriteria.weight}
                    onChange={(e) => setNewAssessmentCriteria(prev => ({ ...prev, weight: e.target.value }))}
                    className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Weight %"
                    min="0"
                    max="100"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddAssessmentCriteria()}
                  />
                  <button
                    type="button"
                    onClick={handleAddAssessmentCriteria}
                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-1.5"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Add
                  </button>
                </div>
              </div>
              
              <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700">Total:</span>
                  <span className={`text-sm font-bold ${assessmentTotal === 100 ? 'text-green-600' : 'text-red-600'}`}>
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
              
              {/* Sub-Assessments Section */}
              {formData.assessment_criteria.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-900">Sub-Assessments</h4>
                    {(() => {
                      const allSubAssessments = Object.values(formData.sub_assessments || {}).flat()
                      const totalAllScores = allSubAssessments.reduce((sum, sub) => sum + (parseFloat(sub.score) || 0), 0)
                      if (allSubAssessments.length > 0) {
                        return (
                          <p className="text-xs font-medium text-gray-700">
                            Total Scores (All): {totalAllScores.toFixed(2)}
                          </p>
                        )
                      }
                      return null
                    })()}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    Create sub-assessments for each assessment criterion. The total weight of sub-assessments must equal the parent criterion weight.
                  </p>
                  
                  <div className="space-y-2">
                    {formData.assessment_criteria.map((criterion, criterionIndex) => {
                      const subAssessments = formData.sub_assessments[criterionIndex] || []
                      const subTotal = subAssessments.reduce((sum, sub) => sum + (parseFloat(sub.weight_percentage) || 0), 0)
                      const isExpanded = editingSubAssessmentFor === criterionIndex
                      
                      return (
                        <div key={criterionIndex} className="border border-gray-300 rounded-lg p-2 bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h5 className="font-medium text-gray-900">
                                {criterion.abbreviation && `${criterion.abbreviation} - `}{criterion.name}
                              </h5>
                              <p className="text-xs text-gray-600">Parent Weight: {criterion.weight}%</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditingSubAssessmentFor(isExpanded ? null : criterionIndex)}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1.5"
                            >
                              {isExpanded ? 'Hide' : 'Add'} Sub-Assessments
                              {subAssessments.length > 0 && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                  {subAssessments.length}
                                </span>
                              )}
                            </button>
                          </div>
                          
                          {subAssessments.length > 0 && (
                            <div className="mb-2 space-y-1.5">
                              {subAssessments.map((sub, subIndex) => (
                                <div key={subIndex} className="flex items-center gap-1.5 p-1.5 bg-gray-50 rounded">
                                  <div className="flex-1 grid grid-cols-4 gap-1.5 text-xs">
                                    <span className="font-medium text-gray-700">
                                      {sub.abbreviation && `${sub.abbreviation} - `}{sub.name}
                                    </span>
                                    <span className="text-gray-600">Weight: {sub.weight_percentage}%</span>
                                    <span className="text-gray-600">Score: {parseFloat(sub.score) || 0}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = { ...formData.sub_assessments }
                                      updated[criterionIndex] = updated[criterionIndex].filter((_, i) => i !== subIndex)
                                      if (updated[criterionIndex].length === 0) delete updated[criterionIndex]
                                      setFormData(prev => ({ ...prev, sub_assessments: updated }))
                                    }}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    title="Remove"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                              <div className="flex items-center justify-between pt-1.5 border-t">
                                <span className="text-xs font-medium text-gray-700">Sub-total:</span>
                                <span className={`text-xs font-bold ${subTotal === parseFloat(criterion.weight) ? 'text-green-600' : 'text-red-600'}`}>
                                  {subTotal}% / {criterion.weight}%
                                </span>
                              </div>
                              {subTotal !== parseFloat(criterion.weight) && (
                                <p className="text-xs text-red-600">
                                  {subTotal < parseFloat(criterion.weight)
                                    ? `Need ${parseFloat(criterion.weight) - subTotal}% more to match parent weight`
                                    : `Exceeds parent weight by ${subTotal - parseFloat(criterion.weight)}%`}
                                </p>
                              )}
                            </div>
                          )}
                          
                          {isExpanded && (
                            <div className="mt-2 p-2 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                                <input
                                  type="text"
                                  value={newSubAssessment.name}
                                  onChange={(e) => setNewSubAssessment(prev => ({ ...prev, name: e.target.value }))}
                                  className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                  placeholder="Sub-assessment Name"
                                />
                                <input
                                  type="text"
                                  value={newSubAssessment.abbreviation}
                                  onChange={(e) => setNewSubAssessment(prev => ({ ...prev, abbreviation: e.target.value }))}
                                  className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                  placeholder="Abbreviation (e.g., QZ1)"
                                  maxLength="10"
                                />
                                <input
                                  type="number"
                                  value={newSubAssessment.weight_percentage}
                                  onChange={(e) => setNewSubAssessment(prev => ({ ...prev, weight_percentage: e.target.value }))}
                                  className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                  placeholder="Weight %"
                                  min="0"
                                  max={criterion.weight}
                                  step="0.1"
                                />
                                <input
                                  type="number"
                                  value={newSubAssessment.score}
                                  onChange={(e) => setNewSubAssessment(prev => ({ ...prev, score: e.target.value }))}
                                  className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                  placeholder="Score"
                                  min="0"
                                  step="0.01"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (newSubAssessment.name && newSubAssessment.weight_percentage) {
                                      const updated = { ...formData.sub_assessments }
                                      if (!updated[criterionIndex]) updated[criterionIndex] = []
                                      updated[criterionIndex] = [...updated[criterionIndex], {
                                        abbreviation: newSubAssessment.abbreviation.trim(),
                                        name: newSubAssessment.name.trim(),
                                        weight_percentage: parseFloat(newSubAssessment.weight_percentage) || 0,
                                        score: parseFloat(newSubAssessment.score) || 0
                                      }]
                                      setFormData(prev => ({ ...prev, sub_assessments: updated }))
                                      setNewSubAssessment({ abbreviation: '', name: '', weight_percentage: '', score: '' })
                                    }
                                  }}
                                  className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-1.5"
                                >
                                  <PlusIcon className="h-5 w-5" />
                                  Add
                                </button>
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <p className="text-xs text-gray-500">
                                  Remaining weight: {Math.max(0, parseFloat(criterion.weight) - subTotal).toFixed(1)}%
                                </p>
                                {subAssessments.length > 0 && (() => {
                                  const totalScores = subAssessments.reduce((sum, sub) => sum + (parseFloat(sub.score) || 0), 0)
                                  return (
                                    <p className="text-xs font-medium text-gray-700">
                                      Total Scores: {totalScores.toFixed(2)}
                                    </p>
                                  )
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
        
      case 4:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Teaching, Learning, and Assessment Strategies</h3>
              <p className="text-xs text-gray-600 mb-2">Describe the teaching approach and assessment components</p>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                General Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.teaching_strategies.general_description}
                onChange={(e) => handleNestedChange('teaching_strategies.general_description', e.target.value)}
                rows={6}
                className={`w-full px-2.5 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.teaching_strategies ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="The course uses a blended learning approach, combining online and face-to-face sessions..."
              />
              {errors.teaching_strategies && <p className="mt-1 text-sm text-red-600">{errors.teaching_strategies}</p>}
              <p className="mt-1 text-xs text-gray-500">Describe the teaching methodology, learning approach, and assessment strategy</p>
            </div>
          </div>
        )
        
      case 5:
        return (
          <div className="space-y-6">
            {/* Step 1: ILO Creation */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Step 1: Create Intended Learning Outcomes (ILOs)</h3>
                <p className="text-xs text-gray-600 mb-2">
                  Define the learning outcomes for this course.
                </p>
              </div>
              
              {/* ILO Form - Inline */}
              <div className="mb-3">
                <button
                  type="button"
                  onClick={() => setShowILOForm(!showILOForm)}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1.5"
                >
                  {showILOForm ? 'Hide' : 'Add'} ILO
                  {ilos.length > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                      {ilos.length}
                    </span>
                  )}
                </button>
              </div>

              {showILOForm || ilos.length === 0 ? (
                <div className="p-2 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 mb-3">
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newILO.code}
                        onChange={(e) => setNewILO(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="ILO Code (e.g., ILO1)"
                        maxLength="20"
                      />
                      <textarea
                        value={newILO.description}
                        onChange={(e) => setNewILO(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="ILO Description (e.g., Students will be able to...)"
                        rows="2"
                      />
                    </div>

                    {/* Mapping Dropdowns - Sequential Order: Sub-Assessments, SO, IGA, CDIO, SDG */}
                    {(() => {
                      // Get all sub-assessments for dropdown
                      const allSubAssessments = []
                      formData.assessment_criteria.forEach((criterion, idx) => {
                        const subAssessments = formData.sub_assessments[idx] || []
                        subAssessments.forEach(sub => {
                          if (sub.abbreviation || sub.name) {
                            allSubAssessments.push({
                              code: sub.abbreviation || sub.name.substring(0, 2).toUpperCase(),
                              name: sub.name,
                              weight: parseFloat(sub.weight_percentage) || 0,
                              score: parseFloat(sub.score) || 0
                            })
                          }
                        })
                      })

                      return (
                        <div className="space-y-2 pt-2 border-t border-gray-200">
                          {/* 1. Map Student Outcomes (SO) */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              1. Select Student Outcome (SO):
                            </label>
                            <select
                              value={newILO.selectedSO}
                              onChange={(e) => setNewILO(prev => ({ ...prev, selectedSO: e.target.value }))}
                              className="w-full text-xs px-2.5 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            >
                              <option value="">Select Student Outcome...</option>
                              {soReferences.map(so => (
                                <option key={so.so_id} value={so.so_id}>
                                  {so.so_code} - {so.description?.substring(0, 60)}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 2. Map Institutional Graduate Attributes (IGA) */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              2. Select Institutional Graduate Attribute (IGA):
                            </label>
                            <select
                              value={newILO.selectedIGA}
                              onChange={(e) => setNewILO(prev => ({ ...prev, selectedIGA: e.target.value }))}
                              className="w-full text-xs px-2.5 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            >
                              <option value="">Select IGA...</option>
                              {igaReferences.map(iga => (
                                <option key={iga.iga_id} value={iga.iga_id}>
                                  {iga.iga_code} - {iga.description?.substring(0, 60)}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 3. Map CDIO Skills */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              3. Select CDIO Skill:
                            </label>
                            <select
                              value={newILO.selectedCDIO}
                              onChange={(e) => setNewILO(prev => ({ ...prev, selectedCDIO: e.target.value }))}
                              className="w-full text-xs px-2.5 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            >
                              <option value="">Select CDIO...</option>
                              {cdioReferences.map(cdio => (
                                <option key={cdio.cdio_id} value={cdio.cdio_id}>
                                  {cdio.cdio_code} - {cdio.description?.substring(0, 60)}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 4. Map SDG Skills */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              4. Select SDG Skill:
                            </label>
                            <select
                              value={newILO.selectedSDG}
                              onChange={(e) => setNewILO(prev => ({ ...prev, selectedSDG: e.target.value }))}
                              className="w-full text-xs px-2.5 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            >
                              <option value="">Select SDG...</option>
                              {sdgReferences.map(sdg => (
                                <option key={sdg.sdg_id} value={sdg.sdg_id}>
                                  {sdg.sdg_code} - {sdg.description?.substring(0, 60)}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 5. Select Sub-Assessments (Checkboxes) */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              5. Select Sub-Assessments:
                            </label>
                            {allSubAssessments.length > 0 ? (
                              <div className="border border-gray-300 rounded p-2 max-h-48 overflow-y-auto bg-white">
                                <div className="space-y-1.5">
                                  {allSubAssessments.map(task => {
                                    const isChecked = newILO.selectedSubAssessments.includes(task.code)
                                    return (
                                      <label
                                        key={task.code}
                                        className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setNewILO(prev => ({
                                                ...prev,
                                                selectedSubAssessments: [...prev.selectedSubAssessments, task.code]
                                              }))
                                            } else {
                                              setNewILO(prev => ({
                                                ...prev,
                                                selectedSubAssessments: prev.selectedSubAssessments.filter(code => code !== task.code)
                                              }))
                                            }
                                          }}
                                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                        />
                                        <span className="text-xs text-gray-700 flex-1">
                                          {task.code} - {task.name}
                                          {task.weight > 0 || task.score > 0 ? ' (' : ''}
                                          {task.weight > 0 ? `W:${task.weight}%` : ''}
                                          {task.weight > 0 && task.score > 0 ? ', ' : ''}
                                          {task.score > 0 ? `S:${task.score}` : ''}
                                          {task.weight > 0 || task.score > 0 ? ')' : ''}
                                        </span>
                                      </label>
                                    )
                                  })}
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic">No sub-assessments available. Add sub-assessments in Step 3 first.</p>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                    
                    {/* Add ILO Button */}
                    <div className="pt-2 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          if (newILO.code && newILO.description) {
                            const newILOData = {
                              code: newILO.code.trim(),
                              description: newILO.description.trim(),
                              so_mappings: newILO.selectedSO ? [{
                                so_id: parseInt(newILO.selectedSO),
                                assessment_tasks: newILO.selectedSubAssessments
                              }] : [],
                              iga_mappings: newILO.selectedIGA ? [{
                                iga_id: parseInt(newILO.selectedIGA),
                                assessment_tasks: newILO.selectedSubAssessments
                              }] : [],
                              cdio_mappings: newILO.selectedCDIO ? [{
                                cdio_id: parseInt(newILO.selectedCDIO),
                                assessment_tasks: newILO.selectedSubAssessments
                              }] : [],
                              sdg_mappings: newILO.selectedSDG ? [{
                                sdg_id: parseInt(newILO.selectedSDG),
                                assessment_tasks: newILO.selectedSubAssessments
                              }] : []
                            }
                            setIlos(prev => [...prev, { ...newILOData, ilo_id: `temp_${Date.now()}` }])
                            // Reset form but keep it open for adding more ILOs
                            setNewILO({
                              code: '',
                              description: '',
                              selectedSO: '',
                              selectedIGA: '',
                              selectedCDIO: '',
                              selectedSDG: '',
                              selectedSubAssessments: []
                            })
                            // Don't close the form - keep it open for adding multiple ILOs
                          }
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-1.5"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Add ILO
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* List of Created ILOs */}
              {ilos.length > 0 && (
                <div className="space-y-2 mt-3">
                  {ilos.map((ilo, index) => (
                    <div key={ilo.ilo_id || index} className="border border-gray-300 rounded-lg p-2 bg-gray-50">
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold text-gray-900">{ilo.code}</span>
                          </div>
                          <p className="text-xs text-gray-700 mb-1.5">{ilo.description}</p>
                          {/* Show mappings */}
                          {(ilo.so_mappings?.length > 0 || ilo.iga_mappings?.length > 0 || 
                            ilo.cdio_mappings?.length > 0 || ilo.sdg_mappings?.length > 0) && (
                            <div className="mt-1 pt-1 border-t border-gray-200">
                              <div className="flex flex-wrap gap-1 text-xs">
                                {ilo.so_mappings?.map((m, i) => {
                                  const so = soReferences.find(r => r.so_id === m.so_id)
                                  return so ? (
                                    <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">SO: {so.so_code}</span>
                                  ) : null
                                })}
                                {ilo.iga_mappings?.map((m, i) => {
                                  const iga = igaReferences.find(r => r.iga_id === m.iga_id)
                                  return iga ? (
                                    <span key={i} className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded">IGA: {iga.iga_code}</span>
                                  ) : null
                                })}
                                {ilo.cdio_mappings?.map((m, i) => {
                                  const cdio = cdioReferences.find(r => r.cdio_id === m.cdio_id)
                                  return cdio ? (
                                    <span key={i} className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded">CDIO: {cdio.cdio_code}</span>
                                  ) : null
                                })}
                                {ilo.sdg_mappings?.map((m, i) => {
                                  const sdg = sdgReferences.find(r => r.sdg_id === m.sdg_id)
                                  return sdg ? (
                                    <span key={i} className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded">SDG: {sdg.sdg_code}</span>
                                  ) : null
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
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
            </div>

            {/* Step 2: Map ILO to Sub-Assessments */}
            {ilos.length > 0 && (
              <div className="space-y-3 border-t pt-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Step 2: Map ILOs to Sub-Assessments</h3>
                  <p className="text-xs text-gray-600 mb-2">
                    Select which sub-assessments assess each ILO.
                  </p>
                </div>
            
                {/* Get all available assessment tasks from sub-assessments */}
                {(() => {
                  const allAssessmentTasks = []
                  // Primary: Add sub-assessments as tasks with scores and weights
                  formData.assessment_criteria.forEach((criterion, idx) => {
                    const subAssessments = formData.sub_assessments[idx] || []
                    subAssessments.forEach(sub => {
                      if (sub.abbreviation || sub.name) {
                        allAssessmentTasks.push({
                          code: sub.abbreviation || sub.name.substring(0, 2).toUpperCase(),
                          name: sub.name,
                          weight: parseFloat(sub.weight_percentage) || 0,
                          score: parseFloat(sub.score) || 0,
                          type: 'sub-assessment'
                        })
                      }
                    })
                    // Fallback: Add assessment criteria if no sub-assessments exist
                    if (subAssessments.length === 0 && (criterion.abbreviation || criterion.name)) {
                      allAssessmentTasks.push({
                        code: criterion.abbreviation || criterion.name.substring(0, 2).toUpperCase(),
                        name: criterion.name,
                        weight: parseFloat(criterion.weight) || 0,
                        score: 0,
                        type: 'criterion'
                      })
                    }
                  })
                  
                  if (allAssessmentTasks.length === 0) {
                    return (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                        <p className="font-medium mb-1">No sub-assessments available</p>
                        <p>Please add sub-assessments in Step 3 before mapping them to ILOs.</p>
                      </div>
                    )
                  }
                  
                  return (
                    <div className="space-y-2">
                      {ilos.map((ilo, iloIndex) => {
                        // Get assessment tasks for this ILO from all mappings
                        const iloTasks = new Set()
                        ilo.so_mappings?.forEach(m => {
                          m.assessment_tasks?.forEach(task => iloTasks.add(task))
                        })
                        ilo.iga_mappings?.forEach(m => {
                          m.assessment_tasks?.forEach(task => iloTasks.add(task))
                        })
                        ilo.cdio_mappings?.forEach(m => {
                          m.assessment_tasks?.forEach(task => iloTasks.add(task))
                        })
                        ilo.sdg_mappings?.forEach(m => {
                          m.assessment_tasks?.forEach(task => iloTasks.add(task))
                        })
                        
                        return (
                          <div key={iloIndex} className="border border-gray-300 rounded-lg p-2 bg-white">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-gray-900">{ilo.code}</span>
                                <span className="text-xs text-gray-600">- {ilo.description}</span>
                              </div>
                            </div>
                            
                            {iloTasks.size > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {Array.from(iloTasks).map(taskCode => {
                                  const task = allAssessmentTasks.find(t => t.code === taskCode) || { code: taskCode, name: taskCode, weight: 0, score: 0 }
                                  let displayText = task.code
                                  if (task.name) displayText += ` (${task.name}`
                                  if (task.weight > 0 || task.score > 0) {
                                    if (!task.name) displayText += ' ('
                                    displayText += task.weight > 0 ? `W:${task.weight}%` : ''
                                    displayText += task.weight > 0 && task.score > 0 ? ', ' : ''
                                    displayText += task.score > 0 ? `S:${task.score}` : ''
                                    displayText += ')'
                                  } else if (task.name) {
                                    displayText += ')'
                                  }
                                  return (
                                    <span
                                      key={taskCode}
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs"
                                    >
                                      {displayText}
                                    </span>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 italic">No sub-assessments mapped yet. Click "Map Sub-Assessments" to add mappings.</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Step 3: Map Sub-Assessments to Student Outcomes */}
            {ilos.length > 0 && formData.assessment_criteria.length > 0 && soReferences.length > 0 && (() => {
              // Get all sub-assessments
              const allSubAssessments = []
              formData.assessment_criteria.forEach((criterion, idx) => {
                const subAssessments = formData.sub_assessments[idx] || []
                subAssessments.forEach(sub => {
                  if (sub.abbreviation || sub.name) {
                    allSubAssessments.push({
                      code: sub.abbreviation || sub.name.substring(0, 2).toUpperCase(),
                      name: sub.name,
                      weight: parseFloat(sub.weight_percentage) || 0,
                      score: parseFloat(sub.score) || 0
                    })
                  }
                })
              })

              if (allSubAssessments.length === 0) return null

              // Get SO mappings for each sub-assessment from ILOs
              const getSOMappingsForSubAssessment = (taskCode) => {
                const soMappings = new Set()
                ilos.forEach(ilo => {
                  if (ilo.so_mappings) {
                    ilo.so_mappings.forEach(mapping => {
                      if (mapping.assessment_tasks && mapping.assessment_tasks.includes(taskCode)) {
                        soMappings.add(mapping.so_id)
                      }
                    })
                  }
                })
                return Array.from(soMappings)
              }

              return (
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Step 3: Map Sub-Assessments to Student Outcomes (SO)</h3>
                    <p className="text-xs text-gray-600 mb-2">
                      Select which Student Outcomes each sub-assessment maps to. This is automatically populated from ILO mappings.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {allSubAssessments.map((sub, idx) => {
                      const currentSOMappings = getSOMappingsForSubAssessment(sub.code)

                      return (
                        <div key={idx} className="border border-gray-300 rounded-lg p-2 bg-white">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-gray-900">{sub.code}</span>
                                <span className="text-xs text-gray-700">- {sub.name}</span>
                                {sub.weight > 0 && (
                                  <span className="text-xs text-gray-500">(W:{sub.weight}%</span>
                                )}
                                {sub.score > 0 && (
                                  <span className="text-xs text-gray-500">, S:{sub.score}</span>
                                )}
                                {sub.weight > 0 && <span className="text-xs text-gray-500">)</span>}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <select
                                value={currentSOMappings.length > 0 ? currentSOMappings.map(id => id.toString()).join(',') : ''}
                                onChange={(e) => {
                                  const selectedSOIds = e.target.value ? e.target.value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : []
                                  // Find ILOs that have this sub-assessment and update their SO mappings
                                  const updatedIlos = ilos.map(ilo => {
                                    // Check if this ILO has this sub-assessment mapped
                                    const hasTask = ilo.so_mappings?.some(m => m.assessment_tasks?.includes(sub.code)) ||
                                                   ilo.iga_mappings?.some(m => m.assessment_tasks?.includes(sub.code)) ||
                                                   ilo.cdio_mappings?.some(m => m.assessment_tasks?.includes(sub.code)) ||
                                                   ilo.sdg_mappings?.some(m => m.assessment_tasks?.includes(sub.code))
                                    
                                    if (hasTask && selectedSOIds.length > 0) {
                                      // Create new ILO object with updated SO mappings
                                      const currentSoMappings = ilo.so_mappings || []
                                      const newSoMappings = []
                                      
                                      // Add or update mappings for selected SOs
                                      selectedSOIds.forEach(soId => {
                                        let existingMapping = currentSoMappings.find(m => m.so_id === soId)
                                        if (existingMapping) {
                                          // Update existing mapping - add task if not present
                                          const tasks = existingMapping.assessment_tasks || []
                                          if (!tasks.includes(sub.code)) {
                                            newSoMappings.push({
                                              ...existingMapping,
                                              assessment_tasks: [...tasks, sub.code]
                                            })
                                          } else {
                                            newSoMappings.push(existingMapping)
                                          }
                                        } else {
                                          // Create new mapping
                                          newSoMappings.push({
                                            so_id: soId,
                                            assessment_tasks: [sub.code]
                                          })
                                        }
                                      })
                                      
                                      // Keep mappings that don't involve this task, or are in selected list
                                      currentSoMappings.forEach(m => {
                                        if (!m.assessment_tasks?.includes(sub.code) || selectedSOIds.includes(m.so_id)) {
                                          if (!newSoMappings.find(nm => nm.so_id === m.so_id && nm.assessment_tasks?.includes(sub.code))) {
                                            newSoMappings.push(m)
                                          }
                                        }
                                      })
                                      
                                      return {
                                        ...ilo,
                                        so_mappings: newSoMappings
                                      }
                                    }
                                    return ilo
                                  })
                                  
                                  // Update state
                                  setIlos(updatedIlos)
                                }}
                                className="w-full text-xs px-2.5 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                multiple
                                size={Math.min(5, soReferences.length)}
                              >
                                <option value="">Select Student Outcome(s)...</option>
                                {soReferences.map(so => (
                                  <option key={so.so_id} value={so.so_id}>
                                    {so.so_code} - {so.description?.substring(0, 50)}
                                  </option>
                                ))}
                              </select>
                              {currentSOMappings.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {currentSOMappings.map(soId => {
                                    const so = soReferences.find(r => r.so_id === soId)
                                    return so ? (
                                      <span key={soId} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                                        {so.so_code}
                                      </span>
                                    ) : null
                                  })}
                                </div>
                              )}
                              {currentSOMappings.length === 0 && (
                                <p className="mt-1 text-xs text-gray-400 italic">No Student Outcomes mapped yet</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                // Find an ILO that maps this sub-assessment and open its modal
                                const iloWithMapping = ilos.find(ilo => {
                                  const hasTask = ilo.so_mappings?.some(m => m.assessment_tasks?.includes(sub.code)) ||
                                                  ilo.iga_mappings?.some(m => m.assessment_tasks?.includes(sub.code)) ||
                                                  ilo.cdio_mappings?.some(m => m.assessment_tasks?.includes(sub.code)) ||
                                                  ilo.sdg_mappings?.some(m => m.assessment_tasks?.includes(sub.code))
                                  return hasTask
                                })
                                if (iloWithMapping) {
                                  // openILOModal removed - no edit functionality
                                } else {
                                  // If no mapping exists, open first ILO to create mapping
                                  if (ilos.length > 0) {
                                    // openILOModal removed - no edit functionality
                                  }
                                }
                              }}
                              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 whitespace-nowrap hidden"
                              title="Edit mapping via ILO (removed)"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
            
            {/* Dynamic Assessment Method and Distribution Map Table */}
            {ilos.length > 0 && formData.assessment_criteria.length > 0 && (() => {
              // Get all sub-assessments with their data
              const allSubAssessments = []
              formData.assessment_criteria.forEach((criterion, idx) => {
                const subAssessments = formData.sub_assessments[idx] || []
                subAssessments.forEach(sub => {
                  if (sub.abbreviation || sub.name) {
                    allSubAssessments.push({
                      code: sub.abbreviation || sub.name.substring(0, 2).toUpperCase(),
                      name: sub.name,
                      weight: parseFloat(sub.weight_percentage) || 0,
                      score: parseFloat(sub.score) || 0,
                      criterionName: criterion.name || '',
                      criterionWeight: parseFloat(criterion.weight) || 0
                    })
                  }
                })
              })

              // Calculate distribution percentages
              const totalWeight = allSubAssessments.reduce((sum, sub) => sum + sub.weight, 0)
              
              // Get ILO mappings for each sub-assessment with score calculations
              const getILOMappings = (taskCode, subScore, subWeight) => {
                const mappings = {}
                const subAssessment = allSubAssessments.find(s => s.code === taskCode)
                if (!subAssessment) return mappings
                
                ilos.forEach((ilo, iloIndex) => {
                  let found = false
                  // Check all mapping types
                  ;['so_mappings', 'iga_mappings', 'cdio_mappings', 'sdg_mappings'].forEach(mappingType => {
                    if (ilo[mappingType]) {
                      ilo[mappingType].forEach(mapping => {
                        if (mapping.assessment_tasks && mapping.assessment_tasks.includes(taskCode)) {
                          found = true
                        }
                      })
                    }
                  })
                  if (found) {
                    // Calculate contribution percentage based on weight
                    const weightContribution = (totalWeight > 0) ? 
                      (subAssessment.weight / totalWeight * 100) : 0
                    
                    // Calculate score contribution: (score * weight) / total possible
                    // Assuming scores are out of 100, calculate weighted contribution
                    const scoreContribution = subScore > 0 && totalWeight > 0 ?
                      (subScore * subAssessment.weight) / totalWeight : 0
                    
                    mappings[iloIndex + 1] = {
                      weightPct: Math.round(weightContribution * 10) / 10,
                      score: Math.round(scoreContribution * 10) / 10
                    }
                  }
                })
                return mappings
              }

              if (allSubAssessments.length === 0) return null

              return (
                <div className="mt-4 border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Assessment Method and Distribution Map</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-900">Code</th>
                          <th className="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-900">Assessment Tasks</th>
                          <th className="px-2 py-1.5 border border-gray-300 text-center font-semibold text-gray-900">I/R/D</th>
                          <th className="px-2 py-1.5 border border-gray-300 text-center font-semibold text-gray-900">(%)</th>
                          {ilos.map((ilo, idx) => (
                            <th key={idx} className="px-2 py-1.5 border border-gray-300 text-center font-semibold text-gray-900">{idx + 1}</th>
                          ))}
                          <th className="px-2 py-1.5 border border-gray-300 text-center font-semibold text-gray-900">Domains</th>
                        </tr>
                        <tr className="bg-gray-100">
                          <th colSpan="4" className="px-2 py-1 border border-gray-300"></th>
                          <th colSpan={ilos.length} className="px-2 py-1 border border-gray-300 text-center font-medium text-gray-700">Intended Learning Outcomes</th>
                          <th className="px-2 py-1 border border-gray-300"></th>
                        </tr>
                        <tr className="bg-gray-100">
                          <th colSpan="4" className="px-2 py-1 border border-gray-300"></th>
                          {ilos.map((ilo, idx) => (
                            <th key={idx} className="px-2 py-1 border border-gray-300 text-center font-medium text-gray-700">{ilo.code}</th>
                          ))}
                          <th className="px-2 py-1 border border-gray-300 text-center font-medium text-gray-700">
                            <div className="flex justify-center gap-2">
                              <span>C</span>
                              <span>P</span>
                              <span>A</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {allSubAssessments.map((sub, idx) => {
                          const iloMappings = getILOMappings(sub.code, sub.score, sub.weight)
                          const distributionPct = totalWeight > 0 ? 
                            Math.round((sub.weight / totalWeight) * 100) : 0
                          
                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-2 py-1.5 border border-gray-300 font-medium text-gray-900">{sub.code}</td>
                              <td className="px-2 py-1.5 border border-gray-300 text-gray-700">{sub.name}</td>
                              <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-600">R</td>
                              <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-700">{sub.weight}%</td>
                              {ilos.map((ilo, iloIdx) => {
                                const mapping = iloMappings[iloIdx + 1]
                                const contribution = mapping ? mapping.weightPct : 0
                                const scoreValue = mapping ? mapping.score : 0
                                return (
                                  <td key={iloIdx} className="px-2 py-1.5 border border-gray-300 text-center text-gray-700">
                                    {contribution > 0 ? (
                                      <div>
                                        <div className="font-medium">{contribution}%</div>
                                        {scoreValue > 0 && (
                                          <div className="text-xs text-gray-500">({scoreValue.toFixed(1)})</div>
                                        )}
                                      </div>
                                    ) : '—'}
                                  </td>
                                )
                              })}
                              <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-700">
                                <div className="flex justify-center gap-2">
                                  <span>—</span>
                                  <span>{sub.score > 0 ? sub.score.toFixed(1) : '100'}</span>
                                  <span>—</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                        <tr className="bg-gray-100 font-semibold">
                          <td colSpan="3" className="px-2 py-1.5 border border-gray-300 text-right">Total:</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-center">{totalWeight}%</td>
                          {ilos.map((ilo, iloIdx) => {
                            const totalStats = allSubAssessments.reduce((acc, sub) => {
                              const iloMappings = getILOMappings(sub.code, sub.score, sub.weight)
                              const mapping = iloMappings[iloIdx + 1]
                              if (mapping) {
                                acc.weightPct += mapping.weightPct
                                acc.score += mapping.score
                              }
                              return acc
                            }, { weightPct: 0, score: 0 })
                            
                            return (
                              <td key={iloIdx} className="px-2 py-1.5 border border-gray-300 text-center">
                                {totalStats.weightPct > 0 ? (
                                  <div>
                                    <div className="font-medium">{totalStats.weightPct.toFixed(1)}%</div>
                                    {totalStats.score > 0 && (
                                      <div className="text-xs text-gray-600">({totalStats.score.toFixed(1)})</div>
                                    )}
                                  </div>
                                ) : '—'}
                              </td>
                            )
                          })}
                          <td className="px-2 py-1.5 border border-gray-300 text-center">
                            <div className="flex justify-center gap-2">
                              <span>—</span>
                              <span>{allSubAssessments.reduce((sum, sub) => sum + (sub.score || 0), 0).toFixed(1)}</span>
                              <span>—</span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}

            {/* Dynamic ILO Mapping Tables */}
            {ilos.length > 0 && (() => {
              // Get all sub-assessments for score calculations
              const allSubAssessmentsForScore = []
              formData.assessment_criteria.forEach((criterion, idx) => {
                const subAssessments = formData.sub_assessments[idx] || []
                subAssessments.forEach(sub => {
                  if (sub.abbreviation || sub.name) {
                    allSubAssessmentsForScore.push({
                      code: sub.abbreviation || sub.name.substring(0, 2).toUpperCase(),
                      name: sub.name,
                      weight: parseFloat(sub.weight_percentage) || 0,
                      score: parseFloat(sub.score) || 0
                    })
                  }
                })
              })
              
              const totalWeightForScore = allSubAssessmentsForScore.reduce((sum, sub) => sum + sub.weight, 0)
              
              // Calculate score contribution for mapped tasks
              const calculateScoreForTasks = (taskCodes) => {
                if (!taskCodes || taskCodes.length === 0) return { totalScore: 0, totalWeight: 0, display: '—' }
                
                let totalScore = 0
                let totalWeight = 0
                const taskDetails = []
                
                taskCodes.forEach(code => {
                  const sub = allSubAssessmentsForScore.find(s => s.code === code)
                  if (sub) {
                    // Calculate weighted contribution
                    const weightedScore = totalWeightForScore > 0 ? 
                      (sub.score * sub.weight) / totalWeightForScore : 0
                    totalScore += weightedScore
                    totalWeight += sub.weight
                    taskDetails.push(`${code}(${weightedScore.toFixed(1)})`)
                  }
                })
                
                return {
                  totalScore: Math.round(totalScore * 10) / 10,
                  totalWeight,
                  display: taskCodes.join(', '),
                  details: taskDetails.join(', ')
                }
              }
              
              // Build comprehensive mapping tables
              const getAssessmentTasksForMapping = (ilo, mappingType) => {
                const tasks = new Set()
                if (ilo[mappingType]) {
                  ilo[mappingType].forEach(mapping => {
                    if (mapping.assessment_tasks) {
                      mapping.assessment_tasks.forEach(task => tasks.add(task))
                    }
                  })
                }
                return Array.from(tasks)
              }

              return (
                <div className="mt-4 border-t pt-4 space-y-4">
                  {/* ILO-SO and ILO-CPA Mapping */}
                  {soReferences.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">ILO-SO and ILO-CPA Mapping</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border border-gray-300">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-900">ILOs</th>
                              {soReferences.map((so, idx) => (
                                <th key={idx} className="px-2 py-1.5 border border-gray-300 text-center font-semibold text-gray-900">{so.so_code}</th>
                              ))}
                              <th className="px-2 py-1.5 border border-gray-300 text-center font-semibold text-gray-900">C</th>
                              <th className="px-2 py-1.5 border border-gray-300 text-center font-semibold text-gray-900">P</th>
                              <th className="px-2 py-1.5 border border-gray-300 text-center font-semibold text-gray-900">A</th>
                            </tr>
                            <tr className="bg-gray-100">
                              <th className="px-2 py-1 border border-gray-300 text-left font-medium text-gray-700">STUDENT OUTCOMES (SO): Mapping of Assessment Tasks (AT)</th>
                              {soReferences.map((so, idx) => (
                                <th key={idx} className="px-2 py-1 border border-gray-300"></th>
                              ))}
                              <th colSpan="3" className="px-2 py-1 border border-gray-300 text-center font-medium text-gray-700">Domains</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {ilos.map((ilo, iloIdx) => {
                              const soTasks = getAssessmentTasksForMapping(ilo, 'so_mappings')
                              const soTaskScores = calculateScoreForTasks(soTasks)
                              return (
                                <tr key={iloIdx} className="hover:bg-gray-50">
                                  <td className="px-2 py-1.5 border border-gray-300">
                                    <div className="font-medium text-gray-900">{ilo.code}</div>
                                    <div className="text-xs text-gray-500 truncate max-w-xs">{ilo.description}</div>
                                  </td>
                                  {soReferences.map((so, soIdx) => {
                                    const mapping = ilo.so_mappings?.find(m => m.so_id === so.so_id)
                                    const tasks = mapping?.assessment_tasks || []
                                    const taskScores = calculateScoreForTasks(tasks)
                                    return (
                                      <td key={soIdx} className="px-2 py-1.5 border border-gray-300 text-center text-gray-700">
                                        {tasks.length > 0 ? (
                                          <div>
                                            <div className="text-xs">{taskScores.display}</div>
                                            {taskScores.totalScore > 0 && (
                                              <div className="text-xs font-semibold text-red-600 mt-0.5">{taskScores.totalScore.toFixed(1)}</div>
                                            )}
                                          </div>
                                        ) : '—'}
                                      </td>
                                    )
                                  })}
                                  <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-700">—</td>
                                  <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-700">
                                    {soTasks.length > 0 ? (
                                      <div>
                                        <div className="text-xs">{soTaskScores.display}</div>
                                        {soTaskScores.totalScore > 0 && (
                                          <div className="text-xs font-semibold text-red-600 mt-0.5">{soTaskScores.totalScore.toFixed(1)}</div>
                                        )}
                                      </div>
                                    ) : '—'}
                                  </td>
                                  <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-700">—</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ILO-IGA Mapping */}
                  {igaReferences.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">ILO-IGA Mapping</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border border-gray-300">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-900">ILOs</th>
                              {igaReferences.map((iga, idx) => (
                                <th key={idx} className="px-2 py-1.5 border border-gray-300 text-center font-semibold text-gray-900">{iga.iga_code}</th>
                              ))}
                            </tr>
                            <tr className="bg-gray-100">
                              <th className="px-2 py-1 border border-gray-300 text-left font-medium text-gray-700">INSTITUTIONAL GRADUATE ATTRIBUTES (IGA): Mapping of Assessment Tasks (AT)</th>
                              {igaReferences.map((iga, idx) => (
                                <th key={idx} className="px-2 py-1 border border-gray-300"></th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {ilos.map((ilo, iloIdx) => (
                              <tr key={iloIdx} className="hover:bg-gray-50">
                                <td className="px-2 py-1.5 border border-gray-300">
                                  <div className="font-medium text-gray-900">{ilo.code}</div>
                                  <div className="text-xs text-gray-500 truncate max-w-xs">{ilo.description}</div>
                                </td>
                                {igaReferences.map((iga, igaIdx) => {
                                  const mapping = ilo.iga_mappings?.find(m => m.iga_id === iga.iga_id)
                                  const tasks = mapping?.assessment_tasks || []
                                  const taskScores = calculateScoreForTasks(tasks)
                                  return (
                                    <td key={igaIdx} className="px-2 py-1.5 border border-gray-300 text-center text-gray-700">
                                      {tasks.length > 0 ? (
                                        <div>
                                          <div className="text-xs">{taskScores.display}</div>
                                          {taskScores.totalScore > 0 && (
                                            <div className="text-xs font-semibold text-red-600 mt-0.5">{taskScores.totalScore.toFixed(1)}</div>
                                          )}
                                        </div>
                                      ) : '—'}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ILO-CDIO and ILO-SDG Mapping */}
                  {(cdioReferences.length > 0 || sdgReferences.length > 0) && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">ILO-CDIO and ILO-SDG Mapping</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {cdioReferences.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border border-gray-300">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-900">ILOs</th>
                                  {cdioReferences.map((cdio, idx) => (
                                    <th key={idx} className="px-2 py-1.5 border border-gray-300 text-center font-semibold text-gray-900">{cdio.cdio_code}</th>
                                  ))}
                                </tr>
                                <tr className="bg-gray-100">
                                  <th className="px-2 py-1 border border-gray-300 text-left font-medium text-gray-700">CDIO SKILLS</th>
                                  {cdioReferences.map((cdio, idx) => (
                                    <th key={idx} className="px-2 py-1 border border-gray-300"></th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="bg-white">
                                {ilos.map((ilo, iloIdx) => (
                                  <tr key={iloIdx} className="hover:bg-gray-50">
                                    <td className="px-2 py-1.5 border border-gray-300">
                                      <div className="font-medium text-gray-900">{ilo.code}</div>
                                    </td>
                                    {cdioReferences.map((cdio, cdioIdx) => {
                                      const mapping = ilo.cdio_mappings?.find(m => m.cdio_id === cdio.cdio_id)
                                      const tasks = mapping?.assessment_tasks || []
                                      const taskScores = calculateScoreForTasks(tasks)
                                      return (
                                        <td key={cdioIdx} className="px-2 py-1.5 border border-gray-300 text-center text-gray-700">
                                          {tasks.length > 0 ? (
                                            <div>
                                              <div className="text-xs">{taskScores.display}</div>
                                              {taskScores.totalScore > 0 && (
                                                <div className="text-xs font-semibold text-red-600 mt-0.5">{taskScores.totalScore.toFixed(1)}</div>
                                              )}
                                            </div>
                                          ) : '—'}
                                        </td>
                                      )
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {sdgReferences.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border border-gray-300">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-2 py-1.5 border border-gray-300 text-left font-semibold text-gray-900">ILOs</th>
                                  {sdgReferences.map((sdg, idx) => (
                                    <th key={idx} className="px-2 py-1.5 border border-gray-300 text-center font-semibold text-gray-900">{sdg.sdg_code}</th>
                                  ))}
                                </tr>
                                <tr className="bg-gray-100">
                                  <th className="px-2 py-1 border border-gray-300 text-left font-medium text-gray-700">SDG Skills</th>
                                  {sdgReferences.map((sdg, idx) => (
                                    <th key={idx} className="px-2 py-1 border border-gray-300"></th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="bg-white">
                                {ilos.map((ilo, iloIdx) => (
                                  <tr key={iloIdx} className="hover:bg-gray-50">
                                    <td className="px-2 py-1.5 border border-gray-300">
                                      <div className="font-medium text-gray-900">{ilo.code}</div>
                                    </td>
                                    {sdgReferences.map((sdg, sdgIdx) => {
                                      const mapping = ilo.sdg_mappings?.find(m => m.sdg_id === sdg.sdg_id)
                                      const tasks = mapping?.assessment_tasks || []
                                      const taskScores = calculateScoreForTasks(tasks)
                                      return (
                                        <td key={sdgIdx} className="px-2 py-1.5 border border-gray-300 text-center text-gray-700">
                                          {tasks.length > 0 ? (
                                            <div>
                                              <div className="text-xs">{taskScores.display}</div>
                                              {taskScores.totalScore > 0 && (
                                                <div className="text-xs font-semibold text-red-600 mt-0.5">{taskScores.totalScore.toFixed(1)}</div>
                                              )}
                                            </div>
                                          ) : '—'}
                                        </td>
                                      )
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ILO to Student Outcomes Mapping Section */}
             {ilos.length > 0 && (
               <div className="mt-4 border-t pt-4">
                 <h4 className="text-sm font-semibold text-gray-900 mb-2">ILO Mapping to Student Outcomes</h4>
                 <p className="text-xs text-gray-600 mb-2">
                  Map ILOs to Student Outcomes (SO) to demonstrate alignment with program outcomes. Click "Edit ILO" to add or modify mappings.
                </p>
                
                <div className="space-y-2">
                  {ilos.map((ilo, index) => (
                    <div key={index} className="border border-gray-300 rounded-lg p-2 bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-xs font-semibold text-gray-900">{ilo.code}</span>
                            <span className="text-xs text-gray-600">{ilo.description}</span>
                          </div>
                        </div>
                        {/* Edit button removed - no edit functionality */}
                      </div>
                      
                       {ilo.so_mappings && ilo.so_mappings.length > 0 ? (
                         <div className="space-y-1.5">
                           {ilo.so_mappings.map((mapping, mapIndex) => {
                             const so = soReferences.find(r => r.so_id === mapping.so_id)
                             return (
                               <div key={mapIndex} className="p-1.5 bg-blue-50 rounded border border-blue-200">
                                 <div className="flex items-center gap-1.5">
                                   <span className="font-medium text-blue-900 text-xs">
                                     {so?.so_code || mapping.so_id}
                                   </span>
                                   {mapping.assessment_tasks && mapping.assessment_tasks.length > 0 && (
                                     <>
                                       <span className="text-gray-400">•</span>
                                       <span className="text-xs text-gray-600">
                                         Assessment Tasks: {mapping.assessment_tasks.join(', ')}
                                       </span>
                                     </>
                                   )}
                                 </div>
                                 {so?.description && (
                                   <p className="text-xs text-gray-600 mt-0.5">{so.description}</p>
                                 )}
                               </div>
                             )
                           })}
                         </div>
                       ) : (
                         <p className="text-xs text-gray-500 italic">No Student Outcomes mapped yet. Click "Edit Mappings" to add mappings.</p>
                       )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> ILOs will be saved when you create/update the syllabus. 
                Click "Edit ILO" or "Map Assessment Tasks" on any ILO to add mappings to Student Outcomes (SO), 
                Institutional Graduate Attributes (IGA), CDIO Skills, and SDG Skills. 
                You can also manage mappings in the ILO Mapping section after the syllabus is created.
              </p>
            </div>
          </div>
        )
        
      case 6:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Books and Other References</h3>
              <p className="text-xs text-gray-600 mb-2">Add learning resources such as textbooks, websites, and materials</p>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                References
              </label>
              
              {formData.learning_resources.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {formData.learning_resources.map((resource, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-900">{resource}</span>
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
                  className="flex-1 px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter reference (e.g., Author, Title. Publisher. Retrieved date, from URL)"
                />
                <button
                  type="button"
                  onClick={handleAddResource}
                  className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1.5"
                >
                  <PlusIcon className="h-4 w-4" />
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
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Course Policies - Grading System</h3>
              <p className="text-xs text-gray-600 mb-2">Define the grading scale for the course</p>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Grade Scale
              </label>
              <div className="space-y-1.5">
                {formData.grading_policy.scale.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={item.grade}
                        onChange={(e) => {
                          const newScale = [...formData.grading_policy.scale]
                          newScale[index].grade = e.target.value
                          handleNestedChange('grading_policy.scale', newScale)
                        }}
                        className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                        className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                        className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
              
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newGradeItem.grade}
                  onChange={(e) => setNewGradeItem(prev => ({ ...prev, grade: e.target.value }))}
                  className="flex-1 px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Grade"
                />
                <input
                  type="text"
                  value={newGradeItem.range}
                  onChange={(e) => setNewGradeItem(prev => ({ ...prev, range: e.target.value }))}
                  className="flex-1 px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Range"
                />
                <input
                  type="text"
                  value={newGradeItem.description}
                  onChange={(e) => setNewGradeItem(prev => ({ ...prev, description: e.target.value }))}
                  className="flex-1 px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Description"
                />
                <button
                  type="button"
                  onClick={handleAddGradeItem}
                  className="px-2.5 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Remedial Activity Note
              </label>
              <textarea
                value={formData.grading_policy.remedial_note}
                onChange={(e) => handleNestedChange('grading_policy.remedial_note', e.target.value)}
                rows={2}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[85vh] my-4 shadow-xl flex flex-col mx-auto">
        {/* Header */}
        <div className="px-3 py-1.5 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              {editingSyllabus ? 'Edit Syllabus' : 'Create New Syllabus'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {selectedClass && `${selectedClass.course_code} - ${selectedClass.course_title}`}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>
        
        {/* Progress Steps */}
        <div className="px-3 py-1.5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number
              
              return (
                <React.Fragment key={step.number}>
                  <div className="flex items-center">
                    <div className={`flex flex-col items-center ${isActive ? 'text-red-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                        isActive ? 'border-red-600 bg-red-50' : 
                        isCompleted ? 'border-green-600 bg-green-50' : 
                        'border-gray-300 bg-white'
                      }`}>
                        {isCompleted ? (
                          <CheckCircleIcon className="h-3 w-3" />
                        ) : (
                          <Icon className="h-3 w-3" />
                        )}
                      </div>
                      <span className={`mt-0.5 text-[9px] font-medium ${isActive ? 'text-red-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                        {step.title}
                      </span>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`} />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>
        
        {/* Content */}
        <div className="px-3 py-3 max-h-[60vh] overflow-y-auto">
          {renderStepContent()}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span>Step {currentStep} of {totalSteps}</span>
            {editingSyllabus && editingSyllabus.status === 'draft' && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">Draft</span>
            )}
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-2 py-1 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-100 transition-colors flex items-center gap-1"
              title="Save as draft without validation"
            >
              <DocumentTextIcon className="h-3 w-3" />
              Save Draft
            </button>
            
            <button
              type="button"
              onClick={handleClose}
              className="px-2 py-1 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="px-2 py-1 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
              >
                <ChevronLeftIcon className="h-3 w-3" />
                Previous
              </button>
            )}
            
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-1"
              >
                Next
                <ChevronRightIcon className="h-3 w-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-1"
              >
                <CheckCircleIcon className="h-3 w-3" />
                {editingSyllabus ? 'Update Syllabus' : 'Create Syllabus'}
              </button>
            )}
          </div>
        </div>
      </div>
      
       {/* ILO Creation/Edit Modal - REMOVED - Using inline form instead */}
       {false && showILOModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-[60]">
           <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
             <div className="p-4">
               <div className="flex items-center justify-between mb-3">
                 <div>
                   <h3 className="text-sm font-bold text-gray-900">
                     {editingILO ? 'Edit ILO' : 'Create New ILO'}
                   </h3>
                   <p className="text-xs text-gray-500 mt-0.5">
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
               <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-2">
                 <div className="flex items-start gap-2">
                   <AcademicCapIcon className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                   <div className="flex-1">
                     <h4 className="text-xs font-semibold text-blue-900 mb-0.5">Quick Guide</h4>
                    <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                      <li><strong>ILO Code:</strong> Use a unique identifier (e.g., ILO1, ILO2)</li>
                      <li><strong>Description:</strong> Write a clear, measurable learning outcome</li>
                      <li><strong>Mapping:</strong> Link ILOs to Student Outcomes (SO), IGA, CDIO, or SDG to show alignment</li>
                    </ul>
                  </div>
                </div>
              </div>
              
               <div className="space-y-3">
                 {/* ILO Code */}
                 <div>
                   <label className="block text-xs font-medium text-gray-700 mb-0.5">
                     ILO Code <span className="text-red-500">*</span>
                   </label>
                   <input
                     type="text"
                     value={iloFormData.code}
                     onChange={(e) => setIloFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                     className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g., ILO1, ILO2"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Use a unique code to identify this learning outcome</p>
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                   <textarea
                     value={iloFormData.description}
                     onChange={(e) => setIloFormData(prev => ({ ...prev, description: e.target.value }))}
                     rows={3}
                     className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Example: 'Students will be able to analyze and design database systems using SQL and NoSQL technologies to solve real-world data management problems.'"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Write a clear, measurable statement. Use action verbs like "analyze", "design", "evaluate", "create"
                  </p>
                </div>
                
                 {/* Mapping Section */}
                 <div className="mt-4 border-t border-gray-200 pt-4">
                   <div className="mb-3">
                     <h4 className="text-xs font-semibold text-gray-900 mb-1.5">Map to Educational Goals (Optional)</h4>
                     <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
                       <p className="text-xs text-amber-800">
                        <strong>Why map ILOs?</strong> Mapping connects your course learning outcomes to institutional goals (SO, IGA, CDIO, SDG). 
                        This demonstrates how your course contributes to program objectives. You can add mappings now or later in the ILO Mapping section.
                      </p>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                       <div className="text-xs">
                         <p className="font-medium text-gray-700 mb-0.5">📋 SO (Student Outcomes)</p>
                         <p className="text-gray-600 text-xs">Program-specific learning outcomes</p>
                       </div>
                       <div className="text-xs">
                         <p className="font-medium text-gray-700 mb-0.5">🎓 IGA (Institutional Graduate Attributes)</p>
                         <p className="text-gray-600 text-xs">University-wide graduate attributes</p>
                       </div>
                       <div className="text-xs">
                         <p className="font-medium text-gray-700 mb-0.5">🔧 CDIO</p>
                         <p className="text-gray-600 text-xs">Conceive, Design, Implement, Operate framework</p>
                       </div>
                       <div className="text-xs">
                         <p className="font-medium text-gray-700 mb-0.5">🌍 SDG (Sustainable Development Goals)</p>
                         <p className="text-gray-600 text-xs">UN sustainability goals alignment</p>
                       </div>
                     </div>
                   </div>
                   
                   {/* SO Mappings */}
                   <div className="mb-3">
                     <label className="block text-xs font-medium text-gray-700 mb-1.5">
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
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Select Sub-Assessments:
                                  {assessmentTasks.length === 0 && (
                                    <span className="ml-2 text-red-500 text-xs">(No sub-assessments added yet)</span>
                                  )}
                                </label>
                                {assessmentTasks.length > 0 ? (
                                  <div className="relative">
                                    <select
                                      multiple
                                      value={mappingTaskSelection}
                                      onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value)
                                        setMappingTaskSelection(selected)
                                      }}
                                      className="w-full text-xs px-2.5 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[100px]"
                                      size="5"
                                    >
                                      {assessmentTasks.map(task => (
                                        <option key={task.code} value={task.code}>
                                          {task.label} {task.weight > 0 ? `(W:${task.weight}%` : ''}{task.weight > 0 && task.score > 0 ? ', ' : ''}{task.score > 0 ? `S:${task.score}` : ''}{task.weight > 0 ? ')' : ''}
                                        </option>
                                      ))}
                                    </select>
                                    <p className="mt-1 text-xs text-gray-500">
                                      {mappingTaskSelection.length > 0 
                                        ? `${mappingTaskSelection.length} sub-assessment(s) selected (Hold Ctrl/Cmd to select multiple)`
                                        : 'Hold Ctrl/Cmd and click to select multiple sub-assessments'}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                    <p className="font-medium mb-1">No sub-assessments available</p>
                                    <p>Please add sub-assessments in Step 3 before mapping them to ILOs.</p>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleUpdateMappingTasks('so', index, mappingTaskSelection)
                                      setEditingMapping({ type: null, index: null })
                                      setMappingTaskSelection([])
                                    }}
                                    className="text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                                  >
                                    <CheckCircleIcon className="h-3 w-3" />
                                    Save Selection
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMapping({ type: null, index: null })
                                      setMappingTaskSelection([])
                                    }}
                                    className="text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-600">
                                {mapping.assessment_tasks?.length > 0 ? (
                                  <span>Tasks: {mapping.assessment_tasks.map(code => {
                                    const task = assessmentTasks.find(t => t.code === code)
                                    if (!task) return code
                                    let display = task.label || code
                                    if (task.weight > 0 || task.score > 0) {
                                      display += ' ('
                                      if (task.weight > 0) display += `W:${task.weight}%`
                                      if (task.weight > 0 && task.score > 0) display += ', '
                                      if (task.score > 0) display += `S:${task.score}`
                                      display += ')'
                                    }
                                    return display
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
                         className="w-full text-xs px-2.5 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Select Sub-Assessments:
                                  {assessmentTasks.length === 0 && (
                                    <span className="ml-2 text-red-500 text-xs">(No sub-assessments added yet)</span>
                                  )}
                                </label>
                                {assessmentTasks.length > 0 ? (
                                  <div className="relative">
                                    <select
                                      multiple
                                      value={mappingTaskSelection}
                                      onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value)
                                        setMappingTaskSelection(selected)
                                      }}
                                      className="w-full text-xs px-2.5 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[100px]"
                                      size="5"
                                    >
                                      {assessmentTasks.map(task => (
                                        <option key={task.code} value={task.code}>
                                          {task.label} {task.weight > 0 ? `(W:${task.weight}%` : ''}{task.weight > 0 && task.score > 0 ? ', ' : ''}{task.score > 0 ? `S:${task.score}` : ''}{task.weight > 0 ? ')' : ''}
                                        </option>
                                      ))}
                                    </select>
                                    <p className="mt-1 text-xs text-gray-500">
                                      {mappingTaskSelection.length > 0 
                                        ? `${mappingTaskSelection.length} sub-assessment(s) selected (Hold Ctrl/Cmd to select multiple)`
                                        : 'Hold Ctrl/Cmd and click to select multiple sub-assessments'}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                    <p className="font-medium mb-1">No sub-assessments available</p>
                                    <p>Please add sub-assessments in Step 3 before mapping them to ILOs.</p>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleUpdateMappingTasks('iga', index, mappingTaskSelection)
                                      setEditingMapping({ type: null, index: null })
                                      setMappingTaskSelection([])
                                    }}
                                    className="text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                                  >
                                    <CheckCircleIcon className="h-3 w-3" />
                                    Save Selection
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMapping({ type: null, index: null })
                                      setMappingTaskSelection([])
                                    }}
                                    className="text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-600">
                                {mapping.assessment_tasks?.length > 0 ? (
                                  <span>Tasks: {mapping.assessment_tasks.map(code => {
                                    const task = assessmentTasks.find(t => t.code === code)
                                    if (!task) return code
                                    let display = task.label || code
                                    if (task.weight > 0 || task.score > 0) {
                                      display += ' ('
                                      if (task.weight > 0) display += `W:${task.weight}%`
                                      if (task.weight > 0 && task.score > 0) display += ', '
                                      if (task.score > 0) display += `S:${task.score}`
                                      display += ')'
                                    }
                                    return display
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
                         className="w-full text-xs px-2.5 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Select Sub-Assessments:
                                  {assessmentTasks.length === 0 && (
                                    <span className="ml-2 text-red-500 text-xs">(No sub-assessments added yet)</span>
                                  )}
                                </label>
                                {assessmentTasks.length > 0 ? (
                                  <div className="relative">
                                    <select
                                      multiple
                                      value={mappingTaskSelection}
                                      onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value)
                                        setMappingTaskSelection(selected)
                                      }}
                                      className="w-full text-xs px-2.5 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[100px]"
                                      size="5"
                                    >
                                      {assessmentTasks.map(task => (
                                        <option key={task.code} value={task.code}>
                                          {task.label} {task.weight > 0 ? `(W:${task.weight}%` : ''}{task.weight > 0 && task.score > 0 ? ', ' : ''}{task.score > 0 ? `S:${task.score}` : ''}{task.weight > 0 ? ')' : ''}
                                        </option>
                                      ))}
                                    </select>
                                    <p className="mt-1 text-xs text-gray-500">
                                      {mappingTaskSelection.length > 0 
                                        ? `${mappingTaskSelection.length} sub-assessment(s) selected (Hold Ctrl/Cmd to select multiple)`
                                        : 'Hold Ctrl/Cmd and click to select multiple sub-assessments'}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                    <p className="font-medium mb-1">No sub-assessments available</p>
                                    <p>Please add sub-assessments in Step 3 before mapping them to ILOs.</p>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleUpdateMappingTasks('cdio', index, mappingTaskSelection)
                                      setEditingMapping({ type: null, index: null })
                                      setMappingTaskSelection([])
                                    }}
                                    className="text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                                  >
                                    <CheckCircleIcon className="h-3 w-3" />
                                    Save Selection
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMapping({ type: null, index: null })
                                      setMappingTaskSelection([])
                                    }}
                                    className="text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-600">
                                {mapping.assessment_tasks?.length > 0 ? (
                                  <span>Tasks: {mapping.assessment_tasks.map(code => {
                                    const task = assessmentTasks.find(t => t.code === code)
                                    if (!task) return code
                                    let display = task.label || code
                                    if (task.weight > 0 || task.score > 0) {
                                      display += ' ('
                                      if (task.weight > 0) display += `W:${task.weight}%`
                                      if (task.weight > 0 && task.score > 0) display += ', '
                                      if (task.score > 0) display += `S:${task.score}`
                                      display += ')'
                                    }
                                    return display
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
                         className="w-full text-xs px-2.5 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Select Sub-Assessments:
                                  {assessmentTasks.length === 0 && (
                                    <span className="ml-2 text-red-500 text-xs">(No sub-assessments added yet)</span>
                                  )}
                                </label>
                                {assessmentTasks.length > 0 ? (
                                  <div className="relative">
                                    <select
                                      multiple
                                      value={mappingTaskSelection}
                                      onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value)
                                        setMappingTaskSelection(selected)
                                      }}
                                      className="w-full text-xs px-2.5 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[100px]"
                                      size="5"
                                    >
                                      {assessmentTasks.map(task => (
                                        <option key={task.code} value={task.code}>
                                          {task.label} {task.weight > 0 ? `(W:${task.weight}%` : ''}{task.weight > 0 && task.score > 0 ? ', ' : ''}{task.score > 0 ? `S:${task.score}` : ''}{task.weight > 0 ? ')' : ''}
                                        </option>
                                      ))}
                                    </select>
                                    <p className="mt-1 text-xs text-gray-500">
                                      {mappingTaskSelection.length > 0 
                                        ? `${mappingTaskSelection.length} sub-assessment(s) selected (Hold Ctrl/Cmd to select multiple)`
                                        : 'Hold Ctrl/Cmd and click to select multiple sub-assessments'}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                    <p className="font-medium mb-1">No sub-assessments available</p>
                                    <p>Please add sub-assessments in Step 3 before mapping them to ILOs.</p>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleUpdateMappingTasks('sdg', index, mappingTaskSelection)
                                      setEditingMapping({ type: null, index: null })
                                      setMappingTaskSelection([])
                                    }}
                                    className="text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                                  >
                                    <CheckCircleIcon className="h-3 w-3" />
                                    Save Selection
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMapping({ type: null, index: null })
                                      setMappingTaskSelection([])
                                    }}
                                    className="text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-600">
                                {mapping.assessment_tasks?.length > 0 ? (
                                  <span>Tasks: {mapping.assessment_tasks.map(code => {
                                    const task = assessmentTasks.find(t => t.code === code)
                                    if (!task) return code
                                    let display = task.label || code
                                    if (task.weight > 0 || task.score > 0) {
                                      display += ' ('
                                      if (task.weight > 0) display += `W:${task.weight}%`
                                      if (task.weight > 0 && task.score > 0) display += ', '
                                      if (task.score > 0) display += `S:${task.score}`
                                      display += ')'
                                    }
                                    return display
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
                         className="w-full text-xs px-2.5 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                    className="flex-1 px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveILO}
                    disabled={!iloFormData.code || !iloFormData.description}
                    className="flex-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

