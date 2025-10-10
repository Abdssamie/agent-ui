/**
 * Hook for managing file memory cleanup
 * Ensures proper cleanup of object URLs and file readers
 */

import { useEffect, useRef } from 'react'
import { fileMemoryManager, previewCache } from '@/lib/fileOptimization'

/**
 * Hook to automatically cleanup file resources on unmount
 */
export function useFileMemoryCleanup() {
  const cleanupRef = useRef<(() => void)[]>([])

  // Register a cleanup function
  const registerCleanup = (cleanup: () => void) => {
    cleanupRef.current.push(cleanup)
  }

  // Create and track an object URL
  const createObjectURL = (blob: Blob): string => {
    const url = fileMemoryManager.createObjectURL(blob)
    registerCleanup(() => fileMemoryManager.revokeObjectURL(url))
    return url
  }

  // Track a FileReader
  const trackFileReader = (reader: FileReader) => {
    fileMemoryManager.trackFileReader(reader)
    registerCleanup(() => fileMemoryManager.abortFileReader(reader))
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current.forEach((cleanup) => cleanup())
      cleanupRef.current = []
    }
  }, [])

  return {
    createObjectURL,
    trackFileReader,
    registerCleanup,
  }
}

/**
 * Hook to manage preview cache
 */
export function usePreviewCache() {
  useEffect(() => {
    // Cleanup old cache entries on mount
    const stats = previewCache.getStats()
    if (stats.size > stats.maxSize * 0.9) {
      // Clear cache if it's over 90% full
      previewCache.clear()
    }
  }, [])

  return {
    getPreview: (file: File) => previewCache.get(file),
    setPreview: (file: File, preview: string) => previewCache.set(file, preview),
    clearCache: () => previewCache.clear(),
    getStats: () => previewCache.getStats(),
  }
}

/**
 * Hook to cleanup all file resources globally
 */
export function useGlobalFileCleanup() {
  useEffect(() => {
    return () => {
      // Cleanup on app unmount
      fileMemoryManager.cleanup()
      previewCache.clear()
    }
  }, [])
}
