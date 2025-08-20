import React from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import { useSidebar } from '../contexts/SidebarContext'

const DashboardLayout = ({ children }) => {
  const { sidebarExpanded, toggleSidebar } = useSidebar()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header - Fixed at top */}
      <Header 
        onSidebarToggle={toggleSidebar}
        sidebarExpanded={sidebarExpanded}
      />
      
      {/* Header spacer to account for fixed header (match h-16 = 64px) */}
      <div className="header-spacer" style={{ height: '64px' }}></div>
      
      {/* Main Content Area with Sidebar and Content */}
      <div className="flex flex-1 min-w-0">
        {/* Sidebar - Fixed at left side */}
        <Sidebar 
          isExpanded={sidebarExpanded} 
          onToggle={toggleSidebar} 
        />
        
        {/* Main Content Area - Add left margin for fixed sidebar */}
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-500 ease-in-out ${
          sidebarExpanded ? 'ml-64' : 'ml-20'
        }`}>
          {/* Main Content */}
          <main className="flex-1 overflow-auto p-3 md:p-5 bg-gray-50 rounded-tl-3xl">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

export default DashboardLayout
