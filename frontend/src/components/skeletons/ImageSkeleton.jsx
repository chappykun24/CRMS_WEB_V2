import React, { useState, useEffect, useRef } from 'react'

/**
 * Image skeleton loader component with lazy loading and asynchronous loading
 * Uses IntersectionObserver for true lazy loading
 * Shows skeleton while loading, then displays image
 * No fallbacks - always shows skeleton if image fails or is missing
 */
const ImageSkeleton = ({ 
  src, 
  alt = '', 
  className = '', 
  size = 'md', // 'xs', 'sm', 'md', 'lg', 'xl'
  shape = 'circle', // 'circle', 'square', 'rounded'
  priority = false // If true, loads immediately without intersection observer
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(priority) // Start loading if priority
  const [imageSrc, setImageSrc] = useState(src)
  const imgRef = useRef(null)
  const observerRef = useRef(null)

  // Update imageSrc when src prop changes
  useEffect(() => {
    if (src) {
      setImageSrc(src)
      setIsLoading(true)
      setHasError(false)
    } else {
      setImageSrc(null)
      setIsLoading(false)
    }
  }, [src])

  // Set up IntersectionObserver for lazy loading
  useEffect(() => {
    // If priority, load immediately
    if (priority) {
      setShouldLoad(true)
      return
    }

    // If no src, don't set up observer
    if (!imageSrc) {
      setShouldLoad(false)
      return
    }

    // Set up lazy loading with IntersectionObserver
    const setupLazyLoading = () => {
      if (!imgRef.current) {
        // Ref not ready, try again next frame
        requestAnimationFrame(setupLazyLoading)
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

      // Set up IntersectionObserver for off-screen images
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

    // Start setup immediately and also on next frame to ensure DOM is ready
    // Check visibility immediately first
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect()
      const isVisible = rect.top < window.innerHeight + 200 && rect.bottom > -200
      if (isVisible) {
        setShouldLoad(true)
        return
      }
    }
    
    // If not immediately visible, set up observer
    requestAnimationFrame(setupLazyLoading)

    // Cleanup observer on unmount
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [imageSrc, priority])

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

  const handleLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  // Always show skeleton if no src, error, or still loading
  const showSkeleton = !imageSrc || hasError || isLoading || !shouldLoad

  return (
    <div 
      ref={imgRef}
      className={`${sizeClasses[size]} ${shapeClasses[shape]} relative overflow-hidden flex-shrink-0 ${className}`}
    >
      {/* Skeleton - shown when loading, no src, error, or not yet visible */}
      {showSkeleton && (
        <div 
          className={`absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 animate-pulse border-2 border-gray-200 ${
            isLoading && shouldLoad ? 'z-0' : 'z-10'
          }`}
          role="status"
          aria-label="Loading image"
        />
      )}
      
      {/* Actual image - only load when shouldLoad is true and src exists */}
      {shouldLoad && imageSrc && !hasError && (
        <img
          src={imageSrc}
          alt={alt}
          className={`${sizeClasses[size]} ${shapeClasses[shape]} object-cover transition-opacity duration-300 absolute inset-0 ${
            isLoading ? 'opacity-0 z-0' : 'opacity-100 z-20'
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

export default ImageSkeleton

