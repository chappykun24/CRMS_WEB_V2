import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import StudentManagement from './StudentManagement'
import AssignFaculty from './AssignFaculty'
import SectionManagement from './SectionManagement'
import { prefetchStaffData } from '../../services/dataPrefetchService'
import { useAuth } from '../../contexts/UnifiedAuthContext'

const StaffDashboard = ({ user }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  // Prefetch data for other pages in the background - only after authentication and initial load
  useEffect(() => {
    // Don't prefetch if not authenticated
    if (!isAuthenticated || authLoading) {
      return
    }

    // Wait for initial page load, then prefetch other interface data
    const timer = setTimeout(() => {
      console.log('🚀 [StaffDashboard] Starting async prefetch after initial load')
      prefetchStaffData()
      setInitialLoadComplete(true)
    }, 1000) // Wait 1 second after dashboard mounts to start prefetching
    
    return () => clearTimeout(timer)
  }, [isAuthenticated, authLoading])
  // Default staff dashboard content
  const defaultContent = (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Staff Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Student Management</h3>
            <p className="text-gray-600">Manage student records and information</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Assign Faculty</h3>
            <p className="text-gray-600">Assign faculty to classes and sections</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Section Management</h3>
            <p className="text-gray-600">Manage class sections and schedules</p>
          </div>
        </div>
      </div>
    </div>
  )

  // Route to specific staff pages
  return (
    <Routes>
      <Route path="/" element={defaultContent} />
      <Route path="/students" element={<StudentManagement />} />
      <Route path="/assign-faculty" element={<AssignFaculty />} />
      <Route path="/sections" element={<SectionManagement />} />
      <Route path="*" element={<Navigate to="/staff" replace />} />
    </Routes>
  )
}

export default StaffDashboard 