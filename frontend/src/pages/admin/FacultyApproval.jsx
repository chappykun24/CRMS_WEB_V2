import React, { useEffect, useState } from 'react'
import { ShieldCheckIcon, NoSymbolIcon, MagnifyingGlassIcon, UserIcon } from '@heroicons/react/24/solid'
import { enhancedApi } from '../../utils/api'

const FacultyApproval = () => {
  const [faculty, setFaculty] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('') // '', 'approved', 'pending'
  const [isApproving, setIsApproving] = useState({})
  const [isRejecting, setIsRejecting] = useState({})

  const formatDateTime = (value) => {
    if (!value) return '—'
    try {
      return new Date(value).toLocaleString()
    } catch (_) {
      return String(value)
    }
  }

  useEffect(() => {
    const loadFaculty = async () => {
      try {
        setLoading(true)
        const data = await enhancedApi.getUsers()
        // Filter for faculty users only
        const facultyUsers = Array.isArray(data) ? data.filter(user => {
          const roleName = (user.role_name || '').toString().toUpperCase()
          return roleName === 'FACULTY' || Number(user.role_id) === 2
        }) : []
        setFaculty(facultyUsers)
      } catch (e) {
        setError(e.message || 'Failed to load faculty')
      } finally {
        setLoading(false)
      }
    }
    loadFaculty()
  }, [])

  const filteredFaculty = faculty.filter(user => {
    const q = query.trim().toLowerCase()
    const matchesQuery = !q || 
      (user.name || '').toLowerCase().includes(q) ||
      (user.email || '').toLowerCase().includes(q)
    
    const matchesStatus = !statusFilter || 
      (statusFilter === 'approved' && user.is_approved) ||
      (statusFilter === 'pending' && !user.is_approved)
    
    return matchesQuery && matchesStatus
  })

  const handleApprove = async (userId) => {
    try {
      setIsApproving(prev => ({ ...prev, [userId]: true }))
      await enhancedApi.approveUser(userId)
      
      // Update local state
      setFaculty(prev => prev.map(user => 
        user.user_id === userId 
          ? { ...user, is_approved: true }
          : user
      ))
    } catch (e) {
      setError(e.message || 'Failed to approve faculty')
    } finally {
      setIsApproving(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleReject = async (userId) => {
    try {
      setIsRejecting(prev => ({ ...prev, [userId]: true }))
      await enhancedApi.rejectUser(userId)
      
      // Update local state
      setFaculty(prev => prev.map(user => 
        user.user_id === userId 
          ? { ...user, is_approved: false }
          : user
      ))
    } catch (e) {
      setError(e.message || 'Failed to reject faculty')
    } finally {
      setIsRejecting(prev => ({ ...prev, [userId]: false }))
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
                  placeholder="Search faculty by name or email..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
              </select>
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">No faculty found</h3>
              <p className="text-gray-500">
                {query || statusFilter ? 'Try adjusting your search criteria.' : 'No faculty members have been registered yet.'}
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
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_approved 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.is_approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {!user.is_approved ? (
                            <button
                              onClick={() => handleApprove(user.user_id)}
                              disabled={isApproving[user.user_id]}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ShieldCheckIcon className="h-4 w-4 mr-1" />
                              {isApproving[user.user_id] ? 'Approving...' : 'Approve'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReject(user.user_id)}
                              disabled={isRejecting[user.user_id]}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <NoSymbolIcon className="h-4 w-4 mr-1" />
                              {isRejecting[user.user_id] ? 'Rejecting...' : 'Reject'}
                            </button>
                          )}
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
                <strong>{filteredFaculty.length}</strong> faculty member{filteredFaculty.length !== 1 ? 's' : ''} found
                {statusFilter && (
                  <span className="ml-2">
                    ({filteredFaculty.filter(u => u.is_approved).length} approved, {filteredFaculty.filter(u => !u.is_approved).length} pending)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FacultyApproval 