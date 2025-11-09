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
    if (!delayLoad && !priority) {
      // Set up Intersection Observer for lazy loading
      if ('IntersectionObserver' in window && imgRef.current) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                setShouldLoad(true)
                // Disconnect observer once we start loading
                if (observerRef.current && imgRef.current) {
                  observerRef.current.unobserve(imgRef.current)
                }
              }
            })
          },
          {
            rootMargin: '50px' // Start loading 50px before entering viewport
          }
        )
        
        observerRef.current.observe(imgRef.current)
      } else {
        // Fallback: load immediately if IntersectionObserver not supported
        setShouldLoad(true)
      }
    } else if (priority || !delayLoad) {
      // Load immediately if priority or delayLoad is false
      setShouldLoad(true)
    }

    // Cleanup observer on unmount
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
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

  // Show skeleton if not loading yet or if loading
  if (!shouldLoad || isLoading) {
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
    <div className={`${sizeClasses[size]} ${shapeClasses[shape]} relative overflow-hidden ${className}`}>
      {/* Skeleton overlay while loading */}
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          role="status"
          aria-label="Loading image"
        />
      )}
      
      {/* Actual image - only loads when shouldLoad is true */}
      {shouldLoad && (
        <img
          src={src}
          alt={alt}
          className={`${sizeClasses[size]} ${shapeClasses[shape]} object-cover transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}
    </div>
  )
}

export default LazyImage

