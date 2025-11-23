import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAuth } from '../../contexts/UnifiedAuthContext'
import { safeGetItem, safeSetItem, minimizeClassData } from '../../utils/cacheUtils'
import { TableSkeleton } from '../../components/skeletons'
import {
  AcademicCapIcon,
  ChartBarIcon,
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  UserGroupIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/solid'

const ILOAttainment = () => {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTermId, setActiveTermId] = useState(null)
  
  // Attainment data
  const [attainmentData, setAttainmentData] = useState(null)
  const [selectedILO, setSelectedILO] = useState(null)
  const [loadingAttainment, setLoadingAttainment] = useState(false)
  const [studentList, setStudentList] = useState([])
  const [iloCombinations, setIloCombinations] = useState([])
  const [showCombinations, setShowCombinations] = useState(false)
  const [expandedStudents, setExpandedStudents] = useState(new Set())
  
  // Filters
  const [passThreshold, setPassThreshold] = useState(75)
  const [performanceFilter, setPerformanceFilter] = useState('all')
  const [highThreshold, setHighThreshold] = useState(80)
  const [lowThreshold, setLowThreshold] = useState(75)
  
  // ILO mapping filters
  const [filterOptions, setFilterOptions] = useState({ so: [], sdg: [], iga: [], cdio: [], ilo_combinations: [], ilo_so_combinations: [], ilo_sdg_combinations: [], ilo_iga_combinations: [], ilo_cdio_combinations: [] })
  const [selectedSO, setSelectedSO] = useState('')
  const [selectedSDG, setSelectedSDG] = useState('')
  const [selectedIGA, setSelectedIGA] = useState('')
  const [selectedCDIO, setSelectedCDIO] = useState('')
  const [selectedILOCombination, setSelectedILOCombination] = useState('')
  const [selectedILOSO, setSelectedILOSO] = useState('')
  const [selectedILOSDG, setSelectedILOSDG] = useState('')
  const [selectedILOIGA, setSelectedILOIGA] = useState('')
  const [selectedILOCDIO, setSelectedILOCDIO] = useState('')

  // Refs for cleanup
  const abortControllerRef = useRef(null)
  const attainmentAbortControllerRef = useRef(null)

  // Normalize faculty ID
  const facultyId = user?.user_id ?? user?.id

  // Load active term
  useEffect(() => {
    const fetchActiveTerm = async () => {
      try {
        const response = await fetch('/api/school-terms')
        if (response.ok) {
          const terms = await response.json()
          const activeTerm = Array.isArray(terms) ? terms.find(t => t.is_active) : null
          if (activeTerm) {
            setActiveTermId(activeTerm.term_id)
            console.log('✅ [ILO ATTAINMENT] Active term found:', activeTerm.term_id, activeTerm.school_year, activeTerm.semester)
          } else {
            console.warn('⚠️ [ILO ATTAINMENT] No active term found')
          }
        }
      } catch (error) {
        console.error('❌ [ILO ATTAINMENT] Error fetching active term:', error)
      }
    }
    fetchActiveTerm()
  }, [])

  // Load faculty classes with caching and async fetching
  useEffect(() => {
    const loadClasses = async () => {
      if (!facultyId) return
      
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Create new abort controller
      abortControllerRef.current = new AbortController()
      
      const cacheKey = `classes_${facultyId}`
      const cached = safeGetItem(cacheKey)
      let classesData = []
      
      // Show cached data immediately if available
      if (cached) {
        classesData = Array.isArray(cached) ? cached : []
        setClasses(classesData)
        setLoading(false)
      } else {
        setLoading(true)
      }
      
      // Fetch fresh data in background
      try {
        const response = await fetch(`/api/section-courses/faculty/${facultyId}`, {
          signal: abortControllerRef.current.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok) {
          throw new Error(`Failed to load classes: ${response.status}`)
        }
        
        const data = await response.json()
        classesData = Array.isArray(data) ? data : []
        setClasses(classesData)
        safeSetItem(cacheKey, classesData, minimizeClassData)
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('🚫 [ILO ATTAINMENT] Classes request was aborted')
          return
        }
        console.error('Error loading classes:', error)
        if (!cached) {
          setError('Failed to load classes')
        }
      } finally {
        setLoading(false)
      }
    }
    
    loadClasses()
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [facultyId])

  // Filter classes by active term
  const filteredClasses = useMemo(() => {
    if (activeTermId === null) return []
    return classes.filter(cls => cls.term_id === activeTermId)
  }, [classes, activeTermId])

  // Load filter options when class is selected or filters change
  useEffect(() => {
    const loadFilterOptions = async () => {
      if (!selectedClass?.section_course_id) {
        setFilterOptions({ so: [], sdg: [], iga: [], cdio: [], ilo_combinations: [] })
        return
      }

      try {
        const params = new URLSearchParams()
        if (selectedSO) params.append('so_id', selectedSO)
        if (selectedSDG) params.append('sdg_id', selectedSDG)
        if (selectedIGA) params.append('iga_id', selectedIGA)
        if (selectedCDIO) params.append('cdio_id', selectedCDIO)
        
        const queryString = params.toString()
        const url = `/api/assessments/ilo-attainment/filters/${selectedClass.section_course_id}${queryString ? `?${queryString}` : ''}`
        
        const response = await fetch(url)
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setFilterOptions({
              ...result.data,
              ilo_so_combinations: result.data.ilo_so_combinations || [],
              ilo_sdg_combinations: result.data.ilo_sdg_combinations || [],
              ilo_iga_combinations: result.data.ilo_iga_combinations || [],
              ilo_cdio_combinations: result.data.ilo_cdio_combinations || []
            })
            // Reset ILO combination selection if it's no longer available
            if (selectedILOCombination && !result.data.ilo_combinations.find(ilo => ilo.ilo_id.toString() === selectedILOCombination)) {
              setSelectedILOCombination('')
            }
          }
        }
      } catch (error) {
        console.error('Error loading filter options:', error)
      }
    }

    loadFilterOptions()
  }, [selectedClass?.section_course_id, selectedSO, selectedSDG, selectedIGA, selectedCDIO])

  // Load ILO attainment data with async fetching and error handling
  const loadAttainmentData = useCallback(async (sectionCourseId, iloId = null) => {
    if (!sectionCourseId) return

    // Cancel previous request if still pending
    if (attainmentAbortControllerRef.current) {
      attainmentAbortControllerRef.current.abort()
    }
    
    // Create new abort controller
    attainmentAbortControllerRef.current = new AbortController()

    setLoadingAttainment(true)
    setError('')

    try {
      const params = new URLSearchParams({
        section_course_id: sectionCourseId.toString(),
        pass_threshold: passThreshold.toString(),
        performance_filter: performanceFilter,
        high_threshold: highThreshold.toString(),
        low_threshold: lowThreshold.toString()
      })

      if (iloId) {
        params.append('ilo_id', iloId.toString())
      } else if (selectedILOCombination) {
        params.append('ilo_id', selectedILOCombination)
      }
      
      if (selectedSO) {
        params.append('so_id', selectedSO)
      }
      if (selectedSDG) {
        params.append('sdg_id', selectedSDG)
      }
      if (selectedIGA) {
        params.append('iga_id', selectedIGA)
      }
      if (selectedCDIO) {
        params.append('cdio_id', selectedCDIO)
      }
      
      if (selectedILOSO) {
        params.append('ilo_so_key', selectedILOSO)
      }
      if (selectedILOSDG) {
        params.append('ilo_sdg_key', selectedILOSDG)
      }
      if (selectedILOIGA) {
        params.append('ilo_iga_key', selectedILOIGA)
      }
      if (selectedILOCDIO) {
        params.append('ilo_cdio_key', selectedILOCDIO)
      }

      const response = await fetch(`/api/assessments/ilo-attainment?${params.toString()}`, {
        signal: attainmentAbortControllerRef.current.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ILO attainment data: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        if (iloId) {
          setSelectedILO(result.data)
          setStudentList(result.data.students || [])
          setAttainmentData(null) // Clear summary when showing specific ILO
        } else {
          setAttainmentData(result.data)
          setSelectedILO(null)
          setStudentList([])
        }
      } else {
        throw new Error(result.error || 'Failed to load attainment data')
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🚫 [ILO ATTAINMENT] Attainment request was aborted')
        return
      }
      console.error('Error loading attainment data:', error)
      setError(error.message || 'Failed to load attainment data')
    } finally {
      setLoadingAttainment(false)
    }
  }, [passThreshold, performanceFilter, highThreshold, lowThreshold, selectedSO, selectedSDG, selectedIGA, selectedCDIO, selectedILOCombination, selectedILOSO, selectedILOSDG, selectedILOIGA, selectedILOCDIO])

  // Load ILO combinations with assessments
  const loadILOCombinations = useCallback(async (sectionCourseId) => {
    if (!sectionCourseId) return

    if (attainmentAbortControllerRef.current) {
      attainmentAbortControllerRef.current.abort()
    }
    
    attainmentAbortControllerRef.current = new AbortController()

    setLoadingAttainment(true)
    setError('')

    try {
      const params = new URLSearchParams({
        section_course_id: sectionCourseId.toString()
      })
      
      if (selectedSO) params.append('so_id', selectedSO)
      if (selectedSDG) params.append('sdg_id', selectedSDG)
      if (selectedIGA) params.append('iga_id', selectedIGA)
      if (selectedCDIO) params.append('cdio_id', selectedCDIO)

      const response = await fetch(`/api/assessments/ilo-attainment/combinations?${params.toString()}`, {
        signal: attainmentAbortControllerRef.current.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ILO combinations: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setIloCombinations(result.data)
        setShowCombinations(true)
        setAttainmentData(null)
        setSelectedILO(null)
        setSelectedILOCombination('') // Clear any selected ILO combination
        console.log(`✅ [ILO COMBINATIONS] Loaded ${result.data.length} ILO combinations with assessments`)
      } else {
        throw new Error(result.error || 'Failed to load ILO combinations')
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🚫 [ILO COMBINATIONS] Request was aborted')
        return
      }
      console.error('Error loading ILO combinations:', error)
      setError(error.message || 'Failed to load ILO combinations')
    } finally {
      setLoadingAttainment(false)
    }
  }, [selectedSO, selectedSDG, selectedIGA, selectedCDIO, selectedILOSO, selectedILOSDG, selectedILOIGA, selectedILOCDIO])

  // Load data when class is selected or filters change
  useEffect(() => {
    if (selectedClass?.section_course_id) {
      // Check if any ILO combination filter is selected
      const hasILOCombinationFilter = selectedILOSO || selectedILOSDG || selectedILOIGA || selectedILOCDIO || selectedILOCombination;
      
      if (hasILOCombinationFilter) {
        // Extract ILO ID from combination key if present
        let iloIdToLoad = null;
        if (selectedILOSO) {
          const parts = selectedILOSO.split('_');
          iloIdToLoad = parts.length === 2 ? parseInt(parts[0]) : null;
        } else if (selectedILOSDG) {
          const parts = selectedILOSDG.split('_');
          iloIdToLoad = parts.length === 2 ? parseInt(parts[0]) : null;
        } else if (selectedILOIGA) {
          const parts = selectedILOIGA.split('_');
          iloIdToLoad = parts.length === 2 ? parseInt(parts[0]) : null;
        } else if (selectedILOCDIO) {
          const parts = selectedILOCDIO.split('_');
          iloIdToLoad = parts.length === 2 ? parseInt(parts[0]) : null;
        } else if (selectedILOCombination) {
          iloIdToLoad = parseInt(selectedILOCombination);
        }
        
        if (iloIdToLoad) {
          // Load that ILO's detailed data
          loadAttainmentData(selectedClass.section_course_id, iloIdToLoad)
          setShowCombinations(false)
        }
      } else {
        // Otherwise load ILO combinations with assessments
        loadILOCombinations(selectedClass.section_course_id)
      }
    }
  }, [selectedClass?.section_course_id, selectedSO, selectedSDG, selectedIGA, selectedCDIO, selectedILOCombination, selectedILOSO, selectedILOSDG, selectedILOIGA, selectedILOCDIO, loadAttainmentData, loadILOCombinations])

  // Reload student list when performance filter changes (only if viewing student list)
  useEffect(() => {
    if (selectedILO?.ilo_id && selectedClass?.section_course_id) {
      loadAttainmentData(selectedClass.section_course_id, selectedILO.ilo_id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [performanceFilter])

  // Reload data when SO/SDG/IGA/CDIO filters change while viewing a specific ILO
  useEffect(() => {
    if (selectedILO?.ilo_id && selectedClass?.section_course_id && !selectedILOCombination) {
      loadAttainmentData(selectedClass.section_course_id, selectedILO.ilo_id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSO, selectedSDG, selectedIGA, selectedCDIO, selectedILOSO, selectedILOSDG, selectedILOIGA, selectedILOCDIO])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (attainmentAbortControllerRef.current) {
        attainmentAbortControllerRef.current.abort()
      }
    }
  }, [])

  // Handle ILO click to show student list
  const handleILOClick = (ilo) => {
    if (selectedClass?.section_course_id) {
      loadAttainmentData(selectedClass.section_course_id, ilo.ilo_id)
    }
  }

  // Handle back to summary
  const handleBackToSummary = () => {
    setSelectedILO(null)
    setStudentList([])
    if (selectedClass?.section_course_id) {
      loadAttainmentData(selectedClass.section_course_id)
    }
  }

  // Toggle expanded student
  const toggleStudentExpanded = (studentId) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(studentId)) {
        newSet.delete(studentId)
      } else {
        newSet.add(studentId)
      }
      return newSet
    })
  }

  // Export to Excel
  const handleExportExcel = async () => {
    if (!selectedClass?.section_course_id) return

    try {
      const params = new URLSearchParams({
        section_course_id: selectedClass.section_course_id.toString(),
        pass_threshold: passThreshold.toString()
      })

      if (selectedILO) {
        params.append('ilo_id', selectedILO.ilo_id.toString())
        params.append('performance_filter', performanceFilter)
      }

      window.open(`/api/assessments/ilo-attainment/export?${params.toString()}`, '_blank')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('Failed to export to Excel')
    }
  }

  // Loading skeleton for classes
  if (loading && classes.length === 0) {
    return (
      <div className="h-full bg-gray-50 p-3 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
            <div className="h-10 bg-gray-200 rounded w-full md:w-1/3"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50 p-3 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AcademicCapIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ILO Attainment Analytics</h1>
                <p className="text-sm text-gray-500 mt-1">View student performance on ILO-mapped assessments</p>
              </div>
            </div>
            {selectedClass && (
              <button
                onClick={handleExportExcel}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                <span>Export to Excel</span>
              </button>
            )}
          </div>
        </div>

        {/* Class Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Class
          </label>
          <select
            value={selectedClass?.section_course_id || ''}
            onChange={(e) => {
              const classId = parseInt(e.target.value)
              const cls = filteredClasses.find(c => c.section_course_id === classId)
              setSelectedClass(cls || null)
            }}
            className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            disabled={loading}
          >
            <option value="">-- Select a class --</option>
            {filteredClasses.map((cls) => (
              <option key={cls.section_course_id} value={cls.section_course_id}>
                {cls.course_title} - {cls.section_code}
              </option>
            ))}
          </select>
          {filteredClasses.length === 0 && !loading && (
            <p className="mt-2 text-sm text-gray-500">No classes available for the active term.</p>
          )}
        </div>


        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Loading State with Skeleton */}
        {loadingAttainment && !selectedILO && !showCombinations && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-gray-50 p-4 rounded-lg">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            </div>
            <TableSkeleton rows={8} columns={8} />
          </div>
        )}

        {/* ILO Combinations with Assessments View */}
        {!loadingAttainment && showCombinations && (
          <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <h2 className="text-xl font-bold text-gray-900 mb-2">ILO Combinations with Assessments</h2>
              <p className="text-sm text-gray-600">
                {iloCombinations.length > 0 
                  ? `Showing ${iloCombinations.length} ILO combination${iloCombinations.length !== 1 ? 's' : ''} with their assessments`
                  : 'No ILO combinations found matching the selected filters'}
              </p>
            </div>

            {iloCombinations.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No ILO combinations found for the selected filters.</p>
                <p className="text-sm text-gray-500 mt-2">Try adjusting your filter selections.</p>
              </div>
            ) : (
              iloCombinations.map((ilo) => (
                <div key={ilo.ilo_id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* ILO Header */}
                <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{ilo.ilo_code}</h3>
                      <p className="text-sm text-gray-600 mt-1">{ilo.description}</p>
                      {ilo.mappings && ilo.mappings.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {ilo.mappings.map((mapping, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                            >
                              {mapping.type}: {mapping.code}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedILOCombination(ilo.ilo_id.toString())
                        setShowCombinations(false)
                      }}
                      className="ml-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      View Details →
                    </button>
                  </div>
                </div>

              </div>
              ))
            )}
          </div>
        )}

        {/* Summary View */}
        {!loadingAttainment && !selectedILO && !showCombinations && attainmentData && (
          <div className="space-y-6">
            {/* Summary Stats */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Total ILOs</p>
                  <p className="text-3xl font-bold text-blue-600">{attainmentData.summary?.total_ilos || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Total Students</p>
                  <p className="text-3xl font-bold text-green-600">{attainmentData.summary?.total_students || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-600 mb-1">Overall Attainment Rate</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {attainmentData.summary?.overall_attainment_rate?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* ILO Attainment Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">ILO Attainment</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ILO Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Students
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attained
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attainment %
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        High Performance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Low Performance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mapped To
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attainmentData.ilo_attainment?.map((ilo) => (
                      <tr
                        key={ilo.ilo_id}
                        onClick={() => handleILOClick(ilo)}
                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">{ilo.ilo_code}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-700">{ilo.description}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{ilo.total_students}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{ilo.attained_count}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-sm font-medium ${
                            ilo.attainment_percentage >= 80 ? 'text-green-600' :
                            ilo.attainment_percentage >= 60 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {ilo.attainment_percentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-green-600 font-medium">{ilo.high_performance_count}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-red-600 font-medium">{ilo.low_performance_count}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {ilo.mapped_to?.map((mapping, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                              >
                                {mapping.type}: {mapping.code}
                              </span>
                            ))}
                            {(!ilo.mapped_to || ilo.mapped_to.length === 0) && (
                              <span className="text-xs text-gray-400">None</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Student List View */}
        {!loadingAttainment && selectedILO && (
          <div className="space-y-6">
            {/* Filters Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ILO-SO Filter */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">ILO-SO</label>
                  <select
                    value={selectedILOSO}
                    onChange={(e) => {
                      setSelectedILOSO(e.target.value)
                      setSelectedILOSDG('')
                      setSelectedILOIGA('')
                      setSelectedILOCDIO('')
                      setSelectedILOCombination('')
                      setSelectedSO('')
                      setSelectedSDG('')
                      setSelectedIGA('')
                      setSelectedCDIO('')
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                    disabled={!filterOptions.ilo_so_combinations || filterOptions.ilo_so_combinations.length === 0}
                  >
                    <option value="">All ILO-SO Combinations</option>
                    {filterOptions.ilo_so_combinations?.map((combo) => (
                      <option key={combo.ilo_so_key} value={combo.ilo_so_key}>
                        {combo.combination_label} - {combo.ilo_description?.substring(0, 40)}...
                      </option>
                    ))}
                  </select>
                </div>

                {/* ILO-SDG Filter */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">ILO-SDG</label>
                  <select
                    value={selectedILOSDG}
                    onChange={(e) => {
                      setSelectedILOSDG(e.target.value)
                      setSelectedILOSO('')
                      setSelectedILOIGA('')
                      setSelectedILOCDIO('')
                      setSelectedILOCombination('')
                      setSelectedSO('')
                      setSelectedSDG('')
                      setSelectedIGA('')
                      setSelectedCDIO('')
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                    disabled={!filterOptions.ilo_sdg_combinations || filterOptions.ilo_sdg_combinations.length === 0}
                  >
                    <option value="">All ILO-SDG Combinations</option>
                    {filterOptions.ilo_sdg_combinations?.map((combo) => (
                      <option key={combo.ilo_sdg_key} value={combo.ilo_sdg_key}>
                        {combo.combination_label} - {combo.ilo_description?.substring(0, 40)}...
                      </option>
                    ))}
                  </select>
                </div>

                {/* ILO-IGA Filter */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">ILO-IGA</label>
                  <select
                    value={selectedILOIGA}
                    onChange={(e) => {
                      setSelectedILOIGA(e.target.value)
                      setSelectedILOSO('')
                      setSelectedILOSDG('')
                      setSelectedILOCDIO('')
                      setSelectedILOCombination('')
                      setSelectedSO('')
                      setSelectedSDG('')
                      setSelectedIGA('')
                      setSelectedCDIO('')
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                    disabled={!filterOptions.ilo_iga_combinations || filterOptions.ilo_iga_combinations.length === 0}
                  >
                    <option value="">All ILO-IGA Combinations</option>
                    {filterOptions.ilo_iga_combinations?.map((combo) => (
                      <option key={combo.ilo_iga_key} value={combo.ilo_iga_key}>
                        {combo.combination_label} - {combo.ilo_description?.substring(0, 40)}...
                      </option>
                    ))}
                  </select>
                </div>

                {/* ILO-CDIO Filter */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">ILO-CDIO</label>
                  <select
                    value={selectedILOCDIO}
                    onChange={(e) => {
                      setSelectedILOCDIO(e.target.value)
                      setSelectedILOSO('')
                      setSelectedILOSDG('')
                      setSelectedILOIGA('')
                      setSelectedILOCombination('')
                      setSelectedSO('')
                      setSelectedSDG('')
                      setSelectedIGA('')
                      setSelectedCDIO('')
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                    disabled={!filterOptions.ilo_cdio_combinations || filterOptions.ilo_cdio_combinations.length === 0}
                  >
                    <option value="">All ILO-CDIO Combinations</option>
                    {filterOptions.ilo_cdio_combinations?.map((combo) => (
                      <option key={combo.ilo_cdio_key} value={combo.ilo_cdio_key}>
                        {combo.combination_label} - {combo.ilo_description?.substring(0, 40)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Main Content with Sidebar Layout */}
            <div className="flex gap-6 items-start">
              {/* Main Content Area - Student Results */}
              <div className="flex-1 min-w-0 space-y-6">

                {/* Performance Filter */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">Filter by Performance:</span>
                    <button
                      onClick={() => setPerformanceFilter('all')}
                      className={`px-4 py-2 rounded-lg transition-colors transition ${
                        performanceFilter === 'all'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setPerformanceFilter('high')}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        performanceFilter === 'high'
                          ? 'bg-green-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      High Performance
                    </button>
                    <button
                      onClick={() => setPerformanceFilter('low')}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        performanceFilter === 'low'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Low Performance
                    </button>
                  </div>
                </div>

                {/* Students Grouped by Percentage Range */}
                {loadingAttainment ? (
                  <TableSkeleton rows={10} columns={5} />
                ) : selectedILO.students_by_range && selectedILO.students_by_range.length > 0 ? (
                  <div className="space-y-4">
                {selectedILO.students_by_range
                  .sort((a, b) => {
                    const aStart = parseInt(a.range.split('-')[0]);
                    const bStart = parseInt(b.range.split('-')[0]);
                    return bStart - aStart; // Sort descending (90-100 first)
                  })
                  .map((rangeGroup) => {
                    const [min, max] = rangeGroup.range.split('-').map(Number);
                    const rangeColor = 
                      min >= 90 ? 'border-green-300 bg-green-50' :
                      min >= 80 ? 'border-blue-300 bg-blue-50' :
                      min >= 70 ? 'border-yellow-300 bg-yellow-50' :
                      min >= 60 ? 'border-orange-300 bg-orange-50' :
                      min >= 50 ? 'border-red-300 bg-red-50' :
                      'border-gray-300 bg-gray-50';
                    
                    const headerColor = 
                      min >= 90 ? 'bg-green-100 border-green-200' :
                      min >= 80 ? 'bg-blue-100 border-blue-200' :
                      min >= 70 ? 'bg-yellow-100 border-yellow-200' :
                      min >= 60 ? 'bg-orange-100 border-orange-200' :
                      min >= 50 ? 'bg-red-100 border-red-200' :
                      'bg-gray-100 border-gray-200';
                    
                    return (
                      <div key={rangeGroup.range} className={`bg-white rounded-lg shadow-sm border-2 ${rangeColor} overflow-hidden p-3`}>
                        <div className={`px-4 py-2 border-b ${headerColor}`}>
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {rangeGroup.range}% Score Range
                            </h3>
                            <span className="text-sm font-medium text-gray-700">
                              {rangeGroup.count} {rangeGroup.count === 1 ? 'Student' : 'Students'}
                            </span>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                                  
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Student Number
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Full Name
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  ILO Score
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Overall %
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Attainment Status
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Performance Level
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {rangeGroup.students.map((student) => {
                                const isExpanded = expandedStudents.has(student.student_id)
                                return (
                                  <React.Fragment key={student.student_id}>
                                    <tr className="hover:bg-gray-50 transition-colors">
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <button
                                          onClick={() => toggleStudentExpanded(student.student_id)}
                                          className="text-gray-500 hover:text-gray-700 transition-colors"
                                          title={isExpanded ? 'Hide assessment scores' : 'Show assessment scores'}
                                        >
                                          {isExpanded ? (
                                            <ChevronDownIcon className="h-5 w-5" />
                                          ) : (
                                            <ChevronRightIcon className="h-5 w-5" />
                                          )}
                                        </button>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <span className="text-sm text-gray-900">{student.student_number}</span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="text-sm text-gray-900">{student.full_name}</span>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <span className="text-sm font-medium text-gray-900">{student.ilo_score?.toFixed(2) || '0.00'}</span>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`text-sm font-medium ${
                                          (student.overall_attainment_rate || 0) >= 80 ? 'text-green-600' :
                                          (student.overall_attainment_rate || 0) >= 60 ? 'text-yellow-600' :
                                          'text-red-600'
                                        }`}>
                                          {(student.overall_attainment_rate || 0).toFixed(2)}%
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                          student.attainment_status === 'attained'
                                            ? 'bg-green-100 text-green-800 border border-green-200'
                                            : 'bg-red-100 text-red-800 border border-red-200'
                                        }`}>
                                          {student.attainment_status === 'attained' ? 'Passed' : 'Failed'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                          student.performance_level === 'high'
                                            ? 'bg-green-100 text-green-800 border border-green-200'
                                            : student.performance_level === 'medium'
                                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                            : 'bg-red-100 text-red-800 border border-red-200'
                                        }`}>
                                          {student.performance_level === 'high' ? 'High' :
                                           student.performance_level === 'medium' ? 'Medium' : 'Low'}
                                        </span>
                                      </td>
                                    </tr>
                                    {isExpanded && student.assessment_scores && student.assessment_scores.length > 0 && (
                                      <tr className="bg-gray-50">
                                        <td colSpan="7" className="px-4 py-3">
                                          <div className="bg-white rounded-lg border border-gray-200 p-3">
                                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Individual Assessment Scores</h4>
                                            <div className="overflow-x-auto">
                                              <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                  <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                      Assessment
                                                    </th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                      Score / Max Score
                                                    </th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                      Percentage
                                                    </th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                      Transmuted Score
                                                    </th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                      Weight %
                                                    </th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                      ILO Weight %
                                                    </th>
                                                  </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                  {student.assessment_scores.map((assessment, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                      <td className="px-4 py-2">
                                                        <span className="text-sm text-gray-900">{assessment.assessment_title}</span>
                                                      </td>
                                                      <td className="px-4 py-2 whitespace-nowrap">
                                                        <span className="text-sm font-medium text-gray-900">
                                                          {assessment.raw_score?.toFixed(2) || '0.00'} / {assessment.max_score || 0}
                                                        </span>
                                                      </td>
                                                      <td className="px-4 py-2 whitespace-nowrap">
                                                        <span className={`text-sm font-medium ${
                                                          (assessment.score_percentage || 0) >= 80 ? 'text-green-600' :
                                                          (assessment.score_percentage || 0) >= 60 ? 'text-yellow-600' :
                                                          'text-red-600'
                                                        }`}>
                                                          {(assessment.score_percentage || 0).toFixed(2)}%
                                                        </span>
                                                      </td>
                                                      <td className="px-4 py-2 whitespace-nowrap">
                                                        <span className="text-sm text-gray-700">
                                                          {assessment.transmuted_score?.toFixed(2) || '0.00'}
                                                        </span>
                                                      </td>
                                                      <td className="px-4 py-2 whitespace-nowrap">
                                                        <span className="text-sm text-gray-700">
                                                          {assessment.weight_percentage?.toFixed(1) || '0.0'}%
                                                        </span>
                                                      </td>
                                                      <td className="px-4 py-2 whitespace-nowrap">
                                                        <span className="text-sm text-gray-700">
                                                          {assessment.ilo_weight_percentage?.toFixed(1) || '0.0'}%
                                                        </span>
                                                      </td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                    <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No students found for the selected filter.</p>
                  </div>
                )}
              </div>

              {/* Right Sidebar - Selected ILO Pair */}
              {selectedILO.assessments && selectedILO.assessments.length > 0 && (
                <div className="w-80 flex-shrink-0">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-4 h-fit max-h-[calc(100vh-120px)] overflow-y-auto">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected ILO Pair</h3>
                    
                    {/* Simplified Assessments Table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Assessment
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Points
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              %
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedILO.assessments.map((assessment) => (
                            <tr key={assessment.assessment_id} className="hover:bg-gray-50">
                              <td className="px-3 py-2">
                                <span className="text-sm font-medium text-gray-900">{assessment.title}</span>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-900">{assessment.total_points}</span>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span className={`text-sm font-medium ${
                                  parseFloat(assessment.average_percentage || 0) >= 80 ? 'text-green-600' :
                                  parseFloat(assessment.average_percentage || 0) >= 60 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {parseFloat(assessment.average_percentage || 0).toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Overall Grade and Percentage */}
                    {selectedILO.assessments && selectedILO.assessments.length > 0 && (() => {
                      const totalPoints = selectedILO.assessments.reduce((sum, a) => sum + (parseFloat(a.total_points) || 0), 0);
                      const avgPercentage = selectedILO.assessments.length > 0
                        ? selectedILO.assessments.reduce((sum, a) => sum + (parseFloat(a.average_percentage) || 0), 0) / selectedILO.assessments.length
                        : 0;
                      
                      // Calculate overall grade based on average percentage
                      const getGrade = (percentage) => {
                        if (percentage >= 97) return 'A+';
                        if (percentage >= 93) return 'A';
                        if (percentage >= 90) return 'A-';
                        if (percentage >= 87) return 'B+';
                        if (percentage >= 83) return 'B';
                        if (percentage >= 80) return 'B-';
                        if (percentage >= 77) return 'C+';
                        if (percentage >= 73) return 'C';
                        if (percentage >= 70) return 'C-';
                        if (percentage >= 67) return 'D+';
                        if (percentage >= 63) return 'D';
                        if (percentage >= 60) return 'D-';
                        return 'F';
                      };

                      const overallGrade = getGrade(avgPercentage);
                      const gradeColor = avgPercentage >= 80 ? 'text-green-600' : avgPercentage >= 60 ? 'text-yellow-600' : 'text-red-600';

                      return (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Overall Grade:</span>
                              <span className={`text-lg font-bold ${gradeColor}`}>{overallGrade}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Overall Percentage:</span>
                              <span className={`text-lg font-bold ${gradeColor}`}>
                                {avgPercentage.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Total Points:</span>
                              <span className="text-sm text-gray-900">{totalPoints}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ILOAttainment
