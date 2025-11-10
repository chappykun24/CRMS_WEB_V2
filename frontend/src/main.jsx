import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { initAnalytics } from './services/analyticsService'
import { BrowserRouter } from 'react-router-dom'
import './index.css'

console.log('main.jsx is executing')

// Initialize analytics before rendering the app
try {
  initAnalytics()
} catch (_) {
  // fail-safe: never block app render due to analytics
}

try {
  const rootElement = document.getElementById('root')
  console.log('Root element found:', rootElement)
  
  if (!rootElement) {
    throw new Error('Root element not found')
  }
  
  const root = ReactDOM.createRoot(rootElement)
  console.log('React root created')
  
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  )
  
  console.log('App rendered successfully')
} catch (error) {
  console.error('Error initializing React app:', error)
  // Fallback - try to show error on page
  const rootElement = document.getElementById('root')
  if (rootElement) {
    rootElement.innerHTML = `<div style="padding: 20px; color: red; background: white;">
      <h1>Error loading React app</h1>
      <p>${error.message}</p>
      <pre>${error.stack}</pre>
    </div>`
  }
} 