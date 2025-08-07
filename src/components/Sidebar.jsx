import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import { 
  Home,
  Users,
  BookOpen,
  Calendar,
  BarChart3,
  FileText,
  Settings,
  GraduationCap,
  ClipboardList,
  Award,
  UserCheck,
  Database,
  ChevronRight
} from 'lucide-react'

const Sidebar = () => {
  const { user } = useUser()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const getNavigationItems = () => {
    const baseItems = [
      { name: 'Dashboard', icon: Home, href: '/dashboard' }
    ]

    switch (user?.role) {
      case 'ADMIN':
        return [
          { name: 'Home', icon: Home, href: '/dashboard/home' },
          { name: 'User Management', icon: Users, href: '/dashboard/users' },
          { name: 'Faculty Approval', icon: UserCheck, href: '/dashboard/faculty-approval' },
          { name: 'Syllabus Approval', icon: FileText, href: '/dashboard/syllabus-approval' },
          { name: 'System Settings', icon: Settings, href: '/dashboard/settings' }
        ]
      
      case 'FACULTY':
        return [
          ...baseItems,
          { name: 'My Classes', icon: BookOpen, href: '/dashboard/classes' },
          { name: 'Attendance', icon: Calendar, href: '/dashboard/attendance' },
          { name: 'Assessments', icon: ClipboardList, href: '/dashboard/assessments' },
          { name: 'Grades', icon: Award, href: '/dashboard/grades' },
          { name: 'Syllabi', icon: FileText, href: '/dashboard/syllabi' }
        ]
      
      case 'DEAN':
        return [
          ...baseItems,
          { name: 'Analytics', icon: BarChart3, href: '/dashboard/analytics' },
          { name: 'My Classes', icon: BookOpen, href: '/dashboard/classes' },
          { name: 'Reports', icon: FileText, href: '/dashboard/reports' },
          { name: 'Syllabus Approval', icon: FileText, href: '/dashboard/syllabus-approval' }
        ]
      
      case 'STAFF':
        return [
          ...baseItems,
          { name: 'Student Management', icon: Users, href: '/dashboard/students' },
          { name: 'Academic Records', icon: Database, href: '/dashboard/records' },
          { name: 'Assign Faculty', icon: UserCheck, href: '/dashboard/assign-faculty' }
        ]
      
      case 'PROGRAM_CHAIR':
        return [
          ...baseItems,
          { name: 'Course Management', icon: BookOpen, href: '/dashboard/courses' },
          { name: 'Analytics', icon: BarChart3, href: '/dashboard/analytics' },
          { name: 'Reports', icon: FileText, href: '/dashboard/reports' },
          { name: 'Submissions', icon: ClipboardList, href: '/dashboard/submissions' }
        ]
      
      default:
        return baseItems
    }
  }

  const navigationItems = getNavigationItems()

  return (
    <div className={`bg-white shadow-sm border-r border-gray-200 transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="flex flex-col h-full">
        {/* Toggle Button */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className={`h-5 w-5 text-gray-600 transition-transform ${
              collapsed ? 'rotate-180' : ''
            }`} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.href
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          ))}
        </nav>

        {/* User Info */}
        {!collapsed && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.role || 'Role'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Sidebar 