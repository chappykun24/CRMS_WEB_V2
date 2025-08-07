import React, { useState } from 'react'
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  Mail,
  Phone,
  Calendar,
  MoreHorizontal
} from 'lucide-react'

const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')

  const users = [
    {
      id: 1,
      name: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@university.edu',
      role: 'FACULTY',
      department: 'Computer Science',
      status: 'Active',
      lastLogin: '2 hours ago',
      phone: '+1 (555) 123-4567'
    },
    {
      id: 2,
      name: 'John Smith',
      email: 'john.smith@university.edu',
      role: 'STAFF',
      department: 'Administration',
      status: 'Active',
      lastLogin: '1 day ago',
      phone: '+1 (555) 234-5678'
    },
    {
      id: 3,
      name: 'Prof. Michael Chen',
      email: 'michael.chen@university.edu',
      role: 'FACULTY',
      department: 'Engineering',
      status: 'Inactive',
      lastLogin: '1 week ago',
      phone: '+1 (555) 345-6789'
    },
    {
      id: 4,
      name: 'Dr. Emily Davis',
      email: 'emily.davis@university.edu',
      role: 'DEAN',
      department: 'Arts & Sciences',
      status: 'Active',
      lastLogin: '3 hours ago',
      phone: '+1 (555) 456-7890'
    }
  ]

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === 'all' || user.role === selectedRole
    return matchesSearch && matchesRole
  })

  const getRoleBadge = (role) => {
    const roleColors = {
      'ADMIN': 'bg-red-100 text-red-800',
      'DEAN': 'bg-purple-100 text-purple-800',
      'FACULTY': 'bg-blue-100 text-blue-800',
      'STAFF': 'bg-green-100 text-green-800',
      'PROGRAM_CHAIR': 'bg-orange-100 text-orange-800'
    }
    return `badge ${roleColors[role] || 'bg-gray-100 text-gray-800'}`
  }

  const getStatusBadge = (status) => {
    return status === 'Active' 
      ? 'badge badge-success' 
      : 'badge badge-warning'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <p className="page-subtitle">Manage system users, roles, and permissions.</p>
      </div>

      {/* Actions Bar */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field input-with-icon"
              />
            </div>

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="input-field"
            >
              <option value="all">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="DEAN">Dean</option>
              <option value="FACULTY">Faculty</option>
              <option value="STAFF">Staff</option>
              <option value="PROGRAM_CHAIR">Program Chair</option>
            </select>
          </div>

          {/* Add User Button */}
          <button className="btn-primary flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">User</th>
                <th className="table-header-cell">Role</th>
                <th className="table-header-cell">Department</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Last Login</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Mail className="h-3 w-3" />
                          <span>{user.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={getRoleBadge(user.role)}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="table-cell">{user.department}</td>
                  <td className="table-cell">
                    <span className={getStatusBadge(user.status)}>
                      {user.status}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>{user.lastLogin}</span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredUsers.length}</span> of{' '}
            <span className="font-medium">{users.length}</span> results
          </div>
          <div className="flex space-x-2">
            <button className="btn-secondary text-sm">Previous</button>
            <button className="btn-primary text-sm">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserManagement 