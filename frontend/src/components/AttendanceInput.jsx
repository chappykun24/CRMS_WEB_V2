import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/solid'
import attendanceService from '../services/attendanceService'
import { useSidebar } from '../contexts/SidebarContext'

const AttendanceInput = ({ 
  selectedClass, 
  students, 
  onAttendanceSubmit, 
  onClose,
  initialDate = new Date().toISOString().split('T')[0]
}) => {
  const { sidebarExpanded } = useSidebar()
  
  // State management
  const [attendanceDate, setAttendanceDate] = useState(initialDate)
  const [attendanceRecords, setAttendanceRecords] = useState({})
  const [sessionDetails, setSessionDetails] = useState({
    sessionNumber: '',
    topic: '',
    description: '',
    startTime: '',
    endTime: '',
    sessionType: 'lecture',
    meetingType: 'in-person'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // all, present, absent, late, excused
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState(new Set())
  const [showSessionModal, setShowSessionModal] = useState(false)

  // Validation
  const isSessionValid = useMemo(() => {
    const { sessionNumber, topic, startTime, endTime } = sessionDetails
    return sessionNumber.trim() !== '' && 
           topic.trim() !== '' && 
           startTime !== '' && 
           endTime !== ''
  }, [sessionDetails])

  // Filtered students based on search and status
  const filteredStudents = useMemo(() => {
    let filtered = students

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(student => 
        student.full_name.toLowerCase().includes(query) ||
        student.student_number.toLowerCase().includes(query)
      )
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(student => {
        const status = getAttendanceStatus(student.student_id)
        return status === filterStatus
      })
    }

    return filtered
  }, [students, searchQuery, filterStatus, attendanceRecords])

  // Attendance status helpers
  const getAttendanceStatus = useCallback((studentId) => {
    return attendanceRecords[studentId]?.status || null
  }, [attendanceRecords])

  const getAttendanceRemarks = useCallback((studentId) => {
    return attendanceRecords[studentId]?.remarks || ''
  }, [attendanceRecords])

  const markAttendance = useCallback((studentId, status, remarks = '') => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
        remarks
      }
    }))
  }, [])

  // Bulk actions
  const markAllPresent = useCallback(() => {
    students.forEach(student => {
      markAttendance(student.student_id, 'present')
    })
    setShowBulkActions(false)
  }, [students, markAttendance])

  const markAllAbsent = useCallback(() => {
    students.forEach(student => {
      markAttendance(student.student_id, 'absent')
    })
    setShowBulkActions(false)
  }, [students, markAttendance])

  const markSelectedPresent = useCallback(() => {
    selectedStudents.forEach(studentId => {
      markAttendance(studentId, 'present')
    })
    setSelectedStudents(new Set())
    setShowBulkActions(false)
  }, [selectedStudents, markAttendance])

  const markSelectedAbsent = useCallback(() => {
    selectedStudents.forEach(studentId => {
      markAttendance(studentId, 'absent')
    })
    setSelectedStudents(new Set())
    setShowBulkActions(false)
  }, [selectedStudents, markAttendance])

  // Student selection
  const toggleStudentSelection = useCallback((studentId) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(studentId)) {
        newSet.delete(studentId)
      } else {
        newSet.add(studentId)
      }
      return newSet
    })
  }, [])

  const selectAllVisible = useCallback(() => {
    const allVisibleIds = filteredStudents.map(s => s.student_id)
    setSelectedStudents(new Set(allVisibleIds))
  }, [filteredStudents])

  const clearSelection = useCallback(() => {
    setSelectedStudents(new Set())
  }, [])

  // Statistics
  const attendanceStats = useMemo(() => {
    const total = students.length
    const present = students.filter(s => getAttendanceStatus(s.student_id) === 'present').length
    const absent = students.filter(s => getAttendanceStatus(s.student_id) === 'absent').length
    const late = students.filter(s => getAttendanceStatus(s.student_id) === 'late').length
    const excused = students.filter(s => getAttendanceStatus(s.student_id) === 'excused').length
    const unmarked = total - present - absent - late - excused

    return { total, present, absent, late, excused, unmarked }
  }, [students, getAttendanceStatus])

  // Submit attendance
  const submitAttendance = useCallback(async () => {
    if (!selectedClass || !isSessionValid) {
      setError('Please fill in all required session details')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // Create session first
      const sessionData = {
        section_course_id: selectedClass.section_course_id,
        session_date: attendanceDate,
        title: sessionDetails.topic,
        session_type: sessionDetails.sessionType,
        meeting_type: sessionDetails.meetingType
      }

      const sessionResponse = await attendanceService.createSession(sessionData)
      const sessionId = sessionResponse.data.session_id

      // Prepare attendance records
      const attendanceRecordsData = students.map(student => ({
        enrollment_id: student.enrollment_id,
        status: getAttendanceStatus(student.student_id) || 'present',
        remarks: getAttendanceRemarks(student.student_id)
      }))

      // Mark attendance
      await attendanceService.markAttendance(sessionId, attendanceRecordsData)

      setSuccess('Attendance submitted successfully!')
      onAttendanceSubmit?.()
      
      // Reset form
      setAttendanceRecords({})
      setSessionDetails({
        sessionNumber: '',
        topic: '',
        description: '',
        startTime: '',
        endTime: '',
        sessionType: 'lecture',
        meetingType: 'in-person'
      })

    } catch (error) {
      console.error('Error submitting attendance:', error)
      setError(error.message || 'Failed to submit attendance')
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedClass, isSessionValid, attendanceDate, sessionDetails, students, getAttendanceStatus, getAttendanceRemarks, onAttendanceSubmit])

  // Status button component
  const StatusButton = ({ studentId, status, label, icon: Icon, colorClass, hoverColorClass }) => {
    const isActive = getAttendanceStatus(studentId) === status
    return (
      <button
        onClick={() => markAttendance(studentId, status)}
        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
          isActive 
            ? `${colorClass} text-white shadow-md` 
            : `bg-gray-100 text-gray-600 hover:${hoverColorClass} hover:text-white`
        }`}
      >
        <Icon className="h-4 w-4" />
        {label}
      </button>
    )
  }

  if (!selectedClass) return null

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4`}>
      <div className={`bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden ${
        sidebarExpanded ? 'ml-64' : 'ml-20'
      } transition-all duration-300`}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Attendance Input</h2>
              <p className="text-red-100 mt-1">
                {selectedClass.course_code} - {selectedClass.section_code} • {attendanceDate}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-red-200 hover:text-white transition-colors p-2"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Session Details Modal */}
        {showSessionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session Number *
                  </label>
                  <input
                    type="text"
                    value={sessionDetails.sessionNumber}
                    onChange={(e) => setSessionDetails(prev => ({ ...prev, sessionNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g., Session 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Topic *
                  </label>
                  <input
                    type="text"
                    value={sessionDetails.topic}
                    onChange={(e) => setSessionDetails(prev => ({ ...prev, topic: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g., Introduction to Programming"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={sessionDetails.description}
                    onChange={(e) => setSessionDetails(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows="3"
                    placeholder="Session description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={sessionDetails.startTime}
                      onChange={(e) => setSessionDetails(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time *
                    </label>
                    <input
                      type="time"
                      value={sessionDetails.endTime}
                      onChange={(e) => setSessionDetails(prev => ({ ...prev, endTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Session Type
                    </label>
                    <select
                      value={sessionDetails.sessionType}
                      onChange={(e) => setSessionDetails(prev => ({ ...prev, sessionType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="lecture">Lecture</option>
                      <option value="laboratory">Laboratory</option>
                      <option value="tutorial">Tutorial</option>
                      <option value="exam">Exam</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meeting Type
                    </label>
                    <select
                      value={sessionDetails.meetingType}
                      onChange={(e) => setSessionDetails(prev => ({ ...prev, meetingType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="in-person">In-Person</option>
                      <option value="online">Online</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Save Details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          
          {/* Session Details Bar */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="h-5 w-5 text-gray-500" />
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <button
                  onClick={() => setShowSessionModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ClockIcon className="h-4 w-4" />
                  <span className="text-sm">
                    {isSessionValid ? '✓ Session Details' : 'Session Details'}
                  </span>
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <UserGroupIcon className="h-4 w-4" />
                  Bulk Actions
                </button>
                <button
                  onClick={submitAttendance}
                  disabled={isSubmitting || !isSessionValid}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckIcon className="h-4 w-4" />
                  )}
                  {isSubmitting ? 'Submitting...' : 'Submit Attendance'}
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions Panel */}
          {showBulkActions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-blue-900">Bulk Actions</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllVisible}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Select All Visible
                  </button>
                  <button
                    onClick={clearSelection}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={markAllPresent}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  Mark All Present
                </button>
                <button
                  onClick={markAllAbsent}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <XCircleIcon className="h-4 w-4" />
                  Mark All Absent
                </button>
                {selectedStudents.size > 0 && (
                  <>
                    <div className="w-px h-6 bg-blue-300"></div>
                    <button
                      onClick={markSelectedPresent}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      Mark Selected Present ({selectedStudents.size})
                    </button>
                    <button
                      onClick={markSelectedAbsent}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <XCircleIcon className="h-4 w-4" />
                      Mark Selected Absent ({selectedStudents.size})
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">{attendanceStats.total}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="bg-white border border-green-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{attendanceStats.present}</div>
              <div className="text-sm text-green-600">Present</div>
            </div>
            <div className="bg-white border border-red-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{attendanceStats.absent}</div>
              <div className="text-sm text-red-600">Absent</div>
            </div>
            <div className="bg-white border border-yellow-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">{attendanceStats.late}</div>
              <div className="text-sm text-yellow-600">Late</div>
            </div>
            <div className="bg-white border border-blue-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{attendanceStats.excused}</div>
              <div className="text-sm text-blue-600">Excused</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-600">{attendanceStats.unmarked}</div>
              <div className="text-sm text-gray-600">Unmarked</div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="excused">Excused</option>
            </select>
          </div>

          {/* Students List */}
          <div className="space-y-2">
            {filteredStudents.map((student) => {
              const isSelected = selectedStudents.has(student.student_id)
              const status = getAttendanceStatus(student.student_id)
              
              return (
                <div
                  key={student.student_id}
                  className={`bg-white border rounded-lg p-4 transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleStudentSelection(student.student_id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-shrink-0">
                        {student.profile_photo ? (
                          <img
                            src={student.profile_photo}
                            alt={student.full_name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {student.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{student.full_name}</h3>
                        <p className="text-sm text-gray-500">{student.student_number}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <StatusButton
                        studentId={student.student_id}
                        status="present"
                        label="Present"
                        icon={CheckCircleIcon}
                        colorClass="bg-green-600"
                        hoverColorClass="bg-green-500"
                      />
                      <StatusButton
                        studentId={student.student_id}
                        status="absent"
                        label="Absent"
                        icon={XCircleIcon}
                        colorClass="bg-red-600"
                        hoverColorClass="bg-red-500"
                      />
                      <StatusButton
                        studentId={student.student_id}
                        status="late"
                        label="Late"
                        icon={ClockIcon}
                        colorClass="bg-yellow-600"
                        hoverColorClass="bg-yellow-500"
                      />
                      <StatusButton
                        studentId={student.student_id}
                        status="excused"
                        label="Excused"
                        icon={ExclamationTriangleIcon}
                        colorClass="bg-blue-600"
                        hoverColorClass="bg-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border-t border-red-200 p-4">
            <div className="flex items-center gap-2 text-red-800">
              <XCircleIcon className="h-5 w-5" />
              {error}
            </div>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border-t border-green-200 p-4">
            <div className="flex items-center gap-2 text-green-800">
              <CheckIcon className="h-5 w-5" />
              {success}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AttendanceInput
