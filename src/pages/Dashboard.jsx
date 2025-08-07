import React, { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

// Import role-specific dashboard components
import AdminDashboard from './admin/AdminDashboard'
import Home from './admin/Home'
import UserManagement from './admin/UserManagement'
import FacultyDashboard from './faculty/FacultyDashboard'
import DeanDashboard from './dean/DeanDashboard'
import StaffDashboard from './staff/StaffDashboard'
import ProgramChairDashboard from './program-chair/ProgramChairDashboard'

const Dashboard = () => {
  const { user } = useUser()
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  const handleSidebarToggle = () => {
    setSidebarExpanded(!sidebarExpanded)
  }

  const getDashboardComponent = () => {
    switch (user?.role) {
      case 'ADMIN':
        return <Home />
      case 'FACULTY':
        return <FacultyDashboard />
      case 'DEAN':
        return <DeanDashboard />
      case 'STAFF':
        return <StaffDashboard />
      case 'PROGRAM_CHAIR':
        return <ProgramChairDashboard />
      default:
        return <Navigate to="/login" replace />
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header onSidebarToggle={handleSidebarToggle} sidebarExpanded={sidebarExpanded} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isExpanded={sidebarExpanded} onToggle={handleSidebarToggle} />
        <main className="flex-1 m-4 overflow-auto">
          <div className="bg-white rounded-3xl h-full p-6 shadow-sm">
            <Routes>
              <Route path="/" element={getDashboardComponent()} />
              {/* Admin Routes */}
              {user?.role === 'ADMIN' && (
                <>
                  <Route path="/home" element={<Home />} />
                  <Route path="/users" element={<UserManagement />} />
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