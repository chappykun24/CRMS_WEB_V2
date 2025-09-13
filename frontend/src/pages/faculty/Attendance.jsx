import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/UnifiedAuthContext'
import { 
  Calendar, 
  Users, 
  Plus,
  Edit3,
  Trash2,
  BarChart3,
  Download
} from 'lucide-react'

const Attendance = () => {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [sessions, setSessions] = useState([])
  const [students, setStudents] = useState([])
  const [attendanceStats, setAttendanceStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // UI State
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  })
  
  // Form states
  const [sessionForm, setSessionForm] = useState({
    title: '',
    session_date: '',
    session_type: 'Lecture',
    meeting_type: 'Face-to-Face'
  })
  
  const [attendanceForm, setAttendanceForm] = useState({})
  
  // Load faculty classes
  const loadClasses = useCallback(async () => {
    try {
      setLoading(true)
      const facultyId = user?.user_id || user?.id
      const response = await fetch(`/api/section-courses/faculty/${facultyId}`)
      
      if (!response.ok) {
        throw new Error('Failed to load classes')
      }
      
      const data = await response.json()
      setClasses(data)
      
      if (data.length > 0 && !selectedClass) {
        setSelectedClass(data[0])
      }
    } catch (error) {
      console.error('Error loading classes:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [user, selectedClass])
  
  // Load sessions for selected class
  const loadSessions = useCallback(async () => {
    if (!selectedClass) return
    
    try {
      const params = new URLSearchParams()
      if (dateFilter.startDate) params.append('startDate', dateFilter.startDate)
      if (dateFilter.endDate) params.append('endDate', dateFilter.endDate)
      
      const response = await fetch(`/api/attendance/sessions/${selectedClass.section_course_id}?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to load sessions')
      }
      
      const data = await response.json()
      setSessions(data.data || [])
    } catch (error) {
      console.error('Error loading sessions:', error)
      setError(error.message)
    }
  }, [selectedClass, dateFilter])
  
  // Load students for selected class
  const loadStudents = useCallback(async () => {
    if (!selectedClass) return
    
    try {
      const response = await fetch(`/api/attendance/students/${selectedClass.section_course_id}`)
      
      if (!response.ok) {
        throw new Error('Failed to load students')
      }
      
      const data = await response.json()
      setStudents(data.data || [])
    } catch (error) {
      console.error('Error loading students:', error)
      setError(error.message)
    }
  }, [selectedClass])
  
  // Load attendance statistics
  const loadAttendanceStats = useCallback(async () => {
    if (!selectedClass) return
    
    try {
      const params = new URLSearchParams()
      if (dateFilter.startDate) params.append('startDate', dateFilter.startDate)
      if (dateFilter.endDate) params.append('endDate', dateFilter.endDate)
      
      const response = await fetch(`/api/attendance/stats/${selectedClass.section_course_id}?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to load attendance stats')
      }
      
      const data = await response.json()
      setAttendanceStats(data.data || [])
    } catch (error) {
      console.error('Error loading attendance stats:', error)
      setError(error.message)
    }
  }, [selectedClass, dateFilter])
  
  // Create new session
  const createSession = async (e) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/attendance/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          ...sessionForm,
          section_course_id: selectedClass.section_course_id
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create session')
      }
      
      setShowSessionModal(false)
      setSessionForm({
        title: '',
        session_date: '',
        session_type: 'Lecture',
        meeting_type: 'Face-to-Face'
      })
      loadSessions()
    } catch (error) {
      console.error('Error creating session:', error)
      setError(error.message)
    }
  }
  
  // Mark attendance
  const markAttendance = async (e) => {
    e.preventDefault()
    
    try {
      const attendanceRecords = students.map(student => ({
        enrollment_id: student.enrollment_id,
        status: attendanceForm[student.student_id]?.status || 'present',
        remarks: attendanceForm[student.student_id]?.remarks || ''
      }))
      
      const response = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          session_id: selectedSession.session_id,
          attendance_records
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to mark attendance')
      }
      
      setShowAttendanceModal(false)
      setAttendanceForm({})
      loadSessions()
      loadAttendanceStats()
    } catch (error) {
      console.error('Error marking attendance:', error)
      setError(error.message)
    }
  }
  
  // Delete session
  const deleteSession = async (sessionId) => {
    if (!confirm('Are you sure you want to delete this session and all its attendance records?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/attendance/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete session')
      }
      
      loadSessions()
      loadAttendanceStats()
    } catch (error) {
      console.error('Error deleting session:', error)
      setError(error.message)
    }
  }
  
  // Export attendance data
  const exportAttendance = async (format = 'csv') => {
    if (!selectedClass) return
    
    try {
      const params = new URLSearchParams()
      params.append('format', format)
      if (dateFilter.startDate) params.append('startDate', dateFilter.startDate)
      if (dateFilter.endDate) params.append('endDate', dateFilter.endDate)
      
      const response = await fetch(`/api/attendance/export/${selectedClass.section_course_id}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to export attendance data')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${selectedClass.course_title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting attendance:', error)
      setError(error.message)
    }
  }
  
  // Initialize data
  useEffect(() => {
    loadClasses()
  }, [loadClasses])
  
  useEffect(() => {
    if (selectedClass) {
      loadSessions()
      loadStudents()
      loadAttendanceStats()
    }
  }, [selectedClass, loadSessions, loadStudents, loadAttendanceStats])
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance data...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Attendance Management</h1>
          <p className="text-gray-600">Track and manage student attendance for your classes</p>
        </div>
        
        {/* Class Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Class</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((classItem) => (
              <div
                key={classItem.section_course_id}
                onClick={() => setSelectedClass(classItem)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedClass?.section_course_id === classItem.section_course_id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h3 className="font-medium text-gray-900">{classItem.course_title}</h3>
                <p className="text-sm text-gray-600">{classItem.section_code}</p>
                <p className="text-xs text-gray-500">{classItem.school_year} - {classItem.semester}</p>
              </div>
            ))}
          </div>
        </div>
        
        {selectedClass && (
          <>
            {/* Controls */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={dateFilter.startDate}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="Start Date"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={dateFilter.endDate}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="End Date"
                    />
                  </div>
                  <button
                    onClick={() => setDateFilter({ startDate: '', endDate: '' })}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Clear
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSessionModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    New Session
                  </button>
                  <button
                    onClick={() => setShowStatsModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    <BarChart3 className="h-4 w-4" />
                    View Stats
                  </button>
                  <button
                    onClick={() => exportAttendance('csv')}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
            
            {/* Sessions List */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Attendance Sessions</h2>
                <p className="text-sm text-gray-600">Manage attendance sessions for {selectedClass.course_title}</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Session
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attendance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sessions.map((session) => (
                      <tr key={session.session_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{session.title}</div>
                          <div className="text-sm text-gray-500">{session.meeting_type}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(session.session_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {session.session_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {session.attendance_count} students
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedSession(session)
                                setShowAttendanceModal(true)
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteSession(session.session_id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        
        {/* Session Modal */}
        {showSessionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Session</h3>
              <form onSubmit={createSession}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Session Title</label>
                    <input
                      type="text"
                      value={sessionForm.title}
                      onChange={(e) => setSessionForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={sessionForm.session_date}
                      onChange={(e) => setSessionForm(prev => ({ ...prev, session_date: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Session Type</label>
                    <select
                      value={sessionForm.session_type}
                      onChange={(e) => setSessionForm(prev => ({ ...prev, session_type: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="Lecture">Lecture</option>
                      <option value="Laboratory">Laboratory</option>
                      <option value="Field Work">Field Work</option>
                      <option value="Seminar">Seminar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Type</label>
                    <select
                      value={sessionForm.meeting_type}
                      onChange={(e) => setSessionForm(prev => ({ ...prev, meeting_type: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="Face-to-Face">Face-to-Face</option>
                      <option value="Online">Online</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowSessionModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Session
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Attendance Modal */}
        {showAttendanceModal && selectedSession && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Mark Attendance - {selectedSession.title}
              </h3>
              <form onSubmit={markAttendance}>
                <div className="space-y-4">
                  {students.map((student) => (
                    <div key={student.student_id} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg">
                      <div className="flex-shrink-0">
                        {student.student_photo ? (
                          <img
                            src={student.student_photo}
                            alt={student.full_name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <Users className="h-5 w-5 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{student.full_name}</div>
                        <div className="text-sm text-gray-500">{student.student_number}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={attendanceForm[student.student_id]?.status || 'present'}
                          onChange={(e) => setAttendanceForm(prev => ({
                            ...prev,
                            [student.student_id]: {
                              ...prev[student.student_id],
                              status: e.target.value
                            }
                          }))}
                          className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                        >
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="late">Late</option>
                          <option value="excused">Excused</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Remarks"
                          value={attendanceForm[student.student_id]?.remarks || ''}
                          onChange={(e) => setAttendanceForm(prev => ({
                            ...prev,
                            [student.student_id]: {
                              ...prev[student.student_id],
                              remarks: e.target.value
                            }
                          }))}
                          className="border border-gray-300 rounded-md px-3 py-1 text-sm w-32"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAttendanceModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Mark Attendance
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Stats Modal */}
        {showStatsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Statistics</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Sessions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Present
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Absent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Late
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Excused
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Percentage
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceStats.map((stat) => (
                      <tr key={stat.student_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{stat.full_name}</div>
                          <div className="text-sm text-gray-500">{stat.student_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stat.total_sessions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="text-green-600 font-medium">{stat.present_count}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="text-red-600 font-medium">{stat.absent_count}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="text-yellow-600 font-medium">{stat.late_count}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="text-blue-600 font-medium">{stat.excused_count}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`font-medium ${
                            stat.attendance_percentage >= 80 ? 'text-green-600' :
                            stat.attendance_percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {stat.attendance_percentage || 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowStatsModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
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

export default Attendance
