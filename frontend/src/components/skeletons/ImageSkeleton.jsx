import React, { useState } from 'react'

/**
 * Modern image skeleton loader component
 * Shows a skeleton while image is loading, then fades in the image
 */
const ImageSkeleton = ({ 
  src, 
  alt = '', 
  className = '', 
  fallbackIcon: FallbackIcon = null,
  size = 'md', // 'xs', 'sm', 'md', 'lg', 'xl'
  shape = 'circle', // 'circle', 'square', 'rounded'
  onError = null
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

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
  }

  const handleError = (e) => {
    setIsLoading(false)
    setHasError(true)
    if (onError) {
      onError(e)
    }
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
      
      {/* Actual image */}
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
    </div>
  )
}

export default ImageSkeleton

