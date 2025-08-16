import React, { useState } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

const DashboardLayout = ({ children }) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)

  const handleSidebarToggle = () => {
    setSidebarExpanded(!sidebarExpanded)
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar - Fixed width and height */}
      <div className="flex-shrink-0">
        <Sidebar 
          isExpanded={sidebarExpanded} 
          onToggle={handleSidebarToggle} 
        />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <Header 
          onSidebarToggle={handleSidebarToggle}
          sidebarExpanded={sidebarExpanded}
        />
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-white">
          {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
