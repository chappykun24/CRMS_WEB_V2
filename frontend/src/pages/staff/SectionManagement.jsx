import React, { useEffect, useMemo, useState } from 'react'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid'

const SectionManagement = () => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSection, setEditingSection] = useState(null)
  const [query, setQuery] = useState('')
  const [sections, setSections] = useState([])
  const [terms, setTerms] = useState([])
  const [programs, setPrograms] = useState([])
  const [specializations, setSpecializations] = useState([])
  const [sectionsError, setSectionsError] = useState('')
  const [isLoadingSections, setIsLoadingSections] = useState(true)
  const [formData, setFormData] = useState({ 
    sectionCode: '', 
    termId: '',
    yearLevel: '',
    programId: '',
    specializationId: ''
  })
  
  // Notification states
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  
  // Loading states
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoadingTerms, setIsLoadingTerms] = useState(true)
  const [selectedSection, setSelectedSection] = useState(null)

  const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api'

  // Load school terms when component mounts
  useEffect(() => {
    let isMounted = true
    ;(async () => {
      try {
        console.log('Loading school terms...')
        setIsLoadingTerms(true)
        const response = await fetch(`${API_BASE_URL}/school-terms`)
        if (!response.ok) throw new Error(`Failed to fetch school terms: ${response.status}`)
        const data = await response.json()
        console.log('School terms loaded:', data)
        if (isMounted) setTerms(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error loading school terms:', error)
        setErrorMessage('Failed to load school terms. Please refresh the page.')
        setShowErrorModal(true)
      } finally {
        if (isMounted) setIsLoadingTerms(false)
      }
    })()
    return () => { isMounted = false }
  }, [])

  // Load programs when component mounts
  useEffect(() => {
    let isMounted = true
    ;(async () => {
      try {
        console.log('Loading programs...')
        const response = await fetch(`${API_BASE_URL}/programs`)
        if (!response.ok) throw new Error(`Failed to fetch programs: ${response.status}`)
        const data = await response.json()
        console.log('Programs loaded:', data)
        if (isMounted) setPrograms(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error loading programs:', error)
        // Don't show error modal for programs as they're optional
      }
    })()
    return () => { isMounted = false }
  }, [])

  // Load specializations when program is selected
  useEffect(() => {
    if (!formData.programId) {
      setSpecializations([])
      return
    }

    let isMounted = true
    ;(async () => {
      try {
        console.log('Loading specializations for program:', formData.programId)
        const response = await fetch(`${API_BASE_URL}/program-specializations?programId=${formData.programId}`)
        if (!response.ok) throw new Error(`Failed to fetch specializations: ${response.status}`)
        const data = await response.json()
        console.log('Specializations loaded:', data)
        if (isMounted) setSpecializations(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error loading specializations:', error)
        if (isMounted) setSpecializations([])
      }
    })()
    return () => { isMounted = false }
  }, [formData.programId])

  // Load all specializations for display purposes
  useEffect(() => {
    let isMounted = true
    ;(async () => {
      try {
        console.log('Loading all specializations for display')
        const response = await fetch(`${API_BASE_URL}/program-specializations`)
        if (!response.ok) throw new Error(`Failed to fetch all specializations: ${response.status}`)
        const data = await response.json()
        console.log('All specializations loaded:', data)
        if (isMounted) {
          // Merge with existing specializations to avoid overwriting form-specific ones
          setSpecializations(prev => {
            const existingIds = new Set(prev.map(s => s.specialization_id))
            const newSpecs = data.filter(s => !existingIds.has(s.specialization_id))
            return [...prev, ...newSpecs]
          })
        }
      } catch (error) {
        console.error('Error loading all specializations:', error)
        // Don't clear existing specializations on error
      }
    })()
    return () => { isMounted = false }
  }, [])

  // Clear specialization when year level changes to 1st or 2nd year
  useEffect(() => {
    if (formData.yearLevel && !['3', '4'].includes(formData.yearLevel)) {
      setFormData(prev => ({ ...prev, specializationId: '' }))
    }
  }, [formData.yearLevel])

  const openCreateModal = () => setShowCreateModal(true)
  
  const handleSectionClick = (section) => {
    setSelectedSection(section)
  }
  const closeCreateModal = () => {
    setShowCreateModal(false)
    setFormData({ 
      sectionCode: '', 
      termId: '', 
      yearLevel: '', 
      programId: '', 
      specializationId: '' 
    })
    setSelectedSection(null)
    console.log('Create modal closed, form data reset')
  }

  const handleEditSection = (section) => {
    console.log('Editing section:', section)
    setEditingSection(section)
    const newFormData = { 
      sectionCode: section.sectionCode, 
      termId: section.termId,
      yearLevel: section.yearLevel,
      programId: section.programId,
      specializationId: section.specializationId
    }
    console.log('Setting form data:', newFormData)
    setFormData(newFormData)
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setEditingSection(null)
    setFormData({ 
      sectionCode: '', 
      termId: '', 
      yearLevel: '', 
      programId: '', 
      specializationId: '' 
    })
    setSelectedSection(null)
    console.log('Edit modal closed, form data reset')
  }

  const handleDeleteSection = async (sectionId) => {
    const section = sections.find(s => s.id === sectionId)
    const sectionName = section ? section.sectionCode : 'this section'
    
    const confirmMessage = `Are you sure you want to delete "${sectionName}"?\n\n⚠️  IMPORTANT: This action cannot be undone.\n\nBefore deleting, ensure that:\n• No courses are assigned to this section\n• No students are enrolled in this section\n• All related data has been removed\n\nIf deletion fails, you may need to remove dependent data first.`
    
    if (!confirm(confirmMessage)) return
    
    setIsDeleting(true)
    try {
      // Try the correct endpoint - delete through the section-courses API
              const response = await fetch(`${API_BASE_URL}/sections/${sectionId}`, {
          method: 'DELETE'
        })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        if (response.status === 404) {
          throw new Error('Section not found. It may have been deleted by another user.')
        } else if (response.status === 409) {
          throw new Error('Cannot delete section. It has associated courses or students. Please remove all related data first.')
        } else if (response.status === 400) {
          throw new Error(errorData.message || 'Section cannot be deleted due to existing dependencies.')
        } else {
          throw new Error(errorData.message || `Failed to delete section: ${response.status}`)
        }
      }
      
      setSections(prev => prev.filter(s => s.id !== sectionId))
      setSuccessMessage('Section deleted successfully!')
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Delete section error:', error)
      setErrorMessage(error.message || 'Failed to delete section. Please try again.')
      setShowErrorModal(true)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdateSection = async () => {
    if (!editingSection) return
    
    if (!formData.sectionCode.trim()) {
      setErrorMessage('Section code is required')
      setShowErrorModal(true)
      return
    }
    
    if (!formData.termId) {
      setErrorMessage('Please select a semester')
      setShowErrorModal(true)
      return
    }
    
    if (!formData.yearLevel) {
      setErrorMessage('Please select a year level')
      setShowErrorModal(true)
      return
    }
    
    if (!formData.programId) {
      setErrorMessage('Please select a program')
      setShowErrorModal(true)
      return
    }
    
    // Specialization is only required for 3rd and 4th year
    if (['3', '4'].includes(formData.yearLevel) && !formData.specializationId) {
      setErrorMessage('Please select a specialization for 3rd and 4th year students')
      setShowErrorModal(true)
      return
    }

    setIsUpdating(true)
    try {
      const payload = { 
        section_code: formData.sectionCode.trim(), 
        term_id: formData.termId || null,
        program_id: formData.programId || null,
        year_level: formData.yearLevel || null,
        specialization_id: formData.specializationId || null
      }
      
      console.log('Updating section with payload:', payload)
      
      // Try the correct endpoint - update through the section-courses API
              const response = await fetch(`${API_BASE_URL}/sections/${editingSection.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 404) {
          throw new Error('Section not found. It may have been deleted by another user.')
        } else if (response.status === 400) {
          throw new Error(errorData.message || 'Invalid data provided. Please check your input.')
        } else if (response.status === 409) {
          throw new Error('Section code already exists. Please use a different code.')
        } else {
          throw new Error(errorData.message || `Failed to update section: ${response.status}`)
        }
      }
      
      const updated = await response.json()
      console.log('Section updated successfully:', updated)
      
      const updatedSection = { 
        ...editingSection, 
        sectionCode: formData.sectionCode.trim(), 
        termId: formData.termId,
        yearLevel: formData.yearLevel,
        programId: formData.programId,
        specializationId: formData.specializationId
      }
      
      setSections(prev => prev.map(s => 
        s.id === editingSection.id ? updatedSection : s
      ))
      
      // Update selected section if it was the one being edited
      if (selectedSection?.id === editingSection.id) {
        setSelectedSection(updatedSection)
      }
      
      setSuccessMessage('Section updated successfully!')
      setShowSuccessModal(true)
      closeEditModal()
    } catch (error) {
      console.error('Update section error:', error)
      setErrorMessage(error.message || 'Failed to update section. Please try again.')
      setShowErrorModal(true)
    } finally {
      setIsUpdating(false)
    }
  }

  useEffect(() => {
    // Initial load of sections list
    let isMounted = true
    ;(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/section-courses/sections`)
        if (!response.ok) throw new Error(`Failed to fetch sections: ${response.status}`)
        const data = await response.json()
        if (isMounted) setSections(Array.isArray(data) ? data.map(s => ({ 
          id: s.section_id, 
          sectionCode: s.section_code, 
          termId: s.term_id,
          yearLevel: s.year_level,
          programId: s.program_id,
          specializationId: s.specialization_id
        })) : [])
      } catch (error) {
        console.error('Error loading sections:', error)
      }
    })()
    return () => { isMounted = false }
  }, [])

  const handleSave = async () => {
    if (!formData.sectionCode.trim()) {
      setErrorMessage('Section code is required')
      setShowErrorModal(true)
      return
    }
    
    if (!formData.termId) {
      setErrorMessage('Please select a semester')
      setShowErrorModal(true)
      return
    }
    
    if (!formData.yearLevel) {
      setErrorMessage('Please select a year level')
      setShowErrorModal(true)
      return
    }
    
    if (!formData.programId) {
      setErrorMessage('Please select a program')
      setShowErrorModal(true)
      return
    }
    
    // Specialization is only required for 3rd and 4th year
    if (['3', '4'].includes(formData.yearLevel) && !formData.specializationId) {
      setErrorMessage('Please select a specialization for 3rd and 4th year students')
      setShowErrorModal(true)
      return
    }

    setIsCreating(true)
    try {
      const payload = { 
        section_code: formData.sectionCode.trim(), 
        term_id: formData.termId || null,
        program_id: formData.programId || null,
        year_level: formData.yearLevel || null,
        specialization_id: formData.specializationId || null
      }
      
      console.log('Creating section with payload:', payload)
      
              const response = await fetch(`${API_BASE_URL}/sections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 400) {
          throw new Error(errorData.message || 'Invalid data provided. Please check your input.')
        } else if (response.status === 409) {
          throw new Error('Section code already exists. Please use a different code.')
        } else if (response.status === 422) {
          throw new Error('Validation failed. Please check all required fields.')
        } else {
          throw new Error(errorData.message || `Failed to create section: ${response.status}`)
        }
      }
      
      const created = await response.json()
      console.log('Section created successfully:', created)
      
      setSections(prev => [
        { 
          id: created.section_id, 
          sectionCode: created.section_code, 
          termId: created.term_id,
          yearLevel: created.year_level,
          programId: created.program_id,
          specializationId: created.specialization_id
        },
        ...prev
      ])
      
      setSuccessMessage('Section created successfully!')
      setShowSuccessModal(true)
      closeCreateModal()
    } catch (error) {
      console.error('Create section error:', error)
      setErrorMessage(error.message || 'Failed to create section. Please try again.')
      setShowErrorModal(true)
    } finally {
      setIsCreating(false)
    }
  }

  const filtered = useMemo(() => {
    if (!query) return sections
    return sections.filter(s => (s.sectionCode || '').toLowerCase().includes(query.toLowerCase()))
  }, [query, sections])

  const activeTerms = useMemo(() => {
    const filtered = terms.filter(t => t.is_active)
    console.log('Active terms:', filtered)
    return filtered
  }, [terms])
  
  const selectedTerm = useMemo(() => {
    if (!formData.termId) return undefined
    const found = terms.find(t => String(t.term_id) === String(formData.termId))
    console.log('Selected term:', found)
    return found
  }, [formData.termId, terms])

  const getTermLabel = (termId) => {
    if (!termId) return 'Not assigned'
    const term = terms.find(t => String(t.term_id) === String(termId))
    if (!term) return 'Not assigned'
    return `${term.school_year} - ${term.semester} semester`
  }

  const getSpecializationName = (specializationId, programId) => {
    if (!specializationId || !programId) return 'Not set'
    
    // Find the specialization in the current specializations state
    const spec = specializations.find(s => s.specialization_id == specializationId)
    if (spec) return spec.name || spec.abbreviation || 'Unknown'
    
    // If not found in current state, return a more informative message
    return 'Specialization not loaded'
  }

  const getYearLevelLabel = (yearLevel) => {
    if (!yearLevel) return 'Not set'
    const year = yearLevel.toString()
    if (year === '1') return '1st Year'
    if (year === '2') return '2nd Year'
    if (year === '3') return '3rd Year'
    if (year === '4') return '4th Year'
    return `${year}th Year`
  }

  return (
    <>
      <div className="pt-0 pb-4">
        <div className="w-full">
          <div className="bg-gray-50 border-b border-gray-200 mb-2">
            <div className="px-0">
              <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200">
                <nav className="flex space-x-8">
                  <div className="py-2 px-4 font-medium text-sm text-red-600 border-b-2 border-red-600">
                    Sections
                  </div>
                </nav>

                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  title="Add Section"
                >
                  <PlusIcon className="h-5 w-5 stroke-[3]" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 flex flex-col">
              <div className="mb-6">

                
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search sections..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1">
                {filtered.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">No sections yet. Click the + to create one.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map(s => (
                      <div
                        key={s.id}
                        className={`bg-white border border-gray-200 rounded-lg px-4 py-3 cursor-pointer transition-all hover:bg-gray-50 ${
                          selectedSection?.id === s.id ? 'bg-gray-50 border-gray-300' : ''
                        }`}
                        onClick={() => handleSectionClick(s)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <h3 className="font-semibold text-gray-900 text-base">{s.sectionCode}</h3>
                            <div className="text-sm text-gray-600">
                              {getTermLabel(s.termId)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditSection(s)
                              }}
                              className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                              title="Edit section"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteSection(s.id)
                              }}
                              disabled={isDeleting}
                              className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete section"
                            >
                              {isDeleting ? (
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-h-[120px]">
              {selectedSection ? (
                <div className="space-y-4">
                  <div className="text-center pb-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedSection.sectionCode}</h3>
                    <p className="text-sm text-gray-600">Section Details</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Semester</span>
                      <div className="text-sm font-medium text-gray-900 mt-1">
                        {getTermLabel(selectedSection.termId)}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Year Level</span>
                      <div className="text-sm font-medium text-gray-900 mt-1">
                        {getYearLevelLabel(selectedSection.yearLevel)}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Program</span>
                      <div className="text-sm font-medium text-gray-900 mt-1">
                        {selectedSection.programId ? programs.find(p => p.program_id == selectedSection.programId)?.name || 'Unknown' : 'Not set'}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Specialization</span>
                      <div className="text-sm font-medium text-gray-900 mt-1">
                        {getSpecializationName(selectedSection.specializationId, selectedSection.programId)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditSection(selectedSection)}
                        className="flex-1 px-3 py-2 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSection(selectedSection.id)}
                        className="flex-1 px-3 py-2 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center text-gray-500 py-10">
                  <div>
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <p className="text-sm">Click on a section to view details here.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-5xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create Section</h3>
              <button onClick={closeCreateModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section Code</label>
                    <input
                      type="text"
                      value={formData.sectionCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, sectionCode: e.target.value }))}
                      placeholder="e.g., IT-BA-4102"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                                                              <select
                      value={formData.termId}
                      onChange={(e) => {
                        console.log('Term selection changed:', e.target.value)
                        setFormData(prev => ({ ...prev, termId: e.target.value }))
                      }}
                      disabled={isLoadingTerms}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {isLoadingTerms ? 'Loading terms...' : 'Select semester'}
                      </option>
                      {isLoadingTerms ? (
                        <option value="" disabled>Loading...</option>
                      ) : activeTerms.length > 0 ? (
                        activeTerms.map(term => (
                          <option key={term.term_id} value={term.term_id}>
                            {`${term.school_year} - ${term.semester}`}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No active terms available</option>
                      )}
                    </select>
                    {isLoadingTerms && (
                      <p className="text-xs text-blue-600 mt-1">
                        Loading school terms...
                      </p>
                    )}
                                          {!isLoadingTerms && activeTerms.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          No active school terms found. Please contact an administrator.
                        </p>
                      )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year Level</label>
                    <select
                      value={formData.yearLevel}
                      onChange={(e) => setFormData(prev => ({ ...prev, yearLevel: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                    >
                      <option value="">Select year level</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
                    <select
                      value={formData.programId}
                      onChange={(e) => setFormData(prev => ({ ...prev, programId: e.target.value, specializationId: '' }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                    >
                      <option value="">Select program</option>
                                              {programs.map(program => (
                          <option key={program.program_id} value={program.program_id}>
                            {program.name || program.program_abbreviation}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                    <select
                      value={formData.specializationId}
                      onChange={(e) => setFormData(prev => ({ ...prev, specializationId: e.target.value }))}
                      disabled={!formData.programId || !['3', '4'].includes(formData.yearLevel)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select specialization</option>
                                              {specializations.map(spec => (
                          <option key={spec.specialization_id} value={spec.specialization_id}>
                            {spec.name || spec.abbreviation}
                          </option>
                        ))}
                    </select>
                    {formData.yearLevel && !['3', '4'].includes(formData.yearLevel) && (
                      <p className="text-xs text-amber-600 mt-1">
                        Specialization is only available for 3rd and 4th Year students
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year Level</label>
                    <select
                      value={formData.yearLevel}
                      onChange={(e) => setFormData(prev => ({ ...prev, yearLevel: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                    >
                      <option value="">Select year level</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500 mb-2">Preview</div>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-sm text-gray-700 space-y-1">
                  <div>
                    <span className="text-gray-500">Section</span>
                    <div className="font-medium text-gray-900">{formData.sectionCode || 'e.g., IT-BA-4102'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Semester</span>
                    <div className="text-gray-900">{selectedTerm ? `${selectedTerm.school_year} - ${selectedTerm.semester}` : '—'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button 
                onClick={closeCreateModal} 
                disabled={isCreating}
                className="px-3 py-1.5 text-sm bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                disabled={isCreating}
                className="px-3 py-1.5 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-5xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Section</h3>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section Code</label>
                    <input
                      type="text"
                      value={formData.sectionCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, sectionCode: e.target.value }))}
                      placeholder="e.g., IT-BA-4102"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                    <select
                      value={formData.termId}
                      onChange={(e) => {
                        console.log('Edit modal - Term selection changed:', e.target.value)
                        setFormData(prev => ({ ...prev, termId: e.target.value }))
                      }}
                      disabled={isLoadingTerms}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {isLoadingTerms ? 'Loading terms...' : 'Select semester'}
                      </option>
                      {isLoadingTerms ? (
                        <option value="" disabled>Loading...</option>
                      ) : activeTerms.length > 0 ? (
                        activeTerms.map(term => (
                          <option key={term.term_id} value={term.term_id}>
                            {`${term.school_year} - ${term.semester}`}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No active terms available</option>
                      )}
                    </select>
                    {isLoadingTerms && (
                      <p className="text-xs text-blue-600 mt-1">
                        Loading school terms...
                      </p>
                    )}
                    {!isLoadingTerms && activeTerms.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        No active school terms found. Please contact an administrator.
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year Level</label>
                    <select
                      value={formData.yearLevel}
                      onChange={(e) => setFormData(prev => ({ ...prev, yearLevel: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                    >
                      <option value="">Select year level</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
                    <select
                      value={formData.programId}
                      onChange={(e) => setFormData(prev => ({ ...prev, programId: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                    >
                      <option value="">Select program</option>
                      {programs.map(program => (
                        <option key={program.program_id} value={program.program_id}>
                          {program.name || program.program_abbreviation}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                    <select
                      value={formData.specializationId}
                      onChange={(e) => setFormData(prev => ({ ...prev, specializationId: e.target.value }))}
                      disabled={!formData.programId || !['3', '4'].includes(formData.yearLevel)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select specialization</option>
                      {specializations.map(spec => (
                        <option key={spec.specialization_id} value={spec.specialization_id}>
                          {spec.name || spec.abbreviation}
                        </option>
                      ))}
                    </select>
                    {formData.yearLevel && !['3', '4'].includes(formData.yearLevel) && (
                      <p className="text-xs text-blue-600 mt-1">
                        Specialization is only available for 3rd and 4th Year students
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500 mb-2">Preview</div>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-sm text-gray-700 space-y-1">
                  <div>
                    <span className="text-gray-500">Section</span>
                    <div className="font-medium text-gray-900">{formData.sectionCode || 'e.g., IT-BA-4102'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Semester</span>
                    <div className="text-gray-900">{selectedTerm ? `${selectedTerm.school_year} - ${selectedTerm.semester}` : '—'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button 
                onClick={closeEditModal} 
                disabled={isUpdating}
                className="px-3 py-1.5 text-sm bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateSection} 
                disabled={isUpdating}
                className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Update'
                )}
              </button>
            </div>
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
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-center mb-4">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
              <p className="text-sm text-gray-500 mb-6">{errorMessage}</p>
              <button
                onClick={() => {
                  setShowErrorModal(false);
                  setErrorMessage('');
                }}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default SectionManagement


