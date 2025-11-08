import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { 
  UserGroupIcon, 
  BookOpenIcon, 
  AcademicCapIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ArrowRightIcon
} from '@heroicons/react/24/solid'
import Analytics from './Analytics'
import MyClasses from './MyClasses'
import SyllabusApproval from './SyllabusApproval'
import { prefetchDeanData } from '../../services/dataPrefetchService'
import { useAuth } from '../../contexts/UnifiedAuthContext'

const Home = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    totalFaculty: 0,
    avgAttendance: 0,
    avgScore: 0,
    studentsAtRisk: 0,
    activeTerm: null
  })

  useEffect(() => {
    // Only fetch if authenticated
    if (isAuthenticated && !authLoading) {
      fetchDashboardStats()
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  const fetchDashboardStats = async () => {
    setLoading(true)
    try {
      // Fetch all data in parallel
      const [classesRes, studentsRes, facultyRes, termsRes, analyticsRes] = await Promise.all([
        fetch('/api/section-courses/assigned'),
        fetch('/api/students'),
        fetch('/api/users?role=FACULTY'),
        fetch('/api/school-terms'),
        fetch('/api/assessments/dean-analytics/sample')
      ])

      // Process classes
      let classesData = []
      try {
        const contentType = classesRes.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          classesData = await classesRes.json()
        }
      } catch (e) {
        console.error('Error parsing classes data:', e)
      }
      const classesCount = Array.isArray(classesData) ? classesData.length : 0

      // Process students (enrolled)
      let studentsData = []
      try {
        const contentType = studentsRes.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          studentsData = await studentsRes.json()
        }
      } catch (e) {
        console.error('Error parsing students data:', e)
      }
      const studentsCount = Array.isArray(studentsData) ? studentsData.length : 0

      // Process faculty
      let facultyData = []
      try {
        const contentType = facultyRes.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          facultyData = await facultyRes.json()
        }
      } catch (e) {
        console.error('Error parsing faculty data:', e)
      }
      const facultyCount = Array.isArray(facultyData) ? facultyData.filter(f => f.is_active !== false).length : 0

      // Process active term
      let termsData = []
      try {
        const contentType = termsRes.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          termsData = await termsRes.json()
        }
      } catch (e) {
        console.error('Error parsing terms data:', e)
      }
      const activeTerm = Array.isArray(termsData) ? termsData.find(t => t.is_active) : null

      // Process analytics for performance metrics
      let avgAttendance = 0
      let avgScore = 0
      let studentsAtRisk = 0

      if (analyticsRes.ok) {
        try {
          const contentType = analyticsRes.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const analyticsData = await analyticsRes.json()
            if (analyticsData.success && Array.isArray(analyticsData.data) && analyticsData.data.length > 0) {
              const students = analyticsData.data
              const totalStudents = students.length

              // Calculate average attendance
              const totalAttendance = students.reduce((sum, s) => {
                return sum + (parseFloat(s.attendance_percentage) || 0)
              }, 0)
              avgAttendance = totalAttendance / totalStudents

              // Calculate average score
              const totalScore = students.reduce((sum, s) => {
                return sum + (parseFloat(s.average_score) || 0)
              }, 0)
              avgScore = totalScore / totalStudents

              // Count students at risk (cluster labels containing "risk" or low attendance/score)
              studentsAtRisk = students.filter(s => {
                const cluster = String(s.cluster_label || '').toLowerCase()
                const attendance = parseFloat(s.attendance_percentage) || 0
                const score = parseFloat(s.average_score) || 0
                return cluster.includes('risk') || attendance < 60 || score < 60
              }).length
            }
          } else {
            const errorText = await analyticsRes.text()
            console.error('Analytics response is not JSON:', errorText.substring(0, 200))
          }
        } catch (jsonError) {
          console.error('Error parsing analytics JSON:', jsonError)
          // Try to get error text for debugging
          try {
            const errorText = await analyticsRes.clone().text()
            console.error('Analytics response text:', errorText.substring(0, 500))
          } catch (e) {
            console.error('Could not read analytics response as text:', e)
          }
        }
      }

      setStats({
        totalStudents: studentsCount,
        totalClasses: classesCount,
        totalFaculty: facultyCount,
        avgAttendance: avgAttendance.toFixed(1),
        avgScore: avgScore.toFixed(1),
        studentsAtRisk: studentsAtRisk,
        activeTerm: activeTerm
      })
      
      setInitialLoadComplete(true)
      
      // Prefetch data for other pages in the background (non-blocking)
      // Use setTimeout to ensure it doesn't block the current page render
      setTimeout(() => {
        console.log('🚀 [DeanDashboard] Starting async prefetch after initial data load')
        prefetchDeanData()
      }, 500) // Wait 500ms after main data loads to start prefetching
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Show loading or auth check
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access the dean dashboard.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Key Statistics Cards Skeleton (Top Row) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                    <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="h-14 w-14 bg-gray-200 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Performance Overview Cards Skeleton (Second Row) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 bg-gray-200 rounded w-28"></div>
                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                </div>
                <div className="h-7 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            ))}
          </div>

          {/* Quick Access Section Skeleton */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-50 rounded-lg border border-gray-200 p-4 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                      </div>
                    </div>
                    <div className="h-5 w-5 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Key Statistics Cards (Top Row) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Total Students */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Students</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalStudents.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-2">All enrolled students</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <UserGroupIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Total Classes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Classes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalClasses.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-2">Active classes this term</p>
              </div>
              <div className="bg-emerald-100 rounded-full p-3">
                <BookOpenIcon className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Total Faculty */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Faculty</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalFaculty.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-2">Active faculty members</p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <AcademicCapIcon className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Performance Overview Cards (Second Row) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Average Attendance Rate */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Average Attendance Rate</p>
              <div className="bg-green-100 rounded-full p-2">
                <ChartBarIcon className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.avgAttendance}%</p>
            <p className="text-xs text-gray-500 mt-2">Overall attendance</p>
          </div>

          {/* Average Student Score */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Average Student Score</p>
              <div className="bg-yellow-100 rounded-full p-2">
                <AcademicCapIcon className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.avgScore}</p>
            <p className="text-xs text-gray-500 mt-2">Overall average grade</p>
          </div>

          {/* Students at Risk */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Students at Risk</p>
              <div className="bg-red-100 rounded-full p-2">
                <UserGroupIcon className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.studentsAtRisk}</p>
            <p className="text-xs text-gray-500 mt-2">Needs attention</p>
          </div>

          {/* Active Term */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Active Term</p>
              <div className="bg-indigo-100 rounded-full p-2">
                <BookOpenIcon className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {stats.activeTerm 
                ? `${stats.activeTerm.school_year} - ${stats.activeTerm.semester}`
                : 'N/A'}
            </p>
            <p className="text-xs text-gray-500 mt-2">Current semester</p>
          </div>
        </div>

        {/* Quick Access Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* View All Classes */}
            <button
              onClick={() => navigate('/dean/classes')}
              className="flex items-center justify-between p-4 bg-gradient-to-br from-emerald-50 to-white rounded-lg border border-emerald-200 hover:border-emerald-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-emerald-100 rounded-lg p-2">
                  <BookOpenIcon className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">View All Classes</p>
                  <p className="text-xs text-gray-600">Browse classes</p>
                </div>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
            </button>

            {/* View Reports & Analytics */}
            <button
              onClick={() => navigate('/dean/analytics')}
              className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 rounded-lg p-2">
                  <ChartBarIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Reports & Analytics</p>
                  <p className="text-xs text-gray-600">View analytics</p>
                </div>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </button>

            {/* Approve Syllabi */}
            <button
              onClick={() => navigate('/dean/syllabus-approval')}
              className="flex items-center justify-between p-4 bg-gradient-to-br from-purple-50 to-white rounded-lg border border-purple-200 hover:border-purple-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 rounded-lg p-2">
                  <DocumentTextIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Approve Syllabi</p>
                  <p className="text-xs text-gray-600">Review syllabi</p>
                </div>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
            </button>

            {/* Recent Activities */}
            <button
              onClick={() => navigate('/dean/classes')}
              className="flex items-center justify-between p-4 bg-gradient-to-br from-orange-50 to-white rounded-lg border border-orange-200 hover:border-orange-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-orange-100 rounded-lg p-2">
                  <ChartBarIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Recent Activities</p>
                  <p className="text-xs text-gray-600">View updates</p>
                </div>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const DeanDashboard = ({ user }) => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/classes" element={<MyClasses />} />
      <Route path="/syllabus-approval" element={<SyllabusApproval />} />
      <Route path="*" element={<Navigate to="/dean" replace />} />
    </Routes>
  )
}

export default DeanDashboard 