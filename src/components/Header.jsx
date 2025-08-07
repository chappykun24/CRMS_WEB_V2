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
    const roleNames = {
      'ADMIN': 'Administrator',
      'FACULTY': 'Faculty',
      'DEAN': 'Dean',
      'STAFF': 'Staff',
      'PROGRAM_CHAIR': 'Program Chair'
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

          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold text-primary-600">CRMS</h1>
          </div>
        </div>

        {/* Right side - Notifications and Profile */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors relative">
            <Bell className="h-6 w-6" />
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400"></span>
          </button>

          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-200 transition-colors"
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
              
              {/* User Info */}
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500">
                  {getRoleDisplayName(user?.role)}
                </p>
              </div>
              
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {/* Profile Modal */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                {/* Profile Section */}
                <div className="p-6 text-center border-b border-gray-100">
                  {/* Large Profile Picture */}
                  <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-gray-100 mx-auto mb-4 relative">
                    {user?.profilePic ? (
                      <img 
                        src={user.profilePic} 
                        alt={user?.name || 'User'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary-600 flex items-center justify-center">
                        <User className="h-8 w-8 text-white" />
                      </div>
                    )}
                    {/* Online status indicator */}
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  
                  {/* User Name */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {user?.name || 'User'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {user?.email}
                  </p>
                </div>
                
                {/* Menu Options */}
                <div className="py-2">
                  <button className="w-full text-left px-6 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors">
                    <Settings className="h-4 w-4 text-gray-500" />
                    <span>Settings</span>
                  </button>
                  
                  <div className="border-t border-gray-100 my-1"></div>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-6 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
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