import React, { useState, useEffect, useRef } from 'react'

/**
 * LazyImage Component - True lazy loading with Intersection Observer
 * Only loads images when they're about to enter the viewport
 * Essential data (text) shows immediately, images load separately
 */
const LazyImage = ({ 
  src, 
  alt = '', 
  className = '', 
  fallbackIcon: FallbackIcon = null,
  size = 'md',
  shape = 'circle',
  onError = null,
  delayLoad = false, // If true, waits for delayLoad to be false before loading
  priority = false // If true, loads immediately without intersection observer
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(priority) // Start loading if priority
  const imgRef = useRef(null)
  const observerRef = useRef(null)

  // Size presets
  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }

  // Shape classes
  const shapeClasses = {
    circle: 'rounded-full',
    square: 'rounded-none',
    rounded: 'rounded-lg'
  }

  // Handle delayLoad prop - if true, wait for it to become false
  useEffect(() => {
    // If priority, load immediately
    if (priority) {
      setShouldLoad(true)
      return
    }
    
    // If delayLoad is true, don't load yet
    if (delayLoad) {
      setShouldLoad(false)
      // Clean up observer if it exists
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
      return
    }
    
    // delayLoad is false - start loading immediately
    // For visible images, load right away. For off-screen images, use Intersection Observer
    const setupLoading = () => {
      if (!imgRef.current) {
        // Ref not ready, try again next frame
        requestAnimationFrame(setupLoading)
        return
      }
      
      // Check if element is already visible
      const rect = imgRef.current.getBoundingClientRect()
      const isVisible = rect.top < window.innerHeight + 200 && rect.bottom > -200
      
      if (isVisible) {
        // Already visible, load immediately
        setShouldLoad(true)
        return
      }
      
      // Set up Intersection Observer for off-screen images
      if ('IntersectionObserver' in window) {
        // Disconnect any existing observer
        if (observerRef.current) {
          observerRef.current.disconnect()
        }
        
        observerRef.current = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                setShouldLoad(true)
                // Disconnect observer once we start loading
                if (observerRef.current) {
                  observerRef.current.disconnect()
                  observerRef.current = null
                }
              }
            })
          },
          {
            rootMargin: '200px' // Start loading 200px before entering viewport
          }
        )
        
        if (imgRef.current) {
          observerRef.current.observe(imgRef.current)
        }
      } else {
        // Fallback: load immediately if IntersectionObserver not supported
        setShouldLoad(true)
      }
    }
    
    // Start setup on next frame to ensure DOM is ready
    requestAnimationFrame(setupLoading)

    // Cleanup observer on unmount
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [delayLoad, priority])

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = (e) => {
    setIsLoading(false)
    setHasError(true)
    if (onError) {
      onError(e)
    }
  }

  // Show skeleton if not loading yet
  if (!shouldLoad) {
    return (
      <div 
        ref={imgRef}
        className={`${sizeClasses[size]} ${shapeClasses[shape]} bg-gray-200 animate-pulse ${className}`}
        role="status"
        aria-label="Loading image"
      />
    )
  }

  // If no src and no fallback, show skeleton
  if (!src && !FallbackIcon) {
    return (
      <div 
        className={`${sizeClasses[size]} ${shapeClasses[shape]} bg-gray-200 animate-pulse ${className}`}
        role="status"
        aria-label="Loading image"
      />
    )
  }

  // If error and no fallback icon, show skeleton
  if (hasError && !FallbackIcon) {
    return (
      <div 
        className={`${sizeClasses[size]} ${shapeClasses[shape]} bg-gray-200 flex items-center justify-center ${className}`}
        role="img"
        aria-label={alt || 'Image placeholder'}
      >
        <svg className="h-1/2 w-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
    )
  }

  // If error and has fallback icon, show fallback with colored background
  if (hasError && FallbackIcon) {
    return (
      <div 
        className={`${sizeClasses[size]} ${shapeClasses[shape]} bg-primary-600 flex items-center justify-center ${className}`}
        role="img"
        aria-label={alt || 'Image placeholder'}
      >
        <FallbackIcon className="h-1/2 w-1/2 text-white" />
      </div>
    )
  }

  // If no src but has fallback icon, show fallback with colored background
  if (!src && FallbackIcon) {
    return (
      <div 
        className={`${sizeClasses[size]} ${shapeClasses[shape]} bg-primary-600 flex items-center justify-center ${className}`}
        role="img"
        aria-label={alt || 'Image placeholder'}
      >
        <FallbackIcon className="h-1/2 w-1/2 text-white" />
      </div>
    )
  }

  // Show image with skeleton while loading
  return (
    <div 
      ref={imgRef}
      className={`${sizeClasses[size]} ${shapeClasses[shape]} relative overflow-hidden ${className}`}
    >
      {/* Skeleton overlay while loading */}
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse z-10"
          role="status"
          aria-label="Loading image"
        />
      )}
      
      {/* Actual image - only loads when shouldLoad is true */}
      {shouldLoad && src && (
        <img
          src={src}
          alt={alt}
          className={`${sizeClasses[size]} ${shapeClasses[shape]} object-cover transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
      )}
    </div>
  )
}

export default LazyImage

