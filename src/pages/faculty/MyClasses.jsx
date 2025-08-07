import React, { useState } from 'react'
import { 
  BookOpen, 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  MoreHorizontal
} from 'lucide-react'

const MyClasses = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const classes = [
    {
      id: 1,
      code: 'CS101',
      name: 'Introduction to Computer Science',
      semester: 'Fall 2024',
      schedule: 'MWF 9:00 AM - 10:30 AM',
      room: 'Room 201, Building A',
      students: 25,
      status: 'active',
      description: 'Fundamental concepts of computer science and programming',
      attendance: 94,
      avgGrade: 87
    },
    {
      id: 2,
      code: 'CS201',
      name: 'Data Structures and Algorithms',
      semester: 'Fall 2024',
      schedule: 'TTH 2:00 PM - 3:30 PM',
      room: 'Room 305, Building B',
      students: 18,
      status: 'active',
      description: 'Advanced data structures and algorithm analysis',
      attendance: 91,
      avgGrade: 82
    },
    {
      id: 3,
      code: 'CS301',
      name: 'Software Engineering',
      semester: 'Fall 2024',
      schedule: 'MWF 11:00 AM - 12:30 PM',
      room: 'Room 401, Building A',
      students: 22,
      status: 'active',
      description: 'Software development methodologies and practices',
      attendance: 88,
      avgGrade: 85
    }
  ]

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSemester = selectedSemester === 'all' || cls.semester === selectedSemester
    const matchesStatus = selectedStatus === 'all' || cls.status === selectedStatus
    
    return matchesSearch && matchesSemester && matchesStatus
  })

  const getStatusBadge = (status) => {
    return status === 'active' 
      ? 'badge badge-success' 
      : 'badge badge-warning'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">My Classes</h1>
        <p className="page-subtitle">Manage your assigned classes and view student information.</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Classes</p>
              <p className="text-2xl font-bold text-gray-900">{classes.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{classes.reduce((sum, cls) => sum + cls.students, 0)}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Attendance</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(classes.reduce((sum, cls) => sum + cls.attendance, 0) / classes.length)}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500">
              <Calendar className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search classes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field input-with-icon"
              />
            </div>

            {/* Semester Filter */}
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="input-field"
            >
              <option value="all">All Semesters</option>
              <option value="Fall 2024">Fall 2024</option>
              <option value="Spring 2025">Spring 2025</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input-field"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Add Class Button */}
          <button className="btn-primary flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Create Class</span>
          </button>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredClasses.map((cls) => (
          <div key={cls.id} className="card hover:shadow-lg transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{cls.code}</h3>
                <p className="text-sm text-gray-600">{cls.name}</p>
              </div>
              <span className={getStatusBadge(cls.status)}>
                {cls.status}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{cls.schedule}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>{cls.room}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{cls.students} students</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600">Attendance</p>
                <p className="text-lg font-semibold text-blue-600">{cls.attendance}%</p>
              </div>
              <div className="text-center p-2 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-600">Avg Grade</p>
                <p className="text-lg font-semibold text-green-600">{cls.avgGrade}%</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button className="btn-outline text-sm flex items-center space-x-1">
                <Eye className="h-4 w-4" />
                <span>View Details</span>
              </button>
              <div className="flex items-center space-x-2">
                <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                  <Edit className="h-4 w-4" />
                </button>
                <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredClasses.length === 0 && (
        <div className="card text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No classes found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  )
}

export default MyClasses
