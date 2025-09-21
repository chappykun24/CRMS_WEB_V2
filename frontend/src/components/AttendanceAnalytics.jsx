import React, { useState, useEffect, useMemo } from 'react'
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/solid'
import attendanceService from '../services/attendanceService'

const AttendanceAnalytics = ({ selectedClass, dateRange = { start: null, end: null } }) => {
  const [analytics, setAnalytics] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load analytics data
  useEffect(() => {
    if (!selectedClass) return

    const loadAnalytics = async () => {
      try {
        setLoading(true)
        setError('')

        const [statsResponse, sessionsResponse] = await Promise.all([
          attendanceService.getAttendanceStats(selectedClass.section_course_id, dateRange),
          attendanceService.getSessions(selectedClass.section_course_id, dateRange)
        ])

        setAnalytics(statsResponse.data)
        setSessions(sessionsResponse.data)
      } catch (err) {
        console.error('Error loading attendance analytics:', err)
        setError('Failed to load attendance analytics')
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [selectedClass, dateRange])

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    if (!analytics || analytics.length === 0) return null

    const totalStudents = analytics.length
    const totalSessions = sessions.length
    const totalRecords = analytics.reduce((sum, student) => sum + student.total_sessions, 0)
    const totalPresent = analytics.reduce((sum, student) => sum + student.present_count, 0)
    const totalAbsent = analytics.reduce((sum, student) => sum + student.absent_count, 0)
    const totalLate = analytics.reduce((sum, student) => sum + student.late_count, 0)
    const totalExcused = analytics.reduce((sum, student) => sum + student.excused_count, 0)
    
    const overallAttendanceRate = totalRecords > 0 ? (totalPresent / totalRecords) * 100 : 0

    return {
      totalStudents,
      totalSessions,
      totalRecords,
      totalPresent,
      totalAbsent,
      totalLate,
      totalExcused,
      overallAttendanceRate
    }
  }, [analytics, sessions])

  // Get attendance trend
  const attendanceTrend = useMemo(() => {
    if (!sessions || sessions.length < 2) return 'stable'
    
    const recentSessions = sessions.slice(0, 3)
    const olderSessions = sessions.slice(3, 6)
    
    if (olderSessions.length === 0) return 'stable'
    
    const recentAvg = recentSessions.reduce((sum, session) => sum + session.attendance_count, 0) / recentSessions.length
    const olderAvg = olderSessions.reduce((sum, session) => sum + session.attendance_count, 0) / olderSessions.length
    
    if (recentAvg > olderAvg * 1.1) return 'improving'
    if (recentAvg < olderAvg * 0.9) return 'declining'
    return 'stable'
  }, [sessions])

  // Get students with low attendance
  const lowAttendanceStudents = useMemo(() => {
    if (!analytics) return []
    
    return analytics
      .filter(student => student.attendance_percentage < 75)
      .sort((a, b) => a.attendance_percentage - b.attendance_percentage)
      .slice(0, 5)
  }, [analytics])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="flex items-center gap-2 text-red-600">
          <ExclamationTriangleIcon className="h-5 w-5" />
          {error}
        </div>
      </div>
    )
  }

  if (!analytics || analytics.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Data</h3>
          <p className="text-gray-500">No attendance records found for the selected period.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Statistics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Overall Statistics</h3>
          <div className="flex items-center gap-2">
            {attendanceTrend === 'improving' && (
              <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
            )}
            {attendanceTrend === 'declining' && (
              <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />
            )}
            <span className={`text-sm font-medium ${
              attendanceTrend === 'improving' ? 'text-green-600' :
              attendanceTrend === 'declining' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {attendanceTrend === 'improving' ? 'Improving' :
               attendanceTrend === 'declining' ? 'Declining' : 'Stable'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{overallStats.totalStudents}</div>
            <div className="text-sm text-gray-500">Total Students</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{overallStats.totalSessions}</div>
            <div className="text-sm text-gray-500">Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {overallStats.overallAttendanceRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Overall Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{overallStats.totalPresent}</div>
            <div className="text-sm text-gray-500">Total Present</div>
          </div>
        </div>
      </div>

      {/* Attendance Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Breakdown</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-green-600">{overallStats.totalPresent}</div>
              <div className="text-sm text-green-600">Present</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
            <XCircleIcon className="h-8 w-8 text-red-600" />
            <div>
              <div className="text-2xl font-bold text-red-600">{overallStats.totalAbsent}</div>
              <div className="text-sm text-red-600">Absent</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
            <ClockIcon className="h-8 w-8 text-yellow-600" />
            <div>
              <div className="text-2xl font-bold text-yellow-600">{overallStats.totalLate}</div>
              <div className="text-sm text-yellow-600">Late</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <ExclamationTriangleIcon className="h-8 w-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-blue-600">{overallStats.totalExcused}</div>
              <div className="text-sm text-blue-600">Excused</div>
            </div>
          </div>
        </div>
      </div>

      {/* Student Performance */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Performance</h3>
        
        <div className="space-y-3">
          {analytics.slice(0, 10).map((student, index) => (
            <div key={student.student_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-gray-500">#{index + 1}</div>
                <div>
                  <div className="font-medium text-gray-900">{student.full_name}</div>
                  <div className="text-sm text-gray-500">{student.student_number}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Attendance Rate</div>
                  <div className={`font-bold ${
                    student.attendance_percentage >= 90 ? 'text-green-600' :
                    student.attendance_percentage >= 75 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {student.attendance_percentage.toFixed(1)}%
                  </div>
                </div>
                
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      student.attendance_percentage >= 90 ? 'bg-green-500' :
                      student.attendance_percentage >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(student.attendance_percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Low Attendance Alert */}
      {lowAttendanceStudents.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">Students with Low Attendance</h3>
          </div>
          
          <div className="space-y-2">
            {lowAttendanceStudents.map((student) => (
              <div key={student.student_id} className="flex items-center justify-between p-2 bg-white rounded border border-red-200">
                <div>
                  <div className="font-medium text-gray-900">{student.full_name}</div>
                  <div className="text-sm text-gray-500">{student.student_number}</div>
                </div>
                <div className="text-red-600 font-bold">
                  {student.attendance_percentage.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Sessions</h3>
        
        <div className="space-y-3">
          {sessions.slice(0, 5).map((session) => (
            <div key={session.session_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">{session.title}</div>
                <div className="text-sm text-gray-500">
                  {new Date(session.session_date).toLocaleDateString()} • {session.session_type}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Attendance</div>
                <div className="font-bold text-blue-600">{session.attendance_count}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AttendanceAnalytics
