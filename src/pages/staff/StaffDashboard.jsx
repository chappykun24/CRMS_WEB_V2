import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import StudentManagement from './StudentManagement'
import AssignFaculty from './AssignFaculty'

const StaffDashboard = ({ user }) => {
  const location = useLocation()

  // If we're at the root staff dashboard, show minimal content
  if (location.pathname === '/dashboard') {
    return null
  }

  // Route to specific staff pages
  return (
    <Routes>
      <Route path="/students" element={<StudentManagement />} />
      <Route path="/assign-faculty" element={<AssignFaculty />} />
    </Routes>
  )
}

export default StaffDashboard 