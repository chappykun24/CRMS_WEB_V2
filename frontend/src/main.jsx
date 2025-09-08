import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import './index.css'

console.log('main.jsx is executing')

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
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
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