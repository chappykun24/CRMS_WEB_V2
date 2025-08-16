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
      
      {/* Main Content Area with Sidebar and Content - Add top padding for fixed header */}
      <div className="flex flex-1 min-w-0 pt-16">
        {/* Sidebar - Below header, left side */}
        <Sidebar 
          isExpanded={sidebarExpanded} 
          onToggle={handleSidebarToggle} 
        />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

export default DashboardLayout
