import React, { useState } from 'react'
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  CheckCircle,
  Clock,
  AlertCircle,
  Edit,
  Eye,
  Download,
  Upload
} from 'lucide-react'

const Syllabi = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const classes = [
    { id: 1, code: 'CS101', name: 'Introduction to Computer Science' },
    { id: 2, code: 'CS201', name: 'Data Structures and Algorithms' },
    { id: 3, code: 'CS301', name: 'Software Engineering' }
  ]

  const syllabi = [
    {
      id: 1,
      title: 'CS101 Syllabus - Fall 2024',
      classCode: 'CS101',
      className: 'Introduction to Computer Science',
      semester: 'Fall 2024',
      status: 'approved',
      lastUpdated: '2024-12-15',
      submittedDate: '2024-12-10',
      approvedDate: '2024-12-15',
      version: '1.0',
      description: 'Comprehensive syllabus covering programming fundamentals and computer science basics'
    },
    {
      id: 2,
      title: 'CS201 Syllabus - Fall 2024',
      classCode: 'CS201',
      className: 'Data Structures and Algorithms',
      semester: 'Fall 2024',
      status: 'pending',
      lastUpdated: '2024-12-18',
      submittedDate: '2024-12-18',
      approvedDate: null,
      version: '1.2',
      description: 'Advanced data structures and algorithm analysis course syllabus'
    },
    {
      id: 3,
      title: 'CS301 Syllabus - Fall 2024',
      classCode: 'CS301',
      className: 'Software Engineering',
      semester: 'Fall 2024',
      status: 'draft',
      lastUpdated: '2024-12-20',
      submittedDate: null,
      approvedDate: null,
      version: '0.8',
      description: 'Software development methodologies and practices syllabus'
    },
    {
      id: 4,
      title: 'CS101 Syllabus - Spring 2025',
      classCode: 'CS101',
      className: 'Introduction to Computer Science',
      semester: 'Spring 2025',
      status: 'draft',
      lastUpdated: '2024-12-20',
      submittedDate: null,
      approvedDate: null,
      version: '0.5',
      description: 'Updated syllabus for Spring 2025 semester'
    }
  ]

  const filteredSyllabi = syllabi.filter(syllabus => {
    const matchesSearch = syllabus.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         syllabus.classCode.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClass = selectedClass === 'all' || syllabus.classCode === selectedClass
    const matchesStatus = selectedStatus === 'all' || syllabus.status === selectedStatus
    
    return matchesSearch && matchesClass && matchesStatus
  })

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'draft':
        return <AlertCircle className="h-5 w-5 text-blue-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'draft':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Syllabi Management</h1>
          <p className="text-gray-600">Create and manage course syllabi for your classes</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center">
            <Upload className="h-4 w-4 mr-2" />
            Import Syllabus
          </button>
          <button className="btn-primary flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Create Syllabus
          </button>
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
                placeholder="Search syllabi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="input-field"
          >
            <option value="all">All Classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.code}>{cls.code} - {cls.name}</option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input-field"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Syllabus Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Syllabi</p>
              <p className="text-2xl font-bold text-gray-900">{filteredSyllabi.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredSyllabi.filter(s => s.status === 'approved').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredSyllabi.filter(s => s.status === 'pending').length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Drafts</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredSyllabi.filter(s => s.status === 'draft').length}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Syllabi Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Course Syllabi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Syllabus
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Semester
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSyllabi.map((syllabus) => (
                <tr key={syllabus.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{syllabus.title}</div>
                      <div className="text-sm text-gray-500">{syllabus.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{syllabus.classCode}</div>
                      <div className="text-sm text-gray-500">{syllabus.className}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {syllabus.semester}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    v{syllabus.version}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(syllabus.status)}
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(syllabus.status)}`}>
                        {syllabus.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(syllabus.lastUpdated).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-purple-600 hover:text-purple-900">
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">CS201 Syllabus approved</p>
                <p className="text-sm text-gray-600">Syllabus for Data Structures and Algorithms was approved by the dean</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">CS301 Syllabus submitted for review</p>
                <p className="text-sm text-gray-600">Software Engineering syllabus submitted for dean approval</p>
                <p className="text-xs text-gray-500">1 day ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">CS101 Syllabus updated</p>
                <p className="text-sm text-gray-600">Introduction to Computer Science syllabus updated to version 1.1</p>
                <p className="text-xs text-gray-500">3 days ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {filteredSyllabi.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No syllabi found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  )
}

export default Syllabi
