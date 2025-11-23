import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { safeGetItem, safeSetItem, minimizeClassData } from '../../utils/cacheUtils'
import { TableSkeleton } from '../../components/skeletons'
import ILOAttainmentSkeleton from '../../components/skeletons/ILOAttainmentSkeleton'
import ILOInsights from '../../components/ILOInsights'
import ILOAttainmentSummaryTable from '../../components/ILOAttainmentSummaryTable'
import {
  UserGroupIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon
} from '@heroicons/react/24/solid'

const ILOAttainment = () => {
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
  const [expandedStudents, setExpandedStudents] = useState(new Set())
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showStudentModal, setShowStudentModal] = useState(false)
  
  // Filters
  const [passThreshold, setPassThreshold] = useState(75)
  const [performanceFilter, setPerformanceFilter] = useState('all')
  const [highThreshold, setHighThreshold] = useState(80)
  const [lowThreshold, setLowThreshold] = useState(75)
  const [selectedPercentageRange, setSelectedPercentageRange] = useState('all')
  
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
            console.log('✅ [PROGRAM CHAIR ILO ATTAINMENT] Active term found:', activeTerm.term_id, activeTerm.school_year, activeTerm.semester)
          } else {
            console.warn('⚠️ [PROGRAM CHAIR ILO ATTAINMENT] No active term found')
          }
        }
      } catch (error) {
        console.error('❌ [PROGRAM CHAIR ILO ATTAINMENT] Error fetching active term:', error)
      }
    }
    fetchActiveTerm()
  }, [])

  // Load all classes for the active term
  useEffect(() => {
    const loadClasses = async () => {
      if (!activeTermId) return
      
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Create new abort controller
      abortControllerRef.current = new AbortController()
      
      const cacheKey = `classes_term_${activeTermId}`
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
        const response = await fetch(`/api/section-courses/term/${activeTermId}`, {
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
          console.log('🚫 [PROGRAM CHAIR ILO ATTAINMENT] Classes request was aborted')
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
  }, [activeTermId])

  // Filter classes by active term (already filtered by API, but keep for consistency)
  const filteredClasses = useMemo(() => {
    if (activeTermId === null) return []
    return classes.filter(cls => cls.term_id === activeTermId)
  }, [classes, activeTermId])

  // Load filter options when class is selected or filters change
  useEffect(() => {
    const loadFilterOptions = async () => {
      if (!selectedClass?.section_course_id) {
        setFilterOptions({ so: [], sdg: [], iga: [], cdio: [], ilo_combinations: [], ilo_so_combinations: [], ilo_sdg_combinations: [], ilo_iga_combinations: [], ilo_cdio_combinations: [] })
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

  // Load ILO attainment data
  const loadAttainmentData = useCallback(async (sectionCourseId, iloId = null) => {
    if (!sectionCourseId) return

    if (attainmentAbortControllerRef.current) {
      attainmentAbortControllerRef.current.abort()
    }
    
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
      
      if (selectedSO) params.append('so_id', selectedSO)
      if (selectedSDG) params.append('sdg_id', selectedSDG)
      if (selectedIGA) params.append('iga_id', selectedIGA)
      if (selectedCDIO) params.append('cdio_id', selectedCDIO)
      
      if (selectedILOSO) params.append('ilo_so_key', selectedILOSO)
      if (selectedILOSDG) params.append('ilo_sdg_key', selectedILOSDG)
      if (selectedILOIGA) params.append('ilo_iga_key', selectedILOIGA)
      if (selectedILOCDIO) params.append('ilo_cdio_key', selectedILOCDIO)

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
          setAttainmentData(null)
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
        console.log('🚫 [PROGRAM CHAIR ILO ATTAINMENT] Attainment request was aborted')
        return
      }
      console.error('Error loading attainment data:', error)
      setError(error.message || 'Failed to load attainment data')
    } finally {
      setLoadingAttainment(false)
    }
  }, [passThreshold, performanceFilter, highThreshold, lowThreshold, selectedSO, selectedSDG, selectedIGA, selectedCDIO, selectedILOCombination, selectedILOSO, selectedILOSDG, selectedILOIGA, selectedILOCDIO])

  // Load data when class is selected or filters change
  useEffect(() => {
    if (selectedClass?.section_course_id) {
      const hasILOCombinationFilter = selectedILOSO || selectedILOSDG || selectedILOIGA || selectedILOCDIO || selectedILOCombination;
      
      if (hasILOCombinationFilter) {
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
          loadAttainmentData(selectedClass.section_course_id, iloIdToLoad)
        }
      } else {
        loadAttainmentData(selectedClass.section_course_id)
      }
    }
  }, [selectedClass?.section_course_id, selectedSO, selectedSDG, selectedIGA, selectedCDIO, selectedILOCombination, selectedILOSO, selectedILOSDG, selectedILOIGA, selectedILOCDIO, loadAttainmentData])

  // Reload data when filters change
  useEffect(() => {
    if (selectedILO?.ilo_id && selectedClass?.section_course_id && !selectedILOCombination) {
      loadAttainmentData(selectedClass.section_course_id, selectedILO.ilo_id)
    }
  }, [selectedSO, selectedSDG, selectedIGA, selectedCDIO, selectedILOSO, selectedILOSDG, selectedILOIGA, selectedILOCDIO])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (attainmentAbortControllerRef.current) {
        attainmentAbortControllerRef.current.abort()
      }
    }
  }, [])

  // Handle ILO click
  const handleILOClick = (ilo) => {
    if (selectedClass?.section_course_id) {
      loadAttainmentData(selectedClass.section_course_id, ilo.ilo_id)
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

  // Handle student click
  const handleStudentClick = (student, e) => {
    if (e.target.closest('button')) {
      return
    }
    setSelectedStudent(student)
    setShowStudentModal(true)
  }

  // Close modal
  const handleCloseModal = () => {
    setShowStudentModal(false)
    setSelectedStudent(null)
  }

  // Loading skeleton
  if (loading && classes.length === 0) {
    return (
      <div className="h-full bg-gray-50 overflow-y-auto">
        <div className="w-full px-6 py-4">
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
    <div className="h-full bg-gray-50 flex flex-col">
      <div className="w-full px-6 py-4 flex-shrink-0">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0">
              <label className="block text-xs text-gray-600 mb-1">Class</label>
              <div className="flex items-center space-x-2">
                <select
                  value={selectedClass?.section_course_id || ''}
                  onChange={(e) => {
                    const classId = parseInt(e.target.value)
                    const cls = filteredClasses.find(c => c.section_course_id === classId)
                    setSelectedClass(cls || null)
                  }}
                  className="w-64 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  disabled={loading}
                >
                  <option value="">-- Select a class --</option>
                  {filteredClasses.map((cls) => (
                    <option key={cls.section_course_id} value={cls.section_course_id}>
                      {cls.course_title} - {cls.section_code}
                    </option>
                  ))}
                </select>
              </div>
              {filteredClasses.length === 0 && !loading && (
                <p className="mt-2 text-xs text-gray-500">No classes available for the active term.</p>
              )}
            </div>

            <div className="flex-1">
              <div className="grid grid-cols-4 gap-4">
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
                    disabled={!selectedClass || !filterOptions.ilo_so_combinations || filterOptions.ilo_so_combinations.length === 0}
                  >
                    <option value="">All ILO-SO</option>
                    {filterOptions.ilo_so_combinations?.map((combo) => (
                      <option key={combo.ilo_so_key} value={combo.ilo_so_key}>
                        {combo.combination_label}
                      </option>
                    ))}
                  </select>
                </div>

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
                    disabled={!selectedClass || !filterOptions.ilo_sdg_combinations || filterOptions.ilo_sdg_combinations.length === 0}
                  >
                    <option value="">All ILO-SDG</option>
                    {filterOptions.ilo_sdg_combinations?.map((combo) => (
                      <option key={combo.ilo_sdg_key} value={combo.ilo_sdg_key}>
                        {combo.combination_label}
                      </option>
                    ))}
                  </select>
                </div>

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
                    disabled={!selectedClass || !filterOptions.ilo_iga_combinations || filterOptions.ilo_iga_combinations.length === 0}
                  >
                    <option value="">All ILO-IGA</option>
                    {filterOptions.ilo_iga_combinations?.map((combo) => (
                      <option key={combo.ilo_iga_key} value={combo.ilo_iga_key}>
                        {combo.combination_label}
                      </option>
                    ))}
                  </select>
                </div>

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
                    disabled={!selectedClass || !filterOptions.ilo_cdio_combinations || filterOptions.ilo_cdio_combinations.length === 0}
                  >
                    <option value="">All ILO-CDIO</option>
                    {filterOptions.ilo_cdio_combinations?.map((combo) => (
                      <option key={combo.ilo_cdio_key} value={combo.ilo_cdio_key}>
                        {combo.combination_label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loadingAttainment ? (
          <ILOAttainmentSkeleton />
        ) : (
          <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6">
            <div className="flex gap-6 items-stretch flex-1 min-h-0 pb-4">
              <div className="flex-1 min-w-0 flex flex-col space-y-6 overflow-y-auto">
                {/* Summary Table - Show when class is selected and we have summary data */}
                {selectedClass && attainmentData && !selectedILO && (
                  <ILOAttainmentSummaryTable
                    courseCode={selectedClass.course_code}
                    courseTitle={selectedClass.course_title}
                    sectionCode={selectedClass.section_code}
                    totalStudents={attainmentData.summary?.total_students || 0}
                    iloAttainment={attainmentData.ilo_attainment || []}
                    assessments={[]}
                    passThreshold={passThreshold}
                    mappingData={filterOptions}
                  />
                )}

                {/* Summary Table - Also show when viewing a specific ILO */}
                {selectedClass && selectedILO && (
                  <ILOAttainmentSummaryTable
                    courseCode={selectedClass.course_code}
                    courseTitle={selectedClass.course_title}
                    sectionCode={selectedClass.section_code}
                    totalStudents={selectedILO.total_students || 0}
                    iloAttainment={[{
                      ilo_id: selectedILO.ilo_id,
                      ilo_code: selectedILO.ilo_code,
                      description: selectedILO.description,
                      attainment_percentage: selectedILO.attained_count && selectedILO.total_students 
                        ? (selectedILO.attained_count / selectedILO.total_students) * 100 
                        : 0,
                      mapped_to: selectedILO.mapped_to || []
                    }]}
                    assessments={selectedILO.assessments || []}
                    passThreshold={passThreshold}
                    students={selectedILO.students || []}
                    mappingData={filterOptions}
                  />
                )}

                {selectedClass && selectedILO ? (
                  <>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                      <div className="flex items-center space-x-4">
                        <label className="text-sm font-medium text-gray-700">Filter by Percentage Range:</label>
                        <select
                          value={selectedPercentageRange}
                          onChange={(e) => setSelectedPercentageRange(e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                        >
                          <option value="all">All Ranges</option>
                          <option value="90-100">90-100%</option>
                          <option value="80-89">80-89%</option>
                          <option value="70-79">70-79%</option>
                          <option value="60-69">60-69%</option>
                          <option value="50-59">50-59%</option>
                          <option value="0-49">Below 50%</option>
                        </select>
                      </div>
                    </div>

                    {selectedILO.students_by_range && selectedILO.students_by_range.length > 0 ? (
                      <div className="space-y-4">
                        {selectedILO.students_by_range
                          .filter((rangeGroup) => {
                            if (selectedPercentageRange === 'all') return true;
                            const rangeStr = rangeGroup.range.replace('%', '').trim();
                            const selectedRange = selectedPercentageRange.replace('%', '').trim();
                            return rangeStr === selectedRange;
                          })
                          .sort((a, b) => {
                            const aStart = parseInt(a.range.split('-')[0]);
                            const bStart = parseInt(b.range.split('-')[0]);
                            return bStart - aStart;
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
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Number</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ILO Score</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overall %</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {rangeGroup.students.map((student) => {
                                        const isExpanded = expandedStudents.has(student.student_id)
                                        return (
                                          <React.Fragment key={student.student_id}>
                                            <tr 
                                              className="hover:bg-gray-50 transition-colors cursor-pointer"
                                              onClick={(e) => handleStudentClick(student, e)}
                                            >
                                              <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                  onClick={() => toggleStudentExpanded(student.student_id)}
                                                  className="text-gray-500 hover:text-gray-700 transition-colors"
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
                                            </tr>
                                            {isExpanded && student.assessment_scores && student.assessment_scores.length > 0 && (
                                              <tr className="bg-gray-50">
                                                <td colSpan="5" className="px-4 py-3">
                                                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Individual Assessment Scores</h4>
                                                    <div className="overflow-x-auto">
                                                      <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-gray-50">
                                                          <tr>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assessment</th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score / Max Score</th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transmuted Score</th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight %</th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ILO Weight %</th>
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
                  </>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center flex-1 flex items-center justify-center min-h-[400px]">
                    <div>
                      <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        {!selectedClass ? 'Please select a class to view student performance.' : 'Please select an ILO to view student details.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-80 flex-shrink-0 flex flex-col">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full overflow-y-auto space-y-4">
                  {selectedClass && selectedILO && selectedILO.assessments && selectedILO.assessments.length > 0 && (
                    <>
                      {/* ILO and Pair Information */}
                      {(() => {
                        // Find the selected combination based on which filter is active
                        let selectedCombination = null;
                        let pairType = '';
                        let pairCode = '';
                        let pairDescription = '';

                        if (selectedILOSO) {
                          selectedCombination = filterOptions.ilo_so_combinations?.find(c => c.ilo_so_key === selectedILOSO);
                          if (selectedCombination) {
                            pairType = 'SO';
                            pairCode = selectedCombination.so_code;
                            pairDescription = selectedCombination.so_description || '';
                          }
                        } else if (selectedILOSDG) {
                          selectedCombination = filterOptions.ilo_sdg_combinations?.find(c => c.ilo_sdg_key === selectedILOSDG);
                          if (selectedCombination) {
                            pairType = 'SDG';
                            pairCode = selectedCombination.sdg_code;
                            pairDescription = selectedCombination.sdg_description || '';
                          }
                        } else if (selectedILOIGA) {
                          selectedCombination = filterOptions.ilo_iga_combinations?.find(c => c.ilo_iga_key === selectedILOIGA);
                          if (selectedCombination) {
                            pairType = 'IGA';
                            pairCode = selectedCombination.iga_code;
                            pairDescription = selectedCombination.iga_description || '';
                          }
                        } else if (selectedILOCDIO) {
                          selectedCombination = filterOptions.ilo_cdio_combinations?.find(c => c.ilo_cdio_key === selectedILOCDIO);
                          if (selectedCombination) {
                            pairType = 'CDIO';
                            pairCode = selectedCombination.cdio_code;
                            pairDescription = selectedCombination.cdio_description || '';
                          }
                        }

                        const iloDescription = selectedILO.description || selectedCombination?.ilo_description || '';
                        const iloCode = selectedILO.ilo_code || selectedCombination?.ilo_code || '';

                        if (iloDescription || pairDescription) {
                          return (
                            <div className="mb-4 pb-4 border-b border-gray-200 space-y-3">
                              {/* ILO Information */}
                              {iloDescription && (
                                <div>
                                  <div className="flex items-start gap-2 mb-1">
                                    <span className="text-xs font-semibold text-gray-700">{iloCode}:</span>
                                  </div>
                                  <p className="text-xs text-gray-600 leading-relaxed">{iloDescription}</p>
                                </div>
                              )}
                              {/* Pair Information */}
                              {pairDescription && (
                                <div>
                                  <div className="flex items-start gap-2 mb-1">
                                    <span className="text-xs font-semibold text-gray-700">{pairCode}:</span>
                                  </div>
                                  <p className="text-xs text-gray-600 leading-relaxed">{pairDescription}</p>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}
                      <div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assessment</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">%</th>
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

                        {selectedILO.assessments && selectedILO.assessments.length > 0 && (() => {
                          const totalPoints = selectedILO.assessments.reduce((sum, a) => sum + (parseFloat(a.total_points) || 0), 0);
                          const avgPercentage = selectedILO.assessments.length > 0
                            ? selectedILO.assessments.reduce((sum, a) => sum + (parseFloat(a.average_percentage) || 0), 0) / selectedILO.assessments.length
                            : 0;
                          
                          const percentageColor = avgPercentage >= 80 ? 'text-green-600' : avgPercentage >= 60 ? 'text-yellow-600' : 'text-red-600';

                          return (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-700">Overall Percentage:</span>
                                  <span className={`text-lg font-bold ${percentageColor}`}>
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
                    </>
                  )}
                </div>

                {/* Performance Insights - Below Total Points */}
                {selectedClass && selectedILO && (
                  <div className="mt-4">
                    <ILOInsights 
                      iloData={selectedILO} 
                      assessments={selectedILO.assessments || []}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
        )}

        {showStudentModal && selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Student Details</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedStudent.full_name} ({selectedStudent.student_number})
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-600 mb-1">ILO Score</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedStudent.ilo_score?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-gray-600 mb-1">Overall %</p>
                      <p className={`text-2xl font-bold ${
                        (selectedStudent.overall_attainment_rate || 0) >= 80 ? 'text-green-600' :
                        (selectedStudent.overall_attainment_rate || 0) >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {(selectedStudent.overall_attainment_rate || 0).toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  {selectedStudent.assessment_scores && selectedStudent.assessment_scores.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Connected Assessments</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assessment</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score / Max Score</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transmuted Score</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight %</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ILO Weight %</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {selectedStudent.assessment_scores.map((assessment, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <span className="text-sm font-medium text-gray-900">{assessment.assessment_title}</span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">
                                    {assessment.raw_score?.toFixed(2) || '0.00'} / {assessment.max_score || 0}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`text-sm font-medium ${
                                    (assessment.score_percentage || 0) >= 80 ? 'text-green-600' :
                                    (assessment.score_percentage || 0) >= 60 ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                    {(assessment.score_percentage || 0).toFixed(2)}%
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="text-sm text-gray-700">
                                    {assessment.transmuted_score?.toFixed(2) || '0.00'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="text-sm text-gray-700">
                                    {assessment.weight_percentage?.toFixed(1) || '0.0'}%
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
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
                  )}

                  {(!selectedStudent.assessment_scores || selectedStudent.assessment_scores.length === 0) && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No assessment scores available for this student.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end p-6 border-t border-gray-200">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ILOAttainment

