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
  // Route to specific staff pages
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/staff/students" replace />} />
      <Route path="/students" element={<StudentManagement />} />
      <Route path="/assign-faculty" element={<AssignFaculty />} />
      <Route path="/sections" element={<SectionManagement />} />
      <Route path="*" element={<Navigate to="/staff/students" replace />} />
    </Routes>
  )
}

export default StaffDashboard 