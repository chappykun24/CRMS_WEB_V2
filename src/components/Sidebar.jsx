import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import {
  HomeIcon,
  UserGroupIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ClipboardDocumentListIcon,
  TrophyIcon,
  UserPlusIcon,
  CircleStackIcon,
  BuildingOffice2Icon
} from '@heroicons/react/24/solid'

const Sidebar = ({ isExpanded, onToggle }) => {
  const { user } = useUser()
  const location = useLocation()
  const [isHovered, setIsHovered] = useState(false)
  const hoverTimeoutRef = useRef(null)

  const getNavigationItems = () => {
    const userRole = user?.role?.toUpperCase()
    
    switch (userRole) {
      case 'ADMIN':
        return [
          { name: 'Home', icon: HomeIcon, href: '/dashboard' },
          { name: 'User Management', icon: UserGroupIcon, href: '/dashboard/users' },
          { name: 'School Configuration', icon: BuildingOffice2Icon, href: '/dashboard/school-config' },
          { name: 'System Settings', icon: Cog6ToothIcon, href: '/dashboard/settings' }
        ]
      
      case 'FACULTY':
        return [
          { name: 'Home', icon: HomeIcon, href: '/dashboard' },
          { name: 'My Classes', icon: BookOpenIcon, href: '/dashboard/classes' },
          { name: 'Attendance', icon: CalendarDaysIcon, href: '/dashboard/attendance' },
          { name: 'Assessments', icon: ClipboardDocumentListIcon, href: '/dashboard/assessments' },
          { name: 'Grades', icon: TrophyIcon, href: '/dashboard/grades' },
          { name: 'Syllabi', icon: DocumentTextIcon, href: '/dashboard/syllabi' }
        ]
      
      case 'DEAN':
        return [
          { name: 'Home', icon: HomeIcon, href: '/dashboard' },
          { name: 'Analytics', icon: ChartBarIcon, href: '/dashboard/analytics' },
          { name: 'My Classes', icon: BookOpenIcon, href: '/dashboard/classes' },
          { name: 'Reports', icon: DocumentTextIcon, href: '/dashboard/reports' },
          { name: 'Syllabus Approval', icon: DocumentTextIcon, href: '/dashboard/syllabus-approval' }
        ]
      
      case 'STAFF':
        return [
          { name: 'Home', icon: HomeIcon, href: '/dashboard' },
          { name: 'Student Management', icon: UserGroupIcon, href: '/dashboard/students' },
          { name: 'Academic Records', icon: CircleStackIcon, href: '/dashboard/records' },
          { name: 'Assign Faculty', icon: UserPlusIcon, href: '/dashboard/assign-faculty' }
        ]
      
      case 'PROGRAM_CHAIR':
      case 'PROGRAM CHAIR':
        return [
          { name: 'Home', icon: HomeIcon, href: '/dashboard' },
          { name: 'Course Management', icon: BookOpenIcon, href: '/dashboard/courses' },
          { name: 'Analytics', icon: ChartBarIcon, href: '/dashboard/analytics' },
          { name: 'Reports', icon: DocumentTextIcon, href: '/dashboard/reports' },
          { name: 'Submissions', icon: ClipboardDocumentListIcon, href: '/dashboard/submissions' }
        ]
      
      default:
        return [
          { name: 'Home', icon: HomeIcon, href: '/dashboard' }
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
      className={`sidebar-fixed bg-white transition-all duration-500 ease-in-out flex flex-col h-full pr-4 ${
        isExpanded ? 'w-64' : 'w-20'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Navigation Items */}
      <nav className="flex-1 py-4 md:py-6 px-2 md:px-3 space-y-2 md:space-y-3">
        {navigationItems.map((item, index) => {
          const isActive = location.pathname === item.href || 
                         (item.href === '/dashboard' && location.pathname === '/dashboard/')
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center justify-start px-4 md:px-4 py-3 md:py-3 pr-10 md:pr-12 text-xs md:text-sm font-medium rounded-full transition-all duration-200 focus:outline-none ${
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
                <div className="flex-shrink-0 mr-4 md:mr-8">
                  <item.icon className={`h-5 w-5 md:h-6 md:w-6 transition-colors duration-300 ease-in-out ${
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