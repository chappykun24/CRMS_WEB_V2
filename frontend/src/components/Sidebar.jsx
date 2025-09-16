import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/UnifiedAuthContext'
import {
  HomeIcon,
  UserGroupIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ClipboardDocumentListIcon,
  AcademicCapIcon,
  UserPlusIcon,
  CircleStackIcon,
  BuildingOffice2Icon
} from '@heroicons/react/24/solid'

const Sidebar = ({ isExpanded, onToggle }) => {
  const { user } = useAuth()
  const location = useLocation()
  const [isHovered, setIsHovered] = useState(false)
  const hoverTimeoutRef = useRef(null)

  const getNavigationItems = () => {
    const userRole = user?.role_name ? String(user.role_name).replace(/\s|_/g, '').toUpperCase() : undefined
    console.log('🔍 [Sidebar] User role debug:', { 
      user, 
      role_name: user?.role_name, 
      userRole,
      hasUser: !!user 
    })
    
    switch (userRole) {
      case 'ADMIN':
        return [
          { name: 'Home', icon: HomeIcon, href: '/admin' },
          { name: 'User Management', icon: UserGroupIcon, href: '/admin/users' },
          { name: 'School Configuration', icon: BuildingOffice2Icon, href: '/admin/school-config' },
          { name: 'System Settings', icon: Cog6ToothIcon, href: '/admin/settings' }
        ]
      
      case 'FACULTY':
        return [
          { name: 'My Classes', icon: BookOpenIcon, href: '/faculty/classes' },
          { name: 'Assessments', icon: ClipboardDocumentListIcon, href: '/faculty/assessments' },
          { name: 'Grades', icon: AcademicCapIcon, href: '/faculty/grades' },
          { name: 'Syllabi', icon: DocumentTextIcon, href: '/faculty/syllabi' }
        ]
      
      case 'DEAN':
        return [
          { name: 'Home', icon: HomeIcon, href: '/dean' },
          { name: 'Analytics', icon: ChartBarIcon, href: '/dean/analytics' },
          { name: 'My Classes', icon: BookOpenIcon, href: '/dean/classes' },
          { name: 'Reports', icon: DocumentTextIcon, href: '/dean/reports' },
          { name: 'Syllabus Approval', icon: DocumentTextIcon, href: '/dean/syllabus-approval' }
        ]
      
      case 'STAFF':
        return [
          { name: 'Home', icon: HomeIcon, href: '/staff' },
          { name: 'Student Management', icon: UserGroupIcon, href: '/staff/students' },
          { name: 'Class Management', icon: UserPlusIcon, href: '/staff/assign-faculty' },
          { name: 'Section Management', icon: ClipboardDocumentListIcon, href: '/staff/sections' }
        ]
      
      case 'PROGRAMCHAIR':
        return [
          { name: 'Home', icon: HomeIcon, href: '/program-chair' },
          { name: 'Course Management', icon: BookOpenIcon, href: '/program-chair/courses' },
          { name: 'Analytics', icon: ChartBarIcon, href: '/program-chair/analytics' },
          { name: 'Reports', icon: DocumentTextIcon, href: '/program-chair/reports' },
          { name: 'Submissions', icon: ClipboardDocumentListIcon, href: '/program-chair/submissions' }
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