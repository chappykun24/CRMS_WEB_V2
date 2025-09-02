import React from 'react'
import { CameraIcon as AttendanceIcon, ClipboardDocumentListIcon as AssessmentsIcon, EllipsisVerticalIcon } from '@heroicons/react/24/solid'

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
  onMore
}) => {
  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'border-red-500 ring-2 ring-red-200 shadow-md' 
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
        {/* Text overlay */}
        <div className="absolute inset-x-0 top-0 p-4">
          <div className="text-white text-xl font-semibold drop-shadow-sm truncate max-w-[75%]">
            {title}
          </div>
          <div className="text-white/90 text-sm font-medium mt-1">
            {section || code}
          </div>
        </div>
        {/* Avatar */}
        <div className="absolute -bottom-6 right-4">
          <div className="h-16 w-16 rounded-full ring-4 ring-white overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={instructor} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gray-100" />
            )}
          </div>
        </div>
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
          title="Assessments"
        >
          <AssessmentsIcon className="h-5 w-5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMore()
          }}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
          title="More"
        >
          <EllipsisVerticalIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

export default ClassCard
