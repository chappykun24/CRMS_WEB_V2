import React, { useState } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  BookOpen, 
  Award,
  Calendar,
  FileText,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

const Analytics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month')

  const stats = [
    {
      title: 'Total Students',
      value: '1,234',
      change: '+5.2%',
      changeType: 'positive',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Total Faculty',
      value: '89',
      change: '+2.1%',
      changeType: 'positive',
      icon: Users,
      color: 'bg-green-500'
    },
    {
      title: 'Active Classes',
      value: '156',
      change: '+8.7%',
      changeType: 'positive',
      icon: BookOpen,
      color: 'bg-purple-500'
    },
    {
      title: 'Average GPA',
      value: '3.45',
      change: '+0.12',
      changeType: 'positive',
      icon: Award,
      color: 'bg-orange-500'
    }
  ]

  const attendanceData = [
    { month: 'Jan', rate: 92 },
    { month: 'Feb', rate: 89 },
    { month: 'Mar', rate: 94 },
    { month: 'Apr', rate: 91 },
    { month: 'May', rate: 88 },
    { month: 'Jun', rate: 93 }
  ]

  const gradeDistribution = [
    { grade: 'A', count: 245, percentage: 25 },
    { grade: 'B', count: 320, percentage: 32 },
    { grade: 'C', count: 280, percentage: 28 },
    { grade: 'D', count: 95, percentage: 10 },
    { grade: 'F', count: 60, percentage: 6 }
  ]

  const recentActivities = [
    {
      id: 1,
      action: 'New faculty member approved',
      user: 'Dr. Sarah Johnson',
      time: '2 hours ago',
      type: 'approval'
    },
    {
      id: 2,
      action: 'Syllabus approved for CS201',
      user: 'Prof. Michael Chen',
      time: '4 hours ago',
      type: 'syllabus'
    },
    {
      id: 3,
      action: 'Grade report generated',
      user: 'System',
      time: '1 day ago',
      type: 'report'
    },
    {
      id: 4,
      action: 'Attendance alert triggered',
      user: 'CS101 Class',
      time: '2 days ago',
      type: 'alert'
    }
  ]

  const getActivityIcon = (type) => {
    switch (type) {
      case 'approval':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'syllabus':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'report':
        return <BarChart3 className="h-4 w-4 text-purple-500" />
      case 'alert':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive overview of academic performance and metrics</p>
        </div>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="input-field"
        >
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="quarter">Last Quarter</option>
          <option value="year">Last Year</option>
        </select>
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Trend</h3>
          <div className="space-y-4">
            {attendanceData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">{item.month}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${item.rate}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-900 w-8">{item.rate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grade Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
          <div className="space-y-4">
            {gradeDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Grade {item.grade}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-900 w-12">{item.count} ({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department Performance */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Department Performance</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">Computer Science</div>
              <div className="text-sm text-gray-600 mt-1">Department</div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Students:</span>
                  <span className="font-medium">456</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Faculty:</span>
                  <span className="font-medium">23</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg GPA:</span>
                  <span className="font-medium">3.52</span>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">Mathematics</div>
              <div className="text-sm text-gray-600 mt-1">Department</div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Students:</span>
                  <span className="font-medium">234</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Faculty:</span>
                  <span className="font-medium">15</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg GPA:</span>
                  <span className="font-medium">3.38</span>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">Engineering</div>
              <div className="text-sm text-gray-600 mt-1">Department</div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Students:</span>
                  <span className="font-medium">544</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Faculty:</span>
                  <span className="font-medium">31</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg GPA:</span>
                  <span className="font-medium">3.45</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                {getActivityIcon(activity.type)}
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
    </div>
  )
}

export default Analytics
