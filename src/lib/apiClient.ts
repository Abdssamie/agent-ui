/**
 * Enhanced API Client with retry logic, request deduplication, and cancellation support
 */

interface RetryConfig {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
}

interface RequestOptions extends RequestInit {
  retryConfig?: Partial<RetryConfig>
  deduplicate?: boolean
  timeout?: number
}

interface PendingRequest {
  promise: Promise<any>
  controller: AbortController
  timestamp: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
}

const LOG_PREFIX = '[APIClient]'

/**
 * Enhanced API Client with retry, deduplication, and cancellation
 */
export class APIClient {
  private pendingRequests: Map<string, PendingRequest> = new Map()
  private requestTimeout: number = 30000 // 30 seconds default
  private requestStats = {
    total: 0,
    deduplicated: 0,
    retried: 0,
    failed: 0,
    cancelled: 0
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number, config: RetryConfig): number {
    const delay = Math.min(
      config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
      config.maxDelay
    )
    // Add jitter to prevent thundering herd
    const jitteredDelay = delay + Math.random() * 1000
    console.log(`${LOG_PREFIX} Backoff delay for attempt ${attempt}: ${jitteredDelay.toFixed(0)}ms`)
    return jitteredDelay
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error.name === 'AbortError') {
      console.log(`${LOG_PREFIX} Error not retryable: AbortError`)
      return false
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.log(`${LOG_PREFIX} Error is retryable: Network error`)
      return true
    }
    
    const status = error.status || error.response?.status
    if (!status) {
      console.log(`${LOG_PREFIX} Error is retryable: No status code`)
      return true
    }
    
    // Retry on 5xx errors and 429 (rate limit)
    const retryable = status >= 500 || status === 429
    console.log(`${LOG_PREFIX} Error ${retryable ? 'is' : 'not'} retryable: HTTP ${status}`)
    return retryable
  }

  /**
   * Generate cache key for request deduplication
   */
  private generateRequestKey(url: string, options: RequestOptions): string {
    const method = options.method || 'GET'
    const body = options.body ? JSON.stringify(options.body) : ''
    return `${method}:${url}:${body}`
  }

  /**
   * Execute fetch with retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: RequestOptions,
    controller: AbortController
  ): Promise<Response> {
    const config = { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig }
    let lastError: any
    const shortUrl = url.length > 80 ? url.substring(0, 80) + '...' : url

    console.log(`${LOG_PREFIX} Starting request to ${shortUrl}`)
    console.log(`${LOG_PREFIX} Retry config:`, config)

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`${LOG_PREFIX} Retry attempt ${attempt}/${config.maxRetries} for ${shortUrl}`)
          this.requestStats.retried++
        }

        const timeoutId = options.timeout
          ? setTimeout(() => controller.abort(), options.timeout)
          : null

        const startTime = Date.now()
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        })
        const duration = Date.now() - startTime

        if (timeoutId) clearTimeout(timeoutId)

        console.log(`${LOG_PREFIX} Response received in ${duration}ms: HTTP ${response.status}`)

        // Don't retry on successful responses or 4xx errors (except 429)
        if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
          if (response.ok) {
            console.log(`${LOG_PREFIX} ✓ Request successful for ${shortUrl}`)
          }
          return response
        }

        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
        lastError.status = response.status
        console.log(`${LOG_PREFIX} Request failed with HTTP ${response.status}`)
      } catch (error) {
        lastError = error
        console.log(`${LOG_PREFIX} Request threw error:`, error instanceof Error ? error.message : error)

        if (error instanceof Error && error.name === 'AbortError') {
          console.log(`${LOG_PREFIX} Request aborted`)
          throw error
        }
      }

      // Don't retry if this was the last attempt or error is not retryable
      if (attempt < config.maxRetries && this.isRetryableError(lastError)) {
        const delay = this.calculateBackoff(attempt, config)
        console.log(`${LOG_PREFIX} Waiting ${delay.toFixed(0)}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        break
      }
    }

    console.log(`${LOG_PREFIX} ✗ Request failed after ${config.maxRetries + 1} attempts`)
    this.requestStats.failed++
    throw lastError
  }

  /**
   * Make an API request with retry, deduplication, and cancellation support
   */
  async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    this.requestStats.total++
    const requestKey = this.generateRequestKey(url, options)
    const shortUrl = url.length > 80 ? url.substring(0, 80) + '...' : url

    console.log(`${LOG_PREFIX} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`${LOG_PREFIX} Request #${this.requestStats.total}`)
    console.log(`${LOG_PREFIX} URL: ${shortUrl}`)
    console.log(`${LOG_PREFIX} Method: ${options.method || 'GET'}`)
    console.log(`${LOG_PREFIX} Deduplicate: ${options.deduplicate !== false}`)

    // Check for existing pending request (deduplication)
    if (options.deduplicate !== false) {
      const pending = this.pendingRequests.get(requestKey)
      if (pending) {
        this.requestStats.deduplicated++
        console.log(`${LOG_PREFIX} ⚡ Request deduplicated! Using existing pending request`)
        console.log(`${LOG_PREFIX} Total deduplicated: ${this.requestStats.deduplicated}`)
        console.log(`${LOG_PREFIX} Pending requests: ${this.pendingRequests.size}`)
        return pending.promise
      }
    }

    console.log(`${LOG_PREFIX} Creating new request`)
    console.log(`${LOG_PREFIX} Pending requests before: ${this.pendingRequests.size}`)

    // Create abort controller for this request
    const controller = new AbortController()

    // Create the request promise
    const requestPromise = (async () => {
      try {
        const response = await this.fetchWithRetry(url, options, controller)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const error: any = new Error(errorData.detail || `HTTP ${response.status}`)
          error.status = response.status
          error.data = errorData
          throw error
        }

        const data = await response.json()
        console.log(`${LOG_PREFIX} ✓ Request completed successfully`)
        return data
      } finally {
        // Clean up pending request
        this.pendingRequests.delete(requestKey)
        console.log(`${LOG_PREFIX} Cleaned up pending request. Remaining: ${this.pendingRequests.size}`)
      }
    })()

    // Store pending request
    this.pendingRequests.set(requestKey, {
      promise: requestPromise,
      controller,
      timestamp: Date.now()
    })

    console.log(`${LOG_PREFIX} Pending requests after: ${this.pendingRequests.size}`)

    return requestPromise
  }

  /**
   * Cancel a specific request by URL and options
   */
  cancelRequest(url: string, options: RequestOptions = {}): boolean {
    const requestKey = this.generateRequestKey(url, options)
    const pending = this.pendingRequests.get(requestKey)

    if (pending) {
      console.log(`${LOG_PREFIX} Cancelling request: ${url}`)
      pending.controller.abort()
      this.pendingRequests.delete(requestKey)
      this.requestStats.cancelled++
      return true
    }

    console.log(`${LOG_PREFIX} No pending request found to cancel: ${url}`)
    return false
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    const count = this.pendingRequests.size
    console.log(`${LOG_PREFIX} Cancelling all ${count} pending requests`)
    
    for (const [key, pending] of this.pendingRequests.entries()) {
      pending.controller.abort()
      this.pendingRequests.delete(key)
    }
    
    this.requestStats.cancelled += count
    console.log(`${LOG_PREFIX} All requests cancelled`)
  }

  /**
   * Get count of pending requests
   */
  getPendingRequestCount(): number {
    return this.pendingRequests.size
  }

  /**
   * Clean up stale pending requests (older than timeout)
   */
  cleanupStaleRequests(maxAge: number = 60000): void {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, pending] of this.pendingRequests.entries()) {
      if (now - pending.timestamp > maxAge) {
        pending.controller.abort()
        this.pendingRequests.delete(key)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      console.log(`${LOG_PREFIX} Cleaned up ${cleaned} stale requests`)
    }
  }

  /**
   * Get request statistics
   */
  getStats() {
    return {
      ...this.requestStats,
      pending: this.pendingRequests.size
    }
  }

  /**
   * Log current statistics
   */
  logStats(): void {
    const stats = this.getStats()
    console.log(`${LOG_PREFIX} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`${LOG_PREFIX} API Client Statistics:`)
    console.log(`${LOG_PREFIX}   Total requests: ${stats.total}`)
    console.log(`${LOG_PREFIX}   Deduplicated: ${stats.deduplicated} (${stats.total > 0 ? ((stats.deduplicated / stats.total) * 100).toFixed(1) : 0}%)`)
    console.log(`${LOG_PREFIX}   Retried: ${stats.retried}`)
    console.log(`${LOG_PREFIX}   Failed: ${stats.failed}`)
    console.log(`${LOG_PREFIX}   Cancelled: ${stats.cancelled}`)
    console.log(`${LOG_PREFIX}   Pending: ${stats.pending}`)
    console.log(`${LOG_PREFIX} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  }
}

// Singleton instance
export const apiClient = new APIClient()
