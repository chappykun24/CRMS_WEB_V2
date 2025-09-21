import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Analytics from './Analytics'
import MyClasses from './MyClasses'
import { CardGridSkeleton } from '../../components/skeletons'

const DeanDashboard = ({ user }) => {
  // Default dean dashboard content with skeleton loading
  const defaultContent = (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dean Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardGridSkeleton cards={6} />
        </div>
      </div>
    </div>
  )

  return (
    <Routes>
      <Route path="/" element={defaultContent} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/classes" element={<MyClasses />} />
      <Route path="*" element={<Navigate to="/dean" replace />} />
    </Routes>
  )
}

export default DeanDashboard 