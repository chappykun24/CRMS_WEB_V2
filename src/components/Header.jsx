import React, { useState } from 'react'
import { useUser } from '../contexts/UserContext'
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

  const handleLogout = () => {
    logout()
  }

  const handleSidebarToggle = () => {
    onSidebarToggle()
  }

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

  return (
    <header className="bg-gray-50">
      <div className="flex justify-between items-center h-16 px-4">
        {/* Left side - Hamburger and Logo */}
        <div className="flex items-center space-x-4">
          {/* Hamburger Menu */}
          <button
            onClick={handleSidebarToggle}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-0"
            title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>

          <div className="flex-shrink-0 flex items-center space-x-2">
            <img 
              src={logo} 
              alt="CRMS Logo" 
              className="w-8 h-8 object-contain"
            />
            <h1 className="text-xl font-bold text-primary-600">CRMS</h1>
          </div>
        </div>

        {/* Right side - Profile */}
        <div className="flex items-center space-x-4">
          {/* Role Display */}
          <div className="text-right hidden md:block">
            <p className="text-xs text-gray-500">Role</p>
            <p className="text-sm font-medium text-gray-900">{getRoleDisplayName(user?.role)}</p>
          </div>
          
          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-0 focus:border-0 active:outline-none active:ring-0 active:border-0"
              style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
            >
              {/* User Photo */}
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 relative">
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
                {/* Online status indicator */}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
            </button>

            {/* Profile Modal */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                {/* Header with Email and Close Button */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                  <div className="text-center flex-1">
                    <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                    <p className="text-xs text-gray-500">CRMS Account</p>
                  </div>
                  <button
                    onClick={() => setShowProfileMenu(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Profile Section */}
                <div className="p-4 text-center">
                  {/* Large Profile Picture */}
                  <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-gray-100 mx-auto mb-3 relative">
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
                    {/* Online status indicator */}
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  
                  {/* Greeting */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Hi, {user?.name?.split(' ')[0] || 'User'}!
                  </h3>
                  
                  {/* Manage Account Button */}
                  <button className="bg-gray-100 hover:bg-gray-200 text-primary-600 text-sm font-medium py-2 px-5 rounded-full border border-gray-300 transition-colors mb-2 focus:outline-none focus:ring-0 focus:border-gray-300 active:outline-none active:ring-0 active:border-gray-300"
                    style={{ outline: 'none', boxShadow: 'none' }}>
                    Manage your CRMS Account
                  </button>
                </div>
                
                {/* Action Buttons */}
                <div className="px-4 pb-3">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center space-x-3 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign out</span>
                  </button>
                </div>

                {/* Footer Links */}
                <div className="px-6 py-3 border-t border-gray-100 text-center">
                  <div className="flex justify-center space-x-4 text-xs text-gray-500">
                    <a href="#" className="hover:text-gray-700 transition-colors">Privacy Policy</a>
                    <span>•</span>
                    <a href="#" className="hover:text-gray-700 transition-colors">Terms of Service</a>
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