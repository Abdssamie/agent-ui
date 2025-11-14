import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { APIClient } from '../apiClient'

describe('EnhancedAPIClient', () => {
  let client: APIClient
  let fetchMock: any

  beforeEach(() => {
    client = new APIClient()
    fetchMock = vi.fn()
    global.fetch = fetchMock
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('request deduplication', () => {
    it('should deduplicate identical concurrent requests', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' })
      })

      const promise1 = client.request('/test', { deduplicate: true })
      const promise2 = client.request('/test', { deduplicate: true })

      await Promise.all([promise1, promise2])

      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('should not deduplicate when disabled', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' })
      })

      const promise1 = client.request('/test', { deduplicate: false })
      const promise2 = client.request('/test', { deduplicate: false })

      await Promise.all([promise1, promise2])

      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('retry logic', () => {
    it('should retry on 5xx errors', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'success' })
        })

      const result = await client.request('/test', {
        retryConfig: { maxRetries: 1, initialDelay: 10 }
      })

      expect(result).toEqual({ data: 'success' })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('should not retry on 4xx errors', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ detail: 'Not found' })
      })

      await expect(
        client.request('/test', {
          retryConfig: { maxRetries: 3, initialDelay: 10 }
        })
      ).rejects.toThrow()

      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('should respect maxRetries limit', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      await expect(
        client.request('/test', {
          retryConfig: { maxRetries: 2, initialDelay: 10 }
        })
      ).rejects.toThrow()

      expect(fetchMock).toHaveBeenCalledTimes(3) // initial + 2 retries
    })
  })

  describe('request cancellation', () => {
    it('should cancel pending request', async () => {
      fetchMock.mockImplementation(() => new Promise(() => {})) // Never resolves

      const promise = client.request('/test')
      
      // Give it a moment to start
      await new Promise(resolve => setTimeout(resolve, 10))
      
      const cancelled = client.cancelRequest('/test')

      expect(cancelled).toBe(true)
      expect(client.getPendingRequestCount()).toBe(0)
    })

    it('should cancel all pending requests', async () => {
      fetchMock.mockImplementation(() => new Promise(() => {}))

      client.request('/test1')
      client.request('/test2')
      
      await new Promise(resolve => setTimeout(resolve, 10))

      client.cancelAllRequests()

      expect(client.getPendingRequestCount()).toBe(0)
    })
  })

  describe('exponential backoff', () => {
    it('should increase delay between retries', async () => {
      const delays: number[] = []
      let callCount = 0

      fetchMock.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          delays.push(0)
        }
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Error'
        })
      })

      const startTime = Date.now()

      await expect(
        client.request('/test', {
          retryConfig: {
            maxRetries: 2,
            initialDelay: 100,
            backoffMultiplier: 2
          }
        })
      ).rejects.toThrow()

      const duration = Date.now() - startTime

      // Should have waited at least 100ms + 200ms (with backoff)
      expect(duration).toBeGreaterThanOrEqual(250)
    })
  })
})
