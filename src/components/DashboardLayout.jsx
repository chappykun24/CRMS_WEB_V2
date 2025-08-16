import React, { useState } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

const DashboardLayout = ({ children }) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)

  const handleSidebarToggle = () => {
    setSidebarExpanded(!sidebarExpanded)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Fixed at top */}
      <Header 
        onSidebarToggle={handleSidebarToggle}
        sidebarExpanded={sidebarExpanded}
      />
      
      {/* Header spacer to account for fixed header */}
      <div className="header-spacer"></div>
      
      {/* Main Content Area with Sidebar and Content */}
      <div className="flex flex-1 min-w-0">
        {/* Sidebar - Below header, left side */}
        <div className="sidebar-container">
          <Sidebar 
            isExpanded={sidebarExpanded} 
            onToggle={handleSidebarToggle} 
          />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Main Content */}
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

export default DashboardLayout
