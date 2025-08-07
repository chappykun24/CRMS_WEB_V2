import React from 'react'
import { 
  BookOpen, 
  Users, 
  FileText, 
  TrendingUp,
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  GraduationCap
} from 'lucide-react'

const ProgramChairDashboard = () => {
  const stats = [
    {
      title: 'Program Students',
      value: '456',
      change: '+23',
      changeType: 'positive',
      icon: Users,
      color: 'bg-blue-500',
      description: 'Enrolled in program'
    },
    {
      title: 'Active Courses',
      value: '34',
      change: '+2',
      changeType: 'positive',
      icon: BookOpen,
      color: 'bg-green-500',
      description: 'This semester'
    },
    {
      title: 'Faculty Members',
      value: '12',
      change: '+1',
      changeType: 'positive',
      icon: GraduationCap,
      color: 'bg-purple-500',
      description: 'Program faculty'
    },
    {
      title: 'Graduation Rate',
      value: '96%',
      change: '+1%',
      changeType: 'positive',
      icon: Award,
      color: 'bg-orange-500',
      description: 'Last academic year'
    }
  ]

  const recentActivities = [
    {
      id: 1,
      action: 'Course approved',
      course: 'CS 401 - Advanced Software Engineering',
      faculty: 'Dr. Sarah Johnson',
      time: '2 hours ago',
      type: 'success',
      icon: CheckCircle
    },
    {
      id: 2,
      action: 'New faculty assigned',
      faculty: 'Dr. Michael Chen',
      course: 'CS 301 - Algorithms',
      time: '1 day ago',
      type: 'success',
      icon: Users
    },
    {
      id: 3,
      action: 'Curriculum review',
      course: 'CS 201 - Data Structures',
      faculty: 'Prof. David Wilson',
      time: '2 days ago',
      type: 'warning',
      icon: AlertCircle
    },
    {
      id: 4,
      action: 'Program report generated',
      department: 'Computer Science',
      time: '3 days ago',
      type: 'info',
      icon: FileText
    }
  ]

  const quickActions = [
    {
      title: 'Course Management',
      description: 'Manage program courses',
      icon: BookOpen,
      color: 'bg-blue-500',
      href: '/course-management'
    },
    {
      title: 'Analytics',
      description: 'Program performance data',
      icon: BarChart3,
      color: 'bg-green-500',
      href: '/analytics'
    },
    {
      title: 'Generate Reports',
      description: 'Create program reports',
      icon: TrendingUp,
      color: 'bg-purple-500',
      href: '/reports'
    },
    {
      title: 'Review Submissions',
      description: 'Review faculty submissions',
      icon: FileText,
      color: 'bg-orange-500',
      href: '/submissions'
    }
  ]

  const courseStats = [
    { name: 'CS 101 - Introduction to Programming', students: 45, faculty: 'Dr. Johnson', status: 'Active' },
    { name: 'CS 201 - Data Structures', students: 38, faculty: 'Prof. Wilson', status: 'Active' },
    { name: 'CS 301 - Algorithms', students: 32, faculty: 'Dr. Chen', status: 'Active' },
    { name: 'CS 401 - Software Engineering', students: 28, faculty: 'Dr. Brown', status: 'Active' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Program Chair Dashboard</h1>
        <p className="page-subtitle">Welcome back! Here's an overview of your Computer Science program.</p>
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

      {/* Course Overview */}
      <div className="section">
        <h2 className="section-title">Course Overview</h2>
        <div className="card">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Course</th>
                  <th className="table-header-cell">Students</th>
                  <th className="table-header-cell">Faculty</th>
                  <th className="table-header-cell">Status</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {courseStats.map((course, index) => (
                  <tr key={index} className="table-row">
                    <td className="table-cell font-medium">{course.name}</td>
                    <td className="table-cell">{course.students}</td>
                    <td className="table-cell">{course.faculty}</td>
                    <td className="table-cell">
                      <span className="badge badge-success">{course.status}</span>
                    </td>
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
                    {activity.course && `${activity.course} • `}
                    {activity.faculty && `${activity.faculty} • `}
                    {activity.department}
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

export default ProgramChairDashboard 