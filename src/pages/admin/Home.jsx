import React from 'react'
import { Navigate } from 'react-router-dom'

const Home = () => {
  // Redirect to admin dashboard for consistency
  return <Navigate to="/dashboard/" replace />
}

export default Home 