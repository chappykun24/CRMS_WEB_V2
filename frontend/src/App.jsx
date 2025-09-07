import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { UserProvider } from './contexts/UserContext'
import { SidebarProvider } from './contexts/SidebarContext'
import WelcomeScreen from './pages/WelcomeScreen'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import Dashboard from './pages/Dashboard'
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
      <UserProvider>
        <Router>
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
              <Route 
                path="/dashboard/*" 
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
            </Routes>
          </div>
        </Router>
      </UserProvider>
    </ErrorBoundary>
  )
}

export default App 