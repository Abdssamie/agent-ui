/**
 * File optimization utilities for performance improvements
 * Includes chunked uploads, compression, and caching
 */

// Chunked upload configuration
export const CHUNK_CONFIG = {
  chunkSize: 1024 * 1024, // 1MB chunks
  maxConcurrentChunks: 3,
  largeFileThreshold: 5 * 1024 * 1024, // 5MB - files larger than this use chunked upload
} as const

// Compression configuration
export const COMPRESSION_CONFIG = {
  imageQuality: 0.85, // JPEG quality (0-1)
  maxImageDimension: 2048, // Max width/height for images
  compressionThreshold: 1024 * 1024, // 1MB - compress files larger than this
  compressibleTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
} as const

// Cache configuration
export const CACHE_CONFIG = {
  maxCacheSize: 50 * 1024 * 1024, // 50MB max cache size
  maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
  previewCacheKey: 'file-preview-cache',
} as const

/**
 * Split a file into chunks for chunked upload
 */
export function splitFileIntoChunks(file: File, chunkSize: number = CHUNK_CONFIG.chunkSize): Blob[] {
  const chunks: Blob[] = []
  let offset = 0

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize)
    chunks.push(chunk)
    offset += chunkSize
  }

  return chunks
}

/**
 * Check if a file should use chunked upload
 */
export function shouldUseChunkedUpload(file: File): boolean {
  return file.size > CHUNK_CONFIG.largeFileThreshold
}

/**
 * Compress an image file
 */
export async function compressImage(
  file: File,
  quality: number = COMPRESSION_CONFIG.imageQuality,
  maxDimension: number = COMPRESSION_CONFIG.maxImageDimension
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        let width = img.width
        let height = img.height

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension
            width = maxDimension
          } else {
            width = (width / height) * maxDimension
            height = maxDimension
          }
        }

        // Create canvas and compress
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }

            // Only use compressed version if it's smaller
            if (blob.size < file.size) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          file.type,
          quality
        )
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = e.target?.result as string
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Check if a file should be compressed
 */
export function shouldCompressFile(file: File): boolean {
    const fileType = file.type as 'image/jpeg' | 'image/jpg' | 'image/png' | 'image/webp'
  return (
    COMPRESSION_CONFIG.compressibleTypes.includes(fileType) &&
    file.size > COMPRESSION_CONFIG.compressionThreshold
  )
}

/**
 * Compress a file if applicable
 */
export async function compressFileIfNeeded(file: File): Promise<File> {
  if (!shouldCompressFile(file)) {
    return file
  }

  try {
    return await compressImage(file)
  } catch (error) {
    console.warn('Failed to compress file, using original:', error)
    return file
  }
}

/**
 * Preview cache entry
 */
interface PreviewCacheEntry {
  preview: string
  timestamp: number
  size: number
  fileKey: string
}

/**
 * Preview cache manager
 */
export class PreviewCache {
  private cache: Map<string, PreviewCacheEntry> = new Map()
  private totalSize: number = 0

  /**
   * Generate a cache key for a file
   */
  private generateKey(file: File): string {
    return `${file.name}_${file.size}_${file.lastModified}`
  }

  /**
   * Get a preview from cache
   */
  get(file: File): string | null {
    const key = this.generateKey(file)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if entry is expired
    const age = Date.now() - entry.timestamp
    if (age > CACHE_CONFIG.maxCacheAge) {
      this.delete(key)
      return null
    }

    return entry.preview
  }

  /**
   * Set a preview in cache
   */
  set(file: File, preview: string): void {
    const key = this.generateKey(file)
    const size = preview.length

    // Evict old entries if cache is full
    while (this.totalSize + size > CACHE_CONFIG.maxCacheSize && this.cache.size > 0) {
      this.evictOldest()
    }

    // Add new entry
    this.cache.set(key, {
      preview,
      timestamp: Date.now(),
      size,
      fileKey: key,
    })

    this.totalSize += size
  }

  /**
   * Delete a preview from cache
   */
  delete(key: string): void {
    const entry = this.cache.get(key)
    if (entry) {
      this.totalSize -= entry.size
      // Revoke object URL if it's a blob URL
      if (entry.preview.startsWith('blob:')) {
        URL.revokeObjectURL(entry.preview)
      }
      this.cache.delete(key)
    }
  }

  /**
   * Evict the oldest entry from cache
   */
  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTimestamp = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.delete(oldestKey)
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    for (const entry of this.cache.values()) {
      if (entry.preview.startsWith('blob:')) {
        URL.revokeObjectURL(entry.preview)
      }
    }
    this.cache.clear()
    this.totalSize = 0
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; count: number; maxSize: number } {
    return {
      size: this.totalSize,
      count: this.cache.size,
      maxSize: CACHE_CONFIG.maxCacheSize,
    }
  }
}

// Global preview cache instance
export const previewCache = new PreviewCache()

/**
 * Memory cleanup utilities
 */
export class FileMemoryManager {
  private objectUrls: Set<string> = new Set()
  private fileReaders: Set<FileReader> = new Set()

  /**
   * Create an object URL and track it for cleanup
   */
  createObjectURL(blob: Blob): string {
    const url = URL.createObjectURL(blob)
    this.objectUrls.add(url)
    return url
  }

  /**
   * Revoke a specific object URL
   */
  revokeObjectURL(url: string): void {
    if (this.objectUrls.has(url)) {
      URL.revokeObjectURL(url)
      this.objectUrls.delete(url)
    }
  }

  /**
   * Track a FileReader for cleanup
   */
  trackFileReader(reader: FileReader): void {
    this.fileReaders.add(reader)
  }

  /**
   * Abort a specific FileReader
   */
  abortFileReader(reader: FileReader): void {
    if (this.fileReaders.has(reader)) {
      reader.abort()
      this.fileReaders.delete(reader)
    }
  }

  /**
   * Clean up all tracked resources
   */
  cleanup(): void {
    // Revoke all object URLs
    for (const url of this.objectUrls) {
      URL.revokeObjectURL(url)
    }
    this.objectUrls.clear()

    // Abort all file readers
    for (const reader of this.fileReaders) {
      reader.abort()
    }
    this.fileReaders.clear()
  }

  /**
   * Get memory usage statistics
   */
  getStats(): { objectUrls: number; fileReaders: number } {
    return {
      objectUrls: this.objectUrls.size,
      fileReaders: this.fileReaders.size,
    }
  }
}

// Global memory manager instance
export const fileMemoryManager = new FileMemoryManager()

/**
 * Generate a thumbnail preview with caching
 */
export async function generateThumbnailWithCache(
  file: File,
  maxSize: number = 200
): Promise<string> {
  // Check cache first
  const cached = previewCache.get(file)
  if (cached) {
    return cached
  }

  // Generate new thumbnail
  const preview = await generateThumbnail(file, maxSize)

  // Cache the preview
  previewCache.set(file, preview)

  return preview
}

/**
 * Generate a thumbnail preview
 */
async function generateThumbnail(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    fileMemoryManager.trackFileReader(reader)

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        // Calculate thumbnail dimensions
        let width = img.width
        let height = img.height

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize
            width = maxSize
          } else {
            width = (width / height) * maxSize
            height = maxSize
          }
        }

        // Create canvas for thumbnail
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        resolve(dataUrl)
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = e.target?.result as string
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsDataURL(file)
  })
}
