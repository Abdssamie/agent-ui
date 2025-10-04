// Tests for useKnowledgeBaseManager hook

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useKnowledgeBaseManager } from '../useKnowledgeBaseManager'
import * as knowledgeBaseServiceModule from '@/lib/knowledgeBaseService'
import { toast } from 'sonner'

// Mock the knowledge base service
vi.mock('@/lib/knowledgeBaseService', () => ({
  knowledgeBaseService: {
    listContent: vi.fn(),
    getContentById: vi.fn(),
    updateContent: vi.fn(),
    deleteContent: vi.fn(),
    deleteAllContent: vi.fn(),
    batchDeleteContent: vi.fn(),
    syncToStore: vi.fn()
  }
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
  useStore: vi.fn(() => ({
    removeKnowledgeContent: vi.fn(),
    setKnowledgeContents: vi.fn(),
    updateKnowledgeContent: vi.fn()
  }))
}))

describe('useKnowledgeBaseManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('loadContents', () => {
    it('should load contents successfully', async () => {
      const mockContents = [
        {
          id: 'content-1',
          name: 'Test Document',
          type: 'application/pdf',
          size: '1024',
          status: 'completed' as const,
          createdAt: '2024-01-01T00:00:00Z'
        }
      ]

      vi.mocked(knowledgeBaseServiceModule.knowledgeBaseService.listContent).mockResolvedValue({
        contents: mockContents,
        pagination: {
          page: 1,
          limit: 10,
          totalPages: 1,
          totalCount: 1
        }
      })

      const { result } = renderHook(() => useKnowledgeBaseManager())

      expect(result.current.isLoading).toBe(false)
      expect(result.current.contents).toEqual([])

      await act(async () => {
        await result.current.loadContents()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.contents).toEqual(mockContents)
      expect(result.current.pagination.totalCount).toBe(1)
      expect(result.current.error).toBeNull()
    })

    it('should handle load errors', async () => {
      const errorMessage = 'Failed to load'
      vi.mocked(knowledgeBaseServiceModule.knowledgeBaseService.listContent).mockRejectedValue(
        new Error(errorMessage)
      )

      const { result } = renderHook(() => useKnowledgeBaseManager())

      await act(async () => {
        await result.current.loadContents()
      })

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage)
      })

      expect(result.current.contents).toEqual([])
      expect(toast.error).toHaveBeenCalledWith(errorMessage)
    })

    it('should auto-load when autoLoad is true', async () => {
      vi.mocked(knowledgeBaseServiceModule.knowledgeBaseService.listContent).mockResolvedValue({
        contents: [],
        pagination: { page: 1, limit: 10, totalPages: 0, totalCount: 0 }
      })

      renderHook(() => useKnowledgeBaseManager({ autoLoad: true }))

      await waitFor(() => {
        expect(knowledgeBaseServiceModule.knowledgeBaseService.listContent).toHaveBeenCalled()
      })
    })
  })

  describe('getContent', () => {
    it('should get content by ID', async () => {
      const mockContent = {
        id: 'content-1',
        name: 'Test Document',
        type: 'application/pdf',
        size: '1024',
        status: 'completed' as const
      }

      vi.mocked(knowledgeBaseServiceModule.knowledgeBaseService.getContentById).mockResolvedValue(
        mockContent
      )

      const { result } = renderHook(() => useKnowledgeBaseManager())

      let content: any
      await act(async () => {
        content = await result.current.getContent('content-1')
      })

      expect(content).toEqual(mockContent)
    })

    it('should handle get content errors', async () => {
      vi.mocked(
        knowledgeBaseServiceModule.knowledgeBaseService.getContentById
      ).mockRejectedValue(new Error('Not found'))

      const { result } = renderHook(() => useKnowledgeBaseManager())

      let content: any
      await act(async () => {
        content = await result.current.getContent('content-1')
      })

      expect(content).toBeNull()
      expect(toast.error).toHaveBeenCalled()
    })
  })

  describe('updateContent', () => {
    it('should update content successfully', async () => {
      const mockUpdated = {
        id: 'content-1',
        name: 'Updated Document',
        type: 'application/pdf',
        size: '1024',
        status: 'completed' as const
      }

      vi.mocked(knowledgeBaseServiceModule.knowledgeBaseService.listContent).mockResolvedValue({
        contents: [
          {
            id: 'content-1',
            name: 'Original Document',
            type: 'application/pdf',
            size: '1024',
            status: 'completed' as const
          }
        ],
        pagination: { page: 1, limit: 10, totalPages: 1, totalCount: 1 }
      })

      vi.mocked(knowledgeBaseServiceModule.knowledgeBaseService.updateContent).mockResolvedValue(
        mockUpdated
      )

      const { result } = renderHook(() => useKnowledgeBaseManager())

      await act(async () => {
        await result.current.loadContents()
      })

      await act(async () => {
        await result.current.updateContent('content-1', { name: 'Updated Document' })
      })

      await waitFor(() => {
        expect(result.current.contents[0].name).toBe('Updated Document')
      })

      expect(toast.success).toHaveBeenCalledWith('Content updated successfully')
    })

    it('should handle update errors', async () => {
      vi.mocked(knowledgeBaseServiceModule.knowledgeBaseService.updateContent).mockRejectedValue(
        new Error('Update failed')
      )

      const { result } = renderHook(() => useKnowledgeBaseManager())

      await expect(
        act(async () => {
          await result.current.updateContent('content-1', { name: 'Updated' })
        })
      ).rejects.toThrow('Update failed')

      expect(toast.error).toHaveBeenCalled()
    })
  })

  describe('deleteContent', () => {
    it('should delete content successfully', async () => {
      vi.mocked(knowledgeBaseServiceModule.knowledgeBaseService.listContent).mockResolvedValue({
        contents: [
          {
            id: 'content-1',
            name: 'Document 1',
            type: 'application/pdf',
            size: '1024',
            status: 'completed' as const
          },
          {
            id: 'content-2',
            name: 'Document 2',
            type: 'application/pdf',
            size: '2048',
            status: 'completed' as const
          }
        ],
        pagination: { page: 1, limit: 10, totalPages: 1, totalCount: 2 }
      })

      vi.mocked(knowledgeBaseServiceModule.knowledgeBaseService.deleteContent).mockResolvedValue()

      const { result } = renderHook(() => useKnowledgeBaseManager())

      await act(async () => {
        await result.current.loadContents()
      })

      await act(async () => {
        await result.current.deleteContent('content-1')
      })

      await waitFor(() => {
        expect(result.current.contents).toHaveLength(1)
      })

      expect(result.current.contents[0].id).toBe('content-2')
      expect(toast.success).toHaveBeenCalledWith('Content deleted successfully')
    })

    it('should handle delete errors', async () => {
      vi.mocked(knowledgeBaseServiceModule.knowledgeBaseService.deleteContent).mockRejectedValue(
        new Error('Delete failed')
      )

      const { result } = renderHook(() => useKnowledgeBaseManager())

      await expect(
        act(async () => {
          await result.current.deleteContent('content-1')
        })
      ).rejects.toThrow('Delete failed')

      expect(toast.error).toHaveBeenCalled()
    })
  })

  describe('deleteAllContents', () => {
    it('should delete all contents successfully', async () => {
      vi.mocked(knowledgeBaseServiceModule.knowledgeBaseService.listContent).mockResolvedValue({
        contents: [
          {
            id: 'content-1',
            name: 'Document 1',
            type: 'application/pdf',
            size: '1024',
            status: 'completed' as const
          }
        ],
        pagination: { page: 1, limit: 10, totalPages: 1, totalCount: 1 }
      })

      vi.mocked(
        knowledgeBaseServiceModule.knowledgeBaseService.deleteAllContent
      ).mockResolvedValue()

      const { result } = renderHook(() => useKnowledgeBaseManager())

      await act(async () => {
        await result.current.loadContents()
      })

      await act(async () => {
        await result.current.deleteAllContents()
      })

      await waitFor(() => {
        expect(result.current.contents).toHaveLength(0)
      })

      expect(result.current.pagination.totalCount).toBe(0)
      expect(toast.success).toHaveBeenCalledWith('All content deleted successfully')
    })
  })

  describe('batchDelete', () => {
    it('should batch delete successfully', async () => {
      vi.mocked(knowledgeBaseServiceModule.knowledgeBaseService.listContent).mockResolvedValue({
        contents: [
          {
            id: 'content-1',
            name: 'Document 1',
            type: 'application/pdf',
            size: '1024',
            status: 'completed' as const
          },
          {
            id: 'content-2',
            name: 'Document 2',
            type: 'application/pdf',
            size: '2048',
            status: 'completed' as const
          },
          {
            id: 'content-3',
            name: 'Document 3',
            type: 'application/pdf',
            size: '3072',
            status: 'completed' as const
          }
        ],
        pagination: { page: 1, limit: 10, totalPages: 1, totalCount: 3 }
      })

      vi.mocked(
        knowledgeBaseServiceModule.knowledgeBaseService.batchDeleteContent
      ).mockResolvedValue({
        successful: ['content-1', 'content-2'],
        failed: []
      })

      const { result } = renderHook(() => useKnowledgeBaseManager())

      await act(async () => {
        await result.current.loadContents()
      })

      await act(async () => {
        await result.current.batchDelete(['content-1', 'content-2'])
      })

      await waitFor(() => {
        expect(result.current.contents).toHaveLength(1)
      })

      expect(result.current.contents[0].id).toBe('content-3')
      expect(toast.success).toHaveBeenCalledWith('2 items deleted successfully')
    })

    it('should handle partial batch delete failures', async () => {
      vi.mocked(
        knowledgeBaseServiceModule.knowledgeBaseService.batchDeleteContent
      ).mockResolvedValue({
        successful: ['content-1'],
        failed: [{ id: 'content-2', error: 'Failed' }]
      })

      const { result } = renderHook(() => useKnowledgeBaseManager())

      await act(async () => {
        await result.current.batchDelete(['content-1', 'content-2'])
      })

      expect(toast.error).toHaveBeenCalledWith('1 deleted, 1 failed')
    })
  })

  describe('refreshContent', () => {
    it('should refresh content successfully', async () => {
      const mockRefreshed = {
        id: 'content-1',
        name: 'Refreshed Document',
        type: 'application/pdf',
        size: '1024',
        status: 'completed' as const,
        createdAt: '2024-01-01T00:00:00Z'
      }

      vi.mocked(knowledgeBaseServiceModule.knowledgeBaseService.listContent).mockResolvedValue({
        contents: [
          {
            id: 'content-1',
            name: 'Original Document',
            type: 'application/pdf',
            size: '1024',
            status: 'processing' as const
          }
        ],
        pagination: { page: 1, limit: 10, totalPages: 1, totalCount: 1 }
      })

      vi.mocked(knowledgeBaseServiceModule.knowledgeBaseService.getContentById).mockResolvedValue(
        mockRefreshed
      )

      const { result } = renderHook(() => useKnowledgeBaseManager())

      await act(async () => {
        await result.current.loadContents()
      })

      await act(async () => {
        await result.current.refreshContent('content-1')
      })

      await waitFor(() => {
        expect(result.current.contents[0].name).toBe('Refreshed Document')
      })
    })
  })

  describe('syncToStore', () => {
    it('should sync to store successfully', async () => {
      vi.mocked(knowledgeBaseServiceModule.knowledgeBaseService.syncToStore).mockResolvedValue()

      const { result } = renderHook(() => useKnowledgeBaseManager())

      await act(async () => {
        await result.current.syncToStore()
      })

      expect(knowledgeBaseServiceModule.knowledgeBaseService.syncToStore).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('Knowledge base synced')
    })
  })
})
