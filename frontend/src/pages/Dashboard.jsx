import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/UnifiedAuthContext'
import AdminDashboard from './admin/AdminDashboard'
import FacultyDashboard from './faculty/FacultyDashboard'
import DeanDashboard from './dean/DeanDashboard'
import StaffDashboard from './staff/StaffDashboard'
import ProgramChairDashboard from './program-chair/ProgramChairDashboard'

const Dashboard = () => {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  console.log('[Dashboard] render', { isLoading, user })
  
  // Debug: Show detailed user information
  useEffect(() => {
    if (user) {
      console.log('🔍 [Dashboard] User Debug Information:')
      console.log('  - User ID:', user.user_id || user.id)
      console.log('  - Email:', user.email)
      console.log('  - Name:', user.first_name, user.last_name)
      console.log('  - Role:', user.role_name || user.role)
      console.log('  - Department:', user.department_name || user.department)
      console.log('  - Employee ID:', user.employee_id)
      console.log('  - Is Active:', user.is_active)
      console.log('  - Last Login:', user.last_login)
      console.log('  - Full User Object:', user)
    }
  }, [user])

  // Redirect to role-specific dashboard based on user role
  useEffect(() => {
    if (!isLoading && user) {
      const role = String(user.role_name || user.role || '').toLowerCase().replace(/\s|_/g, '')
      console.log('[Dashboard] redirecting based on role', { role, raw: user.role })
      
      switch (role) {
        case 'admin':
          navigate('/admin/users', { replace: true })
          break
        case 'faculty':
          navigate('/faculty/classes', { replace: true })
          break
        case 'dean':
          navigate('/dean', { replace: true })
          break
        case 'staff':
          navigate('/staff', { replace: true })
          break
        case 'programchair':
        case 'program_chair':
        case 'program chair':
          navigate('/program-chair', { replace: true })
          break
        default:
          console.warn('[Dashboard] unknown role, staying on main dashboard', { role })
      }
    }
  }, [user, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please log in to access your dashboard.</p>
        </div>
      </div>
    )
  }

  // Fallback: Show role-specific dashboard directly if redirect didn't work
  const role = String(user.role_name || user.role || '').toLowerCase().replace(/\s|_/g, '')
  console.log('[Dashboard] fallback render', { role, raw: user.role })

  if (role === 'admin') return <AdminDashboard user={user} />
  if (role === 'faculty') return <FacultyDashboard user={user} />
  if (role === 'dean') return <DeanDashboard user={user} />
  if (role === 'staff') return <StaffDashboard user={user} />
  if (role === 'programchair') return <ProgramChairDashboard user={user} />

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Welcome, {user.name}!</h2>
            <p className="text-gray-600 mb-4">Role: {user.role_name || user.role || 'Unknown'}</p>
            <p className="text-gray-600">Email: {user.email}</p>
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">
                <strong>Note:</strong> Dashboard for role "{user.role_name || user.role}" is under development.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 