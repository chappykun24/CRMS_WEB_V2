import React, { useEffect, useMemo, useState } from 'react'
import { BookOpenIcon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid'
import { useSidebar } from '../../contexts/SidebarContext'
import { enhancedApi } from '../../utils/api'

const TabButton = ({ isActive, onClick, children }) => (
  <button
    onClick={onClick}
    className={`tab-button py-4 px-4 font-medium text-sm ${
      isActive ? 'text-red-600' : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    {children}
  </button>
)

const CourseManagement = () => {
  const { sidebarExpanded } = useSidebar()
  const [activeTab, setActiveTab] = useState('programs') // Only programs tab now
  const [query, setQuery] = useState('')

  // Selections
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [selectedSpecializationId, setSelectedSpecializationId] = useState('')
  const [selectedTermId, setSelectedTermId] = useState('')

  // Data
  const [programs, setPrograms] = useState([])
  const [specializations, setSpecializations] = useState([])
  const [terms, setTerms] = useState([])
  const [courses, setCourses] = useState([])

  // UI state
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createModalType, setCreateModalType] = useState('') // 'program', 'specialization', 'course'
  const [isEditMode, setIsEditMode] = useState(false)
  const [editIds, setEditIds] = useState({ programId: null, specializationId: null, courseId: null })
  const [loading, setLoading] = useState(false)
  const [showGeneralSubjects, setShowGeneralSubjects] = useState(false)
  
  // Messages
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  
  // Form states
  const [formData, setFormData] = useState({
    program: { name: '', abbreviation: '' },
    specialization: { name: '', abbreviation: '', program_id: '' },
    course: { course_code: '', title: '', specialization_id: '', term_id: '' }
  })

  // Helper function to format term display
  const formatTermDisplay = (termId) => {
    if (!termId) return 'termId'
    const term = terms.find(t => String(t.term_id) === String(termId))
    if (!term) return termId
    
    if (term.semester === '1') return '1st Semester'
    if (term.semester === '2') return '2nd Semester'
    if (term.semester === '3') return 'Summer'
    return term.semester || termId
  }

  // Modal handlers
  const openCreateModal = (type) => {
    setCreateModalType(type)
    setShowCreateModal(true)
    setIsEditMode(false)
    setEditIds({ programId: null, specializationId: null, courseId: null })
    // Reset form data
    setFormData({
      program: { name: '', abbreviation: '' },
      specialization: { name: '', abbreviation: '', program_id: '' },
      course: { course_code: '', title: '', specialization_id: '', term_id: '' }
    })
  }

  const openEditModal = (type, item) => {
    setCreateModalType(type)
    setIsEditMode(true)
    setShowCreateModal(true)
    if (type === 'program') {
      setEditIds({ programId: item.program_id, specializationId: null, courseId: null })
      setFormData(prev => ({
        ...prev,
        program: { name: item.name || '', abbreviation: item.program_abbreviation || '' }
      }))
    } else if (type === 'specialization') {
      setEditIds({ programId: null, specializationId: item.specialization_id, courseId: null })
      setFormData(prev => ({
        ...prev,
        specialization: { name: item.name || '', abbreviation: item.abbreviation || '', program_id: item.program_id }
      }))
    } else if (type === 'course') {
      setEditIds({ programId: null, specializationId: null, courseId: item.course_id })
      setFormData(prev => ({
        ...prev,
        course: { course_code: item.course_code || '', title: item.title || '', specialization_id: item.specialization_id || '', term_id: item.term_id || '' }
      }))
    }
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setCreateModalType('')
    setIsEditMode(false)
    setEditIds({ programId: null, specializationId: null, courseId: null })
    setErrorMessage('')
    setSuccessMessage('')
    setFormData({
      program: { name: '', abbreviation: '' },
      specialization: { name: '', abbreviation: '', program_id: '' },
      course: { course_code: '', title: '', specialization_id: '', term_id: '' }
    })
  }

  // Form submission handlers
  const handleCreateProgram = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setErrorMessage('')
      setSuccessMessage('')
      
      if (isEditMode && editIds.programId) {
        await enhancedApi.updateProgram(editIds.programId, {
          name: formData.program.name,
          description: formData.program.name,
          program_abbreviation: formData.program.abbreviation,
          department_id: null
        })
      } else {
        // Create program using API
        await enhancedApi.createProgram({
          name: formData.program.name,
          description: formData.program.name, // Use name as description for now
          program_abbreviation: formData.program.abbreviation,
          department_id: null // Will be set later when department selection is added
        })
      }
      
      // Refresh programs list
      const updatedPrograms = await enhancedApi.getPrograms()
      setPrograms(Array.isArray(updatedPrograms) ? updatedPrograms : [])
      setSuccessMessage(isEditMode ? 'Program updated successfully!' : 'Program created successfully!')
      setShowSuccessModal(true)
      closeCreateModal()
    } catch (error) {
      setErrorMessage(error.message || (isEditMode ? 'Failed to update program' : 'Failed to create program'))
      setShowErrorModal(true)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSpecialization = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setErrorMessage('')
      setSuccessMessage('')
      
      // Create or update specialization using API
      if (isEditMode && editIds.specializationId) {
        await enhancedApi.updateSpecialization(editIds.specializationId, {
          name: formData.specialization.name,
          description: formData.specialization.name, // Use name as description for now
          abbreviation: formData.specialization.abbreviation
        })
      } else {
        await enhancedApi.createSpecialization({
          name: formData.specialization.name,
          description: formData.specialization.name, // Use name as description for now
          abbreviation: formData.specialization.abbreviation,
          program_id: selectedProgramId
        })
      }
      
      // Refresh specializations list
      const updatedSpecializations = await enhancedApi.getSpecializations(selectedProgramId)
      setSpecializations(Array.isArray(updatedSpecializations) ? updatedSpecializations : [])
      setSuccessMessage(isEditMode ? 'Specialization updated successfully!' : 'Specialization created successfully!')
      setShowSuccessModal(true)
      closeCreateModal()
    } catch (error) {
      setErrorMessage(error.message || (isEditMode ? 'Failed to update specialization' : 'Failed to create specialization'))
      setShowErrorModal(true)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCourse = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setErrorMessage('')
      setSuccessMessage('')
      
      // Create or update course using API
      if (isEditMode && editIds.courseId) {
        await enhancedApi.updateCourse(editIds.courseId, {
          title: formData.course.title,
          course_code: formData.course.course_code,
          description: formData.course.title, // Use title as description for now
          term_id: formData.course.term_id || null,
          specialization_id: formData.course.specialization_id || selectedSpecializationId || null
        })
      } else {
        await enhancedApi.createCourse({
          title: formData.course.title,
          course_code: formData.course.course_code,
          description: formData.course.title, // Use title as description for now
          term_id: formData.course.term_id || null,
          specialization_id: selectedSpecializationId
        })
      }
      
      // Refresh courses list
      await loadCourses()
      setSuccessMessage(isEditMode ? 'Course updated successfully!' : 'Course created successfully!')
      setShowSuccessModal(true)
      closeCreateModal()
    } catch (error) {
      setErrorMessage(error.message || (isEditMode ? 'Failed to update course' : 'Failed to create course'))
      setShowErrorModal(true)
    } finally {
      setLoading(false)
    }
  }

  // Handle program/specialization/term selection changes and communicate with header
  useEffect(() => {
    updateHeaderInfo()
  }, [selectedProgramId, selectedSpecializationId, programs, specializations])

  // Update header when specialization selection changes
  useEffect(() => {
    updateHeaderInfo()
  }, [selectedSpecializationId])

  // Function to update header information
  const updateHeaderInfo = () => {
    // Get the selected program name for display
    const selectedProgram = programs.find(p => String(p.program_id) === String(selectedProgramId))
    const programName = selectedProgram?.name || selectedProgram?.program_abbreviation || ''
    
    // Get the selected specialization name for display
    const selectedSpecialization = specializations.find(s => String(s.specialization_id) === String(selectedSpecializationId))
    const specializationName = selectedSpecialization?.name || selectedSpecialization?.abbreviation || ''
    
    const event = new CustomEvent('courseMgmtTabChanged', { 
      detail: { 
        activeTab, // Send the current active tab
        selectedProgramId,
        programName,
        selectedSpecializationId,
        specializationName
      } 
    })
    window.dispatchEvent(event)
  }

  // Load base data
  useEffect(() => {
    const loadBase = async () => {
      try {
        setLoading(true)
        
        const [prog, term] = await Promise.all([
          enhancedApi.getPrograms(),
          enhancedApi.getTerms()
        ])
        setPrograms(Array.isArray(prog) ? prog : [])
        setTerms(Array.isArray(term) ? term : [])
      } catch (e) {
        setErrorMessage(e.message || 'Failed to load base data')
        setShowErrorModal(true)
      } finally {
        setLoading(false)
      }
    }
    loadBase()
    
    // Update header when component mounts
    updateHeaderInfo()
  }, [])

  // Listen for reset program selection event from header
  useEffect(() => {
    const handleResetProgram = () => {
      setSelectedProgramId('')
      setSelectedSpecializationId('')
      setSelectedCourse(null)
    }
    
    const handleGoBackToSpecializations = () => {
      setSelectedSpecializationId('')
      setSelectedCourse(null)
    }
    
    window.addEventListener('resetProgramSelection', handleResetProgram)
    window.addEventListener('goBackToSpecializations', handleGoBackToSpecializations)
    
    return () => {
      window.removeEventListener('resetProgramSelection', handleResetProgram)
      window.removeEventListener('goBackToSpecializations', handleGoBackToSpecializations)
    }
  }, [])

  // Load specializations when program changes
  useEffect(() => {
    const loadSpecs = async () => {
      try {
        setLoading(true)
        const list = await enhancedApi.getSpecializations(
          selectedProgramId ? Number(selectedProgramId) : undefined
        )
        setSpecializations(Array.isArray(list) ? list : [])
        
        // Log what specializations we got
        console.log('📋 Loaded specializations:', {
          total: list?.length || 0,
          programId: selectedProgramId
        })
      } catch (e) {
        setErrorMessage(e.message || 'Failed to load specializations')
        setShowErrorModal(true)
      } finally {
        setLoading(false)
      }
    }
    loadSpecs()
    // Reset specialization and courses when program changes
    setSelectedSpecializationId('')
    setSelectedCourse(null)
  }, [selectedProgramId])

  // Load courses function - defined outside useEffect so it can be called from other places
    const loadCourses = async () => {
      try {
        setLoading(true)
      // Always fetch ALL courses for the program, regardless of specialization selection
      // We'll filter them on the frontend instead
        const list = await enhancedApi.getCourses({
          programId: selectedProgramId ? Number(selectedProgramId) : undefined,
        // Remove specializationId filter - we want ALL courses for the program
          termId: selectedTermId ? Number(selectedTermId) : undefined
        })
        setCourses(Array.isArray(list) ? list : [])
      
      // Log what courses we got
      console.log('📥 LOADED COURSES:', {
        total: list?.length || 0,
        programId: selectedProgramId,
        termId: selectedTermId,
        note: 'Loaded ALL courses for program (filtering on frontend)'
      })
      } catch (e) {
        setErrorMessage(e.message || 'Failed to load courses')
        setShowErrorModal(true)
      } finally {
        setLoading(false)
      }
    }

  // Load courses when any filter changes
  useEffect(() => {
    loadCourses()
    setSelectedCourse(null)
  }, [selectedProgramId, selectedTermId]) // Removed selectedSpecializationId dependency

  // Filtered views for current tab and search
  const filteredPrograms = useMemo(() => {
    const q = query.trim().toLowerCase()
    return programs.filter(p =>
      !q || (p.name || '').toLowerCase().includes(q) || (p.program_abbreviation || '').toLowerCase().includes(q)
    )
  }, [programs, query])

  const filteredSpecializations = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = specializations
      .filter(s => (selectedProgramId ? String(s.program_id) === String(selectedProgramId) : true))
      .filter(s => !q || (s.name || '').toLowerCase().includes(q) || (s.abbreviation || '').toLowerCase().includes(q))
    
    // Sort to show General first, then alphabetically by name
    return filtered.sort((a, b) => {
      if (a.name === 'General') return -1
      if (b.name === 'General') return 1
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [specializations, selectedProgramId, query])

  const formatDate = (value) => {
    if (!value) return '—'
    try { return new Date(value).toLocaleString() } catch { return String(value) }
  }

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase()
    
    // Start with specialized courses (if specialization is selected)
    let filtered = []
    
    if (selectedSpecializationId) {
      // Show courses from selected specialization
      filtered = courses.filter(c => 
        String(c.specialization_id) === String(selectedSpecializationId) &&
        (!q || (c.title || '').toLowerCase().includes(q) || (c.course_code || '').toLowerCase().includes(q))
      )
    } else {
      // Show all non-general courses when no specialization selected
      let generalSpec = specializations.find(s => 
        String(s.program_id) === String(selectedProgramId) && s.name === 'General'
      )
      // If not found by name, try to find by ID 4
      if (!generalSpec) {
        generalSpec = specializations.find(s => String(s.specialization_id) === '4')
      }
      if (generalSpec) {
        filtered = courses.filter(c => 
          String(c.specialization_id) !== String(generalSpec.specialization_id) &&
          (!q || (c.title || '').toLowerCase().includes(q) || (c.course_code || '').toLowerCase().includes(q))
        )
      } else {
        // Fallback: show all courses if no general specialization found
        filtered = courses.filter(c =>
          (!q || (c.title || '').toLowerCase().includes(q) || (c.course_code || '').toLowerCase().includes(q))
        )
      }
    }
    
    // Filter by term if one is selected
    if (selectedTermId) {
      filtered = filtered.filter(c => String(c.term_id) === String(selectedTermId))
    }
    
    // If showGeneralSubjects is enabled, ADD general subjects below specialized ones
    if (showGeneralSubjects) {
      // First try to find by name "General"
      let generalSpec = specializations.find(s => 
        String(s.program_id) === String(selectedProgramId) && s.name === 'General'
      )
      
      // If not found by name, try to find by ID 4 (which we know contains general subjects)
      if (!generalSpec) {
        generalSpec = specializations.find(s => String(s.specialization_id) === '4')
      }
      
      if (generalSpec) {
        // Get general courses that match search query and term filter
        let generalCourses = courses.filter(c => 
          String(c.specialization_id) === String(generalSpec.specialization_id) &&
          (!q || (c.title || '').toLowerCase().includes(q) || (c.course_code || '').toLowerCase().includes(q))
        )
        
        // Apply term filter to general courses too
        if (selectedTermId) {
          generalCourses = generalCourses.filter(c => String(c.term_id) === String(selectedTermId))
        }
        
        // Add general courses to the end (below specialized subjects)
        filtered = [...filtered, ...generalCourses]
      }
    }
    
    return filtered
  }, [courses, query, selectedProgramId, selectedSpecializationId, selectedTermId, showGeneralSubjects, specializations])



  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading courses...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        .tab-button {
          transition: all 0.2s ease-in-out !important;
          border: none !important;
          border-bottom: none !important;
          outline: none !important;
          box-shadow: none !important;
        }
        
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
      
      <div className={`absolute top-16 bottom-0 bg-gray-50 rounded-tl-3xl overflow-hidden transition-all duration-500 ease-in-out ${
        sidebarExpanded ? 'left-64 right-0' : 'left-20 right-0'
      }`} style={{ marginTop: '0px' }}>
        <div className="w-full pr-2 pl-2 transition-all duration-500 ease-in-out" style={{ marginTop: '0px' }}>

          {/* Tabs */}
          <div className="absolute top-0 right-0 z-40 bg-gray-50 transition-all duration-500 ease-in-out left-0">
            <div className="px-8 bg-gray-50">
              <nav className="flex space-x-8 bg-gray-50 border-b border-gray-200">
                <TabButton isActive={true}>
                  {selectedSpecializationId ? 'Courses' : selectedProgramId ? 'Specializations' : 'Programs'}
                </TabButton>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="pt-16 pb-6 transition-all duration-500 ease-in-out" style={{ height: 'calc(100vh - 80px)' }}>
            <div className={`grid grid-cols-1 lg:grid-cols-4 gap-8 px-8 h-full`}>
              {/* List */}
              <div className={`lg:col-span-3 h-full`}>
                {/* Controls */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={selectedSpecializationId ? 'Search course code or title' : selectedProgramId ? 'Search specialization' : 'Search program'}
                      className="w-full px-3 py-2 pl-9 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 border-gray-300"
                    />
                    <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
                  </div>
                  
                  {/* Show General Subjects Toggle - Only show when viewing courses */}
                  {selectedSpecializationId && (() => {
                    const selectedSpec = specializations.find(s => String(s.specialization_id) === String(selectedSpecializationId))
                    // Don't show the switch for General specialization itself
                    if (selectedSpec && selectedSpec.name === 'General') {
                      return null
                    }
                    return (
                      <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Show General:</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={showGeneralSubjects}
                            onChange={(e) => setShowGeneralSubjects(e.target.checked)}
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all duration-200 ease-in-out peer-checked:bg-blue-600"></div>
                        </label>
                        <span className="text-xs text-gray-500">
                          {showGeneralSubjects ? 'ON' : 'OFF'}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          ({filteredCourses.length} courses)
                        </span>
                      </div>
                    )
                  })()}
                  
                  <button
                    onClick={() => openCreateModal(selectedSpecializationId ? 'course' : selectedProgramId ? 'specialization' : 'program')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <PlusIcon className="h-4 w-4" />
                    {selectedSpecializationId ? 'Add Course' : selectedProgramId ? 'Add Specialization' : 'Add Program'}
                  </button>
                </div>

                {/* Programs content */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300">
                  {!selectedProgramId ? (
                    // Show programs list when no program is selected
                    <>
                      {filteredPrograms.length > 0 ? (
                        <div className="divide-y divide-gray-200">
                          {filteredPrograms.map(p => (
                            <div key={p.program_id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                              <div 
                                className="flex-1 cursor-pointer"
                                onClick={() => { setSelectedProgramId(String(p.program_id)) }}
                              >
                                <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                                <div className="text-xs text-gray-500">{p.program_abbreviation}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-xs text-gray-400 mr-4">
                                {specializations.filter(s => 
                                  String(s.program_id) === String(p.program_id) && 
                                  s.name !== 'General'
                                ).length} Specializations
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal('program', p)
                                  }}
                                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                  title="Edit Program"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!confirm(`Delete program "${p.name}"? This cannot be undone.`)) return;
                                    try {
                                      setLoading(true);
                                      await enhancedApi.deleteProgram(p.program_id);
                                      const updatedPrograms = await enhancedApi.getPrograms();
                                      setPrograms(Array.isArray(updatedPrograms) ? updatedPrograms : []);
                                    } catch (err) {
                                      setErrorMessage(err.message || 'Failed to delete program');
                                      setShowErrorModal(true);
                                    } finally {
                                      setLoading(false);
                                    }
                                  }}
                                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                  title="Delete Program"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-16 text-gray-500">No programs found</div>
                      )}
                    </>
                  ) : !selectedSpecializationId ? (
                    // Show specializations when a program is selected but no specialization is selected
                    <>
                      {filteredSpecializations.length > 0 ? (
                        <div className="divide-y divide-gray-200">
                          {filteredSpecializations.map(s => (
                            <div 
                              key={s.specialization_id} 
                              className={`flex items-center justify-between px-6 py-4 hover:bg-gray-50 ${
                                s.name === 'General' ? 'bg-yellow-50' : ''
                              }`}
                            >
                              <div 
                                className="flex-1 cursor-pointer"
                              onClick={() => { setSelectedSpecializationId(String(s.specialization_id)) }}
                            >
                                <div className="text-sm font-semibold text-gray-900">{s.name}</div>
                                <div className="text-xs text-gray-500">{s.abbreviation}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-xs text-gray-400 mr-4">
                                {courses.filter(c => 
                                  String(c.specialization_id) === String(s.specialization_id)
                                ).length} Subjects
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal('specialization', s)
                                  }}
                                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                  title="Edit Specialization"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!confirm(`Delete specialization "${s.name}"? This cannot be undone.`)) return;
                                    try {
                                      setLoading(true);
                                      await enhancedApi.deleteSpecialization(s.specialization_id);
                                      const updatedSpecializations = await enhancedApi.getSpecializations(selectedProgramId);
                                      setSpecializations(Array.isArray(updatedSpecializations) ? updatedSpecializations : []);
                                    } catch (err) {
                                      setErrorMessage(err.message || 'Failed to delete specialization');
                                      setShowErrorModal(true);
                                    } finally {
                                      setLoading(false);
                                    }
                                  }}
                                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                  title="Delete Specialization"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-16 text-gray-500">
                          {selectedProgramId ? 'No specializations found for this program' : 'Select a program to view specializations'}
                        </div>
                      )}
                    </>
                  ) : (
                    // Show courses when a specialization is selected
                    <>
                      {filteredCourses.length > 0 ? (
                        <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Code</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {filteredCourses.map(course => (
                                <tr
                                  key={course.course_id}
                                  onClick={() => setSelectedCourse(course)}
                                  className={`hover:bg-gray-50 cursor-pointer ${selectedCourse?.course_id === course.course_id ? 'bg-red-50' : ''}`}
                                >
                                  <td className="px-4 py-2">
                                    <div className="text-sm font-medium text-gray-900">{course.course_code}</div>
                                  </td>
                                  <td className="px-4 py-2">
                                    <div className="text-sm text-gray-700">{course.title}</div>
                                  </td>
                                  <td className="px-4 py-2">
                                    <div className="text-sm text-gray-700">{course.specialization_name || course.abbreviation || '—'}</div>
                                  </td>
                                  <td className="px-4 py-2">
                                    <div className="text-sm text-gray-700">{formatTermDisplay(course.term_id)}</div>
                                  </td>
                                  <td className="px-4 py-2">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openEditModal('course', course)
                                        }}
                                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                        title="Edit Course"
                                      >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!confirm(`Delete course ${course.course_code}? This cannot be undone.`)) return;
                                          try {
                                            setLoading(true);
                                            await enhancedApi.deleteCourse(course.course_id);
                                            await loadCourses();
                                          } catch (err) {
                                            setErrorMessage(err.message || 'Failed to delete course');
                                            setShowErrorModal(true);
                                          } finally {
                                            setLoading(false);
                                          }
                                        }}
                                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                        title="Delete Course"
                                      >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
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
                            <BookOpenIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
                            <p className="text-gray-500">Try adjusting filters above.</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Side actions / Course details */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-4 sticky top-4 border border-gray-300">
                  {selectedCourse ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center ring-1 ring-blue-300">
                          <BookOpenIcon className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{selectedCourse.course_code}</h4>
                          <p className="text-sm text-gray-600">{selectedCourse.title}</p>
                          <p className="text-xs text-gray-500">{selectedCourse.program_abbreviation || selectedCourse.program_name} {selectedCourse.abbreviation ? `• ${selectedCourse.abbreviation}` : ''}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Status</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700`}>—</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Program</span>
                          <span className="text-gray-800">{selectedCourse.program_name || selectedCourse.program_abbreviation || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Specialization</span>
                          <span className="text-gray-800">{selectedCourse.specialization_name || selectedCourse.abbreviation || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Term</span>
                          <span className="text-gray-800">{formatTermDisplay(selectedCourse.term_id)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Created</span>
                          <span className="text-gray-800">{formatDate(selectedCourse.created_at)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Updated</span>
                          <span className="text-gray-800">{formatDate(selectedCourse.updated_at)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700">
                          Edit
                        </button>
                        <button className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-white text-red-600 border border-red-300 hover:bg-red-50">
                          Archive
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-10">
                      <BookOpenIcon className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-sm">Select a course from the list to view details here.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {createModalType === 'program' && (isEditMode ? 'Edit Program' : 'Create New Program')}
                {createModalType === 'specialization' && (isEditMode ? 'Edit Specialization' : 'Create New Specialization')}
                {createModalType === 'course' && (isEditMode ? 'Edit Course' : 'Create New Course')}
              </h3>
              <button
                onClick={closeCreateModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>



            {/* Program Creation Form */}
            {createModalType === 'program' && (
              <form onSubmit={handleCreateProgram} className="space-y-4">
                <div>
                  <label htmlFor="programName" className="block text-sm font-medium text-gray-700 mb-1">
                    Program Name *
                  </label>
                  <input
                    type="text"
                    id="programName"
                    value={formData.program.name}
                    onChange={(e) => setFormData({...formData, program: {...formData.program, name: e.target.value}})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., Bachelor of Science in Information Technology"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="programAbbr" className="block text-sm font-medium text-gray-700 mb-1">
                    Program Abbreviation *
                  </label>
                  <input
                    type="text"
                    id="programAbbr"
                    value={formData.program.abbreviation}
                    onChange={(e) => setFormData({...formData, program: {...formData.program, abbreviation: e.target.value}})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., BSIT"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Program' : 'Create Program')}
                  </button>
                </div>
              </form>
            )}

            {/* Specialization Creation Form */}
            {createModalType === 'specialization' && (
              <form onSubmit={handleCreateSpecialization} className="space-y-4">
                <div>
                  <label htmlFor="specName" className="block text-sm font-medium text-gray-700 mb-1">
                    Specialization Name *
                  </label>
                  <input
                    type="text"
                    id="specName"
                    value={formData.specialization.name}
                    onChange={(e) => setFormData({...formData, specialization: {...formData.specialization, name: e.target.value}})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., Software Engineering"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="specAbbr" className="block text-sm font-medium text-gray-700 mb-1">
                    Specialization Abbreviation *
                  </label>
                  <input
                    type="text"
                    id="specAbbr"
                    value={formData.specialization.abbreviation}
                    onChange={(e) => setFormData({...formData, specialization: {...formData.specialization, abbreviation: e.target.value}})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., SE"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Specialization' : 'Create Specialization')}
                  </button>
                </div>
              </form>
            )}

            {/* Course Creation Form */}
            {createModalType === 'course' && (
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label htmlFor="courseCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Course Code *
                </label>
                <input
                  type="text"
                  id="courseCode"
                    value={formData.course.course_code}
                    onChange={(e) => setFormData({...formData, course: {...formData.course, course_code: e.target.value}})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., CS101"
                    required
                />
              </div>

              <div>
                <label htmlFor="courseTitle" className="block text-sm font-medium text-gray-700 mb-1">
                  Course Title *
                </label>
                <input
                  type="text"
                  id="courseTitle"
                    value={formData.course.title}
                    onChange={(e) => setFormData({...formData, course: {...formData.course, title: e.target.value}})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Introduction to Computer Science"
                    required
                />
              </div>



              <div>
                  <label htmlFor="term" className="block text-sm font-medium text-gray-700 mb-1">
                    Term
                </label>
                <select
                    id="term"
                    value={formData.course.term_id}
                    onChange={(e) => setFormData({...formData, course: {...formData.course, term_id: e.target.value}})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                >
                    <option value="">Select a term</option>
                    {terms.map(t => (
                      <option key={t.term_id} value={t.term_id}>
                        {formatTermDisplay(t.term_id)}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                    onClick={closeCreateModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                    {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Course' : 'Create Course')}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-center mb-4">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Success!</h3>
              <p className="text-sm text-gray-500 mb-6">{successMessage}</p>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessMessage('');
                }}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
                  {showErrorModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                  <div className="flex items-center justify-center mb-4">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                      <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Cannot Delete</h3>
                    <p className="text-sm text-gray-700 mb-4 leading-relaxed">{errorMessage}</p>
                    
                    {/* Show additional error details if available */}
                    {errorMessage.includes('contains') && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-4 text-left">
                        <p className="text-xs text-gray-600 font-medium mb-2">📋 What needs to be removed first:</p>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          {errorMessage.includes('specialization') && errorMessage.includes('courses') 
                            ? '• Delete all courses under this specialization first\n• Then return to delete the specialization'
                            : errorMessage.includes('program') && errorMessage.includes('specialization')
                            ? '• Delete all specializations under this program first\n• Then return to delete the program'
                            : '• Remove all child records before deleting this item'
                          }
                        </p>
                      </div>
                    )}
                    
                    <button
                      onClick={() => {
                        setShowErrorModal(false);
                        setErrorMessage('');
                      }}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              </div>
            )}
    </>
  )
}

export default CourseManagement
