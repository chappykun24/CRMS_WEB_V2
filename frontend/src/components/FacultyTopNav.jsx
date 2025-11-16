import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpenIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  TrophyIcon,
  DocumentTextIcon,
  ChartBarIcon
} from '@heroicons/react/24/solid'

const FacultyTopNav = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const tabs = [
    { key: 'classes', label: 'My Classes', href: '/faculty/classes', icon: BookOpenIcon },
    { key: 'assessments', label: 'Assessments', href: '/faculty/assessments', icon: ClipboardDocumentListIcon },
    { key: 'grades', label: 'Grades', href: '/faculty/grades', icon: TrophyIcon },
    { key: 'syllabus', label: 'Syllabus', href: '/faculty/syllabus', icon: DocumentTextIcon },
    { key: 'analytics', label: 'Analytics', href: '/faculty/analytics', icon: ChartBarIcon }
  ]

  const isActive = (href) => {
    const currentPath = location.pathname
    // Handle both /faculty/ and /dashboard/ paths
    if (currentPath === href) return true
    // Check for legacy /dashboard/ paths
    const legacyPath = href.replace('/faculty/', '/dashboard/')
    if (currentPath === legacyPath) return true
    // Check for new /faculty/ paths when on legacy
    const newPath = href.replace('/dashboard/', '/faculty/')
    if (currentPath === newPath) return true
    return false
  }

  return (
    <div className="w-full">
      <div className="bg-gray-50">
        <nav className="flex space-x-8 bg-gray-50 border-b border-gray-200">
          {tabs.map(({ key, label, href, icon: Icon }) => (
            <button
              key={key}
              onClick={() => navigate(href)}
              className={`tab-button inline-flex items-center gap-2 py-4 px-4 font-medium text-sm transition-colors ${
                isActive(href) ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

export default FacultyTopNav
