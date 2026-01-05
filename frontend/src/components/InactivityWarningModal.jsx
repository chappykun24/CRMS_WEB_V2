import React, { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

const InactivityWarningModal = ({ 
  isOpen, 
  onStayLoggedIn, 
  onLogout, 
  countdown = 60 
}) => {
  const [timeLeft, setTimeLeft] = useState(countdown)

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(countdown)
      return
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          onLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, countdown, onLogout])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Session Timeout Warning</h3>
          </div>
        </div>

        {/* Modal Content */}
        <div className="mb-6">
          <p className="text-gray-700 mb-2">
            You have been inactive for a while. Your session will expire in:
          </p>
          <div className="text-center my-4">
            <div className="text-4xl font-bold text-red-600">
              {timeLeft}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {timeLeft === 1 ? 'second' : 'seconds'}
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Click "Stay Logged In" to continue your session, or you will be automatically logged out.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Logout Now
          </button>
          <button
            onClick={onStayLoggedIn}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  )
}

export default InactivityWarningModal

