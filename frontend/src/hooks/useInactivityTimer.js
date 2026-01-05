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
  const tabHiddenTimeRef = useRef(null)
  const remainingTimeRef = useRef(inactivityTimeout)

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

    // Reset tab hidden time
    tabHiddenTimeRef.current = null

    // Update last activity time
    lastActivityRef.current = Date.now()
    remainingTimeRef.current = inactivityTimeout

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

  // Handle tab visibility change
  const handleVisibilityChange = useCallback(() => {
    if (!isActive) return

    if (document.hidden) {
      // Tab became hidden - store the current time and calculate remaining time
      tabHiddenTimeRef.current = Date.now()
      
      // Calculate how much time has elapsed since last activity
      const elapsed = Date.now() - lastActivityRef.current
      remainingTimeRef.current = Math.max(0, inactivityTimeout - elapsed)
      
      // Clear timers since tab is hidden (we'll check when it becomes visible again)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
        warningTimeoutRef.current = null
      }
    } else {
      // Tab became visible again
      if (tabHiddenTimeRef.current !== null) {
        // Calculate how long the tab was hidden
        const hiddenDuration = Date.now() - tabHiddenTimeRef.current
        
        // Check if timeout has passed while tab was hidden
        if (hiddenDuration >= remainingTimeRef.current) {
          // Timeout exceeded while tab was hidden - logout immediately
          onInactive()
          return
        }
        
        // Update remaining time (subtract the time the tab was hidden)
        remainingTimeRef.current = remainingTimeRef.current - hiddenDuration
        
        // Reset activity time to now (user needs to interact to reset timer)
        lastActivityRef.current = Date.now()
        tabHiddenTimeRef.current = null
        
        // Restart timers with remaining time
        if (onWarning && warningTime > 0 && remainingTimeRef.current > warningTime) {
          warningTimeoutRef.current = setTimeout(() => {
            isWarningShownRef.current = true
            onWarning()
          }, remainingTimeRef.current - warningTime)
        } else if (remainingTimeRef.current <= warningTime && !isWarningShownRef.current) {
          // Show warning immediately if we're within warning time
          isWarningShownRef.current = true
          if (onWarning) onWarning()
        }
        
        // Set logout timer with remaining time
        timeoutRef.current = setTimeout(() => {
          onInactive()
        }, remainingTimeRef.current)
      }
      // If tabHiddenTimeRef.current is null, tab was visible the whole time
      // No action needed - timers should already be running
    }
  }, [isActive, inactivityTimeout, warningTime, onWarning, onInactive])

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

    // Add event listeners for user activity
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Add visibility change listener to track tab inactivity
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Check if tab is already hidden when component mounts
    if (document.hidden) {
      tabHiddenTimeRef.current = Date.now()
      const elapsed = Date.now() - lastActivityRef.current
      remainingTimeRef.current = Math.max(0, inactivityTimeout - elapsed)
    } else {
      // Initialize timer only if tab is visible
      resetTimer()
    }

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
      }
    }
  }, [handleActivity, resetTimer, isActive, handleVisibilityChange])

  // Return function to manually reset timer (useful for "Stay logged in" button)
  return {
    resetTimer,
    isWarningShown: isWarningShownRef.current
  }
}

