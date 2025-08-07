import React from 'react'
import { 
  Users, 
  FileText, 
  GraduationCap, 
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  UserPlus,
  BookOpen
} from 'lucide-react'

const StaffHome = () => {
  const stats = [
    {
      title: 'Total Students',
      value: '1,847',
      change: '+89',
      changeType: 'positive',
      icon: Users,
      color: 'bg-blue-500',
      description: 'Enrolled students'
    },
    {
      title: 'New Registrations',
      value: '23',
      change: '+5',
      changeType: 'positive',
      icon: UserPlus,
      color: 'bg-green-500',
      description: 'This week'
    },
    {
      title: 'Academic Records',
      value: '156',
      change: '-12',
      changeType: 'negative',
      icon: FileText,
      color: 'bg-yellow-500',
      description: 'Pending updates'
    },
    {
      title: 'Faculty Assignments',
      value: '45',
      change: '+3',
      changeType: 'positive',
      icon: GraduationCap,
      color: 'bg-purple-500',
      description: 'This semester'
    }
  ]

  const recentActivities = [
    {
      id: 1,
      action: 'Student registered',
      student: 'John Smith',
      course: 'CS 101 - Introduction to Programming',
      time: '1 hour ago',
      type: 'success',
      icon: UserPlus
    },
    {
      id: 2,
      action: 'Academic record updated',
      student: 'Sarah Johnson',
      course: 'CS 201 - Data Structures',
      time: '3 hours ago',
      type: 'info',
      icon: FileText
    },
    {
      id: 3,
      action: 'Faculty assigned',
      faculty: 'Dr. Michael Chen',
      course: 'CS 301 - Algorithms',
      time: '1 day ago',
      type: 'success',
      icon: GraduationCap
    },
    {
      id: 4,
      action: 'Registration pending',
      student: 'David Wilson',
      course: 'CS 401 - Software Engineering',
      time: '2 days ago',
      type: 'warning',
      icon: AlertCircle
    }
  ]

  const quickActions = [
    {
      title: 'Student Management',
      description: 'Manage student records',
      icon: Users,
      color: 'bg-blue-500',
      href: '/students'
    },
    {
      title: 'Academic Records',
      description: 'Update student records',
      icon: FileText,
      color: 'bg-green-500',
      href: '/academic-records'
    },
    {
      title: 'Assign Faculty',
      description: 'Assign faculty to courses',
      icon: GraduationCap,
      color: 'bg-purple-500',
      href: '/assign-faculty'
    },
    {
      title: 'Class Management',
      description: 'Manage class enrollments',
      icon: BookOpen,
      color: 'bg-orange-500',
      href: '/classes'
    }
  ]

  const departmentStats = [
    { name: 'Computer Science', students: 234, courses: 12, faculty: 8 },
    { name: 'Engineering', students: 189, courses: 10, faculty: 6 },
    { name: 'Business', students: 156, courses: 8, faculty: 5 },
    { name: 'Arts & Sciences', students: 203, courses: 11, faculty: 7 }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Staff Home</h1>
        <p className="page-subtitle">Welcome back! Here's an overview of your administrative tasks.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className={`h-4 w-4 ${
                    stat.changeType === 'positive' ? 'text-green-500' : 'text-red-500'
                  }`} />
                  <span className={`text-sm ml-1 ${
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <div key={index} className="card hover:shadow-lg cursor-pointer transition-all duration-200">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${action.color}`}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Department Overview */}
      <div className="section">
        <h2 className="section-title">Department Overview</h2>
        <div className="card">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Department</th>
                  <th className="table-header-cell">Students</th>
                  <th className="table-header-cell">Courses</th>
                  <th className="table-header-cell">Faculty</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {departmentStats.map((dept, index) => (
                  <tr key={index} className="table-row">
                    <td className="table-cell font-medium">{dept.name}</td>
                    <td className="table-cell">{dept.students.toLocaleString()}</td>
                    <td className="table-cell">{dept.courses}</td>
                    <td className="table-cell">{dept.faculty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="section">
        <h2 className="section-title">Recent Activities</h2>
        <div className="card">
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                <div className={`p-2 rounded-full ${
                  activity.type === 'success' ? 'bg-green-100' :
                  activity.type === 'warning' ? 'bg-yellow-100' :
                  activity.type === 'info' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <activity.icon className={`h-4 w-4 ${
                    activity.type === 'success' ? 'text-green-600' :
                    activity.type === 'warning' ? 'text-yellow-600' :
                    activity.type === 'info' ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-600">
                    {activity.student && `${activity.student} • `}
                    {activity.faculty && `${activity.faculty} • `}
                    {activity.course}
                  </p>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  {activity.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StaffHome 