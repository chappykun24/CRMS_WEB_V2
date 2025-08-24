import React, { useEffect, useMemo, useState } from 'react'
import { 
  UserPlusIcon, 
  MagnifyingGlassIcon, 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  CalendarIcon
} from '@heroicons/react/24/solid'
import { useSidebar } from '../../contexts/SidebarContext'
import studentService from '../../services/studentService'
import api, { endpoints } from '../../utils/api'

const TabButton = ({ isActive, onClick, children }) => (
  <button
    onClick={onClick}
    className={`tab-button py-4 px-4 font-medium text-sm ${
      isActive ? 'text-red-600' : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    {children}
  </button>
)

const StudentManagement = () => {
  const { sidebarExpanded } = useSidebar()
  const [activeTab, setActiveTab] = useState('all')
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [departments, setDepartments] = useState([])
  const [programs, setPrograms] = useState([])
  const [specializations, setSpecializations] = useState([])
  const [terms, setTerms] = useState([])
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [programFilter, setProgramFilter] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [sortOption, setSortOption] = useState('created_desc')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  
  // Form state
  const [formData, setFormData] = useState({
    studentNumber: '',
    firstName: '',
    lastName: '',
    middleInitial: '',
    suffix: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: '',
    birthDate: '',
    department: '',
    program: '',
    specialization: '',
    termStart: '',
    termEnd: '',
    profilePic: null
  })

  // Modal states for consistent notifications
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoading(true)
        const data = await studentService.getAllStudents()
        if (data.success) {
          setStudents(Array.isArray(data.students) ? data.students : [])
        } else {
          setError(data.error || 'Failed to load students')
        }
      } catch (e) {
        setError(e.message || 'Failed to load students')
      } finally {
        setLoading(false)
      }
    }
    loadStudents()
  }, [])

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const res = await api.get(endpoints.departments)
        setDepartments(Array.isArray(res.data) ? res.data : [])
      } catch (_) {
        // silently ignore
      }
    }
    loadDepartments()
  }, [])

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const res = await api.get(endpoints.programs)
        setPrograms(Array.isArray(res.data) ? res.data : [])
      } catch (_) {
        // silently ignore
      }
    }
    loadPrograms()
  }, [])

  useEffect(() => {
    const loadTerms = async () => {
      try {
        const res = await api.get(endpoints.terms)
        setTerms(Array.isArray(res.data) ? res.data : [])
      } catch (_) {
        // silently ignore
      }
    }
    loadTerms()
  }, [])

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = students

    // Apply filters
    if (departmentFilter) {
      list = list.filter(s => String(s.department_id) === String(departmentFilter))
    }
    if (programFilter) {
      list = list.filter(s => String(s.program_id) === String(programFilter))
    }

    // Apply search query
    if (q) {
      list = list.filter(s => 
        s.student_number?.toLowerCase().includes(q) ||
        s.full_name?.toLowerCase().includes(q) ||
        s.contact_email?.toLowerCase().includes(q)
      )
    }

    // Apply sorting
    if (sortOption === 'created_desc') {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    } else if (sortOption === 'created_asc') {
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    } else if (sortOption === 'name_asc') {
      list.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
    } else if (sortOption === 'name_desc') {
      list.sort((a, b) => (b.full_name || '').localeCompare(a.full_name || ''))
    }

    return list
  }, [students, query, departmentFilter, programFilter, sortOption])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          profilePic: e.target.result
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const resetForm = () => {
    setFormData({
      studentNumber: '',
      firstName: '',
      lastName: '',
      middleInitial: '',
      suffix: '',
      email: '',
      password: '',
      confirmPassword: '',
      gender: '',
      birthDate: '',
      department: '',
      program: '',
      specialization: '',
      termStart: '',
      termEnd: '',
      profilePic: null
    })
    setCreateError('')
  }

  const openCreateModal = () => {
    setShowCreateModal(true)
    setIsEditMode(false)
    resetForm()
  }

  const openEditModal = (student) => {
    setSelectedStudent(student)
    setIsEditMode(true)
    setShowCreateModal(true)
    setFormData({
      studentNumber: student.student_number || '',
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      middleInitial: student.middleInitial || '',
      suffix: student.suffix || '',
      email: student.contact_email || '',
      password: '',
      confirmPassword: '',
      gender: student.gender || '',
      birthDate: student.birth_date || '',
      department: student.department_id || '',
      program: student.program_id || '',
      specialization: student.specialization || '',
      termStart: student.term_start || '',
      termEnd: student.term_end || '',
      profilePic: student.student_photo || null
    })
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setIsEditMode(false)
    setSelectedStudent(null)
    resetForm()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setCreateError('Passwords do not match')
      return
    }

    // Validate required fields
    if (!formData.studentNumber || !formData.firstName || !formData.lastName || 
        !formData.email || !formData.password || !formData.department || !formData.program) {
      setCreateError('Please fill in all required fields')
      return
    }

    try {
      setIsCreating(true)
      setCreateError('')

      const studentData = {
        studentNumber: formData.studentNumber,
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleInitial: formData.middleInitial,
        suffix: formData.suffix,
        email: formData.email,
        password: formData.password,
        gender: formData.gender,
        birthDate: formData.birthDate,
        department: formData.department,
        program: formData.program,
        specialization: formData.specialization,
        termStart: formData.termStart,
        termEnd: formData.termEnd,
        profilePic: formData.profilePic
      }

      let result
      if (isEditMode && selectedStudent) {
        result = await studentService.updateStudentProfile(selectedStudent.student_id, studentData)
      } else {
        result = await studentService.registerStudent(studentData)
      }

      if (result.success) {
        setSuccessMessage(isEditMode ? 'Student updated successfully!' : 'Student registered successfully!')
        setShowSuccessModal(true)
        closeCreateModal()
        
        // Refresh students list
        const data = await studentService.getAllStudents()
        if (data.success) {
          setStudents(Array.isArray(data.students) ? data.students : [])
        }
      } else {
        setCreateError(result.error || 'Operation failed')
      }
    } catch (error) {
      setCreateError(error.message || 'An error occurred')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteStudent = async (studentId) => {
    if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      return
    }

    try {
      const result = await studentService.deleteStudent(studentId)
      if (result.success) {
        setSuccessMessage('Student deleted successfully!')
        setShowSuccessModal(true)
        
        // Refresh students list
        const data = await studentService.getAllStudents()
        if (data.success) {
          setStudents(Array.isArray(data.students) ? data.students : [])
        }
      } else {
        setErrorMessage(result.error || 'Failed to delete student')
        setShowErrorModal(true)
      }
    } catch (error) {
      setErrorMessage(error.message || 'An error occurred')
      setShowErrorModal(true)
    }
  }

  const formatDateTime = (value) => {
    if (!value) return '—'
    try {
      return new Date(value).toLocaleString()
    } catch (_) {
      return String(value)
    }
  }

  const getDepartmentName = (departmentId) => {
    const dept = departments.find(d => String(d.department_id) === String(departmentId))
    return dept ? dept.name : departmentId
  }

  const getProgramName = (programId) => {
    const prog = programs.find(p => String(p.program_id) === String(programId))
    return prog ? prog.name : programId
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Student Management</h1>
                <p className="text-gray-600">Register and manage student records</p>
              </div>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Register Student
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <TabButton
                isActive={activeTab === 'all'}
                onClick={() => setActiveTab('all')}
              >
                All Students
              </TabButton>
              <TabButton
                isActive={activeTab === 'pending'}
                onClick={() => setActiveTab('pending')}
              >
                Pending Approval
              </TabButton>
              <TabButton
                isActive={activeTab === 'active'}
                onClick={() => setActiveTab('active')}
              >
                Active Students
              </TabButton>
            </nav>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Department Filter */}
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.department_id} value={dept.department_id}>
                    {dept.name}
                  </option>
                ))}
              </select>

              {/* Program Filter */}
              <select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Programs</option>
                {programs.map(prog => (
                  <option key={prog.program_id} value={prog.program_id}>
                    {prog.name}
                  </option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="created_desc">Newest First</option>
                <option value="created_asc">Oldest First</option>
                <option value="name_asc">Name A-Z</option>
                <option value="name_desc">Name Z-A</option>
              </select>
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Program
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        {query || departmentFilter || programFilter ? 'No students match your filters' : 'No students found'}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.student_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {student.student_photo ? (
                                <img
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={student.student_photo}
                                  alt={student.full_name}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center">
                                  <UserPlusIcon className="h-6 w-6 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {student.full_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {student.student_number}
                              </div>
                              <div className="text-sm text-gray-500">
                                {student.contact_email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getDepartmentName(student.department_id)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getProgramName(student.program_id)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            student.is_approved 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {student.is_approved ? 'Approved' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(student.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => openEditModal(student)}
                              className="text-primary-600 hover:text-primary-900 transition-colors"
                              title="Edit"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(student.student_id)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {isEditMode ? 'Edit Student' : 'Register New Student'}
              </h3>
              <button
                onClick={closeCreateModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-600">{createError}</p>
                </div>
              )}

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student Number *
                  </label>
                  <input
                    type="text"
                    name="studentNumber"
                    value={formData.studentNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Middle Initial
                  </label>
                  <input
                    type="text"
                    name="middleInitial"
                    value={formData.middleInitial}
                    onChange={handleInputChange}
                    maxLength="1"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Suffix
                  </label>
                  <input
                    type="text"
                    name="suffix"
                    value={formData.suffix}
                    onChange={handleInputChange}
                    placeholder="Jr., Sr., III, etc."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!isEditMode}
                    minLength={6}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required={!isEditMode}
                    minLength={6}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Birth Date
                  </label>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Academic Information */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <AcademicCapIcon className="h-5 w-5 mr-2 text-primary-600" />
                  Academic Information
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department *
                    </label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.department_id} value={dept.department_id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Program *
                    </label>
                    <select
                      name="program"
                      value={formData.program}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select Program</option>
                      {programs.map(prog => (
                        <option key={prog.program_id} value={prog.program_id}>
                          {prog.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specialization
                    </label>
                    <input
                      type="text"
                      name="specialization"
                      value={formData.specialization}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Term Start
                    </label>
                    <input
                      type="date"
                      name="termStart"
                      value={formData.termStart}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Term End
                    </label>
                    <input
                      type="date"
                      name="termEnd"
                      value={formData.termEnd}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Profile Photo */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Profile Photo</h4>
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                    {formData.profilePic ? (
                      <img 
                        src={formData.profilePic} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <UserPlusIcon className="h-10 w-10 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF • Max 5MB</p>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating ? 'Processing...' : (isEditMode ? 'Update Student' : 'Register Student')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-center mb-4">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Success!</h3>
              <p className="text-sm text-gray-500 mb-6">{successMessage}</p>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessMessage('');
                }}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-center mb-4">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
              <p className="text-sm text-gray-500 mb-6">{errorMessage}</p>
              <button
                onClick={() => {
                  setShowErrorModal(false);
                  setErrorMessage('');
                }}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default StudentManagement
