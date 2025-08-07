import React, { useState } from 'react'
import { 
  BookOpen, 
  Users, 
  Calendar, 
  MapPin, 
  Search,
  Filter
} from 'lucide-react'

const MyClasses = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('all')

  const classes = [
    {
      id: 1,
      code: 'CS101',
      name: 'Introduction to Computer Science',
      semester: 'Fall 2024',
      schedule: 'MWF 9:00 AM - 10:30 AM',
      room: 'Room 201, Building A',
      students: 25,
      faculty: 'Dr. Sarah Johnson',
      status: 'active'
    },
    {
      id: 2,
      code: 'CS201',
      name: 'Data Structures and Algorithms',
      semester: 'Fall 2024',
      schedule: 'TTH 2:00 PM - 3:30 PM',
      room: 'Room 305, Building B',
      students: 18,
      faculty: 'Prof. Michael Chen',
      status: 'active'
    }
  ]

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSemester = selectedSemester === 'all' || cls.semester === selectedSemester
    
    return matchesSearch && matchesSemester
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
          <p className="text-gray-600">Overview of classes under your supervision</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search classes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="input-field"
          >
            <option value="all">All Semesters</option>
            <option value="Fall 2024">Fall 2024</option>
            <option value="Spring 2025">Spring 2025</option>
          </select>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses.map((cls) => (
          <div key={cls.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{cls.code}</h3>
                <p className="text-sm text-gray-600">{cls.name}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                cls.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {cls.status}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                {cls.schedule}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="h-4 w-4 mr-2" />
                {cls.room}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Users className="h-4 w-4 mr-2" />
                {cls.students} students
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Faculty:</span> {cls.faculty}
              </div>
            </div>

            <div className="flex gap-2">
              <button className="btn-secondary flex-1 text-sm">
                View Details
              </button>
              <button className="btn-primary flex-1 text-sm">
                Manage Class
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredClasses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No classes found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  )
}

export default MyClasses
