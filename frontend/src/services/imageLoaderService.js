/**
 * Image Loader Service
 * Handles asynchronous loading of student images after essential data is displayed
 * Uses a queue system to load images in batches for better performance
 */

class ImageLoaderService {
  constructor() {
    this.imageQueue = []
    this.loading = false
    this.batchSize = 20 // Load 20 images at a time (increased for faster loading)
    this.delayBetweenBatches = 0 // No delay between batches for faster loading
    this.imageCache = new Map() // Cache loaded images
    this.loadingImages = new Set() // Track currently loading images to avoid duplicates
  }

  /**
   * Add images to loading queue
   * @param {Array} images - Array of {src, id} objects
   * @param {Boolean} immediate - If true, start loading immediately without batching
   */
  queueImages(images, immediate = false) {
    if (!Array.isArray(images)) return
    
    // Filter out already cached images, invalid srcs, and currently loading images
    const newImages = images.filter(img => {
      if (!img.src || !img.id) return false
      if (this.imageCache.has(img.id)) return false
      if (this.loadingImages.has(img.id)) return false
      return true
    })
    
    if (newImages.length === 0) return
    
    // If immediate, load all images in parallel without batching
    if (immediate) {
      newImages.forEach(img => {
        this.loadingImages.add(img.id)
        this.preloadImage(img).finally(() => {
          this.loadingImages.delete(img.id)
        })
      })
      return
    }
    
    this.imageQueue.push(...newImages)
    this.processQueue()
  }

  /**
   * Process the image queue in batches
   */
  async processQueue() {
    if (this.loading || this.imageQueue.length === 0) return
    
    this.loading = true
    
    // Use requestIdleCallback for non-blocking processing if available
    const processBatch = async () => {
      while (this.imageQueue.length > 0) {
        // Get batch of images
        const batch = this.imageQueue.splice(0, this.batchSize)
        
        // Mark as loading
        batch.forEach(img => this.loadingImages.add(img.id))
        
        // Preload images in batch (all in parallel)
        Promise.all(
          batch.map(img => 
            this.preloadImage(img).finally(() => {
              this.loadingImages.delete(img.id)
            })
          )
        )
        
        // If there are more images, use requestIdleCallback or setTimeout(0) for next batch
        if (this.imageQueue.length > 0) {
          if (this.delayBetweenBatches > 0) {
            await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches))
          } else {
            // Use requestAnimationFrame for smooth processing without blocking
            await new Promise(resolve => requestAnimationFrame(resolve))
          }
        }
      }
      
      this.loading = false
    }
    
    // Start processing immediately
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(processBatch, { timeout: 100 })
    } else {
      // Fallback: use requestAnimationFrame
      requestAnimationFrame(processBatch)
    }
  }

  /**
   * Preload a single image
   * @param {Object} image - {src, id} object
   */
  preloadImage(image) {
    return new Promise((resolve) => {
      // Check cache first
      if (this.imageCache.has(image.id)) {
        resolve(this.imageCache.get(image.id))
        return
      }
      
      const img = new Image()
      img.onload = () => {
        this.imageCache.set(image.id, image.src)
        resolve(image.src)
      }
      img.onerror = () => {
        // Cache failed state to avoid retrying
        this.imageCache.set(image.id, null)
        resolve(null)
      }
      img.src = image.src
    })
  }

  /**
   * Check if image is cached
   * @param {String} id - Image ID
   */
  isCached(id) {
    return this.imageCache.has(id)
  }

  /**
   * Get cached image
   * @param {String} id - Image ID
   */
  getCached(id) {
    return this.imageCache.get(id)
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.imageCache.clear()
    this.imageQueue = []
  }
}

// Singleton instance
const imageLoaderService = new ImageLoaderService()

export default imageLoaderService

