import React, { useState } from 'react'
import { 
  UserCheck, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Search,
  Filter,
  Calendar,
  Mail
} from 'lucide-react'

const FacultyApproval = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedFaculty, setSelectedFaculty] = useState(null)

  // Mock data for faculty approval requests
  const [facultyRequests, setFacultyRequests] = useState([
    {
      id: 1,
      name: 'Dr. Maria Santos',
      email: 'maria.santos@university.edu',
      department: 'Computer Science',
      submittedDate: '2024-01-15',
      status: 'pending',
      documents: ['CV', 'Transcript', 'Recommendation Letter'],
      experience: '5 years',
      education: 'PhD Computer Science'
    },
    {
      id: 2,
      name: 'Prof. Juan Dela Cruz',
      email: 'juan.delacruz@university.edu',
      department: 'Information Technology',
      submittedDate: '2024-01-14',
      status: 'approved',
      documents: ['CV', 'Transcript', 'Recommendation Letter'],
      experience: '8 years',
      education: 'PhD Information Technology'
    },
    {
      id: 3,
      name: 'Dr. Ana Garcia',
      email: 'ana.garcia@university.edu',
      department: 'Computer Engineering',
      submittedDate: '2024-01-13',
      status: 'rejected',
      documents: ['CV', 'Transcript'],
      experience: '3 years',
      education: 'MS Computer Engineering'
    },
    {
      id: 4,
      name: 'Prof. Carlos Mendoza',
      email: 'carlos.mendoza@university.edu',
      department: 'Electrical Engineering',
      submittedDate: '2024-01-12',
      status: 'pending',
      documents: ['CV', 'Transcript', 'Recommendation Letter', 'Research Papers'],
      experience: '10 years',
      education: 'PhD Electrical Engineering'
    }
  ])

  const handleApprove = (id) => {
    setFacultyRequests(prev => 
      prev.map(faculty => 
        faculty.id === id ? { ...faculty, status: 'approved' } : faculty
      )
    )
  }

  const handleReject = (id) => {
    setFacultyRequests(prev => 
      prev.map(faculty => 
        faculty.id === id ? { ...faculty, status: 'rejected' } : faculty
      )
    )
  }

  const filteredRequests = facultyRequests.filter(faculty => {
    const matchesSearch = faculty.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faculty.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faculty.department.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || faculty.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Faculty Approval</h1>
          <p className="text-gray-600">Review and manage faculty applications</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <span>{facultyRequests.filter(f => f.status === 'pending').length} Pending</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span>{facultyRequests.filter(f => f.status === 'approved').length} Approved</span>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Faculty Requests Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Faculty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((faculty) => (
                <tr key={faculty.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <UserCheck className="h-5 w-5 text-primary-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{faculty.name}</div>
                        <div className="text-sm text-gray-500">{faculty.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{faculty.department}</div>
                    <div className="text-sm text-gray-500">{faculty.experience} experience</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{faculty.submittedDate}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(faculty.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedFaculty(faculty)}
                        className="text-primary-600 hover:text-primary-900 flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                      {faculty.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(faculty.id)}
                            className="text-green-600 hover:text-green-900 flex items-center"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(faculty.id)}
                            className="text-red-600 hover:text-red-900 flex items-center"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Faculty Detail Modal */}
      {selectedFaculty && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Faculty Details</h3>
                <button
                  onClick={() => setSelectedFaculty(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedFaculty.name}</h4>
                  <p className="text-sm text-gray-500">{selectedFaculty.email}</p>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-700">Department</h5>
                  <p className="text-sm text-gray-600">{selectedFaculty.department}</p>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-700">Education</h5>
                  <p className="text-sm text-gray-600">{selectedFaculty.education}</p>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-700">Experience</h5>
                  <p className="text-sm text-gray-600">{selectedFaculty.experience}</p>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-700">Documents Submitted</h5>
                  <ul className="text-sm text-gray-600">
                    {selectedFaculty.documents.map((doc, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        {doc}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-700">Status</h5>
                  {getStatusBadge(selectedFaculty.status)}
                </div>
              </div>
              
              {selectedFaculty.status === 'pending' && (
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => {
                      handleApprove(selectedFaculty.id)
                      setSelectedFaculty(null)
                    }}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      handleReject(selectedFaculty.id)
                      setSelectedFaculty(null)
                    }}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FacultyApproval 