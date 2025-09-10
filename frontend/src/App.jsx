import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SidebarProvider } from './contexts/SidebarContext'
import WelcomeScreen from './pages/WelcomeScreen'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import FacultyDashboard from './pages/faculty/FacultyDashboard'
import DeanDashboard from './pages/dean/DeanDashboard'
import StaffDashboard from './pages/staff/StaffDashboard'
import ProgramChairDashboard from './pages/program-chair/ProgramChairDashboard'
import DashboardLayout from './components/DashboardLayout'
import ProtectedRoute from './components/ProtectedRoute'
import ManageAccount from './components/ManageAccount'
import './App.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h1>Something went wrong.</h1>
          <p>Error: {this.state.error?.message}</p>
          <pre>{this.state.error?.stack}</pre>
        </div>
      )
    }

    return this.props.children
  }
}

function App() {
  console.log('App component is rendering')
  
  return (
    <ErrorBoundary>
      <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/" element={<WelcomeScreen />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route 
                path="/manage-account" 
                element={
                  <ProtectedRoute>
                    <SidebarProvider>
                      <DashboardLayout>
                        <ManageAccount />
                      </DashboardLayout>
                    </SidebarProvider>
                  </ProtectedRoute>
                } 
              />
              {/* Main dashboard - redirects to role-specific dashboard */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <SidebarProvider>
                      <DashboardLayout>
                        <Dashboard />
                      </DashboardLayout>
                    </SidebarProvider>
                  </ProtectedRoute>
                } 
              />
              
              {/* Admin Routes */}
              <Route 
                path="/admin/*" 
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <SidebarProvider>
                      <DashboardLayout>
                        <AdminDashboard />
                      </DashboardLayout>
                    </SidebarProvider>
                  </ProtectedRoute>
                } 
              />
              
              {/* Faculty Routes */}
              <Route 
                path="/faculty/*" 
                element={
                  <ProtectedRoute requiredRoles={["faculty"]}>
                    <SidebarProvider>
                      <DashboardLayout>
                        <FacultyDashboard />
                      </DashboardLayout>
                    </SidebarProvider>
                  </ProtectedRoute>
                } 
              />
              
              {/* Dean Routes */}
              <Route 
                path="/dean/*" 
                element={
                  <ProtectedRoute requiredRoles={["dean"]}>
                    <SidebarProvider>
                      <DashboardLayout>
                        <DeanDashboard />
                      </DashboardLayout>
                    </SidebarProvider>
                  </ProtectedRoute>
                } 
              />
              
              {/* Staff Routes */}
              <Route 
                path="/staff/*" 
                element={
                  <ProtectedRoute requiredRoles={["staff"]}>
                    <SidebarProvider>
                      <DashboardLayout>
                        <StaffDashboard />
                      </DashboardLayout>
                    </SidebarProvider>
                  </ProtectedRoute>
                } 
              />
              
              {/* Program Chair Routes */}
              <Route 
                path="/program-chair/*" 
                element={
                  <ProtectedRoute requiredRoles={["program chair", "program_chair", "programchair"]}>
                    <SidebarProvider>
                      <DashboardLayout>
                        <ProgramChairDashboard />
                      </DashboardLayout>
                    </SidebarProvider>
                  </ProtectedRoute>
                } 
              />
              
              {/* Legacy role-specific dashboard paths for backward compatibility */}
              <Route 
                path="/dashboard/classes" 
                element={
                  <ProtectedRoute requiredRoles={["faculty"]}>
                    <SidebarProvider>
                      <DashboardLayout>
                        <FacultyDashboard />
                      </DashboardLayout>
                    </SidebarProvider>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/analytics" 
                element={
                  <ProtectedRoute requiredRoles={["dean"]}>
                    <SidebarProvider>
                      <DashboardLayout>
                        <DeanDashboard />
                      </DashboardLayout>
                    </SidebarProvider>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/students" 
                element={
                  <ProtectedRoute requiredRoles={["staff"]}>
                    <SidebarProvider>
                      <DashboardLayout>
                        <StaffDashboard />
                      </DashboardLayout>
                    </SidebarProvider>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/courses" 
                element={
                  <ProtectedRoute requiredRoles={["program chair", "program_chair", "programchair"]}>
                    <SidebarProvider>
                      <DashboardLayout>
                        <ProgramChairDashboard />
                      </DashboardLayout>
                    </SidebarProvider>
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App 