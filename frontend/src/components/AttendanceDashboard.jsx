import React, { useState, useEffect, useMemo } from 'react'
import { 
  CalendarDaysIcon, 
  ChartBarIcon, 
  UserGroupIcon,
  PlusIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/solid'
import attendanceService from '../services/attendanceService'
import AttendanceInput from './AttendanceInput'
import AttendanceAnalytics from './AttendanceAnalytics'

const AttendanceDashboard = ({ selectedClass, onClassChange }) => {
  const [view, setView] = useState('sessions') // sessions, analytics, input
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [showAttendanceInput, setShowAttendanceInput] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)

  // Load sessions data
  useEffect(() => {
    if (!selectedClass) return

    const loadSessions = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await attendanceService.getSessions(
          selectedClass.section_course_id, 
          dateRange
        )
        setSessions(response.data)
      } catch (err) {
        console.error('Error loading sessions:', err)
        setError('Failed to load attendance sessions')
      } finally {
        setLoading(false)
      }
    }

    loadSessions()
  }, [selectedClass, dateRange])

  // Handle attendance submission
  const handleAttendanceSubmit = () => {
    setShowAttendanceInput(false)
    // Reload sessions
    const loadSessions = async () => {
      try {
        const response = await attendanceService.getSessions(
          selectedClass.section_course_id, 
          dateRange
        )
        setSessions(response.data)
      } catch (err) {
        console.error('Error reloading sessions:', err)
      }
    }
    loadSessions()
  }

  // Export attendance data
  const handleExport = async () => {
    if (!selectedClass) return

    try {
      const blob = await attendanceService.exportAttendance(
        selectedClass.section_course_id,
        'csv',
        dateRange
      )
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${selectedClass.course_code}_${selectedClass.section_code}_${dateRange.start}_to_${dateRange.end}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Error exporting attendance:', err)
      setError('Failed to export attendance data')
    }
  }

  // Filter sessions by search
  const [searchQuery, setSearchQuery] = useState('')
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions
    
    const query = searchQuery.toLowerCase()
    return sessions.filter(session => 
      session.title.toLowerCase().includes(query) ||
      session.session_type.toLowerCase().includes(query) ||
      session.meeting_type.toLowerCase().includes(query)
    )
  }, [sessions, searchQuery])

  if (!selectedClass) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Class</h3>
          <p className="text-gray-500">Choose a class to view attendance information.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Attendance Management</h2>
            <p className="text-gray-600">
              {selectedClass.course_code} - {selectedClass.section_code} • {selectedClass.course_title}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAttendanceInput(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Mark Attendance
            </button>
            
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
          </div>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setView('sessions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                view === 'sessions'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="h-4 w-4" />
                Sessions
              </div>
            </button>
            
            <button
              onClick={() => setView('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                view === 'analytics'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <ChartBarIcon className="h-4 w-4" />
                Analytics
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {view === 'sessions' && (
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search sessions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-5 w-5 text-gray-500" />
                  <span className="text-sm text-gray-500">
                    {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Sessions List */}
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <div className="text-red-600 mb-2">{error}</div>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDaysIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Sessions Found</h3>
                  <p className="text-gray-500 mb-4">No attendance sessions found for the selected date range.</p>
                  <button
                    onClick={() => setShowAttendanceInput(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Create First Session
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSessions.map((session) => (
                    <div
                      key={session.session_id}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{session.title}</h3>
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              {session.session_type}
                            </span>
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              {session.meeting_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{new Date(session.session_date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{session.attendance_count} students attended</span>
                            <span>•</span>
                            <span>Created {new Date(session.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedSession(session)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Edit Session"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === 'analytics' && (
            <AttendanceAnalytics 
              selectedClass={selectedClass} 
              dateRange={dateRange}
            />
          )}
        </div>
      </div>

      {/* Attendance Input Modal */}
      {showAttendanceInput && (
        <AttendanceInput
          selectedClass={selectedClass}
          students={selectedClass.students || []}
          onAttendanceSubmit={handleAttendanceSubmit}
          onClose={() => setShowAttendanceInput(false)}
        />
      )}
    </div>
  )
}

export default AttendanceDashboard
