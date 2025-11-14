import type { CacheEntry, WorkflowSummary } from '@/types/workflow'

const LOG_PREFIX = '[WorkflowCache]'

/**
 * Workflow Cache Manager with TTL and invalidation support
 * Provides in-memory caching for workflow data to improve performance
 */
export class WorkflowCacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private readonly defaultTTL: number
  private readonly maxSize: number
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    invalidations: 0
  }

  constructor(defaultTTL: number = 5 * 60 * 1000, maxSize: number = 100) {
    this.defaultTTL = defaultTTL // 5 minutes default
    this.maxSize = maxSize
    console.log(`${LOG_PREFIX} Cache initialized with TTL: ${defaultTTL}ms, Max size: ${maxSize}`)
  }

  /**
   * Get cached data by key
   * Returns null if cache miss or expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      console.log(`${LOG_PREFIX} MISS: ${key}`)
      console.log(`${LOG_PREFIX} Hit rate: ${this.getHitRate().toFixed(1)}%`)
      return null
    }

    // Check if entry has expired
    const age = Date.now() - entry.timestamp
    if (age > entry.ttl) {
      this.cache.delete(key)
      this.stats.misses++
      console.log(`${LOG_PREFIX} EXPIRED: ${key} (age: ${(age / 1000).toFixed(1)}s, TTL: ${(entry.ttl / 1000).toFixed(1)}s)`)
      console.log(`${LOG_PREFIX} Hit rate: ${this.getHitRate().toFixed(1)}%`)
      return null
    }

    this.stats.hits++
    console.log(`${LOG_PREFIX} HIT: ${key} (age: ${(age / 1000).toFixed(1)}s, TTL: ${(entry.ttl / 1000).toFixed(1)}s)`)
    console.log(`${LOG_PREFIX} Hit rate: ${this.getHitRate().toFixed(1)}%`)
    return entry.data as T
  }

  /**
   * Set cache entry with optional custom TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.stats.sets++
    const effectiveTTL = ttl ?? this.defaultTTL
    
    // Enforce max cache size (LRU eviction)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        console.log(`${LOG_PREFIX} Cache full, evicting oldest entry: ${firstKey}`)
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: effectiveTTL
    })
    
    console.log(`${LOG_PREFIX} SET: ${key} (TTL: ${(effectiveTTL / 1000).toFixed(1)}s)`)
    console.log(`${LOG_PREFIX} Cache size: ${this.cache.size}/${this.maxSize}`)
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    const existed = this.cache.has(key)
    this.cache.delete(key)
    if (existed) {
      this.stats.invalidations++
      console.log(`${LOG_PREFIX} INVALIDATE: ${key}`)
    }
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
    let count = 0
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        count++
      }
    }
    
    if (count > 0) {
      this.stats.invalidations += count
      console.log(`${LOG_PREFIX} INVALIDATE PATTERN: ${pattern} (${count} entries)`)
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    console.log(`${LOG_PREFIX} CLEAR: Removed ${size} entries`)
  }

  /**
   * Calculate hit rate
   */
  private getHitRate(): number {
    const total = this.stats.hits + this.stats.misses
    return total > 0 ? (this.stats.hits / total) * 100 : 0
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    maxSize: number
    hitRate: number
    keys: string[]
    hits: number
    misses: number
    sets: number
    invalidations: number
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.getHitRate(),
      keys: Array.from(this.cache.keys()),
      ...this.stats
    }
  }

  /**
   * Log cache statistics
   */
  logStats(): void {
    const stats = this.getStats()
    console.log(`${LOG_PREFIX} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`${LOG_PREFIX} Cache Statistics:`)
    console.log(`${LOG_PREFIX}   Size: ${stats.size}/${stats.maxSize}`)
    console.log(`${LOG_PREFIX}   Hits: ${stats.hits}`)
    console.log(`${LOG_PREFIX}   Misses: ${stats.misses}`)
    console.log(`${LOG_PREFIX}   Hit Rate: ${stats.hitRate.toFixed(1)}%`)
    console.log(`${LOG_PREFIX}   Sets: ${stats.sets}`)
    console.log(`${LOG_PREFIX}   Invalidations: ${stats.invalidations}`)
    console.log(`${LOG_PREFIX}   Keys: ${stats.keys.length > 0 ? stats.keys.join(', ') : 'none'}`)
    console.log(`${LOG_PREFIX} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  }

  /**
   * Check if cache has valid entry for key
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key)
    
    if (cached !== null) {
      return cached
    }

    const data = await fetcher()
    this.set(key, data, ttl)
    return data
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      console.log(`${LOG_PREFIX} CLEANUP: Removed ${cleaned} expired entries`)
    }
  }
}

// Singleton instance
export const workflowCache = new WorkflowCacheManager()

// Cache key generators
export const CacheKeys = {
  workflowList: (baseUrl: string, dbId?: string | null) => 
    `workflows:list:${baseUrl}:${dbId || 'default'}`,
  
  workflowDetails: (baseUrl: string, workflowId: string, dbId?: string | null) =>
    `workflows:details:${baseUrl}:${workflowId}:${dbId || 'default'}`,
  
  workflowExecution: (workflowId: string, runId: string) =>
    `workflows:execution:${workflowId}:${runId}`,
  
  workflowHistory: (workflowId: string) =>
    `workflows:history:${workflowId}`,
  
  allWorkflows: () => 'workflows:*'
}
