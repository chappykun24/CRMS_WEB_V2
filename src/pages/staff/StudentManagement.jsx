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
import { validateStudentRegistration, buildStudentRegistrationPayload, buildStudentUpdatePayload } from '../../services/studentSpec'
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
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

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination()
  }, [query, departmentFilter, sortOption])

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
    
    // Students-only validation
    const { valid, errors } = validateStudentRegistration(formData)
    if (!valid) {
      const firstError = Object.values(errors)[0]
      setCreateError(firstError || 'Please check the form and try again')
      return
    }

    try {
      setIsCreating(true)
      setCreateError('')

      const studentData = isEditMode
        ? buildStudentUpdatePayload(formData)
        : buildStudentRegistrationPayload(formData)

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

  // Filtered students with search and department filter
  const filteredStudents = useMemo(() => {
    let filtered = students.filter(student => {
      const matchesQuery = !query || 
        (student.full_name || '').toLowerCase().includes(query.toLowerCase()) ||
        (student.contact_email || '').toLowerCase().includes(query.toLowerCase()) ||
        (student.student_number || '').toLowerCase().includes(query.toLowerCase())
      
      const matchesDepartment = !departmentFilter || 
        String(student.department_id) === String(departmentFilter)
      
      return matchesQuery && matchesDepartment
    })

    // Apply sorting
    switch (sortOption) {
      case 'created_desc':
        filtered.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt))
        break
      case 'created_asc':
        filtered.sort((a, b) => new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt))
        break
      case 'name_asc':
        filtered.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
        break
      case 'name_desc':
        filtered.sort((a, b) => (b.full_name || '').localeCompare(a.full_name || ''))
        break
      default:
        break
    }

    return filtered
  }, [students, query, departmentFilter, sortOption])

  // Pagination logic
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentStudents = filteredStudents.slice(startIndex, endIndex)

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const resetPagination = () => {
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <div className="p-6 overflow-hidden">
        <div className="max-w-7xl mx-auto min-h-0">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Navigation Bar with Add Student Button */}
          <div className="bg-gray-50 border-b border-gray-200 mb-6">
            <div className="flex items-center justify-between px-8 py-4">
              <nav className="flex space-x-8">
                <div className="py-4 px-4 font-medium text-sm text-red-600 border-b-2 border-red-600">
                  All Students
                </div>
              </nav>
              
              {/* Add Student Button aligned with navigation */}
              <button
                onClick={openCreateModal}
                className="inline-flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5 stroke-[3]" />
            </button>
          </div>
        </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {/* Department Filter */}
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value)
                  resetPagination()
                }}
                className="px-2 py-2 border rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 border-gray-300 text-sm w-32"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.department_id} value={dept.department_id}>
                    {dept.department_abbreviation || dept.name}
                  </option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="px-2 py-2 border rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 border-gray-300 text-sm w-28"
              >
                <option value="created_desc">Newest</option>
                <option value="created_asc">Oldest</option>
                <option value="name_asc">Name A-Z</option>
                <option value="name_desc">Name Z-A</option>
              </select>

              {/* Pagination and student count on the right side of filters */}
              <div className="flex items-center space-x-3 ml-4">
                {/* Student count display */}
                {filteredStudents.length > 0 && (
                  <div className="text-sm text-red-600 font-medium">
                    {startIndex + 1}-{Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length}
                  </div>
                )}
                
                {/* Pagination controls */}
                {filteredStudents.length > 0 && totalPages > 1 && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-2 py-1 text-xs rounded ${
                          page === currentPage
                            ? 'bg-red-600 text-white'
                            : 'text-gray-500 hover:text-red-600'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Students Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-260px)] min-h-[360px] overflow-hidden">
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
              <div className="overflow-x-auto overflow-y-auto h-full">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SR-Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentStudents.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        {query ? 'No students match your search' : 'No students found'}
                      </td>
                    </tr>
                  ) : (
                    currentStudents.map((student) => (
                      <tr
                        key={student.student_id}
                        className={`hover:bg-gray-50 cursor-pointer h-16 ${selectedStudent?.student_id === student.student_id ? 'bg-red-50 border-l-4 border-red-500' : ''}`}
                        onClick={() => setSelectedStudent(student)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {student.student_photo ? (
                                <img className="h-10 w-10 rounded-full object-cover" src={student.student_photo} alt={student.full_name} />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-red-100 border border-red-200 flex items-center justify-center">
                                  <span className="text-red-700 text-sm font-semibold">{(student.full_name || 'S').charAt(0)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.full_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.contact_email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.student_number}</td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(student.created_at || student.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditModal(student) }}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 rounded p-1 transition-colors"
                              title="Edit"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteStudent(student.student_id) }}
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
            <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full min-h-[320px] overflow-auto">
              {!selectedStudent ? (
                <div className="h-full flex items-center justify-center text-center text-gray-500">
                  <div>
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <UserPlusIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm">Select a student from the list to view details here.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <h3 className="text-base font-semibold text-gray-900">Student Details</h3>
                  <div className="flex items-center">
                    {selectedStudent.student_photo ? (
                      <img className="h-14 w-14 rounded-full object-cover" src={selectedStudent.student_photo} alt={selectedStudent.full_name} />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-red-100 border border-red-200 flex items-center justify-center">
                        <span className="text-red-700 text-base font-semibold">{(selectedStudent.full_name || 'S').charAt(0)}</span>
                      </div>
                    )}
                    <div className="ml-4">
                      <div className="text-base font-semibold text-gray-900">{selectedStudent.full_name}</div>
                      <div className="text-sm text-gray-500">{selectedStudent.student_number}</div>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500">Email</div>
                      <div className="text-gray-900 break-all">{selectedStudent.contact_email}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">SR-Code</div>
                      <div className="text-gray-900">{selectedStudent.student_number}</div>
                    </div>
                    {selectedStudent.gender && (
                      <div>
                        <div className="text-gray-500">Gender</div>
                        <div className="text-gray-900 capitalize">{selectedStudent.gender}</div>
                      </div>
                    )}
                    {selectedStudent.birth_date && (
                      <div>
                        <div className="text-gray-500">Birth Date</div>
                        <div className="text-gray-900">{selectedStudent.birth_date}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-gray-500">Created</div>
                      <div className="text-gray-900">{formatDateTime(selectedStudent.created_at || selectedStudent.createdAt)}</div>
                    </div>
                  </div>
                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => openEditModal(selectedStudent)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-md"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(selectedStudent.student_id)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" /> Delete
                    </button>
                  </div>
                </div>
              )}
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

                {/* Password fields removed for students-only */}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <div className="relative">
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full appearance-none pr-10 pl-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Birth Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleInputChange}
                      className="w-full pr-10 pl-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                      <CalendarIcon className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Academic Information removed for students-only */}

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
