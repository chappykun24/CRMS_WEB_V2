import React from 'react'
import { Users, Database, UserCheck, TrendingUp } from 'lucide-react'

const StaffDashboard = () => {
  const stats = [
    {
      title: 'Total Students',
      value: '2,456',
      change: '+45',
      changeType: 'positive',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Academic Records',
      value: '1,890',
      change: '+23',
      changeType: 'positive',
      icon: Database,
      color: 'bg-green-500'
    },
    {
      title: 'Faculty Assignments',
      value: '156',
      change: '+8',
      changeType: 'positive',
      icon: UserCheck,
      color: 'bg-purple-500'
    },
    {
      title: 'Processing Rate',
      value: '98%',
      change: '+2%',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'bg-yellow-500'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
        <p className="text-gray-600">Student management and academic records overview.</p>
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

export default StaffDashboard 