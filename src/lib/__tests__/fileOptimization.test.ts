/**
 * Performance tests for file optimization utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  splitFileIntoChunks,
  shouldUseChunkedUpload,
  shouldCompressFile,
  PreviewCache,
  FileMemoryManager,
  CHUNK_CONFIG,
  COMPRESSION_CONFIG,
  CACHE_CONFIG,
} from '../fileOptimization';

// Mock URL.createObjectURL and URL.revokeObjectURL for Node.js environment
const mockObjectURLs = new Map<string, Blob>();
let urlCounter = 0;

global.URL.createObjectURL = vi.fn((blob: Blob) => {
  const url = `blob:http://localhost/${urlCounter++}`;
  mockObjectURLs.set(url, blob);
  return url;
});

global.URL.revokeObjectURL = vi.fn((url: string) => {
  mockObjectURLs.delete(url);
});


describe('File Chunking', () => {
  it('should split file into correct number of chunks', () => {
    const fileSize = 10 * 1024 * 1024 // 10MB
    const file = new File([new ArrayBuffer(fileSize)], 'test.pdf', { type: 'application/pdf' })
    
    const chunks = splitFileIntoChunks(file, 1024 * 1024) // 1MB chunks
    
    expect(chunks.length).toBe(10)
  })

  it('should handle files smaller than chunk size', () => {
    const fileSize = 500 * 1024 // 500KB
    const file = new File([new ArrayBuffer(fileSize)], 'test.pdf', { type: 'application/pdf' })
    
    const chunks = splitFileIntoChunks(file, 1024 * 1024) // 1MB chunks
    
    expect(chunks.length).toBe(1)
    expect(chunks[0].size).toBe(fileSize)
  })

  it('should determine when to use chunked upload', () => {
    const smallFile = new File([new ArrayBuffer(1024 * 1024)], 'small.pdf', { type: 'application/pdf' })
    const largeFile = new File([new ArrayBuffer(10 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' })
    
    expect(shouldUseChunkedUpload(smallFile)).toBe(false)
    expect(shouldUseChunkedUpload(largeFile)).toBe(true)
  })

  it('should use correct chunk size from config', () => {
    const fileSize = 5 * 1024 * 1024 // 5MB
    const file = new File([new ArrayBuffer(fileSize)], 'test.pdf', { type: 'application/pdf' })
    
    const chunks = splitFileIntoChunks(file)
    
    expect(chunks.length).toBe(Math.ceil(fileSize / CHUNK_CONFIG.chunkSize))
  })
})

describe('File Compression', () => {
  it('should identify compressible files', () => {
    const jpegFile = new File([new ArrayBuffer(2 * 1024 * 1024)], 'test.jpg', { type: 'image/jpeg' })
    const pdfFile = new File([new ArrayBuffer(2 * 1024 * 1024)], 'test.pdf', { type: 'application/pdf' })
    const smallImage = new File([new ArrayBuffer(500 * 1024)], 'small.jpg', { type: 'image/jpeg' })
    
    expect(shouldCompressFile(jpegFile)).toBe(true)
    expect(shouldCompressFile(pdfFile)).toBe(false)
    expect(shouldCompressFile(smallImage)).toBe(false)
  })

  it('should only compress files above threshold', () => {
    const largeImage = new File(
      [new ArrayBuffer(COMPRESSION_CONFIG.compressionThreshold + 1)],
      'large.jpg',
      { type: 'image/jpeg' }
    )
    const smallImage = new File(
      [new ArrayBuffer(COMPRESSION_CONFIG.compressionThreshold - 1)],
      'small.jpg',
      { type: 'image/jpeg' }
    )
    
    expect(shouldCompressFile(largeImage)).toBe(true)
    expect(shouldCompressFile(smallImage)).toBe(false)
  })

  it('should only compress supported image types', () => {
    const jpegFile = new File([new ArrayBuffer(2 * 1024 * 1024)], 'test.jpg', { type: 'image/jpeg' })
    const pngFile = new File([new ArrayBuffer(2 * 1024 * 1024)], 'test.png', { type: 'image/png' })
    const gifFile = new File([new ArrayBuffer(2 * 1024 * 1024)], 'test.gif', { type: 'image/gif' })
    
    expect(shouldCompressFile(jpegFile)).toBe(true)
    expect(shouldCompressFile(pngFile)).toBe(true)
    expect(shouldCompressFile(gifFile)).toBe(false) // GIF not in compressible types
  })
})

describe('PreviewCache', () => {
  let cache: PreviewCache

  beforeEach(() => {
    cache = new PreviewCache()
  })

  afterEach(() => {
    cache.clear()
  })

  it('should cache and retrieve previews', () => {
    const file = new File([new ArrayBuffer(1024)], 'test.jpg', { type: 'image/jpeg' })
    const preview = 'data:image/jpeg;base64,test'
    
    cache.set(file, preview)
    const retrieved = cache.get(file)
    
    expect(retrieved).toBe(preview)
  })

  it('should return null for non-existent cache entries', () => {
    const file = new File([new ArrayBuffer(1024)], 'test.jpg', { type: 'image/jpeg' })
    
    const retrieved = cache.get(file)
    
    expect(retrieved).toBeNull()
  })

  it('should evict old entries when cache is full', () => {
    // Create previews that will fill the cache
    // Each preview should be about 1/3 of max cache size to ensure eviction happens
    const largePreview = 'x'.repeat(Math.floor(CACHE_CONFIG.maxCacheSize / 2.5))
    
    const file1 = new File([new ArrayBuffer(1024)], 'test1.jpg', { type: 'image/jpeg', lastModified: 1000 })
    const file2 = new File([new ArrayBuffer(1024)], 'test2.jpg', { type: 'image/jpeg', lastModified: 2000 })
    const file3 = new File([new ArrayBuffer(1024)], 'test3.jpg', { type: 'image/jpeg', lastModified: 3000 })
    
    // Add entries with small delays to ensure different timestamps
    cache.set(file1, largePreview)
    cache.set(file2, largePreview)
    
    // Adding the third entry should evict the first (oldest) entry
    cache.set(file3, largePreview)
    
    // First entry should be evicted, others should remain
    expect(cache.get(file1)).toBeNull()
    expect(cache.get(file2)).not.toBeNull()
    expect(cache.get(file3)).not.toBeNull()
  })

  it('should track cache statistics', () => {
    const file = new File([new ArrayBuffer(1024)], 'test.jpg', { type: 'image/jpeg' })
    const preview = 'data:image/jpeg;base64,test'
    
    cache.set(file, preview)
    const stats = cache.getStats()
    
    expect(stats.count).toBe(1)
    expect(stats.size).toBeGreaterThan(0)
    expect(stats.maxSize).toBe(CACHE_CONFIG.maxCacheSize)
  })

  it('should clear all cache entries', () => {
    const file1 = new File([new ArrayBuffer(1024)], 'test1.jpg', { type: 'image/jpeg' })
    const file2 = new File([new ArrayBuffer(1024)], 'test2.jpg', { type: 'image/jpeg' })
    
    cache.set(file1, 'preview1')
    cache.set(file2, 'preview2')
    
    cache.clear()
    
    expect(cache.get(file1)).toBeNull()
    expect(cache.get(file2)).toBeNull()
    expect(cache.getStats().count).toBe(0)
    expect(cache.getStats().size).toBe(0)
  })

  it('should generate consistent keys for same file', () => {
    const file = new File([new ArrayBuffer(1024)], 'test.jpg', { 
      type: 'image/jpeg',
      lastModified: 1234567890
    })
    const preview = 'data:image/jpeg;base64,test'
    
    cache.set(file, preview)
    
    // Create same file again
    const sameFile = new File([new ArrayBuffer(1024)], 'test.jpg', { 
      type: 'image/jpeg',
      lastModified: 1234567890
    })
    
    expect(cache.get(sameFile)).toBe(preview)
  })
})

describe('FileMemoryManager', () => {
  let manager: FileMemoryManager

  beforeEach(() => {
    manager = new FileMemoryManager()
  })

  afterEach(() => {
    manager.cleanup()
  })

  it('should create and track object URLs', () => {
    const blob = new Blob(['test'], { type: 'text/plain' })
    
    const url = manager.createObjectURL(blob)
    
    expect(url).toMatch(/^blob:/)
    expect(manager.getStats().objectUrls).toBe(1)
  })

  it('should revoke object URLs', () => {
    const blob = new Blob(['test'], { type: 'text/plain' })
    const url = manager.createObjectURL(blob)
    
    manager.revokeObjectURL(url)
    
    expect(manager.getStats().objectUrls).toBe(0)
  })

  it('should track file readers', () => {
    const reader = new FileReader()
    
    manager.trackFileReader(reader)
    
    expect(manager.getStats().fileReaders).toBe(1)
  })

  it('should abort file readers', () => {
    const reader = new FileReader()
    const abortSpy = vi.spyOn(reader, 'abort')
    
    manager.trackFileReader(reader)
    manager.abortFileReader(reader)
    
    expect(abortSpy).toHaveBeenCalled()
    expect(manager.getStats().fileReaders).toBe(0)
  })

  it('should cleanup all resources', () => {
    const blob = new Blob(['test'], { type: 'text/plain' })
    const url = manager.createObjectURL(blob)
    const reader = new FileReader()
    manager.trackFileReader(reader)
    
    manager.cleanup()
    
    const stats = manager.getStats()
    expect(stats.objectUrls).toBe(0)
    expect(stats.fileReaders).toBe(0)
  })

  it('should handle multiple object URLs', () => {
    const blob1 = new Blob(['test1'], { type: 'text/plain' })
    const blob2 = new Blob(['test2'], { type: 'text/plain' })
    
    const url1 = manager.createObjectURL(blob1)
    const url2 = manager.createObjectURL(blob2)
    
    expect(manager.getStats().objectUrls).toBe(2)
    
    manager.revokeObjectURL(url1)
    expect(manager.getStats().objectUrls).toBe(1)
    
    manager.revokeObjectURL(url2)
    expect(manager.getStats().objectUrls).toBe(0)
  })
})

describe('Performance Benchmarks', () => {
  it('should split large files efficiently', () => {
    const fileSize = 100 * 1024 * 1024 // 100MB
    const file = new File([new ArrayBuffer(fileSize)], 'large.pdf', { type: 'application/pdf' })
    
    const startTime = performance.now()
    const chunks = splitFileIntoChunks(file)
    const endTime = performance.now()
    
    const duration = endTime - startTime
    
    expect(chunks.length).toBeGreaterThan(0)
    expect(duration).toBeLessThan(100) // Should complete in less than 100ms
  })

  it('should handle cache operations efficiently', () => {
    const cache = new PreviewCache()
    const files: File[] = []
    const previews: string[] = []
    
    // Create test data
    for (let i = 0; i < 100; i++) {
      files.push(new File([new ArrayBuffer(1024)], `test${i}.jpg`, { type: 'image/jpeg' }))
      previews.push(`data:image/jpeg;base64,test${i}`)
    }
    
    // Benchmark set operations
    const setStartTime = performance.now()
    files.forEach((file, i) => cache.set(file, previews[i]))
    const setEndTime = performance.now()
    
    // Benchmark get operations
    const getStartTime = performance.now()
    files.forEach((file) => cache.get(file))
    const getEndTime = performance.now()
    
    const setDuration = setEndTime - setStartTime
    const getDuration = getEndTime - getStartTime
    
    expect(setDuration).toBeLessThan(50) // Should complete in less than 50ms
    expect(getDuration).toBeLessThan(10) // Should complete in less than 10ms
    
    cache.clear()
  })

  it('should handle memory cleanup efficiently', () => {
    const manager = new FileMemoryManager()
    const urls: string[] = []
    
    // Create many object URLs
    const startTime = performance.now()
    for (let i = 0; i < 1000; i++) {
      const blob = new Blob([`test${i}`], { type: 'text/plain' })
      urls.push(manager.createObjectURL(blob))
    }
    const createEndTime = performance.now()
    
    // Cleanup all
    manager.cleanup()
    const cleanupEndTime = performance.now()
    
    const createDuration = createEndTime - startTime
    const cleanupDuration = cleanupEndTime - createEndTime
    
    expect(createDuration).toBeLessThan(100) // Should complete in less than 100ms
    expect(cleanupDuration).toBeLessThan(50) // Should complete in less than 50ms
    expect(manager.getStats().objectUrls).toBe(0)
  })
})
