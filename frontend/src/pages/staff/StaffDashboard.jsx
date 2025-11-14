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

  // Defer prefetch to idle time - non-blocking
  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      return
    }

    // Use requestIdleCallback for non-blocking prefetch
    const schedulePrefetch = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          console.log('🚀 [StaffDashboard] Starting idle-time prefetch')
          prefetchStaffData().catch(err => {
            console.error('Prefetch error (non-blocking):', err)
          })
        }, { timeout: 5000 })
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          console.log('🚀 [StaffDashboard] Starting deferred prefetch')
          prefetchStaffData().catch(err => {
            console.error('Prefetch error (non-blocking):', err)
          })
        }, 3000)
      }
    }

    // Schedule prefetch after a delay to ensure UI is responsive first
    const timer = setTimeout(schedulePrefetch, 2000)
    setInitialLoadComplete(true)
    
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