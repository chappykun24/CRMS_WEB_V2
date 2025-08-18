import React, { useState, useEffect } from 'react'
import { useUser } from '../contexts/UserContext'
import { useLocation, useNavigate } from 'react-router-dom'
import { 
  Bell, 
  User, 
  LogOut, 
  Settings,
  ChevronDown,
  Menu
} from 'lucide-react'
import logo from '../images/logo.png'

const Header = ({ onSidebarToggle, sidebarExpanded }) => {
  const { user, logout } = useUser()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const [schoolConfigActiveTab, setSchoolConfigActiveTab] = useState('departments')
  const [userMgmtActiveTab, setUserMgmtActiveTab] = useState('all')

  const handleLogout = () => {
    logout()
  }

  const handleSidebarToggle = () => {
    onSidebarToggle()
  }

  // Listen for School Configuration tab changes
  useEffect(() => {
    const handleTabChange = (event) => {
      setSchoolConfigActiveTab(event.detail.activeTab)
    }

    window.addEventListener('schoolConfigTabChanged', handleTabChange)
    
    // Get initial value from localStorage
    const initialTab = localStorage.getItem('schoolConfigActiveTab') || 'departments'
    setSchoolConfigActiveTab(initialTab)

    return () => {
      window.removeEventListener('schoolConfigTabChanged', handleTabChange)
    }
  }, [])

  // Listen for User Management tab changes (All Users / Faculty Approval)
  useEffect(() => {
    const handleUserMgmtTabChange = (event) => {
      setUserMgmtActiveTab(event.detail.activeTab)
    }
    window.addEventListener('userMgmtTabChanged', handleUserMgmtTabChange)
    const initialUserTab = localStorage.getItem('userMgmtActiveTab') || 'all'
    setUserMgmtActiveTab(initialUserTab)
    return () => {
      window.removeEventListener('userMgmtTabChanged', handleUserMgmtTabChange)
    }
  }, [])

  const getRoleDisplayName = (role) => {
    if (!role) return 'User'
    
    const roleNames = {
      'ADMIN': 'Administrator',
      'FACULTY': 'Faculty',
      'DEAN': 'Dean',
      'STAFF': 'Staff',
      'PROGRAM_CHAIR': 'Program Chair',
      'PROGRAM CHAIR': 'Program Chair',
      'admin': 'Administrator',
      'faculty': 'Faculty',
      'dean': 'Dean',
      'staff': 'Staff',
      'program chair': 'Program Chair'
    }
    return roleNames[role] || role
  }

  // Function to get breadcrumb data based on current location
  const getBreadcrumbData = () => {
    const path = location.pathname
    
    if (path === '/dashboard') {
      return { 
        title: 'Dashboard', 
        subtitle: 'Overview',
        path: '/dashboard'
      }
    } else if (path === '/dashboard/users' || path === '/dashboard/faculty-approval') {
      // Show which tab is active: All Users or Faculty Approval
      const subtitle = userMgmtActiveTab === 'pending' ? 'Faculty Approval' : 'All Users'
      return {
        title: 'User Management',
        subtitle,
        path: '/dashboard/users'
      }
    } else if (path.startsWith('/dashboard/users/')) {
      // In case we introduce nested routes under user management later
      return {
        title: 'User Management',
        subtitle: 'Manage system users',
        path: '/dashboard/users'
      }
    } else if (path === '/dashboard/school-config') {
      // Use the state value instead of reading from localStorage
      if (schoolConfigActiveTab === 'departments') {
        return { 
          title: 'School Configuration', 
          subtitle: 'Manage departments',
          path: '/dashboard/school-config'
        }
      } else if (schoolConfigActiveTab === 'terms') {
        return { 
          title: 'School Configuration', 
          subtitle: 'Manage school terms',
          path: '/dashboard/school-config'
        }
      }
      
      return { 
        title: 'School Configuration', 
        subtitle: 'Manage departments and terms',
        path: '/dashboard/school-config'
      }
    } else if (path === '/dashboard/settings') {
      return { 
        title: 'System Settings', 
        subtitle: 'Configure system preferences',
        path: '/dashboard/settings'
      }
    } else if (path.startsWith('/dashboard/faculty/')) {
      return { 
        title: 'Faculty Dashboard', 
        subtitle: 'Faculty management',
        path: '/dashboard/faculty'
      }
    } else if (path.startsWith('/dashboard/dean/')) {
      return { 
        title: 'Dean Dashboard', 
        subtitle: 'Dean management',
        path: '/dashboard/dean'
      }
    } else if (path.startsWith('/dashboard/staff/')) {
      return { 
        title: 'Staff Dashboard', 
        subtitle: 'Staff management',
        path: '/dashboard/staff'
      }
    } else if (path.startsWith('/dashboard/program-chair/')) {
      return { 
        title: 'Program Chair Dashboard', 
        subtitle: 'Program management',
        path: '/dashboard/program-chair'
      }
    }
    
    return { 
      title: 'Dashboard', 
      subtitle: 'Welcome',
      path: '/dashboard'
    }
  }

  const breadcrumbData = getBreadcrumbData()

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = (path) => {
    if (path && path !== location.pathname) {
      navigate(path)
    }
  }

  return (
    <header className="fixed-header bg-gray-50">
      <div className="flex justify-between items-center h-16 px-4 md:px-6">
        {/* Left side - Hamburger and Logo */}
        <div className="flex items-center space-x-2 md:px-4">
          {/* Hamburger Menu */}
          <button
            onClick={handleSidebarToggle}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-0 -ml-5"
            title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>

          <div className="flex-shrink-0 flex items-center space-x-2">
            <img 
              src={logo} 
              alt="CRMS Logo" 
              className="w-6 h-6 md:w-8 md:h-8 object-contain"
            />
            <h1 className="text-lg md:text-xl font-bold text-primary-600">CRMS</h1>
          </div>

          {/* Breadcrumb Navigation - Inline with logo */}
          <div className="flex items-center text-sm text-gray-600 ml-4">
            {breadcrumbData.path !== '/dashboard' && (
              <>
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="font-medium ml-2 text-gray-900">
                  {breadcrumbData.title}
                </span>
                {breadcrumbData.subtitle && (
                  <>
                    <svg className="w-4 h-4 text-gray-400 ml-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-500 ml-2">{breadcrumbData.subtitle}</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right side - Profile */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Notification Bell */}
          <div className="relative">
            <button className="p-2 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-0 focus:border-0">
              <Bell className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          
          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-0 focus:border-0 active:outline-none active:ring-0 active:border-0"
              style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
            >
              {/* User Photo */}
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-gray-200 relative">
                {user?.profilePic ? (
                  <img 
                    src={user.profilePic} 
                    alt={user?.name || 'User'} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary-600 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
            </button>

            {/* Profile Modal */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl z-50 overflow-hidden shadow-lg border border-gray-200">
                {/* Header with Email and Close Button */}
                <div className="p-4 flex justify-between items-start bg-gray-50">
                  <div className="text-center flex-1">
                    <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                    <p className="text-xs text-gray-500">CRMS Account</p>
                  </div>
                  <button
                    onClick={() => setShowProfileMenu(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Profile Section */}
                <div className="p-4 text-center bg-white">
                  {/* Large Profile Picture */}
                  <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-gray-200 mx-auto mb-3 relative shadow-lg">
                    {user?.profilePic ? (
                      <img 
                        src={user.profilePic} 
                        alt={user?.name || 'User'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary-600 flex items-center justify-center">
                        <User className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* Greeting */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Hi, {user?.name?.split(' ')[0] || 'User'}!
                  </h3>
                  
                  {/* Manage Account Button */}
                  <button className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium py-2 px-5 rounded-full transition-all duration-200 mb-2 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 hover:shadow-md">
                    Manage your CRMS Account
                  </button>
                </div>
                
                {/* Action Buttons */}
                <div className="px-4 pb-3 bg-gray-50">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg flex items-center space-x-3 transition-colors hover:text-red-600"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign out</span>
                  </button>
                </div>

                {/* Footer Links */}
                <div className="px-6 py-3 text-center bg-gray-50">
                  <div className="flex justify-center space-x-4 text-xs text-gray-500">
                    <a href="#" className="hover:text-primary-600 transition-colors">Privacy Policy</a>
                    <span>•</span>
                    <a href="#" className="hover:text-primary-600 transition-colors">Terms of Service</a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close profile menu */}
      {showProfileMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowProfileMenu(false)}
        />
      )}
    </header>
  )
}

export default Header 