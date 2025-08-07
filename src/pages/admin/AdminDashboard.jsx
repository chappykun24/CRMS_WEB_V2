import React from 'react'
import { 
  Users, 
  UserCheck, 
  FileText, 
  Settings,
  TrendingUp,
  Shield,
  Activity,
  Clock
} from 'lucide-react'

const AdminHome = () => {
  const stats = [
    {
      title: 'Total Users',
      value: '1,234',
      change: '+12%',
      changeType: 'positive',
      icon: Users,
      color: 'bg-blue-500',
      description: 'Active accounts'
    },
    {
      title: 'Pending Approvals',
      value: '23',
      change: '+5',
      changeType: 'negative',
      icon: UserCheck,
      color: 'bg-yellow-500',
      description: 'Require attention'
    },
    {
      title: 'System Status',
      value: 'Healthy',
      change: '100%',
      changeType: 'positive',
      icon: Shield,
      color: 'bg-green-500',
      description: 'All systems operational'
    },
    {
      title: 'Active Sessions',
      value: '89',
      change: '+15%',
      changeType: 'positive',
      icon: Activity,
      color: 'bg-purple-500',
      description: 'Current users online'
    }
  ]

  const recentActivities = [
    {
      id: 1,
      action: 'New faculty registration',
      user: 'Dr. Sarah Johnson',
      time: '2 hours ago',
      type: 'success',
      icon: UserCheck
    },
    {
      id: 2,
      action: 'User account deactivated',
      user: 'John Smith',
      time: '1 day ago',
      type: 'warning',
      icon: Users
    },
    {
      id: 3,
      action: 'System backup completed',
      user: 'System',
      time: '2 days ago',
      type: 'info',
      icon: Settings
    },
    {
      id: 4,
      action: 'New user login',
      user: 'Prof. Michael Chen',
      time: '3 hours ago',
      type: 'success',
      icon: Activity
    }
  ]

  const quickActions = [
    {
      title: 'User Management',
      description: 'Manage user accounts',
      icon: Users,
      color: 'bg-blue-500',
      href: '/users'
    },
    {
      title: 'Faculty Approval',
      description: 'Review pending applications',
      icon: UserCheck,
      color: 'bg-yellow-500',
      href: '/faculty-approval'
    },
    {
      title: 'System Settings',
      description: 'Configure system options',
      icon: Settings,
      color: 'bg-purple-500',
      href: '/settings'
    },
    {
      title: 'System Monitor',
      description: 'View system status',
      icon: Activity,
      color: 'bg-green-500',
      href: '/monitor'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Admin Home</h1>
        <p className="page-subtitle">Welcome back! Here's what's happening with your system.</p>
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
                  <p className="text-xs text-gray-600">{activity.user}</p>
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

export default AdminHome 