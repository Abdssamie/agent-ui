// Knowledge Base Service Tests
// Tests for comprehensive persistent knowledge base content management

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { KnowledgeBaseService } from '../knowledgeBaseService'
import * as agnoKnowledgeAPI from '@/api/agnoKnowledge'
import * as agnoKnowledgeIndexAPI from '@/api/agnoKnowledge/index'
import { toast } from 'sonner'

// Mock the API functions
vi.mock('@/api/agnoKnowledge', () => ({
  listContentAPI: vi.fn(),
  uploadContentAPI: vi.fn()
}))

vi.mock('@/api/agnoKnowledge/index', () => ({
  getContentByIdAPI: vi.fn(),
  getContentStatusAPI: vi.fn(),
  updateContentAPI: vi.fn(),
  deleteContentByIdAPI: vi.fn(),
  deleteAllContentAPI: vi.fn()
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Mock store
vi.mock('@/store', () => ({
  useStore: {
    getState: vi.fn(() => ({
      setKnowledgeContents: vi.fn()
    }))
  }
}))

describe('KnowledgeBaseService', () => {
  let service: KnowledgeBaseService

  beforeEach(() => {
    service = new KnowledgeBaseService('http://test-api.com')
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('listContent', () => {
    it('should list all content with pagination', async () => {
      const mockResponse = {
        data: [
          {
            id: 'content-1',
            name: 'Test Document',
            description: 'A test document',
            type: 'application/pdf',
            size: '1024',
            status: 'completed' as const,
            status_message: 'Processing complete',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            access_count: 5
          }
        ],
        meta: {
          page: 1,
          limit: 10,
          total_pages: 1,
          total_count: 1
        }
      }

      vi.mocked(agnoKnowledgeAPI.listContentAPI).mockResolvedValue(mockResponse)

      const result = await service.listContent({ page: 1, limit: 10 })

      expect(result.contents).toHaveLength(1)
      expect(result.contents[0]).toEqual({
        id: 'content-1',
        name: 'Test Document',
        description: 'A test document',
        type: 'application/pdf',
        size: '1024',
        status: 'completed',
        statusMessage: 'Processing complete',
        metadata: undefined,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        accessCount: 5
      })
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        totalPages: 1,
        totalCount: 1
      })
    })

    it('should handle empty content list', async () => {
      const mockResponse = {
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total_pages: 0,
          total_count: 0
        }
      }

      vi.mocked(agnoKnowledgeAPI.listContentAPI).mockResolvedValue(mockResponse)

      const result = await service.listContent()

      expect(result.contents).toHaveLength(0)
      expect(result.pagination.totalCount).toBe(0)
    })

    it('should pass filtering and sorting parameters', async () => {
      const mockResponse = {
        data: [],
        meta: { page: 1, limit: 10, total_pages: 0, total_count: 0 }
      }

      vi.mocked(agnoKnowledgeAPI.listContentAPI).mockResolvedValue(mockResponse)

      await service.listContent({
        page: 2,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'desc',
        db_id: 'test-db'
      })

      expect(agnoKnowledgeAPI.listContentAPI).toHaveBeenCalledWith(
        {
          page: 2,
          limit: 20,
          sort_by: 'created_at',
          sort_order: 'desc',
          db_id: 'test-db'
        },
        'http://test-api.com'
      )
    })
  })

  describe('getContentById', () => {
    it('should retrieve content by ID', async () => {
      const mockResponse = {
        id: 'content-1',
        name: 'Test Document',
        type: 'application/pdf',
        status: 'completed' as const
      }

      vi.mocked(agnoKnowledgeIndexAPI.getContentByIdAPI).mockResolvedValue(mockResponse)

      const result = await service.getContentById('content-1')

      expect(result.id).toBe('content-1')
      expect(result.name).toBe('Test Document')
      expect(agnoKnowledgeIndexAPI.getContentByIdAPI).toHaveBeenCalledWith(
        { content_id: 'content-1', db_id: undefined },
        'http://test-api.com'
      )
    })

    it('should pass db_id parameter', async () => {
      const mockResponse = {
        id: 'content-1',
        name: 'Test',
        status: 'completed' as const
      }

      vi.mocked(agnoKnowledgeIndexAPI.getContentByIdAPI).mockResolvedValue(mockResponse)

      await service.getContentById('content-1', 'test-db')

      expect(agnoKnowledgeIndexAPI.getContentByIdAPI).toHaveBeenCalledWith(
        { content_id: 'content-1', db_id: 'test-db' },
        'http://test-api.com'
      )
    })
  })

  describe('getContentStatus', () => {
    it('should retrieve content processing status', async () => {
      const mockResponse = {
        status: 'processing' as const,
        status_message: 'Embedding in progress'
      }

      vi.mocked(agnoKnowledgeIndexAPI.getContentStatusAPI).mockResolvedValue(mockResponse)

      const result = await service.getContentStatus('content-1')

      expect(result.status).toBe('processing')
      expect(result.status_message).toBe('Embedding in progress')
    })

    it('should handle completed status', async () => {
      const mockResponse = {
        status: 'completed' as const,
        status_message: 'Processing complete'
      }

      vi.mocked(agnoKnowledgeIndexAPI.getContentStatusAPI).mockResolvedValue(mockResponse)

      const result = await service.getContentStatus('content-1')

      expect(result.status).toBe('completed')
    })

    it('should handle failed status', async () => {
      const mockResponse = {
        status: 'failed' as const,
        status_message: 'Processing failed: Invalid format'
      }

      vi.mocked(agnoKnowledgeIndexAPI.getContentStatusAPI).mockResolvedValue(mockResponse)

      const result = await service.getContentStatus('content-1')

      expect(result.status).toBe('failed')
      expect(result.status_message).toContain('failed')
    })
  })

  describe('updateContent', () => {
    it('should update content metadata', async () => {
      const mockResponse = {
        id: 'content-1',
        name: 'Updated Document',
        description: 'Updated description',
        status: 'completed' as const
      }

      vi.mocked(agnoKnowledgeIndexAPI.updateContentAPI).mockResolvedValue(mockResponse)

      const result = await service.updateContent('content-1', {
        name: 'Updated Document',
        description: 'Updated description'
      })

      expect(result.name).toBe('Updated Document')
      expect(result.description).toBe('Updated description')
    })

    it('should update content with custom metadata', async () => {
      const mockResponse = {
        id: 'content-1',
        name: 'Test',
        metadata: { custom: 'value', version: 2 },
        status: 'completed' as const
      }

      vi.mocked(agnoKnowledgeIndexAPI.updateContentAPI).mockResolvedValue(mockResponse)

      const result = await service.updateContent('content-1', {
        metadata: { custom: 'value', version: 2 }
      })

      expect(result.metadata).toEqual({ custom: 'value', version: 2 })
    })
  })

  describe('deleteContent', () => {
    it('should delete content by ID', async () => {
      const mockResponse = {
        id: 'content-1',
        name: 'Deleted',
        status: 'completed' as const
      }

      vi.mocked(agnoKnowledgeIndexAPI.deleteContentByIdAPI).mockResolvedValue(mockResponse)

      await service.deleteContent('content-1')

      expect(agnoKnowledgeIndexAPI.deleteContentByIdAPI).toHaveBeenCalledWith(
        { content_id: 'content-1', db_id: undefined },
        'http://test-api.com'
      )
    })

    it('should pass db_id when deleting', async () => {
      const mockResponse = {
        id: 'content-1',
        name: 'Deleted',
        status: 'completed' as const
      }

      vi.mocked(agnoKnowledgeIndexAPI.deleteContentByIdAPI).mockResolvedValue(mockResponse)

      await service.deleteContent('content-1', 'test-db')

      expect(agnoKnowledgeIndexAPI.deleteContentByIdAPI).toHaveBeenCalledWith(
        { content_id: 'content-1', db_id: 'test-db' },
        'http://test-api.com'
      )
    })
  })

  describe('deleteAllContent', () => {
    it('should delete all content', async () => {
      vi.mocked(agnoKnowledgeIndexAPI.deleteAllContentAPI).mockResolvedValue(
        'All content deleted'
      )

      await service.deleteAllContent()

      expect(agnoKnowledgeIndexAPI.deleteAllContentAPI).toHaveBeenCalledWith(
        { db_id: undefined },
        'http://test-api.com'
      )
    })

    it('should pass db_id when deleting all', async () => {
      vi.mocked(agnoKnowledgeIndexAPI.deleteAllContentAPI).mockResolvedValue(
        'All content deleted'
      )

      await service.deleteAllContent('test-db')

      expect(agnoKnowledgeIndexAPI.deleteAllContentAPI).toHaveBeenCalledWith(
        { db_id: 'test-db' },
        'http://test-api.com'
      )
    })
  })

  describe('uploadContent', () => {
    it('should upload file content', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const mockResponse = {
        id: 'content-1',
        name: 'test.pdf',
        status: 'processing' as const
      }

      vi.mocked(agnoKnowledgeAPI.uploadContentAPI).mockResolvedValue(mockResponse)

      const result = await service.uploadContent({
        file: mockFile,
        name: 'test.pdf',
        metadata: { source: 'upload' }
      })

      expect(result.id).toBe('content-1')
      expect(result.status).toBe('processing')
    })

    it('should upload text content', async () => {
      const mockResponse = {
        id: 'content-2',
        name: 'text-content',
        status: 'processing' as const
      }

      vi.mocked(agnoKnowledgeAPI.uploadContentAPI).mockResolvedValue(mockResponse)

      const result = await service.uploadContent({
        text_content: 'This is test content',
        name: 'text-content'
      })

      expect(result.id).toBe('content-2')
    })
  })

  describe('waitForProcessing', () => {
    it('should poll until processing is complete', async () => {
      vi.mocked(agnoKnowledgeIndexAPI.getContentStatusAPI)
        .mockResolvedValueOnce({
          status: 'processing',
          status_message: 'In progress'
        })
        .mockResolvedValueOnce({
          status: 'processing',
          status_message: 'In progress'
        })
        .mockResolvedValueOnce({
          status: 'completed',
          status_message: 'Complete'
        })

      const result = await service.waitForProcessing('content-1', {
        pollInterval: 100
      })

      expect(result.status).toBe('completed')
      expect(agnoKnowledgeIndexAPI.getContentStatusAPI).toHaveBeenCalledTimes(3)
    })

    it('should call onStatusUpdate callback', async () => {
      const onStatusUpdate = vi.fn()

      vi.mocked(agnoKnowledgeIndexAPI.getContentStatusAPI).mockResolvedValue({
        status: 'completed',
        status_message: 'Complete'
      })

      await service.waitForProcessing('content-1', {
        pollInterval: 100,
        onStatusUpdate
      })

      expect(onStatusUpdate).toHaveBeenCalledWith({
        status: 'completed',
        status_message: 'Complete'
      })
    })

    it('should timeout after max attempts', async () => {
      vi.mocked(agnoKnowledgeIndexAPI.getContentStatusAPI).mockResolvedValue({
        status: 'processing',
        status_message: 'Still processing'
      })

      await expect(
        service.waitForProcessing('content-1', {
          maxAttempts: 3,
          pollInterval: 10
        })
      ).rejects.toThrow('Content processing timeout')
    })

    it('should handle failed status', async () => {
      vi.mocked(agnoKnowledgeIndexAPI.getContentStatusAPI).mockResolvedValue({
        status: 'failed',
        status_message: 'Processing failed'
      })

      const result = await service.waitForProcessing('content-1', {
        pollInterval: 100
      })

      expect(result.status).toBe('failed')
    })
  })

  describe('batchDeleteContent', () => {
    it('should delete multiple content items', async () => {
      vi.mocked(agnoKnowledgeIndexAPI.deleteContentByIdAPI).mockResolvedValue({
        id: 'deleted',
        name: 'deleted',
        status: 'completed'
      })

      const result = await service.batchDeleteContent([
        'content-1',
        'content-2',
        'content-3'
      ])

      expect(result.successful).toHaveLength(3)
      expect(result.failed).toHaveLength(0)
      expect(agnoKnowledgeIndexAPI.deleteContentByIdAPI).toHaveBeenCalledTimes(3)
    })

    it('should handle partial failures', async () => {
      vi.mocked(agnoKnowledgeIndexAPI.deleteContentByIdAPI)
        .mockResolvedValueOnce({
          id: 'content-1',
          name: 'deleted',
          status: 'completed'
        })
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce({
          id: 'content-3',
          name: 'deleted',
          status: 'completed'
        })

      const result = await service.batchDeleteContent([
        'content-1',
        'content-2',
        'content-3'
      ])

      expect(result.successful).toHaveLength(2)
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0]).toEqual({
        id: 'content-2',
        error: 'Delete failed'
      })
    })

    it('should handle all failures', async () => {
      vi.mocked(agnoKnowledgeIndexAPI.deleteContentByIdAPI).mockRejectedValue(
        new Error('Delete failed')
      )

      const result = await service.batchDeleteContent(['content-1', 'content-2'])

      expect(result.successful).toHaveLength(0)
      expect(result.failed).toHaveLength(2)
    })
  })

  describe('cross-session persistence', () => {
    it('should list content that persists across sessions', async () => {
      const mockResponse = {
        data: [
          {
            id: 'old-content',
            name: 'Old Document',
            created_at: '2024-01-01T00:00:00Z',
            status: 'completed' as const
          },
          {
            id: 'new-content',
            name: 'New Document',
            created_at: '2024-01-15T00:00:00Z',
            status: 'completed' as const
          }
        ],
        meta: { page: 1, limit: 10, total_pages: 1, total_count: 2 }
      }

      vi.mocked(agnoKnowledgeAPI.listContentAPI).mockResolvedValue(mockResponse)

      const result = await service.listContent()

      expect(result.contents).toHaveLength(2)
      expect(result.contents[0].id).toBe('old-content')
      expect(result.contents[1].id).toBe('new-content')
    })

    it('should retrieve content uploaded in previous sessions', async () => {
      const mockResponse = {
        id: 'old-session-content',
        name: 'Previous Session Document',
        created_at: '2024-01-01T00:00:00Z',
        status: 'completed' as const
      }

      vi.mocked(agnoKnowledgeIndexAPI.getContentByIdAPI).mockResolvedValue(mockResponse)

      const result = await service.getContentById('old-session-content')

      expect(result.id).toBe('old-session-content')
      expect(result.name).toBe('Previous Session Document')
    })
  })
})
