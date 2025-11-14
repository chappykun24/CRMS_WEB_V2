import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
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
// Removed SidebarContext import - using local state instead
import studentService from '../../services/studentService'
// Removed studentSpec import - using inline validation instead
import api, { endpoints } from '../../utils/api'
import { TableSkeleton, SidebarSkeleton, ImageSkeleton } from '../../components/skeletons'
import staffCacheService from '../../services/staffCacheService'
import { safeSetItem, safeGetItem, minimizeStudentData, createCacheGetter, createCacheSetter } from '../../utils/cacheUtils'

// Cache helpers
const getCachedData = createCacheGetter(staffCacheService)
const setCachedData = createCacheSetter(staffCacheService)

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
  const [sidebarExpanded] = useState(true) // Default to expanded
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
  
  // Lock page scroll while this page is mounted
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
    }
  }, [])

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

  // Random data generation function
  const fillRandomData = () => {
    const firstNames = [
      'Juan', 'Maria', 'Jose', 'Ana', 'Pedro', 'Carmen', 'Antonio', 'Isabel', 'Manuel', 'Rosa',
      'Carlos', 'Elena', 'Miguel', 'Sofia', 'Luis', 'Carmen', 'Francisco', 'Lucia', 'Diego', 'Valentina',
      'Alejandro', 'Camila', 'Daniel', 'Gabriela', 'Roberto', 'Adriana', 'Fernando', 'Patricia', 'Ricardo', 'Monica'
    ]
    
    const lastNames = [
      'Santos', 'Cruz', 'Reyes', 'Gonzalez', 'Lopez', 'Martinez', 'Rodriguez', 'Hernandez', 'Garcia', 'Perez',
      'Torres', 'Flores', 'Rivera', 'Morales', 'Ortiz', 'Silva', 'Jimenez', 'Moreno', 'Romero', 'Diaz',
      'Vargas', 'Castillo', 'Ramos', 'Ruiz', 'Alvarez', 'Mendoza', 'Herrera', 'Medina', 'Castro', 'Guerrero'
    ]
    
    const middleInitials = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
    const suffixes = ['Jr.', 'Sr.', 'II', 'III', 'IV']
    const genders = ['male', 'female', 'other']
    
    // Generate random SR code with format 2X-XXXXX
    const year = Math.floor(Math.random() * 10) + 20 // 20-29
    const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
    const studentNumber = `${year}-${randomNum}`
    
    // Generate random birth date (18-25 years old) in HTML date format (YYYY-MM-DD)
    const currentYear = new Date().getFullYear()
    const birthYear = currentYear - (Math.floor(Math.random() * 8) + 18)
    const birthMonth = Math.floor(Math.random() * 12) + 1
    const birthDay = Math.floor(Math.random() * 28) + 1
    const birthDate = `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`
    
    // Generate random email using SR code format
    const email = `${studentNumber}@g.batstate-u.edu.ph`
    
    // Select random names
    const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    
    // Select random department if available
    const randomDepartment = departments.length > 0 ? departments[Math.floor(Math.random() * departments.length)].department_id : ''
    
    setFormData(prev => ({
      ...prev,
      studentNumber: studentNumber,
      firstName: randomFirstName,
      lastName: randomLastName,
      middleInitial: middleInitials[Math.floor(Math.random() * middleInitials.length)],
      suffix: Math.random() > 0.7 ? suffixes[Math.floor(Math.random() * suffixes.length)] : '',
      email: email,
      gender: genders[Math.floor(Math.random() * genders.length)],
      birthDate: birthDate,
      department: randomDepartment
    }))
  }

  // Modal states for consistent notifications
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Sidebar photo upload states
  const [sidebarEditMode, setSidebarEditMode] = useState(false)
  const [sidebarPhotoFile, setSidebarPhotoFile] = useState(null)
  const [sidebarPhotoPreview, setSidebarPhotoPreview] = useState(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  
  // Abort controllers for request cancellation
  const studentsAbortControllerRef = useRef(null)
  const departmentsAbortControllerRef = useRef(null)
  const programsAbortControllerRef = useRef(null)
  const termsAbortControllerRef = useRef(null)

  // Fetch students with caching
  const loadStudents = useCallback(async () => {
    console.log('🔍 [STAFF STUDENTS] loadStudents starting')
    setError('')
    
    // Check sessionStorage first for instant display
    const sessionCacheKey = 'staff_students_session'
    const sessionCached = safeGetItem(sessionCacheKey)
    
    if (sessionCached) {
      console.log('📦 [STAFF STUDENTS] Using session cached students data')
      setStudents(Array.isArray(sessionCached) ? sessionCached : [])
      setLoading(false)
      // Continue to fetch fresh data in background
    } else {
      setLoading(true)
    }
    
    // Check enhanced cache
    const cacheKey = 'staff_students'
    const cachedData = getCachedData('students', cacheKey, 10 * 60 * 1000) // 10 minute cache
    if (cachedData && !sessionCached) {
      console.log('📦 [STAFF STUDENTS] Using enhanced cached students data')
      setStudents(Array.isArray(cachedData) ? cachedData : [])
      setLoading(false)
      // Cache minimized data in sessionStorage for next time
      safeSetItem(sessionCacheKey, cachedData, minimizeStudentData)
      // Continue to fetch fresh data in background
    }
    
    // Cancel previous request if still pending
    if (studentsAbortControllerRef.current) {
      studentsAbortControllerRef.current.abort()
    }
    
    // Create new abort controller
    studentsAbortControllerRef.current = new AbortController()
    
    try {
      console.log('🔄 [STAFF STUDENTS] Fetching fresh students...')
      const data = await studentService.getAllStudents()
      
      if (data.success) {
        const studentsData = Array.isArray(data.students) ? data.students : []
        console.log(`✅ [STAFF STUDENTS] Received ${studentsData.length} students`)
        setStudents(studentsData)
        setError('')
        
        // Store minimized data in sessionStorage for instant next load
        if (!sessionCached) {
          safeSetItem(sessionCacheKey, studentsData, minimizeStudentData)
        }
        
        // Store full data in enhanced cache
        setCachedData('students', cacheKey, studentsData)
      } else {
        throw new Error(data.error || 'Failed to load students')
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('🚫 [STAFF STUDENTS] Request was aborted')
        return
      }
      console.error('❌ [STAFF STUDENTS] Error loading students:', e)
      const sessionCached = safeGetItem(sessionCacheKey)
      const cachedData = getCachedData('students', cacheKey, 10 * 60 * 1000)
      if (!sessionCached && !cachedData) {
        setError(e.message || 'Failed to load students')
        setStudents([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch departments with caching
  const loadDepartments = useCallback(async () => {
    console.log('🔍 [STAFF STUDENTS] loadDepartments starting')
    
    // Check sessionStorage first
    const sessionCacheKey = 'staff_departments_session'
    const sessionCached = safeGetItem(sessionCacheKey)
    
    if (sessionCached) {
      console.log('📦 [STAFF STUDENTS] Using session cached departments')
      setDepartments(Array.isArray(sessionCached) ? sessionCached : [])
      // Continue to fetch fresh data in background
    }
    
    // Check enhanced cache
    const cacheKey = 'staff_departments'
    const cachedData = getCachedData('departments', cacheKey, 30 * 60 * 1000) // 30 minute cache
    if (cachedData && !sessionCached) {
      console.log('📦 [STAFF STUDENTS] Using enhanced cached departments')
      setDepartments(Array.isArray(cachedData) ? cachedData : [])
      safeSetItem(sessionCacheKey, cachedData)
      // Continue to fetch fresh data in background
    }
    
    // Cancel previous request if still pending
    if (departmentsAbortControllerRef.current) {
      departmentsAbortControllerRef.current.abort()
    }
    
    departmentsAbortControllerRef.current = new AbortController()
    
    try {
      console.log('🔄 [STAFF STUDENTS] Fetching fresh departments...')
      const res = await api.get(endpoints.departments)
      const departmentsData = Array.isArray(res.data) ? res.data : []
      console.log(`✅ [STAFF STUDENTS] Received ${departmentsData.length} departments`)
      setDepartments(departmentsData)
      
      // Store in sessionStorage
      if (!sessionCached) {
        safeSetItem(sessionCacheKey, departmentsData)
      }
      
      // Store in enhanced cache
      setCachedData('departments', cacheKey, departmentsData)
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('🚫 [STAFF STUDENTS] Departments request was aborted')
        return
      }
      console.error('❌ [STAFF STUDENTS] Error loading departments:', e)
      // Don't set error for departments as they're optional
    }
  }, [])

  // Fetch programs with caching
  const loadPrograms = useCallback(async () => {
    console.log('🔍 [STAFF STUDENTS] loadPrograms starting')
    
    // Check sessionStorage first
    const sessionCacheKey = 'staff_programs_session'
    const sessionCached = safeGetItem(sessionCacheKey)
    
    if (sessionCached) {
      console.log('📦 [STAFF STUDENTS] Using session cached programs')
      setPrograms(Array.isArray(sessionCached) ? sessionCached : [])
      // Continue to fetch fresh data in background
    }
    
    // Check enhanced cache
    const cacheKey = 'staff_programs'
    const cachedData = getCachedData('programs', cacheKey, 30 * 60 * 1000) // 30 minute cache
    if (cachedData && !sessionCached) {
      console.log('📦 [STAFF STUDENTS] Using enhanced cached programs')
      setPrograms(Array.isArray(cachedData) ? cachedData : [])
      safeSetItem(sessionCacheKey, cachedData)
      // Continue to fetch fresh data in background
    }
    
    // Cancel previous request if still pending
    if (programsAbortControllerRef.current) {
      programsAbortControllerRef.current.abort()
    }
    
    programsAbortControllerRef.current = new AbortController()
    
    try {
      console.log('🔄 [STAFF STUDENTS] Fetching fresh programs...')
      const res = await api.get(endpoints.programs)
      const programsData = Array.isArray(res.data) ? res.data : []
      console.log(`✅ [STAFF STUDENTS] Received ${programsData.length} programs`)
      setPrograms(programsData)
      
      // Store in sessionStorage
      if (!sessionCached) {
        safeSetItem(sessionCacheKey, programsData)
      }
      
      // Store in enhanced cache
      setCachedData('programs', cacheKey, programsData)
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('🚫 [STAFF STUDENTS] Programs request was aborted')
        return
      }
      console.error('❌ [STAFF STUDENTS] Error loading programs:', e)
      // Don't set error for programs as they're optional
    }
  }, [])

  // Fetch terms with caching
  const loadTerms = useCallback(async () => {
    console.log('🔍 [STAFF STUDENTS] loadTerms starting')
    
    // Check sessionStorage first
    const sessionCacheKey = 'staff_terms_session'
    const sessionCached = safeGetItem(sessionCacheKey)
    
    if (sessionCached) {
      console.log('📦 [STAFF STUDENTS] Using session cached terms')
      setTerms(Array.isArray(sessionCached) ? sessionCached : [])
      // Continue to fetch fresh data in background
    }
    
    // Check enhanced cache
    const cacheKey = 'staff_terms'
    const cachedData = getCachedData('terms', cacheKey, 30 * 60 * 1000) // 30 minute cache
    if (cachedData && !sessionCached) {
      console.log('📦 [STAFF STUDENTS] Using enhanced cached terms')
      setTerms(Array.isArray(cachedData) ? cachedData : [])
      safeSetItem(sessionCacheKey, cachedData)
      // Continue to fetch fresh data in background
    }
    
    // Cancel previous request if still pending
    if (termsAbortControllerRef.current) {
      termsAbortControllerRef.current.abort()
    }
    
    termsAbortControllerRef.current = new AbortController()
    
    try {
      console.log('🔄 [STAFF STUDENTS] Fetching fresh terms...')
      const res = await api.get(endpoints.terms)
      const termsData = Array.isArray(res.data) ? res.data : []
      console.log(`✅ [STAFF STUDENTS] Received ${termsData.length} terms`)
      setTerms(termsData)
      
      // Store in sessionStorage
      if (!sessionCached) {
        safeSetItem(sessionCacheKey, termsData)
      }
      
      // Store in enhanced cache
      setCachedData('terms', cacheKey, termsData)
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('🚫 [STAFF STUDENTS] Terms request was aborted')
        return
      }
      console.error('❌ [STAFF STUDENTS] Error loading terms:', e)
      // Don't set error for terms as they're optional
    }
  }, [])

  // Load data on mount with prioritization - no prefetching
  useEffect(() => {
    // Priority 1: Load critical data immediately (students - main content)
    loadStudents()
    
    // Priority 2: Load filter data after critical data starts loading
    // Departments are needed for filtering, so load them next
    const loadSecondaryData = () => {
      loadDepartments()
    }
    
    // Priority 3: Load tertiary data (programs, terms) only when needed
    // These are only used in filters, so load them after departments
    const loadTertiaryData = () => {
      loadPrograms()
      loadTerms()
    }
    
    // Load secondary data after a short delay
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadSecondaryData, { timeout: 500 })
      // Load tertiary data even later
      requestIdleCallback(loadTertiaryData, { timeout: 1500 })
    } else {
      setTimeout(loadSecondaryData, 200)
      setTimeout(loadTertiaryData, 800)
    }
    
    // Cleanup function to abort pending requests
    return () => {
      if (studentsAbortControllerRef.current) {
        studentsAbortControllerRef.current.abort()
      }
      if (departmentsAbortControllerRef.current) {
        departmentsAbortControllerRef.current.abort()
      }
      if (programsAbortControllerRef.current) {
        programsAbortControllerRef.current.abort()
      }
      if (termsAbortControllerRef.current) {
        termsAbortControllerRef.current.abort()
      }
    }
  }, [loadStudents, loadDepartments, loadPrograms, loadTerms])

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination()
  }, [query, departmentFilter, sortOption])

  // Reset sidebar photo states when selected student changes
  useEffect(() => {
    if (selectedStudent) {
      setSidebarEditMode(false)
      setSidebarPhotoFile(null)
      setSidebarPhotoPreview(null)
    }
  }, [selectedStudent])



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

  // Sidebar photo upload handlers
  const handleSidebarPhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSidebarPhotoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setSidebarPhotoPreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSidebarPhotoUpload = async () => {
    if (!sidebarPhotoFile || !selectedStudent) return

    setIsUploadingPhoto(true)

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const photoBase64 = e.target.result

        const response = await fetch('/api/students/upload-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoBase64,
            studentId: selectedStudent.student_id
          })
        })

        if (!response.ok) throw new Error('Failed to upload photo')
        const result = await response.json()
        if (!result.success) throw new Error(result.error || 'Failed to upload photo')

        // Update UI with new photo
        setSelectedStudent(prev => ({ ...prev, student_photo: result.photoUrl }))
        setStudents(prev => prev.map(student => (
          student.student_id === selectedStudent.student_id
            ? { ...student, student_photo: result.photoUrl }
            : student
        )))

        // Reset sidebar photo states
        setSidebarPhotoFile(null)
        setSidebarPhotoPreview(null)
        setSidebarEditMode(false)

        // Success toast
        setShowSuccessModal(true)
        setTimeout(() => setShowSuccessModal(false), 3000)
      } catch (error) {
        console.error('Photo upload error:', error)
        setErrorMessage(error.message || 'Failed to upload photo')
        setShowErrorModal(true)
      } finally {
        setIsUploadingPhoto(false)
      }
    }

    reader.onerror = () => {
      setIsUploadingPhoto(false)
      setErrorMessage('Failed to read photo file')
      setShowErrorModal(true)
    }

    reader.readAsDataURL(sidebarPhotoFile)
  }

  const cancelSidebarPhotoEdit = () => {
    setSidebarPhotoFile(null)
    setSidebarPhotoPreview(null)
    setSidebarEditMode(false)
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
    // Simple validation - check required fields
    const errors = {}
    if (!formData.firstName?.trim()) errors.firstName = 'First name is required'
    if (!formData.lastName?.trim()) errors.lastName = 'Last name is required'
    if (!formData.email?.trim()) errors.email = 'Email is required'
    if (!formData.studentNumber?.trim()) errors.studentNumber = 'Student number is required'
    const valid = Object.keys(errors).length === 0
    if (!valid) {
      const firstError = Object.values(errors)[0]
      setCreateError(firstError || 'Please check the form and try again')
      return
    }

    try {
      setIsCreating(true)
      setCreateError('')

      const studentData = isEditMode
        ? {
            firstName: formData.firstName?.trim(),
            lastName: formData.lastName?.trim(),
            email: formData.email?.trim(),
            studentNumber: formData.studentNumber?.trim(),
            gender: formData.gender || 'other',
            birthDate: formData.birthDate || null,
            contactEmail: formData.contactEmail?.trim() || formData.email?.trim(),
            phone: formData.phone?.trim() || null,
            address: formData.address?.trim() || null,
            emergencyContact: formData.emergencyContact?.trim() || null,
            emergencyPhone: formData.emergencyPhone?.trim() || null,
            programId: formData.programId || null,
            specializationId: formData.specializationId || null,
            yearLevel: formData.yearLevel || 1
          }
        : {
            firstName: formData.firstName?.trim(),
            lastName: formData.lastName?.trim(),
            email: formData.email?.trim(),
            studentNumber: formData.studentNumber?.trim(),
            gender: formData.gender || 'other',
            birthDate: formData.birthDate || null,
            contactEmail: formData.contactEmail?.trim() || formData.email?.trim(),
            phone: formData.phone?.trim() || null,
            address: formData.address?.trim() || null,
            emergencyContact: formData.emergencyContact?.trim() || null,
            emergencyPhone: formData.emergencyPhone?.trim() || null,
            programId: formData.programId || null,
            specializationId: formData.specializationId || null,
            yearLevel: formData.yearLevel || 1
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
      <div className="pt-0 pb-4 overflow-hidden">
        <div className="w-full">
          {/* Tabs and Add Student Button */}
          <div className="bg-gray-50 border-b border-gray-200 mb-2">
            <div className="px-0">
              <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200">
                <nav className="flex space-x-8">
                  <div className="py-2 px-4 font-medium text-sm text-red-600 border-b-2 border-red-600">
                    All Students
                  </div>
                </nav>
                
                {/* Add Student Button aligned with navigation */}
                <button
                  className="inline-flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  disabled
                >
                  <PlusIcon className="h-5 w-5 stroke-[3]" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area - Loading State */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-150px)]">
            {/* Left Section - Table Skeleton */}
            <div className="lg:col-span-3 flex flex-col h-full min-h-0">
              {/* Search Bar Skeleton */}
              <div className="mb-6 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <div className="w-full h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                  </div>
                  <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
                  <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse"></div>
                </div>
              </div>

              {/* Table Skeleton */}
              <div className="flex-1 min-h-0">
                <TableSkeleton rows={8} columns={6} />
              </div>
            </div>

            {/* Right Section - Sidebar Skeleton */}
            <div className="lg:col-span-1">
              <SidebarSkeleton />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="pt-0 pb-4 overflow-hidden">
        <div className="w-full">
                    {/* Tabs and Add Student Button */}
          <div className="bg-gray-50 border-b border-gray-200 mb-2">
            <div className="px-0">
              <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200">
                <nav className="flex space-x-8">
                  <div className="py-2 px-4 font-medium text-sm text-red-600 border-b-2 border-red-600">
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
          </div>

          {/* Main Content Area - Filters, Search, Table, and Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-150px)]">
            {/* Left Section - Filters, Search, and Table */}
            <div className="lg:col-span-3 flex flex-col h-full min-h-0">
              {/* Filters and Search Bar */}
              <div className="mb-6 shrink-0">
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
              <div className="flex-1 min-h-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto overflow-y-auto h-full">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PROFILE</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NAME</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EMAIL</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SR-CODE</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DEPARTMENT</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
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
                                    <ImageSkeleton
                                      src={student.student_photo}
                                      alt={student.full_name}
                                      size="md"
                                      shape="circle"
                                      className="border-2 border-gray-200"
                                    />
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
                              <div className="flex items-center">
                                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                {getDepartmentName(student.department_id) || '—'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className="text-green-600 font-semibold">Active</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

                        {/* Right Section - Sidebar */}
            <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-h-[120px] overflow-auto">
              {!selectedStudent ? (
                <div className="h-full flex items-center justify-center text-center text-gray-500 py-10">
                  <div>
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <p className="text-sm">Select a student from the list to view details here.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Header with Edit Toggle */}
                  <div className="flex items-center justify-between">
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
                    <button
                      onClick={() => setSidebarEditMode(!sidebarEditMode)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-full hover:bg-red-50"
                      title={sidebarEditMode ? "Cancel Edit" : "Edit Photo"}
                    >
                      {sidebarEditMode ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  
                  {/* Photo Upload Section - Edit Mode */}
                  {sidebarEditMode && (
                    <div className="border-t border-gray-200 pt-4">
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Update Profile Photo
                        </label>
                        <div className="flex items-center space-x-3">
                          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                            {sidebarPhotoPreview ? (
                              <img 
                                src={sidebarPhotoPreview} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleSidebarPhotoChange}
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                            />
                            <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF • Max 5MB</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handleSidebarPhotoUpload}
                            disabled={!sidebarPhotoFile || isUploadingPhoto}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
                          >
                            {isUploadingPhoto && (
                              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                              </svg>
                            )}
                            <span>{isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                          </button>
                          {sidebarPhotoFile && (
                            <button
                              onClick={cancelSidebarPhotoEdit}
                              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Student Details */}
                  <div className="border-t border-gray-200 pt-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email</span>
                      <span className="text-gray-800 text-sm">{selectedStudent.contact_email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">SR-Code</span>
                      <span className="text-gray-800 text-sm">{selectedStudent.student_number}</span>
                    </div>
                    {selectedStudent.gender && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Gender</span>
                        <span className="text-gray-800 text-sm capitalize">{selectedStudent.gender}</span>
                      </div>
                    )}
                    {selectedStudent.birth_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Birth Date</span>
                        <span className="text-gray-800 text-sm">{formatDateTime(selectedStudent.birth_date)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Created</span>
                      <span className="text-gray-800 text-sm">{formatDateTime(selectedStudent.created_at || selectedStudent.createdAt)}</span>
                    </div>
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
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={fillRandomData}
                  className="text-xs font-medium text-red-600 hover:underline"
                  title="Fill random student data"
                >
                  Fill Random Data
                </button>
                <button
                  onClick={closeCreateModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
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
