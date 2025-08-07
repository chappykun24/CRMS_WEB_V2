import React, { useState, useRef, useEffect } from 'react'
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
  ClipboardList,
  Award,
  UserCheck,
  Database
} from 'lucide-react'

const Sidebar = ({ isExpanded, onToggle }) => {
  const { user } = useUser()
  const location = useLocation()
  const [isHovered, setIsHovered] = useState(false)
  const hoverTimeoutRef = useRef(null)

  const getNavigationItems = () => {
    switch (user?.role) {
      case 'ADMIN':
        return [
          { name: 'Home', icon: Home, href: '/dashboard' },
          { name: 'User Management', icon: Users, href: '/dashboard/users' },
          { name: 'Faculty Approval', icon: UserCheck, href: '/dashboard/faculty-approval' },
          { name: 'System Settings', icon: Settings, href: '/dashboard/settings' }
        ]
      
      case 'FACULTY':
        return [
          { name: 'Home', icon: Home, href: '/dashboard' },
          { name: 'My Classes', icon: BookOpen, href: '/dashboard/classes' },
          { name: 'Attendance', icon: Calendar, href: '/dashboard/attendance' },
          { name: 'Assessments', icon: ClipboardList, href: '/dashboard/assessments' },
          { name: 'Grades', icon: Award, href: '/dashboard/grades' },
          { name: 'Syllabi', icon: FileText, href: '/dashboard/syllabi' }
        ]
      
      case 'DEAN':
        return [
          { name: 'Home', icon: Home, href: '/dashboard' },
          { name: 'Analytics', icon: BarChart3, href: '/dashboard/analytics' },
          { name: 'My Classes', icon: BookOpen, href: '/dashboard/classes' },
          { name: 'Reports', icon: FileText, href: '/dashboard/reports' },
          { name: 'Syllabus Approval', icon: FileText, href: '/dashboard/syllabus-approval' }
        ]
      
      case 'STAFF':
        return [
          { name: 'Home', icon: Home, href: '/dashboard' },
          { name: 'Student Management', icon: Users, href: '/dashboard/students' },
          { name: 'Academic Records', icon: Database, href: '/dashboard/records' },
          { name: 'Assign Faculty', icon: UserCheck, href: '/dashboard/assign-faculty' }
        ]
      
      case 'PROGRAM_CHAIR':
        return [
          { name: 'Home', icon: Home, href: '/dashboard' },
          { name: 'Course Management', icon: BookOpen, href: '/dashboard/courses' },
          { name: 'Analytics', icon: BarChart3, href: '/dashboard/analytics' },
          { name: 'Reports', icon: FileText, href: '/dashboard/reports' },
          { name: 'Submissions', icon: ClipboardList, href: '/dashboard/submissions' }
        ]
      
      default:
        return [
          { name: 'Home', icon: Home, href: '/dashboard' }
        ]
    }
  }

  const navigationItems = getNavigationItems()

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setIsHovered(true)
    // Small delay before expanding to prevent accidental expansion
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isExpanded) {
        onToggle()
      }
    }, 150)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    // Delay before collapsing to allow moving mouse to content
    hoverTimeoutRef.current = setTimeout(() => {
      if (isExpanded) {
        onToggle()
      }
    }, 200)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div 
      className={`bg-gray-50 transition-all duration-500 ease-in-out flex flex-col h-screen pr-2 ${
        isExpanded ? 'w-64' : 'w-16'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Navigation Items */}
      <nav className="flex-1 py-6 px-3 space-y-2">
        {navigationItems.map((item, index) => {
          const isActive = location.pathname === item.href || 
                         (item.href === '/dashboard' && location.pathname === '/dashboard/')
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center justify-start px-4 py-3 pr-10 text-sm font-medium rounded-full transition-all duration-200 focus:outline-none ${
                isActive 
                  ? 'bg-primary-50 text-primary-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title={!isExpanded ? item.name : ''}
              style={{
                animationDelay: `${index * 50}ms`
              }}
            >
              <div className="flex items-center justify-start">
                <div className="flex-shrink-0 mr-8">
                  <item.icon className={`h-6 w-6 transition-colors duration-300 ease-in-out ${
                    isActive ? 'text-primary-600' : 'text-gray-600'
                  }`} />
                </div>
                <span 
                  className={`transition-all duration-300 ease-in-out whitespace-nowrap ${
                    isExpanded 
                      ? 'opacity-100 translate-x-0' 
                      : 'opacity-0 -translate-x-4 pointer-events-none w-0'
                  }`}
                >
                  {item.name}
                </span>
              </div>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export default Sidebar 