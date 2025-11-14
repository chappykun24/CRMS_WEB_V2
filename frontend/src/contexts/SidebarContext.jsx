import React, { createContext, useContext } from 'react'

export const SidebarContext = createContext()

export const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (!context) {
    // Return default values if context is not available (for components outside DashboardLayout)
    return { sidebarExpanded: true, toggleSidebar: () => {} }
  }
  return context
}
