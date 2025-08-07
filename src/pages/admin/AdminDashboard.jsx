import React from 'react'
import { 
  Users, 
  UserCheck, 
  FileText, 
  Settings,
  TrendingUp
} from 'lucide-react'

const AdminDashboard = () => {
  const stats = [
    {
      title: 'Total Users',
      value: '1,234',
      change: '+12%',
      changeType: 'positive',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Pending Approvals',
      value: '23',
      change: '+5',
      changeType: 'negative',
      icon: UserCheck,
      color: 'bg-yellow-500'
    },
    {
      title: 'Active Syllabi',
      value: '456',
      change: '+8%',
      changeType: 'positive',
      icon: FileText,
      color: 'bg-green-500'
    },
    {
      title: 'System Status',
      value: 'Healthy',
      change: '100%',
      changeType: 'positive',
      icon: Settings,
      color: 'bg-purple-500'
    }
  ]

  const recentActivities = [
    {
      id: 1,
      action: 'New faculty registration',
      user: 'Dr. Sarah Johnson',
      time: '2 hours ago',
      type: 'registration'
    },
    {
      id: 2,
      action: 'Syllabus submitted for approval',
      user: 'Prof. Michael Chen',
      time: '4 hours ago',
      type: 'syllabus'
    },
    {
      id: 3,
      action: 'User account deactivated',
      user: 'John Smith',
      time: '1 day ago',
      type: 'deactivation'
    },
    {
      id: 4,
      action: 'System backup completed',
      user: 'System',
      time: '2 days ago',
      type: 'system'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your system.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <div className="flex items-center mt-1">
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

      {/* Recent Activities */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
        <div className="space-y-4">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className={`w-2 h-2 rounded-full mt-2 ${
                activity.type === 'registration' ? 'bg-blue-500' :
                activity.type === 'syllabus' ? 'bg-green-500' :
                activity.type === 'deactivation' ? 'bg-red-500' :
                'bg-purple-500'
              }`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                <p className="text-sm text-gray-600">{activity.user}</p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard 