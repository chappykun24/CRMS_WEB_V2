import React, { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

// Import role-specific home components
import AdminHome from './admin/AdminDashboard'
import Home from './admin/Home'
import UserManagement from './admin/UserManagement'
import FacultyApproval from './admin/FacultyApproval'
import SystemSettings from './admin/SystemSettings'
import FacultyHome from './faculty/FacultyDashboard'
import MyClasses from './faculty/MyClasses'
import Attendance from './faculty/Attendance'
import Assessments from './faculty/Assessments'
import Grades from './faculty/Grades'
import Syllabi from './faculty/Syllabi'
import DeanHome from './dean/DeanDashboard'
import Analytics from './dean/Analytics'
import DeanMyClasses from './dean/MyClasses'
import StaffHome from './staff/StaffDashboard'
import StudentManagement from './staff/StudentManagement'
import ProgramChairHome from './program-chair/ProgramChairDashboard'

const Dashboard = () => {
  const { user } = useUser()
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  const handleSidebarToggle = () => {
    setSidebarExpanded(!sidebarExpanded)
  }

  const getDashboardComponent = () => {
    switch (user?.role) {
      case 'ADMIN':
        return <AdminHome />
      case 'FACULTY':
        return <FacultyHome />
      case 'DEAN':
        return <DeanHome />
      case 'STAFF':
        return <StaffHome />
      case 'PROGRAM_CHAIR':
        return <ProgramChairHome />
      default:
        return <Navigate to="/login" replace />
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header onSidebarToggle={handleSidebarToggle} sidebarExpanded={sidebarExpanded} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isExpanded={sidebarExpanded} onToggle={handleSidebarToggle} />
        <main className="flex-1 m-2 overflow-hidden">
          <div className="bg-white rounded-3xl h-full p-6 overflow-auto">
            <Routes>
              <Route path="/" element={getDashboardComponent()} />
              {/* Admin Routes */}
              {user?.role === 'ADMIN' && (
                <>
                  <Route path="/home" element={<Home />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/faculty-approval" element={<FacultyApproval />} />
                  <Route path="/settings" element={<SystemSettings />} />
                </>
              )}
              
              {/* Faculty Routes */}
              {user?.role === 'FACULTY' && (
                <>
                  <Route path="/classes" element={<MyClasses />} />
                  <Route path="/attendance" element={<Attendance />} />
                  <Route path="/assessments" element={<Assessments />} />
                  <Route path="/grades" element={<Grades />} />
                  <Route path="/syllabi" element={<Syllabi />} />
                </>
              )}
              
              {/* Dean Routes */}
              {user?.role === 'DEAN' && (
                <>
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/classes" element={<DeanMyClasses />} />
                </>
              )}
              
              {/* Staff Routes */}
              {user?.role === 'STAFF' && (
                <>
                  <Route path="/students" element={<StudentManagement />} />
                </>
              )}
              <Route path="*" element={getDashboardComponent()} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Dashboard 