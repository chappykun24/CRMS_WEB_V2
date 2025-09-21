import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import CourseManagement from './CourseManagement'
import Analytics from './Analytics'
import Reports from './Reports'
import Submissions from './Submissions'
import { CardGridSkeleton } from '../../components/skeletons'

const ProgramChairDashboard = ({ user }) => {
  // Default program chair dashboard content with skeleton loading
  const defaultContent = (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Program Chair Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CardGridSkeleton cards={8} />
        </div>
      </div>
    </div>
  )

  // Route to specific program chair pages
  return (
    <Routes>
      <Route path="/" element={defaultContent} />
      <Route path="/courses" element={<CourseManagement />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/submissions" element={<Submissions />} />
      <Route path="*" element={<Navigate to="/program-chair" replace />} />
    </Routes>
  )
}

export default ProgramChairDashboard 