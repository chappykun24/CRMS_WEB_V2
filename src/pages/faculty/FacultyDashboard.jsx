import React from 'react'
import { 
  BookOpen, 
  Users, 
  FileText, 
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

const FacultyDashboard = () => {
  const stats = [
    {
      title: 'Active Classes',
      value: '4',
      change: '+1',
      changeType: 'positive',
      icon: BookOpen,
      color: 'bg-blue-500',
      description: 'Classes this semester'
    },
    {
      title: 'Total Students',
      value: '156',
      change: '+12',
      changeType: 'positive',
      icon: Users,
      color: 'bg-green-500',
      description: 'Enrolled students'
    },
    {
      title: 'Pending Grades',
      value: '23',
      change: '-5',
      changeType: 'negative',
      icon: FileText,
      color: 'bg-yellow-500',
      description: 'Assessments to grade'
    },
    {
      title: 'Attendance Rate',
      value: '94%',
      change: '+2%',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'bg-purple-500',
      description: 'This week'
    }
  ]

  const recentActivities = [
    {
      id: 1,
      action: 'Grade submitted',
      course: 'CS 101 - Introduction to Programming',
      time: '2 hours ago',
      type: 'success',
      icon: CheckCircle
    },
    {
      id: 2,
      action: 'Attendance marked',
      course: 'CS 201 - Data Structures',
      time: '1 day ago',
      type: 'info',
      icon: Calendar
    },
    {
      id: 3,
      action: 'Assessment created',
      course: 'CS 301 - Algorithms',
      time: '2 days ago',
      type: 'success',
      icon: FileText
    },
    {
      id: 4,
      action: 'Syllabus updated',
      course: 'CS 401 - Software Engineering',
      time: '3 days ago',
      type: 'warning',
      icon: AlertCircle
    }
  ]

  const quickActions = [
    {
      title: 'Mark Attendance',
      description: 'Record today\'s attendance',
      icon: Calendar,
      color: 'bg-blue-500',
      href: '/attendance'
    },
    {
      title: 'Create Assessment',
      description: 'Add new assessment',
      icon: FileText,
      color: 'bg-green-500',
      href: '/assessments'
    },
    {
      title: 'Grade Submissions',
      description: 'Review and grade',
      icon: CheckCircle,
      color: 'bg-purple-500',
      href: '/grades'
    },
    {
      title: 'View Classes',
      description: 'Manage your classes',
      icon: BookOpen,
      color: 'bg-orange-500',
      href: '/classes'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Faculty Dashboard</h1>
        <p className="page-subtitle">Welcome back! Here's an overview of your teaching activities.</p>
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
                  <p className="text-xs text-gray-600">{activity.course}</p>
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

export default FacultyDashboard 