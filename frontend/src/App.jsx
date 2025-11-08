import React, { useEffect } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { UnifiedAuthProvider } from './contexts/UnifiedAuthContext'
// Removed SidebarProvider import - using local state instead
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
import { initializeStorageCleanup } from './utils/localStorageManager'
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
  // Guard against BFCache restoring protected content after logout
  const location = useLocation()
  const navigate = useNavigate()

  // Initialize localStorage cleanup on app start
  useEffect(() => {
    try {
      initializeStorageCleanup()
      console.log('✅ [App] LocalStorage cleanup initialized')
    } catch (error) {
      console.warn('⚠️ [App] Failed to initialize storage cleanup:', error)
    }
  }, [])

  useEffect(() => {
    const onPageShow = (event) => {
      if (event.persisted || (performance && performance.getEntriesByType && performance.getEntriesByType('navigation')[0]?.type === 'back_forward')) {
        const storedUser = localStorage.getItem('userData')
        const authed = !!storedUser && storedUser !== 'null' && storedUser !== 'undefined' && storedUser !== ''
        if (!authed && location.pathname !== '/login') {
          navigate('/login', { replace: true })
        }
      }
    }
    const onPopState = () => {
      const storedUser = localStorage.getItem('userData')
      const authed = !!storedUser && storedUser !== 'null' && storedUser !== 'undefined' && storedUser !== ''
      const isProtected = !['/', '/login', '/signup'].includes(location.pathname)
      if (!authed && isProtected) {
        navigate('/login', { replace: true })
      }
    }
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('popstate', onPopState)
    }
  }, [location.pathname, navigate])
  
  return (
    <ErrorBoundary>
      <UnifiedAuthProvider>
        <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/" element={<WelcomeScreen />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route 
                path="/manage-account" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <ManageAccount />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              {/* Main dashboard - redirects to role-specific dashboard */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Dashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Admin Routes */}
              <Route 
                path="/admin/*" 
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <DashboardLayout>
                      <AdminDashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Faculty Routes */}
              <Route 
                path="/faculty/*" 
                element={
                  <ProtectedRoute requiredRoles={["faculty"]}>
                    <DashboardLayout>
                        <FacultyDashboard />
                      </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Dean Routes */}
              <Route 
                path="/dean/*" 
                element={
                  <ProtectedRoute requiredRoles={["dean"]}>
                    <DashboardLayout>
                        <DeanDashboard />
                      </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Staff Routes */}
              <Route 
                path="/staff/*" 
                element={
                  <ProtectedRoute requiredRoles={["staff"]}>
                    <DashboardLayout>
                        <StaffDashboard />
                      </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Program Chair Routes */}
              <Route 
                path="/program-chair/*" 
                element={
                  <ProtectedRoute requiredRoles={["program chair", "program_chair", "programchair"]}>
                    <DashboardLayout>
                        <ProgramChairDashboard />
                      </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Legacy role-specific dashboard paths for backward compatibility */}
              <Route 
                path="/dashboard/classes" 
                element={
                  <ProtectedRoute requiredRoles={["faculty"]}>
                    <DashboardLayout>
                        <FacultyDashboard />
                      </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/assessments" 
                element={
                  <ProtectedRoute requiredRoles={["faculty"]}>
                    <DashboardLayout>
                        <FacultyDashboard />
                      </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/grades" 
                element={
                  <ProtectedRoute requiredRoles={["faculty"]}>
                    <DashboardLayout>
                        <FacultyDashboard />
                      </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/syllabi" 
                element={
                  <ProtectedRoute requiredRoles={["faculty"]}>
                    <DashboardLayout>
                        <FacultyDashboard />
                      </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/analytics" 
                element={
                  <ProtectedRoute requiredRoles={["dean"]}>
                    <DashboardLayout>
                        <DeanDashboard />
                      </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/students" 
                element={
                  <ProtectedRoute requiredRoles={["staff"]}>
                    <DashboardLayout>
                        <StaffDashboard />
                      </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/courses" 
                element={
                  <ProtectedRoute requiredRoles={["program chair", "program_chair", "programchair"]}>
                    <DashboardLayout>
                        <ProgramChairDashboard />
                      </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
      </UnifiedAuthProvider>
    </ErrorBoundary>
  )
}

export default App 