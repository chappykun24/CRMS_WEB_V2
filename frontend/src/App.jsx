import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { UnifiedAuthProvider } from './contexts/UnifiedAuthContext'
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
import BrowserHistoryProtection from './components/BrowserHistoryProtection'
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
      <UnifiedAuthProvider>
        <BrowserHistoryProtection>
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
              
            </Routes>
          </div>
        </BrowserHistoryProtection>
      </UnifiedAuthProvider>
    </ErrorBoundary>
  )
}

export default App 