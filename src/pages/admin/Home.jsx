import React from 'react'
import { 
  Users, 
  BookOpen, 
  FileText, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  BarChart3,
  Calendar,
  Bell,
  Activity,
  Database,
  Shield,
  Settings,
  UserCheck,
  UserX,
  Plus,
  Eye
} from 'lucide-react'

const Home = () => {
  // Dummy data for statistics
  const stats = [
    {
      title: 'Total Users',
      value: '1,234',
      change: '+12%',
      changeType: 'positive',
      icon: Users,
      color: 'bg-blue-500',
      description: 'Active system users'
    },
    {
      title: 'Active Courses',
      value: '456',
      change: '+8%',
      changeType: 'positive',
      icon: BookOpen,
      color: 'bg-green-500',
      description: 'Currently running courses'
    },
    {
      title: 'Pending Approvals',
      value: '23',
      change: '+5',
      changeType: 'negative',
      icon: AlertCircle,
      color: 'bg-yellow-500',
      description: 'Requires attention'
    },
    {
      title: 'System Health',
      value: '98%',
      change: '+2%',
      changeType: 'positive',
      icon: Shield,
      color: 'bg-purple-500',
      description: 'Overall system status'
    }
  ]

  // Recent activities
  const recentActivities = [
    {
      id: 1,
      action: 'New faculty registration',
      user: 'Dr. Sarah Johnson',
      time: '2 hours ago',
      type: 'registration',
      status: 'pending'
    },
    {
      id: 2,
      action: 'Syllabus submitted for approval',
      user: 'Prof. Michael Chen',
      time: '4 hours ago',
      type: 'syllabus',
      status: 'pending'
    },
    {
      id: 3,
      action: 'User account activated',
      user: 'John Smith',
      time: '6 hours ago',
      type: 'activation',
      status: 'completed'
    },
    {
      id: 4,
      action: 'System backup completed',
      user: 'System',
      time: '1 day ago',
      type: 'system',
      status: 'completed'
    },
    {
      id: 5,
      action: 'Course enrollment updated',
      user: 'Dr. Lisa Wang',
      time: '1 day ago',
      type: 'course',
      status: 'completed'
    }
  ]

  // Quick actions
  const quickActions = [
    {
      title: 'Add New User',
      description: 'Create a new system user account',
      icon: UserCheck,
      color: 'bg-blue-500',
      action: 'add-user'
    },
    {
      title: 'Review Approvals',
      description: 'Check pending faculty and syllabus approvals',
      icon: FileText,
      color: 'bg-yellow-500',
      action: 'review-approvals'
    },
    {
      title: 'System Analytics',
      description: 'View detailed system performance metrics',
      icon: BarChart3,
      color: 'bg-green-500',
      action: 'analytics'
    },
    {
      title: 'System Settings',
      description: 'Configure system preferences and security',
      icon: Settings,
      color: 'bg-purple-500',
      action: 'settings'
    }
  ]

  // System alerts
  const systemAlerts = [
    {
      id: 1,
      type: 'warning',
      message: '3 pending faculty approvals require attention',
      time: '1 hour ago'
    },
    {
      id: 2,
      type: 'info',
      message: 'System maintenance scheduled for tomorrow at 2 AM',
      time: '3 hours ago'
    },
    {
      id: 3,
      type: 'success',
      message: 'Database backup completed successfully',
      time: '6 hours ago'
    }
  ]

  const getActivityIcon = (type) => {
    const icons = {
      registration: UserCheck,
      syllabus: FileText,
      activation: CheckCircle,
      system: Database,
      course: BookOpen
    }
    return icons[type] || Activity
  }

  const getActivityColor = (type) => {
    const colors = {
      registration: 'text-blue-600',
      syllabus: 'text-yellow-600',
      activation: 'text-green-600',
      system: 'text-purple-600',
      course: 'text-indigo-600'
    }
    return colors[type] || 'text-gray-600'
  }

  const getAlertIcon = (type) => {
    const icons = {
      warning: AlertCircle,
      info: Bell,
      success: CheckCircle
    }
    return icons[type] || Bell
  }

  const getAlertColor = (type) => {
    const colors = {
      warning: 'text-yellow-600 bg-yellow-50',
      info: 'text-blue-600 bg-blue-50',
      success: 'text-green-600 bg-green-50'
    }
    return colors[type] || 'text-gray-600 bg-gray-50'
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, Admin!</h1>
            <p className="text-primary-100 mt-2">
              Here's what's happening with your Class Record Management System today.
            </p>
          </div>
          <div className="hidden md:block">
            <Calendar className="h-16 w-16 text-primary-200" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="card hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${action.color}`}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{action.title}</h4>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
              <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity) => {
                const ActivityIcon = getActivityIcon(activity.type)
                return (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg bg-gray-100 ${getActivityColor(activity.type)}`}>
                      <ActivityIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-600">{activity.user}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {activity.status === 'pending' && (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                          Pending
                        </span>
                      )}
                      {activity.status === 'completed' && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* System Alerts */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h3>
        <div className="space-y-3">
          {systemAlerts.map((alert) => {
            const AlertIcon = getAlertIcon(alert.type)
            return (
              <div key={alert.id} className={`p-4 rounded-lg border ${getAlertColor(alert.type)}`}>
                <div className="flex items-start space-x-3">
                  <AlertIcon className="h-5 w-5 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs opacity-75 mt-1">{alert.time}</p>
                  </div>
                  <button className="text-sm font-medium hover:underline">
                    View Details
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">CPU Usage</span>
              <span className="text-sm font-medium text-gray-900">45%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Memory Usage</span>
              <span className="text-sm font-medium text-gray-900">62%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '62%' }}></div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Storage Usage</span>
              <span className="text-sm font-medium text-gray-900">78%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '78%' }}></div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">New Users</span>
              <span className="text-sm font-medium text-green-600">+12</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Active Sessions</span>
              <span className="text-sm font-medium text-blue-600">156</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Pending Tasks</span>
              <span className="text-sm font-medium text-yellow-600">8</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">System Errors</span>
              <span className="text-sm font-medium text-red-600">0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home 