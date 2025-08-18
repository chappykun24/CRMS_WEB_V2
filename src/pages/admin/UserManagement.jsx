import React, { useEffect, useMemo, useState } from 'react'
import { Users, UserCheck, Search, ShieldCheck, Ban } from 'lucide-react'
import { useSidebar } from '../../contexts/SidebarContext'
import api, { enhancedApi, endpoints } from '../../utils/api'

const TabButton = ({ isActive, onClick, children }) => (
  <button
    onClick={onClick}
    className={`tab-button py-4 px-4 font-medium text-sm ${
      isActive ? 'active text-primary-600' : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    {children}
  </button>
)

const UserManagement = () => {
  const { sidebarExpanded } = useSidebar()
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('userMgmtActiveTab') || 'all')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [isApproving, setIsApproving] = useState({})
  const [roles, setRoles] = useState([])
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('') // '', 'approved', 'pending'
  const [selectedUser, setSelectedUser] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [sortOption, setSortOption] = useState('created_desc')

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

  useEffect(() => {
    localStorage.setItem('userMgmtActiveTab', activeTab)
    const event = new CustomEvent('userMgmtTabChanged', { detail: { activeTab } })
    window.dispatchEvent(event)
    // Remove role filter when on Faculty Approval tab
    if (activeTab === 'pending' && roleFilter) {
      setRoleFilter('')
    }
    // Ensure default status is All when switching tabs
    if (statusFilter !== '') {
      setStatusFilter('')
    }
  }, [activeTab])

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true)
        const data = await enhancedApi.getUsers()
        setUsers(Array.isArray(data) ? data : [])
      } catch (e) {
        setError(e.message || 'Failed to load users')
      } finally {
        setLoading(false)
      }
    }
    loadUsers()
  }, [])

  const facultyRoleId = useMemo(() => {
    const r = roles.find((r) => String(r.name).toUpperCase() === 'FACULTY')
    return r ? r.role_id : null
  }, [roles])


  useEffect(() => {
    const loadRoles = async () => {
      try {
        const res = await api.get(endpoints.roles)
        setRoles(Array.isArray(res.data) ? res.data : [])
      } catch (_) {
        // silently ignore
      }
    }
    loadRoles()
  }, [])

  // If currently selected role is FACULTY, clear it from filter
  useEffect(() => {
    if (!roles || roles.length === 0 || !roleFilter) return
    const facultyRole = roles.find(r => String(r.name).toUpperCase() === 'FACULTY')
    if (facultyRole && String(facultyRole.role_id) === String(roleFilter)) {
      setRoleFilter('')
    }
  }, [roles])

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = users
    // When on Faculty Approval tab, always show only Faculty users
    if (activeTab === 'pending') {
      list = list.filter(u => {
        const roleName = (u.role_name || '').toString().toUpperCase()
        const isFacultyByName = roleName === 'FACULTY'
        const facultyId = facultyRoleId ?? 2
        const isFacultyById = Number(u.role_id) === Number(facultyId)
        return isFacultyByName || isFacultyById
      })
    }
    // Exclude faculty by default on All Users tab
    if (activeTab === 'all') {
      list = list.filter(u => {
        const roleName = (u.role_name || '').toString().toUpperCase()
        const isFacultyByName = roleName === 'FACULTY'
        const facultyId = facultyRoleId ?? 2
        const isFacultyById = Number(u.role_id) === Number(facultyId)
        return !(isFacultyByName || isFacultyById)
      })
    }
    // Status filter
    if (statusFilter === 'approved') {
      list = list.filter(u => !!u.is_approved)
    } else if (statusFilter === 'pending') {
      list = list.filter(u => !u.is_approved)
    }
    // Role filter (only on All Users tab)
    if (activeTab === 'all' && roleFilter) {
      const roleId = parseInt(roleFilter, 10)
      list = list.filter(u => Number(u.role_id) === roleId)
    }
    // Text query
    if (q) {
      list = list.filter(u => (
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      ))
    }
    // Sorting
    const sorted = [...list]
    switch (sortOption) {
      case 'created_asc':
        sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        break
      case 'name_asc':
        sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        break
      case 'name_desc':
        sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''))
        break
      case 'approved_first':
        sorted.sort((a, b) => Number(b.is_approved) - Number(a.is_approved))
        break
      case 'pending_first':
        sorted.sort((a, b) => Number(a.is_approved) - Number(b.is_approved))
        break
      case 'created_desc':
      default:
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        break
    }
    return sorted
  }, [users, query, activeTab, roleFilter, statusFilter, facultyRoleId, sortOption])

  const handleApprove = async (userId) => {
    try {
      setIsApproving(prev => ({ ...prev, [userId]: true }))
      await api.patch(endpoints.userApprove(userId))
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading users...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>
        {`
          .tab-button { transition: all 0.2s ease-in-out !important; border-bottom: 2px solid transparent !important; }
          .tab-button.active { border-bottom: 2px solid #dc2626 !important; }
          .tab-button:focus { outline: none !important; box-shadow: none !important; }
          .tab-button:focus-visible { outline: none !important; box-shadow: none !important; }
        `}
      </style>
      <div className={`absolute top-16 bottom-0 bg-white rounded-tl-lg overflow-hidden transition-all duration-500 ease-in-out ${
          sidebarExpanded ? 'left-64 right-0' : 'left-20 right-0'
        }`} style={{ marginTop: '0px' }}>
        <div className="w-full pr-2 pl-2 transition-all duration-500 ease-in-out" style={{ marginTop: '0px' }}>

          {/* Tabs */}
          <div className="absolute top-0 right-0 z-40 bg-transparent transition-all duration-500 ease-in-out left-0">
            <div className="px-8 bg-transparent">
              <nav className="flex space-x-8 bg-transparent border-b border-gray-200">
                <TabButton isActive={activeTab === 'all'} onClick={() => setActiveTab('all')}>
                  All Users
                </TabButton>
                <TabButton isActive={activeTab === 'pending'} onClick={() => setActiveTab('pending')}>
                  Faculty Approval
                </TabButton>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="pt-16 pb-6 transition-all duration-500 ease-in-out" style={{ height: 'calc(100vh - 80px)' }}>
            <div className={`grid grid-cols-1 lg:grid-cols-4 gap-8 px-8 h-full`}>
              {/* List */}
              <div className={`lg:col-span-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 h-full`}>
                <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300">
                  <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search name or email"
                        className="w-full px-3 py-2 pl-9 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 border-gray-300"
                      />
                      <Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
                    </div>
                    {activeTab === 'all' && (
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-3 py-2 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 border-gray-300"
                      >
                        <option value="">All Users</option>
                        {roles
                          .filter(r => String(r.name).toUpperCase() !== 'FACULTY')
                          .map(r => (
                            <option key={r.role_id} value={r.role_id}>{formatRoleName(r.name)}</option>
                          ))}
                      </select>
                    )}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 border-gray-300"
                    >
                      <option value="">All Status</option>
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                    </select>
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value)}
                      className="px-3 py-2 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 border-gray-300"
                    >
                      <option value="created_desc">Newest</option>
                      <option value="created_asc">Oldest</option>
                      <option value="name_asc">Name A–Z</option>
                      <option value="name_desc">Name Z–A</option>
                      <option value="approved_first">Approved First</option>
                      <option value="pending_first">Pending First</option>
                    </select>
                  </div>
                  {filteredUsers.length > 0 ? (
                    <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile</th>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredUsers.map(u => (
                            <tr
                              key={u.user_id}
                              onClick={() => setSelectedUser(u)}
                              className={`hover:bg-gray-50 cursor-pointer ${selectedUser?.user_id === u.user_id ? 'bg-red-50' : ''}`}
                            >
                              <td className="px-6 py-3">
                                <div className="h-10 w-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center ring-1 ring-gray-300">
                                  {u.profile_pic ? (
                                    <img src={u.profile_pic} alt={`${u.name || 'User'} avatar`} className="h-full w-full object-cover" />
                                  ) : (
                                    <span className="text-sm font-semibold text-gray-500">
                                      {(u.name || u.email || '?').toString().trim().charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-8 py-3">
                                <div className="text-sm font-medium text-gray-900 break-words">{u.name}</div>
                              </td>
                              <td className="px-8 py-3">
                                <div className="text-sm text-gray-700">{u.email}</div>
                              </td>
                              <td className="px-8 py-3">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${u.is_approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {u.is_approved ? 'Approved' : 'Pending'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center py-16">
                      <div className="text-center">
                        {activeTab === 'pending' ? (
                          <UserCheck className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                        ) : (
                          <Users className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                        )}
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                        <p className="text-gray-500">Try adjusting your filters.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Side actions / User details */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-4 sticky top-4 border border-gray-300">
                  {selectedUser ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center ring-1 ring-gray-300">
                          {selectedUser.profile_pic ? (
                            <img src={selectedUser.profile_pic} alt={`${selectedUser.name || 'User'} avatar`} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-base font-semibold text-gray-500">
                              {(selectedUser.name || selectedUser.email || '?').toString().trim().charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{selectedUser.name || 'Unnamed User'}</h4>
                          <p className="text-sm text-gray-600">{selectedUser.email}</p>
                          <p className="text-xs text-gray-500">Role: {formatRoleName(selectedUser.role_name) || selectedUser.role_id || '—'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Status</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${selectedUser.is_approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {selectedUser.is_approved ? 'Approved' : 'Pending'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">User ID</span>
                          <span className="text-gray-800">{selectedUser.user_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Created</span>
                          <span className="text-gray-800">{formatDateTime(selectedUser.created_at)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Updated</span>
                          <span className="text-gray-800">{formatDateTime(selectedUser.updated_at)}</span>
                        </div>
                      </div>

                      {!selectedUser.is_approved && (
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => handleApprove(selectedUser.user_id)}
                            disabled={!!isApproving[selectedUser.user_id]}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                          >
                            {isApproving[selectedUser.user_id] ? 'Approving…' : 'Approve'}
                          </button>
                          <button
                            onClick={() => alert('Reject handler not implemented yet')}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-white text-red-600 border border-red-300 hover:bg-red-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {error && <div className="text-red-600 text-sm">{error}</div>}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-10">
                      <Users className="h-12 w-12 text-gray-300 mb-3" />
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
    </>
  )
}

export default UserManagement 