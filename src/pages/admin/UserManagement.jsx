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
    // Tab constraint
    if (activeTab === 'pending') {
      list = list.filter(u => !u.is_approved)
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
    return list
  }, [users, query, activeTab, roleFilter, statusFilter, facultyRoleId])

  const handleApprove = async (userId) => {
    try {
      setIsApproving(prev => ({ ...prev, [userId]: true }))
      await api.patch(endpoints.userApprove(userId))
      setUsers(prev => prev.map(u => (u.user_id === userId ? { ...u, is_approved: true } : u)))
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
        `}
      </style>
      <div className={`absolute top-20 bottom-0 bg-white overflow-hidden transition-all duration-500 ease-in-out ${
          sidebarExpanded ? 'left-64 right-0' : 'left-20 right-0'
        }`} style={{ marginTop: '20px' }}>
        <div className="w-full pr-2 pl-2 transition-all duration-500 ease-in-out" style={{ marginTop: '20px' }}>

          {/* Tabs */}
          <div className="absolute top-0 right-0 z-40 bg-transparent transition-all duration-500 ease-in-out left-0">
            <div className="px-8 bg-transparent">
              <nav className="flex space-x-8 bg-transparent">
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
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 px-8 h-full">
              {/* List */}
              <div className="lg:col-span-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 h-full">
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
                  </div>
                  {filteredUsers.length > 0 ? (
                    <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved</th>
                            <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredUsers.map(u => (
                            <tr key={u.user_id} className="hover:bg-gray-50">
                              <td className="px-8 py-6">
                                <div className="text-sm font-medium text-gray-900 break-words">{u.name}</div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="text-sm text-gray-700">{u.email}</div>
                              </td>
                              <td className="px-8 py-6">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${u.is_approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {u.is_approved ? 'Approved' : 'Pending'}
                                </span>
                              </td>
                              <td className="px-8 py-6 text-sm font-medium">
                                <div className="flex space-x-3">
                                  {!u.is_approved ? (
                                    <button
                                      onClick={() => handleApprove(u.user_id)}
                                      disabled={!!isApproving[u.user_id]}
                                      className="text-primary-600 hover:text-primary-900 p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                                      title="Approve"
                                    >
                                      {isApproving[u.user_id] ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                                      ) : (
                                        <ShieldCheck className="h-5 w-5" />
                                      )}
                                    </button>
                                  ) : (
                                    <button className="text-gray-400 p-1 cursor-not-allowed" title="Already approved">
                                      <ShieldCheck className="h-5 w-5" />
                                    </button>
                                  )}
                                  <button className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-gray-100" title="Disable">
                                    <Ban className="h-5 w-5" />
                                  </button>
                                </div>
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

              {/* Side actions (reserved for future: add user, edit) */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-4 sticky top-4 border border-gray-300">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 text-left">
                    {activeTab === 'pending' ? 'Approval Queue' : 'User Actions'}
                  </h4>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p>Search and approve faculty accounts. More actions coming soon.</p>
                    {error && (
                      <div className="text-red-600 text-sm">{error}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default UserManagement 