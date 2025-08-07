import React from 'react'
import { 
  BookOpen, 
  Calendar, 
  ClipboardList, 
  Award,
  Users,
  Clock,
  TrendingUp
} from 'lucide-react'

const FacultyDashboard = () => {
  const stats = [
    {
      title: 'Active Classes',
      value: '4',
      change: '+1',
      changeType: 'positive',
      icon: BookOpen,
      color: 'bg-blue-500'
    },
    {
      title: 'Total Students',
      value: '156',
      change: '+12',
      changeType: 'positive',
      icon: Users,
      color: 'bg-green-500'
    },
    {
      title: 'Pending Grades',
      value: '23',
      change: '-5',
      changeType: 'negative',
      icon: Award,
      color: 'bg-yellow-500'
    },
    {
      title: 'Attendance Rate',
      value: '94%',
      change: '+2%',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'bg-purple-500'
    }
  ]

  const recentClasses = [
    {
      id: 1,
      name: 'Introduction to Computer Science',
      code: 'CS101',
      students: 45,
      nextSession: 'Today, 2:00 PM',
      attendance: '92%'
    },
    {
      id: 2,
      name: 'Data Structures and Algorithms',
      code: 'CS201',
      students: 38,
      nextSession: 'Tomorrow, 10:00 AM',
      attendance: '95%'
    },
    {
      id: 3,
      name: 'Web Development',
      code: 'CS301',
      students: 42,
      nextSession: 'Wednesday, 1:00 PM',
      attendance: '88%'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Faculty Dashboard</h1>
        <p className="text-gray-600">Manage your classes, track attendance, and grade assessments.</p>
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

      {/* Recent Classes */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Classes</h3>
        <div className="space-y-4">
          {recentClasses.map((classItem) => (
            <div key={classItem.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-medium text-gray-900">{classItem.name}</h4>
                  <p className="text-sm text-gray-600">{classItem.code}</p>
                </div>
                <span className="text-sm text-gray-500">{classItem.students} students</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{classItem.nextSession}</span>
                </div>
                <span className="text-green-600 font-medium">{classItem.attendance}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default FacultyDashboard 