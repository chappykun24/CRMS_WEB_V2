import React, { useState, useRef, useEffect } from 'react'
import { UserGroupIcon as AttendanceIcon, ClipboardDocumentListIcon as AssessmentsIcon, EllipsisVerticalIcon } from '@heroicons/react/24/solid'

const ClassCard = ({
  title,
  code,
  section,
  instructor,
  bannerType,
  bannerColor,
  bannerImage,
  avatarUrl,
  isSelected = false,
  onClick,
  onAttendance,
  onAssessments,
  onMore,
  onEdit,
  onArchive
}) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])
  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'border-gray-300 ring-2 ring-gray-200 shadow-md' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
      onClick={onClick}
    >
      {/* Banner */}
      <div className="relative h-24" style={{ 
        backgroundColor: bannerType === 'color' ? bannerColor : 'transparent',
        backgroundImage: bannerType === 'image' && bannerImage ? `url(${bannerImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        {/* Dark gradient overlay - only for image banners */}
        {bannerType === 'image' && (
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/30"></div>
        )}
        {/* Text overlay */}
        <div className="absolute inset-x-0 top-0 p-4 z-10">
          <div className="text-white text-xl font-semibold drop-shadow-sm truncate max-w-[75%]">
            {title}
          </div>
          <div className="text-white/90 text-sm font-medium mt-1">
            {section || code}
          </div>
        </div>
        {/* Avatar removed per request */}
      </div>

      {/* Body */}
      <div className="flex-1 p-4 pt-8">
        <div className="text-xs text-gray-500">{code}</div>
        <div className="text-sm text-gray-800">{instructor}</div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAttendance()
          }}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
          title="Attendance"
        >
          <AttendanceIcon className="h-5 w-5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAssessments()
          }}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
          title="Grading"
        >
          <AssessmentsIcon className="h-5 w-5" />
        </button>
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((v) => !v)
              if (onMore) onMore()
            }}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
            title="More"
          >
            <EllipsisVerticalIcon className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 bottom-full mb-1 z-20 w-36 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => { setMenuOpen(false); if (onEdit) onEdit(); }}
              >
                Edit
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
                onClick={() => { setMenuOpen(false); if (onArchive) onArchive(); }}
              >
                Archive
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClassCard
