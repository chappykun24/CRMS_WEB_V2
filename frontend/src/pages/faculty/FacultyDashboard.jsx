import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import MyClasses from './MyClasses'
import Attendance from './Attendance'
import Assessments from './Assessments'
import Grades from './Grades'
import Syllabi from './Syllabi'

const FacultyDashboard = ({ user }) => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/faculty/classes" replace />} />
      <Route path="/classes" element={<MyClasses />} />
      <Route path="/attendance" element={<Attendance />} />
      <Route path="/assessments" element={<Assessments />} />
      <Route path="/grades" element={<Grades />} />
      <Route path="/syllabi" element={<Syllabi />} />
      <Route path="*" element={<Navigate to="/faculty/classes" replace />} />
    </Routes>
  )
}

export default FacultyDashboard 