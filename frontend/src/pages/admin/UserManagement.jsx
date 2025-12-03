import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { UsersIcon, UserPlusIcon, MagnifyingGlassIcon, ShieldCheckIcon, NoSymbolIcon, PlusIcon } from '@heroicons/react/24/solid'
import api, { enhancedApi, endpoints } from '../../utils/api'
import { TableSkeleton, SidebarSkeleton } from '../../components/skeletons'
// Removed prefetch - using lazy loading instead
import { useAuth } from '../../contexts/UnifiedAuthContext'
import { useSidebar } from '../../contexts/SidebarContext'
import { setLocalStorageItem, getLocalStorageItem } from '../../utils/localStorageManager'

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

const UserManagement = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { sidebarExpanded } = useSidebar()
  const [activeTab, setActiveTab] = useState(() => {
    const saved = getLocalStorageItem('userMgmtActiveTab')
    return saved === 'faculty' ? 'faculty' : 'all' // Only allow 'all' or 'faculty'
  })
  const [isInitialMount, setIsInitialMount] = useState(true)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [isApproving, setIsApproving] = useState({})
  const [isRejecting, setIsRejecting] = useState({})
  const [roles, setRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [departments, setDepartments] = useState([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [roleFilter, setRoleFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [sortOption, setSortOption] = useState('created_desc')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    role_id: '',
    department_id: '',
    password: '',
    confirmPassword: ''
  })
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [isUpdatingDepartment, setIsUpdatingDepartment] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [totalUsers, setTotalUsers] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  const formatDateTime = (value) => {
    if (!value) return '—'
    try {
      return new Date(value).toLocaleString()
    } catch (_) {
      return String(value)
    }
  }

  const formatRoleName = (name) => {
    if (!name) return ''
    return String(name)
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  // Helper function to check if a user is approved
  const isUserApproved = (user) => {
    if (user.is_approved === true || user.is_approved === 1 || user.is_approved === 'true' || user.is_approved === '1') {
      return true
    }
    if (typeof user.is_approved === 'boolean') {
      return user.is_approved === true
    }
    if (typeof user.is_approved === 'number') {
      return user.is_approved > 0
    }
    return false
  }

  // Track initial mount to prevent unnecessary updates on first render
  useEffect(() => {
    setIsInitialMount(false)
  }, [])

  useEffect(() => {
    // Skip on initial mount to prevent automatic switching
    if (isInitialMount) {
      return
    }

    setLocalStorageItem('userMgmtActiveTab', activeTab)
    
    // Find the role name for the selected filter
    let roleFilterName = ''
    if (roleFilter && roleFilter !== 'faculty') {
      const selectedRole = roles.find(r => Number(r.role_id) === Number(roleFilter))
      roleFilterName = selectedRole ? formatRoleName(selectedRole.name) : ''
    } else if (roleFilter === 'faculty') {
      roleFilterName = 'Faculty'
    }
    
    const event = new CustomEvent('userMgmtTabChanged', { detail: { activeTab, roleFilter, roleFilterName } })
    window.dispatchEvent(event)
    // Remove role filter when on Faculty Approval tab (faculty tab doesn't use role filter)
    if (activeTab === 'faculty' && roleFilter) {
      setRoleFilter('')
    }
    // Clear department filter when switching tabs
    if (departmentFilter !== '') {
      setDepartmentFilter('')
    }
    // Reset pagination when switching tabs
    resetPagination()
  }, [activeTab, isInitialMount, roleFilter, roles])

  // Dispatch role filter changes for breadcrumb updates
  useEffect(() => {
    if (!isInitialMount) {
      // Find the role name for the selected filter
      let roleFilterName = ''
      if (roleFilter && roleFilter !== 'faculty') {
        const selectedRole = roles.find(r => Number(r.role_id) === Number(roleFilter))
        roleFilterName = selectedRole ? formatRoleName(selectedRole.name) : ''
      } else if (roleFilter === 'faculty') {
        roleFilterName = 'Faculty'
      }
      
      const event = new CustomEvent('userMgmtTabChanged', { 
        detail: { 
          activeTab, 
          roleFilter,
          roleFilterName 
        } 
      })
      window.dispatchEvent(event)
    }
  }, [roleFilter, isInitialMount, activeTab, roles])

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination()
  }, [query, roleFilter, departmentFilter, sortOption])

  // Load users with pagination - only fetch when authenticated
  const loadUsers = useCallback(async (page = 1, append = false) => {
    // Don't fetch if not authenticated
    if (!isAuthenticated || authLoading) {
      return
    }

    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setUsers([]) // Clear existing users when loading fresh
      }
      
      setError('')
      
      // Build query parameters
      const params = {
        page,
        limit: itemsPerPage
      }
      
      // Add filters based on active tab
      if (activeTab === 'faculty') {
        // Faculty Approval tab: Show ONLY faculties with pending requests
        // Find faculty role
        if (roles && roles.length > 0) {
          const facultyRole = roles.find(r => String(r.name).toUpperCase() === 'FACULTY')
          if (facultyRole) {
            params.role_id = facultyRole.role_id
          }
        } else {
          // Fallback: use common faculty role_id (usually 2, but this is a fallback)
          params.role_id = 2
        }
        // Always filter for pending status on Faculty Approval tab
        params.status = 'pending'
      } else if (activeTab === 'all') {
        // All Users tab: Show all roles (admin, dean, program chair, staff, and faculties)
        // But only approved faculties (pending faculties will be filtered out on frontend)
        if (roleFilter) {
          if (roleFilter === 'faculty') {
            // When "Faculty" is selected, fetch faculty users but filter approved ones on frontend
            const facultyRole = roles && roles.length > 0 
              ? roles.find(r => String(r.name).toUpperCase() === 'FACULTY')
              : null
            if (facultyRole) {
              params.role_id = facultyRole.role_id
            } else {
              params.role_id = 2 // fallback
            }
          } else {
            params.role_id = parseInt(roleFilter, 10)
          }
        }
        // Note: When no role filter or "Faculty" filter is selected,
        // we'll filter out pending faculty users on the frontend
        if (departmentFilter) {
          params.department_id = parseInt(departmentFilter, 10)
        }
      }
      
      // Add search query if provided
      if (query.trim()) {
        params.search = query.trim()
      }
      
      const response = await enhancedApi.getUsers(params)
      
      // Handle response format - backend returns { success: true, data: { users: [], pagination: {} } }
      // enhancedApi.getUsers returns response.data from axios, so response is already unwrapped
      let responseData
      if (response?.success && response?.data) {
        // Backend format: { success: true, data: { users: [], pagination: {} } }
        responseData = response.data
      } else if (response?.data) {
        // Alternative format: { data: { users: [], pagination: {} } }
        responseData = response.data
      } else {
        // Fallback: assume response is already the data object
        responseData = response
      }
      
      let usersList = Array.isArray(responseData?.users) ? responseData.users : Array.isArray(responseData) ? responseData : []
      
      // Apply frontend filtering based on active tab
      if (activeTab === 'all') {
        // First, ensure role filter is applied correctly
        if (roleFilter && roleFilter !== 'faculty') {
          // When a specific role is selected, filter to show ONLY that role
          const selectedRoleId = Number(roleFilter)
          usersList = usersList.filter(user => {
            const userRoleId = Number(user.role_id)
            return userRoleId === selectedRoleId
          })
        } else if (roleFilter === 'faculty') {
          // When "Faculty" filter is selected, show only approved faculty
          const facultyRoleId = roles && roles.length > 0 
            ? roles.find(r => String(r.name).toUpperCase() === 'FACULTY')?.role_id 
            : null
          
          if (facultyRoleId) {
            const facultyId = Number(facultyRoleId)
            usersList = usersList.filter(user => {
              const userRoleId = Number(user.role_id)
              // Only include faculty users, and only if approved
              return userRoleId === facultyId && isUserApproved(user)
            })
          }
        } else {
          // No role filter: Show all roles but filter out pending faculty
          const facultyRoleId = roles && roles.length > 0 
            ? roles.find(r => String(r.name).toUpperCase() === 'FACULTY')?.role_id 
            : null
          
          if (facultyRoleId) {
            const facultyId = Number(facultyRoleId)
            usersList = usersList.filter(user => {
              const userRoleId = Number(user.role_id)
              // If user is faculty, only include if approved
              if (userRoleId === facultyId) {
                return isUserApproved(user)
              }
              // Include all non-faculty users (admin, dean, program chair, staff)
              return true
            })
          }
        }
      } else if (activeTab === 'faculty') {
        // For "Faculty Approval" tab: Only show pending faculty users
        // This should already be filtered by backend, but ensure it's correct
        const facultyRoleId = roles && roles.length > 0 
          ? roles.find(r => String(r.name).toUpperCase() === 'FACULTY')?.role_id 
          : 2 // fallback
        
        if (facultyRoleId) {
          usersList = usersList.filter(user => {
            // Only include faculty users with pending status
            return user.role_id === facultyRoleId && !user.is_approved
          })
        }
      }
      
      const pagination = responseData?.pagination || {}
      
      if (append) {
        setUsers(prev => [...prev, ...usersList])
      } else {
        setUsers(usersList)
      }
      
      // Update pagination info
      setTotalUsers(pagination.total || usersList.length)
      setHasMore(pagination.pages ? page < pagination.pages : usersList.length === itemsPerPage)
      setCurrentPage(page)
      setInitialLoadComplete(true)
      
    } catch (e) {
      setError(e.message || 'Failed to load users')
      console.error('Error loading users:', e)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [isAuthenticated, authLoading, activeTab, roleFilter, departmentFilter, query, itemsPerPage, roles])

  // Load initial users when authenticated (async, non-blocking)
  useEffect(() => {
    if (isAuthenticated && !authLoading && !initialLoadComplete) {
      // Use requestIdleCallback for better performance, fallback to setTimeout
      const loadData = () => {
        loadUsers(1, false).catch(err => {
          console.error('Error loading initial users:', err)
          setError('Failed to load users. Please refresh the page.')
        })
      }
      
      if ('requestIdleCallback' in window) {
        requestIdleCallback(loadData, { timeout: 2000 })
      } else {
        setTimeout(loadData, 0)
      }
    }
  }, [isAuthenticated, authLoading, initialLoadComplete, loadUsers])

  // Reload users when filters change (but not on initial mount)
  useEffect(() => {
    if (isInitialMount) {
      return
    }
    if (isAuthenticated && !authLoading && initialLoadComplete) {
      // Debounce search query
      const timer = setTimeout(() => {
        loadUsers(1, false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [query, activeTab, roleFilter, departmentFilter, isInitialMount])

  // Load roles and departments asynchronously after initial users load (only once)
  const rolesLoadedRef = useRef(false)
  const activeTabRef = useRef(activeTab)
  const loadUsersRef = useRef(loadUsers)
  const isInitialMountRef = useRef(true)
  
  // Keep refs in sync
  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])
  
  useEffect(() => {
    loadUsersRef.current = loadUsers
  }, [loadUsers])
  
  useEffect(() => {
    isInitialMountRef.current = isInitialMount
  }, [isInitialMount])
  
  useEffect(() => {
    if (initialLoadComplete && isAuthenticated && !authLoading && !rolesLoadedRef.current) {
      rolesLoadedRef.current = true // Mark as loading to prevent multiple loads
      
      // Load roles asynchronously
      const loadRoles = async () => {
        try {
          setRolesLoading(true)
          const res = await api.get(endpoints.roles)
          const rolesData = Array.isArray(res.data) ? res.data : []
          setRoles(rolesData)
          
          // If we're on faculty tab and roles just loaded, reload users with proper faculty filter
          // Use ref to get current activeTab and loadUsers to avoid dependency issues
          // Only reload if not on initial mount to prevent automatic switching
          if (!isInitialMountRef.current && activeTabRef.current === 'faculty' && rolesData.length > 0) {
            // Small delay to ensure state is updated, then reload users
            setTimeout(() => {
              loadUsersRef.current(1, false)
            }, 100)
          }
        } catch (e) {
          console.error('Error loading roles:', e)
          rolesLoadedRef.current = false // Reset on error so it can retry
        } finally {
          setRolesLoading(false)
        }
      }
      
      // Load departments asynchronously
      const loadDepartments = async () => {
        try {
          setDepartmentsLoading(true)
          const res = await api.get(endpoints.departments)
          setDepartments(Array.isArray(res.data) ? res.data : [])
        } catch (e) {
          console.error('Error loading departments:', e)
        } finally {
          setDepartmentsLoading(false)
        }
      }
      
      // Load both in parallel after a short delay
      setTimeout(() => {
        Promise.all([loadRoles(), loadDepartments()])
      }, 300)
    }
  }, [initialLoadComplete, isAuthenticated, authLoading])

  const facultyRoleId = useMemo(() => {
    const r = roles.find((r) => String(r.name).toUpperCase() === 'FACULTY')
    return r ? r.role_id : null
  }, [roles])


  // Load more users handler
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && isAuthenticated) {
      loadUsers(currentPage + 1, true)
    }
  }, [loadingMore, hasMore, isAuthenticated, currentPage, loadUsers])

  // If currently selected role is FACULTY, clear it from filter
  useEffect(() => {
    if (!roles || roles.length === 0 || !roleFilter) return
    const facultyRole = roles.find(r => String(r.name).toUpperCase() === 'FACULTY')
    if (facultyRole && String(facultyRole.role_id) === String(roleFilter)) {
      setRoleFilter('')
    }
  }, [roles])

  // Client-side filtering and sorting for displayed users
  const filteredUsers = useMemo(() => {
    let list = [...users]
    
    // Additional filtering based on active tab (already filtered in loadUsers, but ensure consistency)
    if (activeTab === 'all') {
      // Ensure role filter is applied correctly
      if (roleFilter && roleFilter !== 'faculty') {
        // When a specific role is selected, filter to show ONLY that role
        const selectedRoleId = Number(roleFilter)
        list = list.filter(user => {
          const userRoleId = Number(user.role_id)
          return userRoleId === selectedRoleId
        })
      } else if (roleFilter === 'faculty') {
        // When "Faculty" filter is selected, show only approved faculty
        const facultyRoleId = roles && roles.length > 0 
          ? roles.find(r => String(r.name).toUpperCase() === 'FACULTY')?.role_id 
          : null
        
        if (facultyRoleId) {
          const facultyId = Number(facultyRoleId)
          list = list.filter(user => {
            const userRoleId = Number(user.role_id)
            // Only include faculty users, and only if approved
            return userRoleId === facultyId && isUserApproved(user)
          })
        }
      } else {
        // No role filter: Show all roles but filter out pending faculty
        const facultyRoleId = roles && roles.length > 0 
          ? roles.find(r => String(r.name).toUpperCase() === 'FACULTY')?.role_id 
          : null
        
        if (facultyRoleId) {
          const facultyId = Number(facultyRoleId)
          list = list.filter(user => {
            const userRoleId = Number(user.role_id)
            // If user is faculty, only include if approved
            if (userRoleId === facultyId) {
              return isUserApproved(user)
            }
            return true
          })
        }
      }
    } else if (activeTab === 'faculty') {
      // Ensure only pending faculty users are shown in "Faculty Approval" tab
      const facultyRoleId = roles && roles.length > 0 
        ? roles.find(r => String(r.name).toUpperCase() === 'FACULTY')?.role_id 
        : 2 // fallback
      
      if (facultyRoleId) {
        list = list.filter(user => {
          return user.role_id === facultyRoleId && !user.is_approved
        })
      }
    }
    
    // Apply client-side sorting
    switch (sortOption) {
      case 'created_asc':
        list.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
        break
      case 'name_asc':
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim()
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim()
        list.sort((a, b) => nameA.localeCompare(nameB))
        break
      case 'name_desc':
        const nameA2 = `${a.first_name || ''} ${a.last_name || ''}`.trim()
        const nameB2 = `${b.first_name || ''} ${b.last_name || ''}`.trim()
        list.sort((a, b) => nameB2.localeCompare(nameA2))
        break
      case 'approved_first':
        list.sort((a, b) => Number(b.is_approved || 0) - Number(a.is_approved || 0))
        break
      case 'pending_first':
        list.sort((a, b) => Number(a.is_approved || 0) - Number(b.is_approved || 0))
        break
      case 'created_desc':
      default:
        list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        break
    }
    return list
  }, [users, sortOption, activeTab, roles])

  const resetPagination = () => {
    setCurrentPage(1)
    setUsers([])
    setInitialLoadComplete(false)
  }

  const handleApprove = async (userId) => {
    try {
      setIsApproving(prev => ({ ...prev, [userId]: true }))
      await api.patch(endpoints.userApprove(userId))
      
      // Update local state immediately for better UX
      setUsers(prev => prev.map(u => (u.user_id === userId ? { ...u, is_approved: true } : u)))
      if (selectedUser && selectedUser.user_id === userId) {
        setSelectedUser(prev => ({ ...prev, is_approved: true }))
      }
      
      setSuccessMessage('User approved successfully')
      setShowSuccessModal(true)
    } catch (e) {
      setError(e.message || 'Failed to approve user')
    } finally {
      setIsApproving(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleReject = async (userId) => {
    try {
      setIsRejecting(prev => ({ ...prev, [userId]: true }))
      await api.patch(endpoints.userReject(userId))
      
      // Update local state immediately for better UX
      setUsers(prev => prev.map(u => (u.user_id === userId ? { ...u, is_approved: false } : u)))
      if (selectedUser && selectedUser.user_id === userId) {
        setSelectedUser(prev => ({ ...prev, is_approved: false }))
      }
      
      setSuccessMessage('User rejected successfully')
      setShowSuccessModal(true)
    } catch (e) {
      setError(e.message || 'Failed to reject user')
    } finally {
      setIsRejecting(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleDepartmentChange = async (userId, departmentId) => {
    try {
      setIsUpdatingDepartment(prev => ({ ...prev, [userId]: true }))
      const newDepartmentId = departmentId === '' ? null : parseInt(departmentId)
      
      // Update the user's department access
      const response = await api.patch(endpoints.user(userId), {
        department_id: newDepartmentId
      })
      
      if (response.data) {
        // Update local state
        setUsers(prev => prev.map(u => 
          u.user_id === userId 
            ? { ...u, department_id: newDepartmentId, department_name: response.data.department_name }
            : u
        ))
        
        // Update selected user if it's the current one
        if (selectedUser && selectedUser.user_id === userId) {
          setSelectedUser(prev => ({ 
            ...prev, 
            department_id: newDepartmentId, 
            department_name: response.data.department_name 
          }))
        }
        
        setSuccessMessage('Department access updated successfully')
        setShowSuccessModal(true)
      }
    } catch (e) {
      setError(e.message || 'Failed to update department access')
    } finally {
      setIsUpdatingDepartment(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.role_id || !createForm.password) {
      setCreateError('All fields are required')
      return
    }
    
    if (createForm.password !== createForm.confirmPassword) {
      setCreateError('Passwords do not match')
      return
    }
    
    if (createForm.password.length < 6) {
      setCreateError('Password must be at least 6 characters long')
      return
    }

    try {
      setIsCreating(true)
      setCreateError('')
      
      const userData = {
        name: createForm.name.trim(),
        email: createForm.email.trim().toLowerCase(),
        role_id: parseInt(createForm.role_id),
        department_id: createForm.department_id ? parseInt(createForm.department_id) : null,
        password: createForm.password
      }
      
      // Call API to create user
      const response = await api.post(endpoints.users, userData)
      
      // Reload users to get fresh data with proper pagination
      setSuccessMessage('User created successfully')
      setShowSuccessModal(true)
      setShowCreateModal(false)
      resetCreateForm()
      
      // Reload users list
      await loadUsers(1, false)
    } catch (e) {
      setCreateError(e.message || 'Failed to create user')
    } finally {
      setIsCreating(false)
    }
  }

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      email: '',
      role_id: '',
      department_id: '',
      password: '',
      confirmPassword: ''
    })
    setCreateError('')
  }

  // Show loading or auth check
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
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
          <p className="text-gray-600">Please log in to access user management.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <>
        <style>{`
          .tab-button {
            transition: all 0.2s ease-in-out !important;
            border: none !important;
            border-bottom: none !important;
            outline: none !important;
            box-shadow: none !important;
          }
          
          input[type="text"], input[type="search"], select {
            border-color: #d1d5db !important;
            outline: none !important;
            box-shadow: none !important;
          }
          
          input[type="text"]:focus, input[type="search"]:focus, select:focus {
            border-color: #9ca3af !important;
            outline: none !important;
            box-shadow: none !important;
          }
          
          select {
            appearance: none !important;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e") !important;
            background-position: right 8px center !important;
            background-repeat: no-repeat !important;
            background-size: 16px !important;
            padding-right: 40px !important;
            cursor: pointer !important;
          }
        `}</style>
        <div className={`absolute top-16 bottom-0 bg-gray-50 rounded-tl-3xl overflow-hidden transition-all duration-500 ease-in-out ${
          sidebarExpanded ? 'left-64 right-0' : 'left-20 right-0'
        }`} style={{ marginTop: '0px' }}>
          <div className="w-full pr-2 pl-2 transition-all duration-500 ease-in-out" style={{ marginTop: '0px' }}>

            {/* Tabs and Add User Button */}
            <div className="absolute top-0 right-0 z-40 bg-gray-50 transition-all duration-500 ease-in-out left-0">
              <div className="px-8 bg-gray-50">
                <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200">
                  <nav className="flex space-x-8">
                    <div className="py-2 px-4 font-medium text-sm text-red-600 border-b-2 border-red-600">
                      All Users
                    </div>
                    <div className="py-2 px-4 font-medium text-sm text-gray-500">
                      Faculty Approval
                    </div>
                  </nav>
                  
                  {/* Add User Button aligned with navigation */}
                  <button
                    className="inline-flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                    disabled
                  >
                    <PlusIcon className="h-5 w-5 stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="pt-16 pb-6 transition-all duration-500 ease-in-out" style={{ height: 'calc(100vh - 80px)' }}>
              <div className={`grid grid-cols-1 lg:grid-cols-4 gap-8 px-8 h-full transition-all duration-500 ease-in-out`}>
                {/* List */}
                <div className={`lg:col-span-3 h-full`}>
                  {/* Controls outside the table */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative flex-1">
                      <div className="w-full h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                    </div>
                    <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
                    <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse"></div>
                    <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse"></div>
                  </div>

                  <TableSkeleton rows={8} columns={5} />
                </div>

                {/* Side actions / User details */}
                <div className="lg:col-span-1">
                  <SidebarSkeleton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`
          .tab-button {
            transition: all 0.2s ease-in-out !important;
            border: none !important;
            border-bottom: none !important;
            outline: none !important;
            box-shadow: none !important;
          }
          
          /* Remove any red styling from search inputs */
          input[type="text"], input[type="search"], select {
            border-color: #d1d5db !important;
            outline: none !important;
            box-shadow: none !important;
          }
          
          input[type="text"]:focus, input[type="search"]:focus, select:focus {
            border-color: #9ca3af !important;
            outline: none !important;
            box-shadow: none !important;
          }
          
          /* Clean dropdown styling */
          select {
            appearance: none !important;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e") !important;
            background-position: right 8px center !important;
            background-repeat: no-repeat !important;
            background-size: 16px !important;
            padding-right: 40px !important;
            cursor: pointer !important;
          }
          
          select option {
            background-color: white !important;
            color: #374151 !important;
            padding: 12px 16px !important;
            border: none !important;
            font-size: 14px !important;
            line-height: 1.5 !important;
          }
          
          select option:hover {
            background-color: #f3f4f6 !important;
          }
          
          select option:checked {
            background-color: #e5e7eb !important;
            color: #111827 !important;
            font-weight: 500 !important;
          }
        `}</style>
      <div className={`absolute top-16 bottom-0 bg-gray-50 rounded-tl-3xl overflow-hidden transition-all duration-500 ease-in-out ${
        sidebarExpanded ? 'left-64 right-0' : 'left-20 right-0'
      }`} style={{ marginTop: '0px' }}>
        <div className="w-full pr-2 pl-2 transition-all duration-500 ease-in-out" style={{ marginTop: '0px' }}>

          {/* Tabs and Add User Button */}
          <div className="absolute top-0 right-0 z-40 bg-gray-50 transition-all duration-500 ease-in-out left-0">
            <div className="px-8 bg-gray-50">
              <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200">
                <nav className="flex space-x-8">
                  <TabButton isActive={activeTab === 'all'} onClick={() => setActiveTab('all')}>
                    All Users
                  </TabButton>
                  <TabButton isActive={activeTab === 'faculty'} onClick={() => setActiveTab('faculty')}>
                    Faculty Approval
                  </TabButton>
                </nav>
                
                {/* Add User Button aligned with navigation */}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  title="Add User"
                >
                  <PlusIcon className="h-5 w-5 stroke-[3]" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="pt-16 pb-6 transition-all duration-500 ease-in-out" style={{ height: 'calc(100vh - 80px)' }}>
            <div className={`grid grid-cols-1 lg:grid-cols-4 gap-8 px-8 h-full transition-all duration-500 ease-in-out`}>
              {/* List */}
              <div className={`lg:col-span-3 h-full`}>
                {/* Controls outside the table */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search name or email"
                      className="w-full px-3 py-2 pl-9 border rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 border-gray-300"
                    />
                    <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
                  </div>
                  {activeTab === 'all' && (
                    <>
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-2 py-2 border rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 border-gray-300 text-sm w-32"
                      >
                        <option value="">All Users</option>
                        {roles
                          .filter(role => {
                            // Exclude Faculty from role filter (case-insensitive) since it has its own tab
                            // We'll add Faculty option separately below
                            const roleName = String(role.name || '').toUpperCase().trim()
                            return roleName !== 'FACULTY'
                          })
                          .map(role => (
                            <option key={role.role_id} value={role.role_id}>
                              {formatRoleName(role.name)}
                            </option>
                          ))}
                        <option value="faculty">Faculty</option>
                      </select>
                      
                      <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="px-2 py-2 border rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 border-gray-300 text-sm w-28"
                      >
                        <option value="">All Departments</option>
                        {departments.map(dept => (
                          <option key={dept.department_id} value={dept.department_id}>
                            {dept.department_abbreviation || dept.name}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="px-2 py-2 border rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 border-gray-300 text-sm w-28"
                  >
                    <option value="created_desc">Newest</option>
                    <option value="created_asc">Oldest</option>
                    <option value="name_asc">Name A–Z</option>
                    <option value="name_desc">Name Z–A</option>
                    <option value="approved_first">Approved First</option>
                    <option value="pending_first">Pending First</option>
                  </select>
                  
                  {/* User count display */}
                  <div className="flex items-center space-x-3 ml-4">
                    {users.length > 0 && (
                      <div className="text-sm text-red-600 font-medium">
                        Showing {filteredUsers.length} of {totalUsers} users
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300">
                  {filteredUsers.length > 0 ? (
                    <>
                      <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                              </th>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                              </th>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                              </th>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Department
                              </th>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.map(u => {
                              const userName = `${u.first_name || ''} ${u.last_name || ''} ${u.middle_name || ''}`.trim() || u.email || 'Unnamed User'
                              const userInitial = userName.charAt(0).toUpperCase()
                              return (
                                <tr
                                  key={u.user_id}
                                  onClick={() => setSelectedUser(u)}
                                  className={`hover:bg-gray-50 cursor-pointer ${selectedUser?.user_id === u.user_id ? 'bg-red-50' : ''}`}
                                >
                                  <td className="px-8 py-3">
                                    <div className="text-sm font-medium text-gray-900 break-words">{userName}</div>
                                  </td>
                                  <td className="px-8 py-3">
                                    <div className="text-sm text-gray-700">{u.email}</div>
                                  </td>
                                  <td className="px-8 py-3">
                                    <div className="text-sm text-gray-700">{formatRoleName(u.role_name) || u.role_id || '—'}</div>
                                  </td>
                                  <td className="px-8 py-3">
                                    <div className="text-sm text-gray-700">
                                      {u.department_name ? (
                                        <span className="inline-flex items-center gap-1">
                                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                          {u.department_abbreviation || u.department_name}
                                        </span>
                                      ) : (
                                        '—'
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-8 py-3">
                                    <span className={`text-xs font-semibold ${u.is_approved ? 'text-green-600' : 'text-yellow-600'}`}>
                                      {u.is_approved ? 'Approved' : 'Pending'}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      {/* Load More Button */}
                      {hasMore && (
                        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                          <button
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                          >
                            {loadingMore ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Loading...</span>
                              </>
                            ) : (
                              <span>Load More Users</span>
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center py-16">
                      <div className="text-center">
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading users...</h3>
                            <p className="text-gray-500">Please wait while we fetch the data.</p>
                          </>
                        ) : (
                          <>
                            {activeTab === 'faculty' ? (
                              <UserPlusIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                            ) : (
                              <UsersIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                            )}
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                            <p className="text-gray-500">Try adjusting your filters or {hasMore && 'load more users'}.</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Side actions / User details */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-300 h-[calc(100vh-200px)] overflow-y-auto">
                  {selectedUser ? (
                    <div className="space-y-4 pb-8">
                      <div className="flex items-center gap-4">
                        {(() => {
                          const selectedUserName = `${selectedUser.first_name || ''} ${selectedUser.last_name || ''} ${selectedUser.middle_name || ''}`.trim() || selectedUser.email || 'Unnamed User'
                          const selectedUserInitial = selectedUserName.charAt(0).toUpperCase()
                          return (
                            <>
                              <div className="h-16 w-16 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center ring-1 ring-gray-300">
                                {selectedUser.profile_pic ? (
                                  <img src={selectedUser.profile_pic} alt={`${selectedUserName} avatar`} className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-base font-semibold text-gray-500">
                                    {selectedUserInitial}
                                  </span>
                                )}
                              </div>
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900">{selectedUserName}</h4>
                                <p className="text-sm text-gray-600">{selectedUser.email}</p>
                                <p className="text-xs text-gray-500">Role: {formatRoleName(selectedUser.role_name) || selectedUser.role_id || '—'}</p>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                      
                      {selectedUser.department_name ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Department:</span>
                          <span className="text-xs text-gray-700 font-medium">
                            {selectedUser.department_abbreviation || selectedUser.department_name}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No department assigned</p>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-600">Status</span>
                          <span className={`text-sm font-semibold ${selectedUser.is_approved ? 'text-green-600' : 'text-yellow-600'}`}>
                            {selectedUser.is_approved ? 'Approved' : 'Pending'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-600">Created</span>
                          <span className="text-sm text-gray-800">{formatDateTime(selectedUser.created_at)}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-600">Updated</span>
                          <span className="text-sm text-gray-800">{formatDateTime(selectedUser.updated_at)}</span>
                        </div>
                      </div>

                                            {/* Department Access Control */}
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <h5 className="text-sm font-semibold text-gray-800">Department Access Control</h5>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Accessible Department
                            </label>
                            <div className="relative">
                              <select
                                value={selectedUser.department_id || ''}
                                onChange={(e) => handleDepartmentChange(selectedUser.user_id, e.target.value)}
                                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-colors"
                                disabled={!selectedUser.is_approved || isUpdatingDepartment[selectedUser.user_id]}
                              >
                                <option value="">Select Department (Optional)</option>
                                {departments.map(dept => (
                                  <option key={dept.department_id} value={dept.department_id}>
                                    {dept.department_abbreviation || dept.name}
                                  </option>
                                ))}
                              </select>
                              {isUpdatingDepartment[selectedUser.user_id] && (
                                <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg">
                                                   <div className="flex items-center gap-2 text-sm text-red-600">
                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                   <span>Updating...</span>
                 </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {!selectedUser.is_approved && (
                        <div className="mt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <h6 className="text-sm font-semibold text-gray-800">Pending Approval</h6>
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleApprove(selectedUser.user_id)}
                              disabled={!!isApproving[selectedUser.user_id]}
                              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              {isApproving[selectedUser.user_id] ? 'Approving…' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleReject(selectedUser.user_id)}
                              disabled={!!isRejecting[selectedUser.user_id]}
                              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                              {isRejecting[selectedUser.user_id] ? 'Rejecting...' : 'Reject'}
                            </button>
                          </div>
                        </div>
                      )}

                      {error && (
                        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                            <div className="flex-1">
                              <h6 className="text-sm font-semibold text-gray-800 mb-1">Error</h6>
                              <p className="text-sm text-gray-700 leading-relaxed">{error}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-10">
                      <UsersIcon className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-sm">Select a user from the list to view details here.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                  setShowSuccessModal(false)
                  setSuccessMessage('')
                }}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  resetCreateForm()
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  id="role"
                  value={createForm.role_id}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, role_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select a role</option>
                  {roles.map(role => (
                    <option key={role.role_id} value={role.role_id}>
                      {formatRoleName(role.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  id="department"
                  value={createForm.department_id}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, department_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select a department (optional)</option>
                  {departments.map(dept => (
                    <option key={dept.department_id} value={dept.department_id}>
                      {dept.department_abbreviation || dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  id="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter password"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={createForm.confirmPassword}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Confirm password"
                />
              </div>

              {createError && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {createError}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    resetCreateForm()
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {isCreating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default UserManagement 