import { useEffect, useRef, useCallback } from 'react'

/**
 * Custom hook to detect user inactivity and trigger logout
 * @param {Function} onInactive - Callback when user is inactive
 * @param {number} inactivityTimeout - Time in milliseconds before logout (default: 15 minutes)
 * @param {number} warningTime - Time in milliseconds before logout to show warning (default: 1 minute)
 * @param {Function} onWarning - Callback when warning should be shown
 * @param {boolean} isActive - Whether the timer should be active (default: true)
 */
export const useInactivityTimer = (
  onInactive,
  inactivityTimeout = 15 * 60 * 1000, // 15 minutes
  warningTime = 60 * 1000, // 1 minute before logout
  onWarning = null,
  isActive = true
) => {
  const timeoutRef = useRef(null)
  const warningTimeoutRef = useRef(null)
  const lastActivityRef = useRef(Date.now())
  const isWarningShownRef = useRef(false)

  const resetTimer = useCallback(() => {
    if (!isActive) return

    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
      warningTimeoutRef.current = null
    }

    // Reset warning flag
    isWarningShownRef.current = false

    // Update last activity time
    lastActivityRef.current = Date.now()

    // Set warning timer (show warning before logout)
    if (onWarning && warningTime > 0) {
      warningTimeoutRef.current = setTimeout(() => {
        isWarningShownRef.current = true
        onWarning()
      }, inactivityTimeout - warningTime)
    }

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      onInactive()
    }, inactivityTimeout)
  }, [onInactive, inactivityTimeout, warningTime, onWarning, isActive])

  const handleActivity = useCallback(() => {
    if (!isActive) return
    // Only reset if warning hasn't been shown or user is actively interacting
    if (!isWarningShownRef.current || Date.now() - lastActivityRef.current < 1000) {
      resetTimer()
    }
  }, [resetTimer, isActive])

  useEffect(() => {
    if (!isActive) {
      // Clear timers if inactive
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
        warningTimeoutRef.current = null
      }
      return
    }

    // Events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown'
    ]

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Initialize timer
    resetTimer()

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
      }
    }
  }, [handleActivity, resetTimer, isActive])

  // Return function to manually reset timer (useful for "Stay logged in" button)
  return {
    resetTimer,
    isWarningShown: isWarningShownRef.current
  }
}

