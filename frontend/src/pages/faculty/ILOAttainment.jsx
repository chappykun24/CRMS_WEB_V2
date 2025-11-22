import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../../contexts/UnifiedAuthContext'
import { safeGetItem, safeSetItem, minimizeClassData } from '../../utils/cacheUtils'
import {
  AcademicCapIcon,
  ChartBarIcon,
  UserGroupIcon,
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  FunnelIcon
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
  
  // Filters
  const [passThreshold, setPassThreshold] = useState(75)
  const [performanceFilter, setPerformanceFilter] = useState('all')
  const [highThreshold, setHighThreshold] = useState(80)
  const [lowThreshold, setLowThreshold] = useState(75)

  // Load active term
  useEffect(() => {
    const fetchActiveTerm = async () => {
      try {
        const response = await fetch('/api/school-terms/active')
        if (response.ok) {
          const data = await response.json()
          if (data.term_id) {
            setActiveTermId(data.term_id)
          }
        }
      } catch (error) {
        console.error('Error fetching active term:', error)
      }
    }
    fetchActiveTerm()
  }, [])

  // Load faculty classes
  useEffect(() => {
    const loadClasses = async () => {
      if (!user?.user_id) return
      
      const cacheKey = `classes_${user.user_id}`
      const cached = safeGetItem(cacheKey)
      let classesData = []
      
      if (cached) {
        classesData = Array.isArray(cached) ? cached : []
        setClasses(classesData)
        setLoading(false)
      }
      
      try {
        const response = await fetch(`/api/section-courses/faculty/${user.user_id}`)
        if (response.ok) {
          const data = await response.json()
          classesData = Array.isArray(data) ? data : []
          setClasses(classesData)
          safeSetItem(cacheKey, classesData, minimizeClassData)
        } else {
          if (!cached) setError('Failed to load classes')
        }
      } catch (error) {
        console.error('Error loading classes:', error)
        if (!cached) setError('Failed to load classes')
      } finally {
        setLoading(false)
      }
    }
    
    loadClasses()
  }, [user])

  // Filter classes by active term
  const filteredClasses = useMemo(() => {
    if (activeTermId === null) return []
    return classes.filter(cls => cls.term_id === activeTermId)
  }, [classes, activeTermId])

  // Load ILO attainment data
  const loadAttainmentData = useCallback(async (sectionCourseId, iloId = null) => {
    if (!sectionCourseId) return

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
      }

      const response = await fetch(`/api/assessments/ilo-attainment?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch ILO attainment data')
      }

      const result = await response.json()
      
      if (result.success) {
        setAttainmentData(result.data)
        if (iloId) {
          setSelectedILO(result.data)
        }
      } else {
        throw new Error(result.error || 'Failed to load attainment data')
      }
    } catch (error) {
      console.error('Error loading attainment data:', error)
      setError(error.message)
    } finally {
      setLoadingAttainment(false)
    }
  }, [passThreshold, performanceFilter, highThreshold, lowThreshold])

  // Load data when class is selected
  useEffect(() => {
    if (selectedClass?.section_course_id) {
      setSelectedILO(null)
      loadAttainmentData(selectedClass.section_course_id)
    }
  }, [selectedClass, loadAttainmentData])

  // Handle ILO click to show student list
  const handleILOClick = (ilo) => {
    if (selectedClass?.section_course_id) {
      loadAttainmentData(selectedClass.section_course_id, ilo.ilo_id)
    }
  }

  // Handle back to summary
  const handleBackToSummary = () => {
    setSelectedILO(null)
    if (selectedClass?.section_course_id) {
      loadAttainmentData(selectedClass.section_course_id)
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading classes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AcademicCapIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ILO Attainment Analytics</h1>
                <p className="text-sm text-gray-500">View student performance on ILO-mapped assessments</p>
              </div>
            </div>
            {selectedClass && (
              <button
                onClick={handleExportExcel}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                <span>Export to Excel</span>
              </button>
            )}
          </div>
        </div>

        {/* Class Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
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
            className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select a class --</option>
            {filteredClasses.map((cls) => (
              <option key={cls.section_course_id} value={cls.section_course_id}>
                {cls.course_title} - {cls.section_code}
              </option>
            ))}
          </select>
        </div>

        {/* Filters */}
        {selectedClass && !selectedILO && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <FunnelIcon className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pass Threshold (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={passThreshold}
                  onChange={(e) => setPassThreshold(parseInt(e.target.value) || 75)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  High Threshold (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={highThreshold}
                  onChange={(e) => setHighThreshold(parseInt(e.target.value) || 80)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Low Threshold (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={lowThreshold}
                  onChange={(e) => setLowThreshold(parseInt(e.target.value) || 75)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loadingAttainment && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading attainment data...</p>
          </div>
        )}

        {/* Summary View */}
        {!loadingAttainment && !selectedILO && attainmentData && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total ILOs</p>
                  <p className="text-2xl font-bold text-blue-600">{attainmentData.summary?.total_ilos || 0}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-green-600">{attainmentData.summary?.total_students || 0}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Overall Attainment Rate</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {attainmentData.summary?.overall_attainment_rate?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* ILO Attainment Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
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
                        className="hover:bg-blue-50 cursor-pointer transition"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">{ilo.ilo_code}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700">{ilo.description}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{ilo.total_students}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{ilo.attained_count}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${
                            ilo.attainment_percentage >= 80 ? 'text-green-600' :
                            ilo.attainment_percentage >= 60 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {ilo.attainment_percentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-green-600 font-medium">{ilo.high_performance_count}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-red-600 font-medium">{ilo.low_performance_count}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {ilo.mapped_to?.map((mapping, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
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
                {(!attainmentData.ilo_attainment || attainmentData.ilo_attainment.length === 0) && (
                  <div className="text-center py-12 text-gray-500">
                    No ILO attainment data available for this class.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Student List View */}
        {!loadingAttainment && selectedILO && (
          <div className="space-y-6">
            {/* Header with Back Button */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleBackToSummary}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
                  >
                    <ArrowLeftIcon className="h-5 w-5" />
                    <span>Back to Summary</span>
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedILO.ilo_code}</h2>
                    <p className="text-sm text-gray-600">{selectedILO.description}</p>
                  </div>
                </div>
                <button
                  onClick={handleExportExcel}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  <span>Export to Excel</span>
                </button>
              </div>
              
              {/* Mapped To */}
              {selectedILO.mapped_to && selectedILO.mapped_to.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-sm text-gray-600">Mapped to:</span>
                  {selectedILO.mapped_to.map((mapping, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {mapping.type}: {mapping.code}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-xl font-bold text-blue-600">{selectedILO.total_students || 0}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Attained</p>
                  <p className="text-xl font-bold text-green-600">{selectedILO.attained_count || 0}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Attainment Rate</p>
                  <p className="text-xl font-bold text-purple-600">
                    {selectedILO.total_students > 0
                      ? ((selectedILO.attained_count / selectedILO.total_students) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Filter */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">Filter by Performance:</span>
                <button
                  onClick={() => setPerformanceFilter('all')}
                  className={`px-4 py-2 rounded-lg transition ${
                    performanceFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setPerformanceFilter('high')}
                  className={`px-4 py-2 rounded-lg transition ${
                    performanceFilter === 'high'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  High Performance
                </button>
                <button
                  onClick={() => setPerformanceFilter('low')}
                  className={`px-4 py-2 rounded-lg transition ${
                    performanceFilter === 'low'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Low Performance
                </button>
              </div>
            </div>

            {/* Student List Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Student List</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Full Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ILO Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attainment Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Performance Level
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedILO.students?.map((student) => (
                      <tr key={student.student_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{student.student_number}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">{student.full_name}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">{student.ilo_score.toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            student.attainment_status === 'attained'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {student.attainment_status === 'attained' ? 'Passed' : 'Failed'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            student.performance_level === 'high'
                              ? 'bg-green-100 text-green-800'
                              : student.performance_level === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {student.performance_level === 'high' ? 'High' :
                             student.performance_level === 'medium' ? 'Medium' : 'Low'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!selectedILO.students || selectedILO.students.length === 0) && (
                  <div className="text-center py-12 text-gray-500">
                    No students found for the selected filter.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!loadingAttainment && !selectedILO && !attainmentData && selectedClass && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No ILO attainment data available for this class.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ILOAttainment

