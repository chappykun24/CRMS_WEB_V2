import React, { useState, useEffect, useRef, useCallback } from 'react'
import ImageSkeleton from './skeletons/ImageSkeleton'

// Photo cache to avoid re-fetching the same photo
const photoCache = new Map()

/**
 * LazyStudentImage - Fetches student photos on-demand as they scroll into view
 * Uses IntersectionObserver for true lazy loading
 * Caches photos to avoid redundant API calls
 */
const LazyStudentImage = ({
  studentId,
  alt = '',
  className = '',
  size = 'md',
  shape = 'circle',
  priority = false // If true, fetches immediately
}) => {
  const [photoUrl, setPhotoUrl] = useState(null)
  const [isFetching, setIsFetching] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [shouldFetch, setShouldFetch] = useState(priority)
  const containerRef = useRef(null)
  const observerRef = useRef(null)
  const abortControllerRef = useRef(null)

  // Check cache first
  useEffect(() => {
    if (!studentId) {
      setPhotoUrl(null)
      return
    }

    // Check cache first
    if (photoCache.has(studentId)) {
      setPhotoUrl(photoCache.get(studentId))
      setHasError(false)
      return
    }

    // If priority, fetch immediately
    if (priority) {
      setShouldFetch(true)
    }
  }, [studentId, priority])

  // Fetch photo from API
  const fetchPhoto = useCallback(async () => {
    if (!studentId || isFetching || photoUrl) return

    // Check cache again (might have been cached by another instance)
    if (photoCache.has(studentId)) {
      setPhotoUrl(photoCache.get(studentId))
      setHasError(false)
      return
    }

    setIsFetching(true)
    setHasError(false)

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(`/api/students/${studentId}/photo`, {
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        if (response.status === 404) {
          // No photo found - cache null to avoid retrying
          photoCache.set(studentId, null)
          setPhotoUrl(null)
          setHasError(true)
        } else {
          throw new Error(`Failed to fetch photo: ${response.status}`)
        }
        return
      }

      const data = await response.json()
      const photo = data.photo

      if (photo) {
        // Cache the photo
        photoCache.set(studentId, photo)
        setPhotoUrl(photo)
        setHasError(false)
      } else {
        // No photo - cache null
        photoCache.set(studentId, null)
        setPhotoUrl(null)
        setHasError(true)
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }
      console.error(`Error fetching photo for student ${studentId}:`, error)
      setHasError(true)
      // Don't cache errors - allow retry
    } finally {
      setIsFetching(false)
      abortControllerRef.current = null
    }
  }, [studentId, isFetching, photoUrl])

  // Set up IntersectionObserver for lazy loading with deferred initialization
  useEffect(() => {
    // If priority or already fetched, skip observer
    if (priority || photoUrl !== null) {
      return
    }

    // If no studentId, don't set up observer
    if (!studentId) {
      return
    }

    // Defer image loading to prioritize student data
    // Use requestIdleCallback to load images only when browser is idle
    const setupLazyLoading = () => {
      if (!containerRef.current) {
        requestAnimationFrame(setupLazyLoading)
        return
      }

      // Check if element is already visible
      const rect = containerRef.current.getBoundingClientRect()
      const isVisible = rect.top < window.innerHeight + 200 && rect.bottom > -200

      if (isVisible) {
        // Defer even visible images slightly to prioritize data loading
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            setShouldFetch(true)
          }, { timeout: 1000 })
        } else {
          // Fallback: small delay to prioritize data
          setTimeout(() => {
            setShouldFetch(true)
          }, 100)
        }
        return
      }

      // Set up IntersectionObserver for off-screen images
      if ('IntersectionObserver' in window) {
        if (observerRef.current) {
          observerRef.current.disconnect()
        }

        observerRef.current = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                // Defer image fetching even when intersecting to prioritize data
                if ('requestIdleCallback' in window) {
                  requestIdleCallback(() => {
                    setShouldFetch(true)
                  }, { timeout: 1000 })
                } else {
                  setTimeout(() => {
                    setShouldFetch(true)
                  }, 100)
                }
                if (observerRef.current) {
                  observerRef.current.disconnect()
                  observerRef.current = null
                }
              }
            })
          },
          {
            rootMargin: '200px' // Start fetching 200px before entering viewport
          }
        )

        if (containerRef.current) {
          observerRef.current.observe(containerRef.current)
        }
      } else {
        // Fallback: defer fetch to prioritize data
        setTimeout(() => {
          setShouldFetch(true)
        }, 200)
      }
    }

    // Defer initial setup to prioritize student data loading
    // Wait a bit before setting up image observers
    const deferredSetup = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const isVisible = rect.top < window.innerHeight + 200 && rect.bottom > -200
        if (isVisible) {
          // Visible images: defer slightly
          if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
              setShouldFetch(true)
            }, { timeout: 1000 })
          } else {
            setTimeout(() => {
              setShouldFetch(true)
            }, 100)
          }
          return
        }
      }

      // Use requestIdleCallback to defer observer setup
      if ('requestIdleCallback' in window) {
        requestIdleCallback(setupLazyLoading, { timeout: 500 })
      } else {
        setTimeout(setupLazyLoading, 200)
      }
    }

    // Small initial delay to ensure student data loads first
    setTimeout(deferredSetup, 50)

    // Cleanup observer on unmount
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [studentId, priority, photoUrl])

  // Fetch photo when shouldFetch becomes true
  useEffect(() => {
    if (shouldFetch && !photoUrl && !isFetching && studentId) {
      fetchPhoto()
    }
  }, [shouldFetch, photoUrl, isFetching, studentId, fetchPhoto])

  return (
    <div ref={containerRef}>
      <ImageSkeleton
        src={photoUrl}
        alt={alt}
        className={className}
        size={size}
        shape={shape}
        priority={priority}
      />
    </div>
  )
}

// Clear cache function (useful for testing or when photos are updated)
export const clearPhotoCache = (studentId = null) => {
  if (studentId) {
    photoCache.delete(studentId)
  } else {
    photoCache.clear()
  }
}

export default LazyStudentImage

