import React, { useState, useEffect } from 'react'

/**
 * Image skeleton loader component
 * Shows skeleton while loading, then displays image
 * No fallbacks - always shows skeleton if image fails or is missing
 */
const ImageSkeleton = ({ 
  src, 
  alt = '', 
  className = '', 
  size = 'md', // 'xs', 'sm', 'md', 'lg', 'xl'
  shape = 'circle', // 'circle', 'square', 'rounded'
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [imageSrc, setImageSrc] = useState(src)

  // Update imageSrc when src prop changes
  useEffect(() => {
    if (src) {
      setImageSrc(src)
      setIsLoading(true)
      setHasError(false)
    }
  }, [src])

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
  const showSkeleton = !imageSrc || hasError || isLoading

  return (
    <div className={`${sizeClasses[size]} ${shapeClasses[shape]} relative overflow-hidden flex-shrink-0 ${className}`}>
      {/* Skeleton - always shown when loading, no src, or error */}
      {showSkeleton && (
        <div 
          className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 animate-pulse border-2 border-gray-200"
          role="status"
          aria-label="Loading image"
        />
      )}
      
      {/* Actual image - only show when loaded successfully */}
      {imageSrc && !hasError && (
        <img
          src={imageSrc}
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

export default ImageSkeleton

