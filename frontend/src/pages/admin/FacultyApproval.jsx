import React, { useEffect, useState } from 'react'
import { ShieldCheckIcon, MagnifyingGlassIcon, UserIcon } from '@heroicons/react/24/solid'
import { enhancedApi } from '../../utils/api'
// Removed prefetch - using lazy loading instead

const FacultyApproval = () => {
  const [faculty, setFaculty] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [isApproving, setIsApproving] = useState({})

  const formatDateTime = (value) => {
    if (!value) return '—'
    try {
      return new Date(value).toLocaleString()
    } catch (_) {
      return String(value)
    }
  }

  useEffect(() => {
    let isMounted = true

    const loadFaculty = async () => {
      try {
        setLoading(true)
        setError('')
        
        const response = await enhancedApi.getUsers()
        
        if (!isMounted) return
        
        // Handle different response structures
        // Backend returns: { success: true, data: { users: [...], pagination: {...} } }
        // enhancedApi.getUsers() returns response.data, so we get: { success: true, data: { users: [...], pagination: {...} } }
        let users = []
        if (Array.isArray(response)) {
          users = response
        } else if (response?.data?.users && Array.isArray(response.data.users)) {
          users = response.data.users
        } else if (response?.data && Array.isArray(response.data)) {
          users = response.data
        } else if (response?.users && Array.isArray(response.users)) {
          users = response.users
        } else {
          console.warn('Unexpected response structure:', response)
          users = []
        }
        
        if (!isMounted) return
        
        // Filter for faculty users with pending approval only
        const facultyUsers = users.filter(user => {
          // Get role information from multiple possible fields
          const roleName = (user.role_name || user.role || '').toString().trim().toUpperCase()
          const roleId = user.role_id ? Number(user.role_id) : null
          
          // Check if user is faculty
          // Priority: role_name is most reliable, use role_id only as fallback
          let isFaculty = false
          
          // First, check role_name (most reliable indicator)
          if (roleName) {
            const normalizedRoleName = roleName.replace(/[_\s-]/g, '')
            // Check for faculty role name variations
            const isFacultyByName = normalizedRoleName === 'FACULTY' || 
                                   normalizedRoleName === 'FACULTYMEMBER' ||
                                   roleName === 'FACULTY' ||
                                   roleName === 'FACULTY MEMBER' ||
                                   roleName === 'FACULTY_MEMBER'
            
            // If role_name explicitly indicates non-faculty, exclude even if role_id matches
            const isNonFacultyRole = normalizedRoleName.includes('ADMIN') ||
                                     normalizedRoleName.includes('DEAN') ||
                                     normalizedRoleName.includes('STAFF') ||
                                     normalizedRoleName.includes('PROGRAMCHAIR') ||
                                     normalizedRoleName.includes('PROGRAM') ||
                                     normalizedRoleName.includes('CHAIR')
            
            if (isNonFacultyRole) {
              // Explicitly not faculty - exclude regardless of role_id
              isFaculty = false
            } else if (isFacultyByName) {
              // Explicitly faculty by name
              isFaculty = true
            } else if (roleId === 2) {
              // If role_name is unclear but role_id is 2, trust role_id
              isFaculty = true
            }
          } else {
            // No role_name, fall back to role_id
            if (roleId !== null && roleId !== undefined) {
              isFaculty = roleId === 2
            }
          }
          
          // Only show faculty with pending approval (is_approved is false, null, or undefined)
          const isPending = user.is_approved === false || user.is_approved === null || user.is_approved === undefined
          
          // Must be faculty AND pending
          const shouldInclude = isFaculty && isPending
          
          // Debug logging for non-faculty users (only log if they're pending, to reduce noise)
          if (!shouldInclude && isPending && roleName) {
            console.debug('[FacultyApproval] Non-faculty user filtered out:', {
              name: user.name || user.email,
              role_name: user.role_name || user.role,
              role_id: user.role_id,
              is_approved: user.is_approved
            })
          }
          
          return shouldInclude
        })
        
        console.log(`[FacultyApproval] Filtered ${facultyUsers.length} faculty users from ${users.length} total users`)
        
        if (isMounted) {
          setFaculty(facultyUsers)
        }
      } catch (e) {
        if (isMounted) {
          console.error('Error loading faculty:', e)
          setError(e.message || 'Failed to load faculty')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    // Use requestIdleCallback for non-blocking load, fallback to immediate
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadFaculty, { timeout: 1000 })
    } else {
      loadFaculty()
    }
    
    return () => {
      isMounted = false
    }
  }, [])

  // Filter faculty by search query only (all are pending by default)
  const filteredFaculty = faculty.filter(user => {
    const q = query.trim().toLowerCase()
    const matchesQuery = !q || 
      (user.name || '').toLowerCase().includes(q) ||
      (user.email || '').toLowerCase().includes(q)
    
    return matchesQuery
  })

  const handleApprove = async (userId) => {
    try {
      setIsApproving(prev => ({ ...prev, [userId]: true }))
      await enhancedApi.approveUser(userId)
      
      // Remove approved user from the list (since we only show pending)
      setFaculty(prev => prev.filter(user => user.user_id !== userId))
    } catch (e) {
      setError(e.message || 'Failed to approve faculty')
    } finally {
      setIsApproving(prev => ({ ...prev, [userId]: false }))
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Faculty Approval</h1>
          <p className="text-gray-600">Manage faculty member approvals and access</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search pending faculty by name or email..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Faculty List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredFaculty.length === 0 ? (
            <div className="text-center py-12">
              <UserIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pending faculty found</h3>
              <p className="text-gray-500">
                {query ? 'Try adjusting your search criteria.' : 'No faculty members are pending approval.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Faculty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registered
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFaculty.map((user) => (
                    <tr key={user.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {user.profile_pic ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={user.profile_pic}
                                alt={user.name}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <UserIcon className="h-6 w-6 text-gray-600" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">ID: {user.user_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.department_name || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(user.user_id)}
                            disabled={isApproving[user.user_id]}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ShieldCheckIcon className="h-4 w-4 mr-1" />
                            {isApproving[user.user_id] ? 'Approving...' : 'Approve'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        {filteredFaculty.length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-800">
                <strong>{filteredFaculty.length}</strong> pending faculty member{filteredFaculty.length !== 1 ? 's' : ''} found
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FacultyApproval 