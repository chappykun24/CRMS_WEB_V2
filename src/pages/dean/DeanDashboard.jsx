import React from 'react'
import { BarChart3, BookOpen, FileText, TrendingUp } from 'lucide-react'

const DeanDashboard = () => {
  const stats = [
    {
      title: 'Total Faculty',
      value: '45',
      change: '+3',
      changeType: 'positive',
      icon: BarChart3,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Courses',
      value: '128',
      change: '+8',
      changeType: 'positive',
      icon: BookOpen,
      color: 'bg-green-500'
    },
    {
      title: 'Pending Approvals',
      value: '12',
      change: '-2',
      changeType: 'negative',
      icon: FileText,
      color: 'bg-yellow-500'
    },
    {
      title: 'Average GPA',
      value: '3.2',
      change: '+0.1',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'bg-purple-500'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dean Dashboard</h1>
        <p className="text-gray-600">Academic overview and institutional analytics.</p>
      </div>

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
    </div>
  )
}

export default DeanDashboard 