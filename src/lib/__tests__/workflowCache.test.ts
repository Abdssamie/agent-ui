import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorkflowCacheManager, CacheKeys } from '../workflowCache'

describe('WorkflowCacheManager', () => {
  let cache: WorkflowCacheManager

  beforeEach(() => {
    cache = new WorkflowCacheManager(1000, 10) // 1 second TTL, max 10 items
  })

  describe('get and set', () => {
    it('should store and retrieve data', () => {
      const testData = { id: '1', name: 'Test Workflow' }
      cache.set('test-key', testData)

      const retrieved = cache.get('test-key')
      expect(retrieved).toEqual(testData)
    })

    it('should return null for non-existent key', () => {
      const result = cache.get('non-existent')
      expect(result).toBeNull()
    })

    it('should return null for expired entries', async () => {
      cache.set('test-key', 'test-data', 100) // 100ms TTL
      
      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150))
      
      const result = cache.get('test-key')
      expect(result).toBeNull()
    })
  })

  describe('invalidate', () => {
    it('should invalidate specific key', () => {
      cache.set('key1', 'data1')
      cache.set('key2', 'data2')

      cache.invalidate('key1')

      expect(cache.get('key1')).toBeNull()
      expect(cache.get('key2')).toBe('data2')
    })

    it('should invalidate keys matching pattern', () => {
      cache.set('workflow:1', 'data1')
      cache.set('workflow:2', 'data2')
      cache.set('execution:1', 'data3')

      cache.invalidatePattern(/^workflow:/)

      expect(cache.get('workflow:1')).toBeNull()
      expect(cache.get('workflow:2')).toBeNull()
      expect(cache.get('execution:1')).toBe('data3')
    })
  })

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set('key1', 'data1')
      cache.set('key2', 'data2')

      cache.clear()

      expect(cache.get('key1')).toBeNull()
      expect(cache.get('key2')).toBeNull()
    })
  })

  describe('has', () => {
    it('should return true for valid cached entry', () => {
      cache.set('test-key', 'test-data')
      expect(cache.has('test-key')).toBe(true)
    })

    it('should return false for non-existent entry', () => {
      expect(cache.has('non-existent')).toBe(false)
    })

    it('should return false for expired entry', async () => {
      cache.set('test-key', 'test-data', 50)
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(cache.has('test-key')).toBe(false)
    })
  })

  describe('getOrSet', () => {
    it('should fetch and cache data on cache miss', async () => {
      const fetcher = vi.fn().mockResolvedValue('fetched-data')

      const result = await cache.getOrSet('test-key', fetcher)

      expect(result).toBe('fetched-data')
      expect(fetcher).toHaveBeenCalledTimes(1)
      expect(cache.get('test-key')).toBe('fetched-data')
    })

    it('should return cached data without calling fetcher', async () => {
      cache.set('test-key', 'cached-data')
      const fetcher = vi.fn().mockResolvedValue('fetched-data')

      const result = await cache.getOrSet('test-key', fetcher)

      expect(result).toBe('cached-data')
      expect(fetcher).not.toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      cache.set('key1', 'data1', 50)
      cache.set('key2', 'data2', 5000)

      await new Promise((resolve) => setTimeout(resolve, 100))
      cache.cleanup()

      expect(cache.get('key1')).toBeNull()
      expect(cache.get('key2')).toBe('data2')
    })
  })

  describe('getStats', () => {
    it('should return cache statistics', () => {
      cache.set('key1', 'data1')
      cache.set('key2', 'data2')

      const stats = cache.getStats()

      expect(stats.size).toBe(2)
      expect(stats.maxSize).toBe(10)
      expect(stats.keys).toContain('key1')
      expect(stats.keys).toContain('key2')
    })
  })

  describe('max size enforcement', () => {
    it('should evict oldest entry when max size is reached', () => {
      const smallCache = new WorkflowCacheManager(10000, 3)

      smallCache.set('key1', 'data1')
      smallCache.set('key2', 'data2')
      smallCache.set('key3', 'data3')
      smallCache.set('key4', 'data4') // Should evict key1

      expect(smallCache.get('key1')).toBeNull()
      expect(smallCache.get('key2')).toBe('data2')
      expect(smallCache.get('key3')).toBe('data3')
      expect(smallCache.get('key4')).toBe('data4')
    })
  })
})

describe('CacheKeys', () => {
  it('should generate correct workflow list key', () => {
    const key = CacheKeys.workflowList('http://localhost:7777', 'db1')
    expect(key).toBe('workflows:list:http://localhost:7777:db1')
  })

  it('should generate correct workflow details key', () => {
    const key = CacheKeys.workflowDetails('http://localhost:7777', 'wf1', 'db1')
    expect(key).toBe('workflows:details:http://localhost:7777:wf1:db1')
  })

  it('should handle null dbId', () => {
    const key = CacheKeys.workflowList('http://localhost:7777', null)
    expect(key).toBe('workflows:list:http://localhost:7777:default')
  })
})
