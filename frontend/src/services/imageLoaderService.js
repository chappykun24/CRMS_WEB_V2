/**
 * Image Loader Service
 * Handles asynchronous loading of student images after essential data is displayed
 * Uses a queue system to load images in batches for better performance
 */

class ImageLoaderService {
  constructor() {
    this.imageQueue = []
    this.loading = false
    this.batchSize = 5 // Load 5 images at a time
    this.delayBetweenBatches = 100 // 100ms delay between batches
    this.imageCache = new Map() // Cache loaded images
  }

  /**
   * Add images to loading queue
   * @param {Array} images - Array of {src, id} objects
   */
  queueImages(images) {
    if (!Array.isArray(images)) return
    
    // Filter out already cached images and invalid srcs
    const newImages = images.filter(img => {
      if (!img.src || !img.id) return false
      if (this.imageCache.has(img.id)) return false
      return true
    })
    
    this.imageQueue.push(...newImages)
    this.processQueue()
  }

  /**
   * Process the image queue in batches
   */
  async processQueue() {
    if (this.loading || this.imageQueue.length === 0) return
    
    this.loading = true
    
    while (this.imageQueue.length > 0) {
      // Get batch of images
      const batch = this.imageQueue.splice(0, this.batchSize)
      
      // Preload images in batch
      await Promise.all(
        batch.map(img => this.preloadImage(img))
      )
      
      // Delay between batches to avoid blocking
      if (this.imageQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches))
      }
    }
    
    this.loading = false
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

