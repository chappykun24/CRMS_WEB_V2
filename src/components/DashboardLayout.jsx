import React, { useState } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

const DashboardLayout = ({ children }) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

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
      <div className="header-spacer" style={{ height: '88px' }}></div>
      
      {/* Main Content Area with Sidebar and Content */}
      <div className="flex flex-1 min-w-0">
        {/* Sidebar - Fixed at left side */}
        <Sidebar 
          isExpanded={sidebarExpanded} 
          onToggle={handleSidebarToggle} 
        />
        
        {/* Main Content Area - Add left margin for fixed sidebar */}
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-500 ease-in-out ${
          sidebarExpanded ? 'ml-64' : 'ml-20'
        }`}>
          {/* Main Content */}
          <main className="flex-1 overflow-auto p-4 md:p-6 bg-white rounded-lg">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

export default DashboardLayout
