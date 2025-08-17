import React, { createContext, useContext, useState } from 'react'

const SidebarContext = createContext()

export const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

export const SidebarProvider = ({ children }) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded)
  }

  const value = {
    sidebarExpanded,
    toggleSidebar
  }

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  )
}
