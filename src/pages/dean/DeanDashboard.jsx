import React from 'react'
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  TrendingUp,
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  FileText
} from 'lucide-react'

const DeanHome = () => {
  const stats = [
    {
      title: 'Total Students',
      value: '2,847',
      change: '+156',
      changeType: 'positive',
      icon: Users,
      color: 'bg-blue-500',
      description: 'Enrolled this semester'
    },
    {
      title: 'Faculty Members',
      value: '89',
      change: '+3',
      changeType: 'positive',
      icon: GraduationCap,
      color: 'bg-green-500',
      description: 'Active faculty'
    },
    {
      title: 'Active Courses',
      value: '234',
      change: '+12',
      changeType: 'positive',
      icon: BookOpen,
      color: 'bg-purple-500',
      description: 'This semester'
    },
    {
      title: 'Graduation Rate',
      value: '94%',
      change: '+2%',
      changeType: 'positive',
      icon: Award,
      color: 'bg-orange-500',
      description: 'Last academic year'
    }
  ]

  const recentActivities = [
    {
      id: 1,
      action: 'Syllabus approved',
      course: 'CS 401 - Advanced Software Engineering',
      faculty: 'Dr. Sarah Johnson',
      time: '1 hour ago',
      type: 'success',
      icon: CheckCircle
    },
    {
      id: 2,
      action: 'New faculty appointment',
      faculty: 'Dr. Michael Chen',
      department: 'Computer Science',
      time: '3 hours ago',
      type: 'success',
      icon: Users
    },
    {
      id: 3,
      action: 'Department report generated',
      department: 'Engineering',
      time: '1 day ago',
      type: 'info',
      icon: FileText
    },
    {
      id: 4,
      action: 'Curriculum review pending',
      course: 'CS 301 - Algorithms',
      faculty: 'Prof. David Wilson',
      time: '2 days ago',
      type: 'warning',
      icon: AlertCircle
    }
  ]

  const quickActions = [
    {
      title: 'View Analytics',
      description: 'Academic performance data',
      icon: BarChart3,
      color: 'bg-blue-500',
      href: '/analytics'
    },
    {
      title: 'Review Syllabi',
      description: 'Approve course syllabi',
      icon: FileText,
      color: 'bg-green-500',
      href: '/syllabus-approval'
    },
    {
      title: 'Generate Reports',
      description: 'Create academic reports',
      icon: TrendingUp,
      color: 'bg-purple-500',
      href: '/reports'
    },
    {
      title: 'My Classes',
      description: 'View teaching schedule',
      icon: BookOpen,
      color: 'bg-orange-500',
      href: '/classes'
    }
  ]

  const departmentStats = [
    { name: 'Computer Science', students: 456, faculty: 12, courses: 34 },
    { name: 'Engineering', students: 623, faculty: 18, courses: 42 },
    { name: 'Business', students: 389, faculty: 15, courses: 28 },
    { name: 'Arts & Sciences', students: 512, faculty: 22, courses: 38 }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Dean Home</h1>
        <p className="page-subtitle">Welcome back! Here's an overview of your academic institution.</p>
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
                  <th className="table-header-cell">Faculty</th>
                  <th className="table-header-cell">Courses</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {departmentStats.map((dept, index) => (
                  <tr key={index} className="table-row">
                    <td className="table-cell font-medium">{dept.name}</td>
                    <td className="table-cell">{dept.students.toLocaleString()}</td>
                    <td className="table-cell">{dept.faculty}</td>
                    <td className="table-cell">{dept.courses}</td>
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

export default DeanHome 