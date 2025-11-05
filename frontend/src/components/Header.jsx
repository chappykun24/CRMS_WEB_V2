import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/UnifiedAuthContext'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BellIcon,
  UserIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/solid'
import logo from '../images/logo.png'

const Header = ({ onSidebarToggle, sidebarExpanded }) => {
  const { user, logout } = useAuth()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [selectedClass, setSelectedClass] = useState(null)
  
  // Debug: Log user data to see what's available
  useEffect(() => {
    console.log('🔍 [HEADER] User data received:', user);
    console.log('🔍 [HEADER] User profilePic:', user?.profilePic);
    console.log('🔍 [HEADER] User profile_pic:', user?.profile_pic);
    console.log('🔍 [HEADER] User ID:', user?.user_id || user?.id);
    console.log('🔍 [HEADER] User name:', user?.name);
    console.log('🔍 [HEADER] User first_name:', user?.first_name);
    console.log('🔍 [HEADER] User last_name:', user?.last_name);
    console.log('🔍 [HEADER] User email:', user?.email);
  }, [user]);
  
  const location = useLocation()
  const navigate = useNavigate()
  
  // Listen for localStorage changes to update selected class
  useEffect(() => {
    const handleStorageChange = () => {
      const classData = localStorage.getItem('selectedClass')
      if (classData) {
        try {
          setSelectedClass(JSON.parse(classData))
        } catch (e) {
          setSelectedClass(null)
        }
      } else {
        setSelectedClass(null)
      }
    }
    
    // Check initial value
    handleStorageChange()
    
    // Listen for storage events
    window.addEventListener('storage', handleStorageChange)
    
    // Also listen for custom events (for same-tab updates)
    window.addEventListener('selectedClassChanged', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('selectedClassChanged', handleStorageChange)
    }
  }, [])
  
  const [courseMgmtDetails, setCourseMgmtDetails] = useState({
    selectedProgramId: '',
    programName: '',
    selectedSpecializationId: '',
    specializationName: '',
    activeTab: 'programs' // Add active tab state
  })

  const [userMgmtActiveTab, setUserMgmtActiveTab] = useState('all')
  const [schoolConfigActiveTab, setSchoolConfigActiveTab] = useState('departments')

  const handleLogout = () => {
    logout()
    // Ensure we return to login and remove protected page from history
    navigate('/login', { replace: true })
  }

  const handleSidebarToggle = () => {
    onSidebarToggle()
  }

  // Listen for Course Management tab changes
  useEffect(() => {
    const handleCourseMgmtTabChange = (event) => {
      setCourseMgmtDetails({
        selectedProgramId: event.detail.selectedProgramId || '',
        programName: event.detail.programName || '',
        selectedSpecializationId: event.detail.selectedSpecializationId || '',
        specializationName: event.detail.specializationName || '',
        activeTab: event.detail.activeTab || 'programs' // Update activeTab
      })
    }
    window.addEventListener('courseMgmtTabChanged', handleCourseMgmtTabChange)
    return () => {
      window.removeEventListener('courseMgmtTabChanged', handleCourseMgmtTabChange)
    }
  }, [])

  // Listen for User Management tab changes
  useEffect(() => {
    const handleUserMgmtTabChange = (event) => {
      setUserMgmtActiveTab(event.detail.activeTab || 'all')
    }
    window.addEventListener('userMgmtTabChanged', handleUserMgmtTabChange)
    return () => {
      window.removeEventListener('userMgmtTabChanged', handleUserMgmtTabChange)
    }
  }, [])

  // Listen for School Configuration tab changes
  useEffect(() => {
    const handleSchoolConfigTabChange = (event) => {
      setSchoolConfigActiveTab(event.detail.activeTab || 'departments')
    }
    window.addEventListener('schoolConfigTabChanged', handleSchoolConfigTabChange)
    return () => {
      window.removeEventListener('schoolConfigTabChanged', handleSchoolConfigTabChange)
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

  // Function to get current sidebar item name
  const getCurrentSidebarItem = () => {
    const path = location.pathname
    let userRole = ''
    
    if (user?.role) {
      // Handle different role formats
      const rawRole = String(user.role).toLowerCase()
      if (rawRole.includes('program') && rawRole.includes('chair')) {
        userRole = 'PROGRAMCHAIR'
      } else if (rawRole.includes('program_chair')) {
        userRole = 'PROGRAMCHAIR'
      } else {
        userRole = rawRole.replace(/\s|_/g, '').toUpperCase()
      }
    }
    
    if (path === '/dashboard') {
      return 'Home'
    }
    
    switch (userRole) {
      case 'ADMIN':
        if (path === '/dashboard/users' || path === '/dashboard/faculty-approval') {
          // Show the current tab for User Management
          if (userMgmtActiveTab === 'faculty') {
            return 'User Management'
          }
          return 'User Management'
        }
        if (path === '/dashboard/school-config') {
          // Show the current tab for School Configuration
          if (schoolConfigActiveTab === 'terms') {
            return 'School Terms'
          }
          return 'School Configuration'
        }
        if (path === '/dashboard/settings') {
          return 'System Settings'
        }
        break
      case 'FACULTY':
        if (path === '/dashboard/classes') return 'My Classes'
        if (path === '/dashboard/assessments') return 'Assessments'
        if (path === '/dashboard/grades') return 'Grades'
        if (path === '/dashboard/syllabi') return 'Syllabi'
        break
      case 'DEAN':
        if (path === '/dean' || path === '/dean/') return 'Home'
        if (path === '/dashboard/analytics' || path === '/dean/analytics') return 'Reports and Analytics'
        if (path === '/dashboard/classes' || path === '/dean/classes') return 'Classes'
        if (path === '/dashboard/syllabus-approval' || path === '/dean/syllabus-approval') return 'Syllabus Approval'
        break
      case 'STAFF':
        if (path === '/dashboard/students') return 'Student Management'
        if (path === '/dashboard/records') return 'Academic Records'
        if (path === '/dashboard/assign-faculty') return 'Assign Faculty'
        break
      case 'PROGRAMCHAIR':
        if (path === '/dashboard/courses' || path === '/dashboard/program-chair/courses') {
          // Return "Course Management" as the main section
          return 'Course Management'
        }
        if (path === '/dashboard/analytics' || path === '/dashboard/program-chair/analytics') return 'Analytics'
        if (path === '/dashboard/reports' || path === '/dashboard/program-chair/reports') return 'Reports'
        if (path === '/dashboard/submissions' || path === '/dashboard/program-chair/submissions') return 'Submissions'
        break
      default:
        break
    }
    
    // Fallback: Check path directly if role detection failed
    if (path === '/dashboard/courses' || path.startsWith('/dashboard/program-chair/courses')) {
      // Return "Course Management" as the main section
      return 'Course Management'
    }
    
    return 'Dashboard'
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
      const subtitle = userMgmtActiveTab === 'faculty' ? 'Faculty Approval' : 'All Users'
      return {
        title: userMgmtActiveTab === 'faculty' ? 'UserManagement' : 'User Management',
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
      const subtitle = schoolConfigActiveTab === 'terms' ? 'Manage school terms' : 'Manage departments'
      return { 
        title: 'School Configuration', 
        subtitle,
        path: '/dashboard/school-config'
      }
    } else if (path === '/dashboard/settings') {
      return { 
        title: 'System Settings', 
        subtitle: 'Configure system preferences',
        path: '/dashboard/settings'
      }
    } else if (path.startsWith('/dashboard/faculty/')) {
      // Check if we're in MyClasses and have a selected class
      if (path === '/dashboard/faculty/my-classes') {
        if (selectedClass) {
          return {
            title: 'My Classes',
            subtitle: `${selectedClass.course_title} - ${selectedClass.section_code}`,
            path: '/dashboard/faculty/my-classes'
          }
        }
        return {
          title: 'My Classes',
          subtitle: 'Select a class to view details',
          path: '/dashboard/faculty/my-classes'
        }
      }
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
      if (path === '/dashboard/program-chair/courses') {
        // Enhanced dynamic breadcrumb for Course Management
        let subtitle = ''
        
        // Only show subtitle if there's selected parent content
        if (courseMgmtDetails.programName) {
          if (courseMgmtDetails.specializationName) {
            subtitle = courseMgmtDetails.specializationName
          } else {
            subtitle = courseMgmtDetails.programName
          }
        }
        // If no program is selected, don't show any subtitle
        
        return {
          title: 'Course Management',
          subtitle,
          path: '/dashboard/program-chair/courses'
        }
      }
      return { 
        title: 'Program Chair Dashboard', 
        subtitle: 'Program management',
        path: '/dashboard/program-chair'
      }
    } else if (path === '/dashboard/courses') {
      // Handle the direct /dashboard/courses path
      let subtitle = ''
      
      // Only show subtitle if there's selected parent content
      if (courseMgmtDetails.programName) {
        if (courseMgmtDetails.specializationName) {
          subtitle = courseMgmtDetails.specializationName
        } else {
          subtitle = courseMgmtDetails.programName
        }
      }
      // If no program is selected, don't show any subtitle
      
      return {
        title: 'Course Management',
        subtitle,
        path: '/dashboard/courses'
      }
    }
    
    return { 
      title: 'Dashboard', 
      subtitle: 'Overview',
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
    <header className="fixed-header bg-white">
      
      <div className="flex justify-between items-center h-16 px-4 md:px-6">
        {/* Left side - Hamburger, Logo, and Breadcrumbs */}
        <div className="flex items-center space-x-4">
          {/* Hamburger Menu */}
          <button
            onClick={handleSidebarToggle}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-0"
            title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <Bars3Icon className="h-5 w-5 text-gray-600" />
          </button>

          {/* Logo and CRMS Text */}
          <div className="flex items-center space-x-2">
            <img 
              src={logo} 
              alt="CRMS Logo" 
              className="w-6 h-6 md:w-8 md:h-8 object-contain"
            />
            <h1 className="text-lg md:text-xl font-bold text-primary-600">CRMS</h1>
          </div>

          {/* Breadcrumb Navigation - Following the exact design from the screenshot */}
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span className="font-medium ml-2 text-gray-900">
              {(() => {
                const sidebarItem = getCurrentSidebarItem()
                // Make Course Management clickable when a program is selected
                if (sidebarItem === 'Course Management' && courseMgmtDetails.programName) {
                  return (
                    <button
                      onClick={() => {
                        if (courseMgmtDetails.specializationName) {
                          // If on courses page, go back to specializations
                          const event = new CustomEvent('goBackToSpecializations')
                          window.dispatchEvent(event)
                        } else {
                          // If on specializations page, go back to programs
                          const event = new CustomEvent('resetProgramSelection')
                          window.dispatchEvent(event)
                        }
                      }}
                      className="text-primary-600 hover:text-primary-700 underline cursor-pointer"
                    >
                      {courseMgmtDetails.specializationName ? 'Specializations' : 'Programs'}
                    </button>
                  )
                }
                return sidebarItem
              })()}
            </span>
            
            {/* Show subtitle as second breadcrumb level */}
            {breadcrumbData.subtitle && (
              <>
                <svg className="w-4 h-4 text-gray-400 ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-500 ml-2">{breadcrumbData.subtitle}</span>
              </>
            )}
          </div>
        </div>

        {/* Right side - Profile */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Notification Bell */}
          <div className="relative">
            <button className="p-2 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-0 focus:border-0">
              <BellIcon className="h-5 w-5 text-gray-600" />
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
                {(user?.profilePic || user?.profile_pic) ? (
                  <img 
                    src={user.profilePic || user.profile_pic} 
                    alt={user?.name || 'User'} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log('🔍 [HEADER] Image load error, falling back to default avatar');
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-full h-full bg-primary-600 flex items-center justify-center ${(user?.profilePic || user?.profile_pic) ? 'hidden' : ''}`}>
                  <UserIcon className="h-5 w-5 text-white" />
                </div>
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
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Profile Section */}
                <div className="p-4 text-center bg-white">
                  {/* Large Profile Picture */}
                  <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-gray-200 mx-auto mb-3 relative shadow-lg">
                    {(user?.profilePic || user?.profile_pic) ? (
                      <img 
                        src={user.profilePic || user.profile_pic} 
                        alt={user?.name || 'User'} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.log('🔍 [HEADER MODAL] Image load error, falling back to default avatar');
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full bg-primary-600 flex items-center justify-center ${(user?.profilePic || user?.profile_pic) ? 'hidden' : ''}`}>
                      <UserIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  
                  {/* Greeting */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Hi, {user?.name?.split(' ')[0] || user?.first_name || 'User'}!
                  </h3>
                  
                  {/* Manage Account Button */}
                  <button 
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/manage-account');
                    }}
                    className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium py-2 px-5 rounded-full transition-all duration-200 mb-2 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 hover:shadow-md"
                  >
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