import React, { useState } from 'react'
import { 
  Award, 
  Search, 
  Filter, 
  Download, 
  Upload,
  Edit,
  Eye,
  BarChart3,
  Users,
  TrendingUp
} from 'lucide-react'

const Grades = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('all')
  const [selectedAssessment, setSelectedAssessment] = useState('all')

  const classes = [
    { id: 1, code: 'CS101', name: 'Introduction to Computer Science' },
    { id: 2, code: 'CS201', name: 'Data Structures and Algorithms' },
    { id: 3, code: 'CS301', name: 'Software Engineering' }
  ]

  const assessments = [
    { id: 1, title: 'Midterm Examination', classCode: 'CS101' },
    { id: 2, title: 'Programming Assignment 3', classCode: 'CS201' },
    { id: 3, title: 'Final Project', classCode: 'CS301' },
    { id: 4, title: 'Quiz 1', classCode: 'CS101' }
  ]

  const grades = [
    {
      id: 1,
      studentName: 'John Smith',
      studentId: '2024-001',
      classCode: 'CS101',
      className: 'Introduction to Computer Science',
      assessment: 'Midterm Examination',
      score: 85,
      totalPoints: 100,
      percentage: 85,
      grade: 'B+',
      submittedDate: '2024-12-20',
      gradedDate: '2024-12-21'
    },
    {
      id: 2,
      studentName: 'Sarah Johnson',
      studentId: '2024-002',
      classCode: 'CS101',
      className: 'Introduction to Computer Science',
      assessment: 'Midterm Examination',
      score: 92,
      totalPoints: 100,
      percentage: 92,
      grade: 'A-',
      submittedDate: '2024-12-20',
      gradedDate: '2024-12-21'
    },
    {
      id: 3,
      studentName: 'Michael Chen',
      studentId: '2024-003',
      classCode: 'CS201',
      className: 'Data Structures and Algorithms',
      assessment: 'Programming Assignment 3',
      score: 45,
      totalPoints: 50,
      percentage: 90,
      grade: 'A-',
      submittedDate: '2024-12-19',
      gradedDate: '2024-12-20'
    },
    {
      id: 4,
      studentName: 'Emily Davis',
      studentId: '2024-004',
      classCode: 'CS301',
      className: 'Software Engineering',
      assessment: 'Final Project',
      score: 180,
      totalPoints: 200,
      percentage: 90,
      grade: 'A-',
      submittedDate: '2024-12-18',
      gradedDate: '2024-12-19'
    }
  ]

  const filteredGrades = grades.filter(grade => {
    const matchesSearch = grade.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         grade.studentId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClass = selectedClass === 'all' || grade.classCode === selectedClass
    const matchesAssessment = selectedAssessment === 'all' || grade.assessment === selectedAssessment
    
    return matchesSearch && matchesClass && matchesAssessment
  })

  const getGradeColor = (grade) => {
    if (grade.startsWith('A')) return 'text-green-600'
    if (grade.startsWith('B')) return 'text-blue-600'
    if (grade.startsWith('C')) return 'text-yellow-600'
    if (grade.startsWith('D')) return 'text-orange-600'
    if (grade.startsWith('F')) return 'text-red-600'
    return 'text-gray-600'
  }

  const getGradeBackground = (grade) => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800'
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800'
    if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800'
    if (grade.startsWith('D')) return 'bg-orange-100 text-orange-800'
    if (grade.startsWith('F')) return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  const calculateAverageGrade = () => {
    if (filteredGrades.length === 0) return 0
    const totalPercentage = filteredGrades.reduce((sum, grade) => sum + grade.percentage, 0)
    return Math.round(totalPercentage / filteredGrades.length)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grade Management</h1>
          <p className="text-gray-600">View and manage student grades for your classes</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center">
            <Upload className="h-4 w-4 mr-2" />
            Import Grades
          </button>
          <button className="btn-secondary flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export Grades
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
                placeholder="Search students..."
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
            value={selectedAssessment}
            onChange={(e) => setSelectedAssessment(e.target.value)}
            className="input-field"
          >
            <option value="all">All Assessments</option>
            {assessments.map(assessment => (
              <option key={assessment.id} value={assessment.title}>{assessment.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grade Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Grades</p>
              <p className="text-2xl font-bold text-gray-900">{filteredGrades.length}</p>
            </div>
            <Award className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Grade</p>
              <p className="text-2xl font-bold text-gray-900">{calculateAverageGrade()}%</p>
            </div>
            <BarChart3 className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Students</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(filteredGrades.map(g => g.studentId)).size}
              </p>
            </div>
            <Users className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Assessments</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(filteredGrades.map(g => g.assessment)).size}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Grades Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Student Grades</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assessment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Graded
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredGrades.map((grade) => (
                <tr key={grade.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{grade.studentName}</div>
                      <div className="text-sm text-gray-500">{grade.studentId}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{grade.classCode}</div>
                      <div className="text-sm text-gray-500">{grade.className}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {grade.assessment}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {grade.score}/{grade.totalPoints}
                    </div>
                    <div className="text-xs text-gray-500">
                      {grade.percentage}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getGradeBackground(grade.grade)}`}>
                      {grade.grade}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(grade.submittedDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(grade.gradedDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredGrades.length === 0 && (
        <div className="text-center py-12">
          <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No grades found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  )
}

export default Grades
