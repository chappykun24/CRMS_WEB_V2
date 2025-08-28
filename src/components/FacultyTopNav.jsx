import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpenIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  TrophyIcon,
  DocumentTextIcon
} from '@heroicons/react/24/solid'

const FacultyTopNav = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const tabs = [
    { key: 'classes', label: 'My Classes', href: '/dashboard/classes', icon: BookOpenIcon },
    { key: 'attendance', label: 'Attendance', href: '/dashboard/attendance', icon: CalendarDaysIcon },
    { key: 'assessments', label: 'Assessments', href: '/dashboard/assessments', icon: ClipboardDocumentListIcon },
    { key: 'grades', label: 'Grades', href: '/dashboard/grades', icon: TrophyIcon },
    { key: 'syllabi', label: 'Syllabi', href: '/dashboard/syllabi', icon: DocumentTextIcon }
  ]

  const isActive = (href) => location.pathname === href

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
