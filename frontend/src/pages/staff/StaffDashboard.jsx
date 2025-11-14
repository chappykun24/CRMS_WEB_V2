import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import StudentManagement from './StudentManagement'
import AssignFaculty from './AssignFaculty'
import SectionManagement from './SectionManagement'

const StaffDashboard = ({ user }) => {
  // Route to specific staff pages
  // Each component handles its own data fetching with prioritization
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