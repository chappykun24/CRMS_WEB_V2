import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import UserManagement from './UserManagement'
import FacultyApproval from './FacultyApproval'
import SystemSettings from './SystemSettings'
import SchoolConfiguration from './SchoolConfiguration'
import { prefetchAdminData } from '../../services/dataPrefetchService'

const AdminDashboard = ({ user }) => {
  // Prefetch data for other pages in the background
  useEffect(() => {
    // Wait 1 second after dashboard mounts to start prefetching
    const timer = setTimeout(() => {
      prefetchAdminData()
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [])

  // Route to specific admin pages
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/users" replace />} />
      <Route path="/users" element={<UserManagement />} />
      <Route path="/faculty-approval" element={<FacultyApproval />} />
      <Route path="/school-config" element={<SchoolConfiguration />} />
      <Route path="/settings" element={<SystemSettings />} />
      <Route path="*" element={<Navigate to="/admin/users" replace />} />
    </Routes>
  )
}

export default AdminDashboard 