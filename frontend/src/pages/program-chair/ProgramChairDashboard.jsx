import React, { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { 
  UserGroupIcon, 
  BookOpenIcon, 
  AcademicCapIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ArrowRightIcon
} from '@heroicons/react/24/solid'

// Lazy load scatterplot component
const ScatterPlotChart = lazy(() => import('../../components/charts/ScatterPlotChart'))
import CourseManagement from './CourseManagement'
import Analytics from '../dean/Analytics'
import SyllabusReview from './SyllabusReview'
import Syllabus from './Syllabus'
import { prefetchProgramChairData } from '../../services/dataPrefetchService'
import { useAuth } from '../../contexts/UnifiedAuthContext'
import { API_BASE_URL } from '../../utils/api'
import programChairCacheService from '../../services/programChairCacheService'
import { safeSetItem, safeGetItem, minimizeAnalyticsData, createCacheGetter, createCacheSetter } from '../../utils/cacheUtils'
import { DashboardSkeleton } from '../../components/skeletons'

// Cache helpers
const getCachedData = createCacheGetter(programChairCacheService)
const setCachedData = createCacheSetter(programChairCacheService)
const PROGRAM_CHAIR_DASHBOARD_CACHE_KEY = 'program_chair_dashboard_stats'
const SESSION_CACHE_KEY = 'program_chair_dashboard_stats_session'

const Home = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [error, setError] = useState(null)
  const abortControllerRef = useRef(null)
  const [stats, setStats] = useState({
    totalCourses: 0,
    pendingReviews: 0,
    approvedSyllabi: 0,
    totalPrograms: 0,
    activeTerm: null
  })
  const [scatterData, setScatterData] = useState([])
  const [loadingScatter, setLoadingScatter] = useState(true)

  // Fetch dashboard stats with caching
  const fetchDashboardStats = useCallback(async (isBackgroundRefresh = false) => {
    console.log('🔍 [PROGRAM CHAIR] fetchDashboardStats starting')
    setError(null)
    
    // Check sessionStorage first for instant display
    const sessionCached = safeGetItem(SESSION_CACHE_KEY)
    
    if (sessionCached) {
      console.log('📦 [PROGRAM CHAIR] Using session cached dashboard stats')
      setStats(sessionCached)
      setLoading(false)
      setInitialLoadComplete(true)
      // Continue to fetch fresh data in background
    } else {
      if (!isBackgroundRefresh) {
        setLoading(true)
      }
    }
    
    // Check enhanced cache
    const cachedData = getCachedData('analytics', PROGRAM_CHAIR_DASHBOARD_CACHE_KEY, 30 * 60 * 1000) // 30 minute cache
    if (cachedData && !sessionCached) {
      console.log('📦 [PROGRAM CHAIR] Using enhanced cached dashboard stats')
      setStats(cachedData)
      setLoading(false)
      setInitialLoadComplete(true)
      // Cache minimized data in sessionStorage for next time
      safeSetItem(SESSION_CACHE_KEY, cachedData, minimizeAnalyticsData)
      // Continue to fetch fresh data in background
    }
    
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController()
    
    try {
      if (!isBackgroundRefresh && !sessionCached && !cachedData) {
        setLoading(true)
      }
      
      console.log('🔄 [PROGRAM CHAIR] Fetching fresh dashboard stats...')
      // Fetch courses, syllabi, programs, and terms
      const [coursesRes, syllabiRes, programsRes, termsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/catalog/courses`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          signal: abortControllerRef.current.signal
        }),
        fetch(`${API_BASE_URL}/syllabi`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          signal: abortControllerRef.current.signal
        }),
        fetch(`${API_BASE_URL}/catalog/programs`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          signal: abortControllerRef.current.signal
        }),
        fetch(`${API_BASE_URL}/school-terms`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          signal: abortControllerRef.current.signal
        })
      ])

      // Process courses
      let coursesData = []
      try {
        const contentType = coursesRes.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          coursesData = await coursesRes.json()
        }
      } catch (e) {
        console.error('Error parsing courses data:', e)
      }
      const totalCourses = Array.isArray(coursesData) ? coursesData.length : 0

      // Process syllabi
      let syllabiData = []
      let pendingReviews = 0
      let approvedSyllabi = 0
      try {
        const contentType = syllabiRes.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          syllabiData = await syllabiRes.json()
          if (Array.isArray(syllabiData)) {
            // Count pending reviews (review_status = 'pending')
            pendingReviews = syllabiData.filter(s => s.review_status === 'pending').length
            // Count approved syllabi (review_status = 'approved')
            approvedSyllabi = syllabiData.filter(s => s.review_status === 'approved').length
          }
        }
      } catch (e) {
        console.error('Error parsing syllabi data:', e)
      }

      // Process programs
      let programsData = []
      try {
        const contentType = programsRes.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          programsData = await programsRes.json()
        }
      } catch (e) {
        console.error('Error parsing programs data:', e)
      }
      const totalPrograms = Array.isArray(programsData) ? programsData.length : 0

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

      const newStats = {
        totalCourses,
        pendingReviews,
        approvedSyllabi,
        totalPrograms,
        activeTerm
      }
      
      console.log(`✅ [PROGRAM CHAIR] Received dashboard stats`)
      
      // Update stats with fresh data
      setStats(newStats)
      
      // Fetch analytics data for scatterplot asynchronously (non-blocking)
      // Use requestIdleCallback or setTimeout to defer loading
      const loadScatterData = async () => {
        try {
          const analyticsRes = await fetch(`${API_BASE_URL}/assessments/dean-analytics/sample`, {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            signal: abortControllerRef.current.signal
          })
          
          if (analyticsRes.ok) {
            const contentType = analyticsRes.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
              const analyticsData = await analyticsRes.json()
              if (analyticsData.success && Array.isArray(analyticsData.data)) {
                // Prepare scatterplot data (Attendance vs Score)
                const scatterPlotData = analyticsData.data
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
                    name: row.full_name
                  }))
                setScatterData(scatterPlotData)
                setLoadingScatter(false)
              }
            }
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('Error fetching scatterplot data:', error)
          }
          setLoadingScatter(false)
        }
      }
      
      // Defer scatterplot data loading using requestIdleCallback or setTimeout
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          loadScatterData()
        }, { timeout: 2000 })
      } else {
        setTimeout(() => {
          loadScatterData()
        }, 500)
      }
      
      // Store minimized data in sessionStorage for instant next load
      if (!sessionCached) {
        safeSetItem(SESSION_CACHE_KEY, newStats, minimizeAnalyticsData)
      }
      
      // Store full data in enhanced cache
      setCachedData('analytics', PROGRAM_CHAIR_DASHBOARD_CACHE_KEY, newStats)
      
      setInitialLoadComplete(true)
      
      if (isBackgroundRefresh) {
        console.log('✅ [PROGRAM CHAIR] Background refresh completed')
        setRefreshing(false)
      }
      
      // Prefetch data for other pages in the background (non-blocking)
      setTimeout(() => {
        console.log('🚀 [PROGRAM CHAIR] Starting async prefetch after initial data load')
        prefetchProgramChairData()
      }, 500)
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🚫 [PROGRAM CHAIR] Request was aborted')
        return
      }
      console.error('❌ [PROGRAM CHAIR] Error fetching dashboard stats:', error)
      const sessionCached = safeGetItem(SESSION_CACHE_KEY)
      const cachedData = getCachedData('analytics', PROGRAM_CHAIR_DASHBOARD_CACHE_KEY, 30 * 60 * 1000)
      if (!sessionCached && !cachedData) {
        setError(error.message)
      }
    } finally {
      setLoading(false)
      setInitialLoadComplete(true)
    }
  }, [])

  useEffect(() => {
    // Only fetch if authenticated
    if (isAuthenticated && !authLoading) {
      fetchDashboardStats(false)
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false)
    }
    
    // Cleanup function to abort pending requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [isAuthenticated, authLoading, fetchDashboardStats])

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
          <p className="text-gray-600">Please log in to access the program chair dashboard.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return <DashboardSkeleton showQuickAccess={true} />
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 max-w-7xl mx-auto">
        {/* Key Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Courses */}
          <button
            onClick={() => navigate('/program-chair/courses')}
            className="bg-white rounded-lg shadow-sm border border-emerald-200 p-4 hover:shadow-md hover:border-emerald-300 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="bg-emerald-100 rounded-lg p-2 group-hover:bg-emerald-200 transition-colors">
                <BookOpenIcon className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-600 mb-1">Total Courses</p>
            <p className="text-2xl font-bold text-gray-900 mb-1">{(stats.totalCourses || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500">All courses in catalog</p>
          </button>

          {/* Pending Reviews */}
          <button
            onClick={() => navigate('/program-chair/syllabus-review')}
            className="bg-white rounded-lg shadow-sm border border-orange-200 p-4 hover:shadow-md hover:border-orange-300 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="bg-orange-100 rounded-lg p-2 group-hover:bg-orange-200 transition-colors">
                <DocumentTextIcon className="h-5 w-5 text-orange-600" />
              </div>
              {stats.pendingReviews > 0 && (
                <div className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  ACTION REQUIRED
                </div>
              )}
            </div>
            <p className="text-xs font-medium text-gray-600 mb-1">Pending Reviews</p>
            <p className="text-2xl font-bold text-gray-900 mb-1">{(stats.pendingReviews || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500">Syllabi awaiting review</p>
          </button>

          {/* Approved Syllabi */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-green-100 rounded-lg p-2">
                <DocumentTextIcon className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-600 mb-1">Approved Syllabi</p>
            <p className="text-2xl font-bold text-gray-900 mb-1">{(stats.approvedSyllabi || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500">Total approved syllabi</p>
          </div>

          {/* Total Programs */}
          <div className="bg-gradient-to-br from-indigo-50 to-white rounded-lg shadow-sm border border-indigo-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-indigo-100 rounded-lg p-2">
                <AcademicCapIcon className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-600 mb-1">Total Programs</p>
            <p className="text-2xl font-bold text-gray-900 mb-1">{(stats.totalPrograms || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500">Academic programs</p>
          </div>
        </div>

        {/* Active Term Card */}
        {stats.activeTerm && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-md p-4 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-indigo-100 mb-1">Current Academic Term</p>
                <p className="text-lg font-bold">
                  {stats.activeTerm.semester === '1' ? '1st' : stats.activeTerm.semester === '2' ? '2nd' : stats.activeTerm.semester === '3' ? 'Summer' : stats.activeTerm.semester} Semester {stats.activeTerm.school_year}
                </p>
              </div>
              <div className="bg-white/20 rounded-lg p-2">
                <BookOpenIcon className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        )}

        {/* Scatterplot Section - Lazy Loaded */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Student Performance Overview</h2>
              <p className="text-xs text-gray-600 mt-0.5">Attendance vs Average Score</p>
            </div>
            <button
              onClick={() => navigate('/program-chair/analytics')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View Full Analytics
              <ArrowRightIcon className="h-3 w-3" />
            </button>
          </div>
          <button
            onClick={() => navigate('/program-chair/analytics')}
            className="w-full cursor-pointer"
          >
            <Suspense fallback={
              <div className="h-56 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                <div className="text-xs text-gray-400">Loading chart...</div>
              </div>
            }>
              {loadingScatter ? (
                <div className="h-56 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                  <div className="text-xs text-gray-400">Loading chart...</div>
                </div>
              ) : scatterData.length > 0 ? (
                <ScatterPlotChart 
                  data={scatterData} 
                  onNavigate={() => navigate('/program-chair/analytics')}
                />
              ) : (
                <div className="h-56 bg-gray-50 rounded-lg flex items-center justify-center border border-dashed border-gray-300">
                  <div className="text-center">
                    <ChartBarIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No data available</p>
                    <p className="text-[10px] text-gray-400 mt-1">Click to view analytics</p>
                  </div>
                </div>
              )}
            </Suspense>
          </button>
        </div>

        {/* Quick Access Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Course Management */}
            <button
              onClick={() => navigate('/program-chair/courses')}
              className="flex items-center justify-between p-4 bg-gradient-to-br from-emerald-50 to-white rounded-lg border border-emerald-200 hover:border-emerald-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-emerald-100 rounded-lg p-2 group-hover:bg-emerald-200 transition-colors">
                  <BookOpenIcon className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 text-sm">Course Management</p>
                  <p className="text-xs text-gray-600">Manage programs & courses</p>
                </div>
              </div>
              <ArrowRightIcon className="h-6 w-6 text-gray-400 group-hover:text-emerald-600 transition-colors" />
            </button>

            {/* Syllabus Review */}
            <button
              onClick={() => navigate('/program-chair/syllabus-review')}
              className="flex items-center justify-between p-4 bg-gradient-to-br from-orange-50 to-white rounded-lg border border-orange-200 hover:border-orange-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-orange-100 rounded-lg p-2 group-hover:bg-orange-200 transition-colors">
                  <DocumentTextIcon className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 text-sm">Syllabus Review</p>
                  <p className="text-xs text-gray-600">Review pending syllabi</p>
                </div>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
            </button>

            {/* Analytics */}
            <button
              onClick={() => navigate('/program-chair/analytics')}
              className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 rounded-lg p-2 group-hover:bg-blue-200 transition-colors">
                  <ChartBarIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 text-sm">Analytics</p>
                  <p className="text-xs text-gray-600">View reports & analytics</p>
                </div>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const ProgramChairDashboard = ({ user }) => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/courses" element={<CourseManagement />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/syllabus-review" element={<SyllabusReview />} />
      <Route path="/syllabus" element={<Syllabus />} />
      <Route path="*" element={<Navigate to="/program-chair" replace />} />
    </Routes>
  )
}

export default ProgramChairDashboard 