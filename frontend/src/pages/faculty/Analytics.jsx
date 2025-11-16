import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { ChartBarIcon, UserGroupIcon, AcademicCapIcon, ClockIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../../contexts/UnifiedAuthContext'
import { API_BASE_URL } from '../../utils/api'
import { DashboardSkeleton } from '../../components/skeletons'

// Lazy load scatterplot component
const ScatterPlotChart = lazy(() => import('../../components/charts/ScatterPlotChart'))

const Analytics = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [classes, setClasses] = useState([])
  const [activeTerm, setActiveTerm] = useState(null)
  const [analyticsData, setAnalyticsData] = useState([])
  const [loadingAnalytics, setLoadingAnalytics] = useState(true)
  const [stats, setStats] = useState({
    totalStudents: 0,
    averageScore: 0,
    averageAttendance: 0,
    totalClasses: 0
  })
  const [scatterData, setScatterData] = useState([])
  const abortControllerRef = useRef(null)

  // Normalize faculty ID from user context
  const facultyId = user?.user_id ?? user?.id

  // Fetch active term
  const fetchActiveTerm = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/school-terms`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch school terms')
      }

      const terms = await response.json()
      // Get active term or latest term (sorted by term_id descending)
      const sortedTerms = Array.isArray(terms) ? [...terms].sort((a, b) => (b.term_id || 0) - (a.term_id || 0)) : []
      const active = sortedTerms.find(t => t.is_active) || (sortedTerms.length > 0 ? sortedTerms[0] : null)
      setActiveTerm(active)
      return active
    } catch (error) {
      console.error('Error fetching active term:', error)
      return null
    }
  }, [])

  // Fetch faculty classes for active term
  const fetchFacultyClasses = useCallback(async (termId) => {
    if (!facultyId || !termId) return []

    try {
      const response = await fetch(`${API_BASE_URL}/section-courses/faculty/${facultyId}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: abortControllerRef.current?.signal
      })

      if (!response.ok) {
        throw new Error('Failed to fetch faculty classes')
      }

      const allClasses = await response.json()
      // Filter by active term
      const termClasses = Array.isArray(allClasses) 
        ? allClasses.filter(c => c.term_id === termId)
        : []
      
      setClasses(termClasses)
      return termClasses
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching faculty classes:', error)
        setError(error.message)
      }
      return []
    }
  }, [facultyId])

  // Fetch analytics for all faculty classes in active term
  const fetchAnalytics = useCallback(async (termId, facultyClasses) => {
    if (!termId || !facultyClasses || facultyClasses.length === 0) {
      setLoadingAnalytics(false)
      setAnalyticsData([])
      return
    }

    setLoadingAnalytics(true)
    try {
      // Fetch analytics for each class and aggregate
      const analyticsPromises = facultyClasses.map(async (classItem) => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/assessments/dean-analytics/sample?term_id=${termId}&section_course_id=${classItem.section_course_id}`,
            {
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              signal: abortControllerRef.current?.signal
            }
          )

          if (!response.ok) {
            console.warn(`Failed to fetch analytics for class ${classItem.section_course_id}`)
            return null
          }

          const contentType = response.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            return null
          }

          const result = await response.json()
          if (result.success && Array.isArray(result.data)) {
            // Add class info to each student record
            return result.data.map(student => ({
              ...student,
              section_course_id: classItem.section_course_id,
              course_code: classItem.course_code,
              course_title: classItem.course_title,
              section_code: classItem.section_code
            }))
          }
          return null
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error(`Error fetching analytics for class ${classItem.section_course_id}:`, error)
          }
          return null
        }
      })

      const results = await Promise.all(analyticsPromises)
      const aggregatedData = results
        .filter(data => data !== null && Array.isArray(data))
        .flat()

      setAnalyticsData(aggregatedData)

      // Calculate stats
      if (aggregatedData.length > 0) {
        const totalStudents = aggregatedData.length
        const avgScore = aggregatedData.reduce((sum, s) => sum + (parseFloat(s.average_score) || 0), 0) / totalStudents
        const avgAttendance = aggregatedData.reduce((sum, s) => sum + (parseFloat(s.attendance_percentage) || 0), 0) / totalStudents

        setStats({
          totalStudents,
          averageScore: avgScore,
          averageAttendance: avgAttendance,
          totalClasses: facultyClasses.length
        })

        // Prepare scatter plot data
        const scatterPlotData = aggregatedData
          .filter(row => row.cluster_label && 
            row.cluster_label !== null && 
            row.cluster_label !== undefined &&
            !(typeof row.cluster_label === 'number' && isNaN(row.cluster_label)) &&
            !(typeof row.cluster_label === 'string' && (row.cluster_label.toLowerCase() === 'nan' || row.cluster_label.trim() === '')))
          .map(row => ({
            attendance: parseFloat(row.attendance_percentage) || 0,
            score: parseFloat(row.average_score) || 0,
            submissionRate: (parseFloat(row.submission_rate) || 0) * 100,
            cluster: row.cluster_label,
            name: row.full_name,
            course: `${row.course_code} - ${row.section_code}`
          }))
        setScatterData(scatterPlotData)
      } else {
        setStats({
          totalStudents: 0,
          averageScore: 0,
          averageAttendance: 0,
          totalClasses: facultyClasses.length
        })
        setScatterData([])
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching analytics:', error)
        setError(error.message)
      }
    } finally {
      setLoadingAnalytics(false)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    if (!facultyId) {
      setLoading(false)
      return
    }

    const loadData = async () => {
      setLoading(true)
      setError(null)

      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      try {
        // Fetch active term
        const term = await fetchActiveTerm()
        if (!term) {
          setError('No active term found')
          setLoading(false)
          return
        }

        // Fetch faculty classes for active term
        const facultyClasses = await fetchFacultyClasses(term.term_id)
        
        // Fetch analytics for those classes
        await fetchAnalytics(term.term_id, facultyClasses)
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error loading analytics data:', error)
          setError(error.message)
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [facultyId, fetchActiveTerm, fetchFacultyClasses, fetchAnalytics])

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Analytics</h1>
          {activeTerm && (
            <p className="text-gray-600">
              {activeTerm.school_year} - {activeTerm.semester}
            </p>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-blue-100 rounded-lg p-2">
                <UserGroupIcon className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-600 mb-1">Total Students</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
            <p className="text-xs text-gray-500">Across all classes</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-green-100 rounded-lg p-2">
                <AcademicCapIcon className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-600 mb-1">Average Score</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.averageScore > 0 ? stats.averageScore.toFixed(1) : '0.0'}
            </p>
            <p className="text-xs text-gray-500">Overall average</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-orange-100 rounded-lg p-2">
                <ClockIcon className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-600 mb-1">Average Attendance</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.averageAttendance > 0 ? stats.averageAttendance.toFixed(1) : '0.0'}%
            </p>
            <p className="text-xs text-gray-500">Overall average</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-purple-100 rounded-lg p-2">
                <ChartBarIcon className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-600 mb-1">Total Classes</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalClasses}</p>
            <p className="text-xs text-gray-500">In active term</p>
          </div>
        </div>

        {/* Scatter Plot */}
        {loadingAnalytics ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="h-64 bg-gray-100 rounded"></div>
            </div>
          </div>
        ) : scatterData.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Student Performance Overview</h2>
            <p className="text-sm text-gray-600 mb-4">Attendance vs Average Score</p>
            <Suspense fallback={
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            }>
              <ScatterPlotChart data={scatterData} />
            </Suspense>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="text-center py-12">
              <ChartBarIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
              <p className="text-gray-600">
                {stats.totalClasses === 0 
                  ? 'You have no classes assigned in the active term.'
                  : 'No student performance data available for your classes in the active term.'}
              </p>
            </div>
          </div>
        )}

        {/* Classes List */}
        {classes.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">My Classes ({activeTerm?.school_year} - {activeTerm?.semester})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((classItem) => {
                const classStudents = analyticsData.filter(s => s.section_course_id === classItem.section_course_id)
                const classAvgScore = classStudents.length > 0
                  ? classStudents.reduce((sum, s) => sum + (parseFloat(s.average_score) || 0), 0) / classStudents.length
                  : 0
                const classAvgAttendance = classStudents.length > 0
                  ? classStudents.reduce((sum, s) => sum + (parseFloat(s.attendance_percentage) || 0), 0) / classStudents.length
                  : 0

                return (
                  <div key={classItem.section_course_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h3 className="font-semibold text-gray-900 mb-1">{classItem.course_code}</h3>
                    <p className="text-sm text-gray-600 mb-2">{classItem.course_title}</p>
                    <p className="text-xs text-gray-500 mb-3">Section: {classItem.section_code}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Students:</span>
                        <span className="font-medium">{classStudents.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Avg Score:</span>
                        <span className="font-medium">{classAvgScore > 0 ? classAvgScore.toFixed(1) : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Avg Attendance:</span>
                        <span className="font-medium">{classAvgAttendance > 0 ? classAvgAttendance.toFixed(1) + '%' : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Analytics

