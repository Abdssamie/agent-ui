import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFileUpload } from '../useFileUpload'
import { useStore } from '@/store'
import * as fileUploadService from '@/lib/fileUploadService'
import { FileAttachment } from '@/types/fileHandling'

// Mock the file upload service
vi.mock('@/lib/fileUploadService', () => ({
  uploadFileToKnowledge: vi.fn(),
  uploadFilesToKnowledge: vi.fn(),
  retryUpload: vi.fn()
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useStore.setState({
      attachments: [],
      isUploading: false,
      uploadProgress: {},
      knowledgeContents: [],
      selectedEndpoint: 'http://localhost:7777'
    })
  })

  const createMockFile = (name: string, size: number, type: string): File => {
    return new File(['test content'], name, { type })
  }

  const createMockAttachment = (id: string, file: File): FileAttachment => ({
    id,
    file,
    uploadStatus: 'pending'
  })

  describe('uploadFile', () => {
    it('should upload a single file successfully', async () => {
      const mockFile = createMockFile('test.pdf', 1024, 'application/pdf')
      const mockAttachment = createMockAttachment('1', mockFile)

      const mockResult = {
        success: true,
        knowledgeId: 'knowledge-123',
        knowledgeContent: {
          id: 'knowledge-123',
          filename: 'test.pdf',
          content_type: 'application/pdf',
          size: 1024,
          upload_date: new Date().toISOString(),
          status: 'completed' as const,
          metadata: {
            source: 'chat-upload',
            user_context: 'chat-interface'
          }
        }
      }

      vi.mocked(fileUploadService.uploadFileToKnowledge).mockResolvedValue(mockResult)

      const { result } = renderHook(() => useFileUpload())

      await act(async () => {
        await result.current.uploadFile(mockAttachment)
      })

      await waitFor(() => {
        const state = useStore.getState()
        expect(state.knowledgeContents).toHaveLength(1)
        expect(state.knowledgeContents[0].id).toBe('knowledge-123')
      })
    })

    it('should handle upload failure', async () => {
      const mockFile = createMockFile('test.pdf', 1024, 'application/pdf')
      const mockAttachment = createMockAttachment('1', mockFile)

      const mockResult = {
        success: false,
        error: 'Network error'
      }

      vi.mocked(fileUploadService.uploadFileToKnowledge).mockResolvedValue(mockResult)

      const { result } = renderHook(() => useFileUpload())

      await act(async () => {
        await result.current.uploadFile(mockAttachment)
      })

      await waitFor(() => {
        const state = useStore.getState()
        expect(state.knowledgeContents).toHaveLength(0)
      })
    })

    it('should update upload status and progress', async () => {
      const mockFile = createMockFile('test.pdf', 1024, 'application/pdf')
      const mockAttachment = createMockAttachment('1', mockFile)

      // Add attachment to store
      useStore.setState({
        attachments: [mockAttachment]
      })

      const mockResult = {
        success: true,
        knowledgeId: 'knowledge-123',
        knowledgeContent: {
          id: 'knowledge-123',
          filename: 'test.pdf',
          content_type: 'application/pdf',
          size: 1024,
          upload_date: new Date().toISOString(),
          status: 'completed' as const,
          metadata: {
            source: 'chat-upload',
            user_context: 'chat-interface'
          }
        }
      }

      vi.mocked(fileUploadService.uploadFileToKnowledge).mockImplementation(
        async (attachment, options) => {
          // Simulate progress updates
          options?.onProgress?.(50)
          options?.onProgress?.(100)
          options?.onSuccess?.('knowledge-123')
          return mockResult
        }
      )

      const { result } = renderHook(() => useFileUpload())

      await act(async () => {
        await result.current.uploadFile(mockAttachment)
      })

      await waitFor(() => {
        const state = useStore.getState()
        const attachment = state.attachments.find((a) => a.id === '1')
        expect(attachment?.uploadStatus).toBe('completed')
        expect(attachment?.knowledgeId).toBe('knowledge-123')
      })
    })
  })

  describe('uploadAllFiles', () => {
    it('should upload all pending attachments', async () => {
      const mockFile1 = createMockFile('test1.pdf', 1024, 'application/pdf')
      const mockFile2 = createMockFile('test2.pdf', 2048, 'application/pdf')
      const mockAttachment1 = createMockAttachment('1', mockFile1)
      const mockAttachment2 = createMockAttachment('2', mockFile2)

      useStore.setState({
        attachments: [mockAttachment1, mockAttachment2]
      })

      const mockResults = new Map([
        [
          '1',
          {
            success: true,
            knowledgeId: 'knowledge-1',
            knowledgeContent: {
              id: 'knowledge-1',
              filename: 'test1.pdf',
              content_type: 'application/pdf',
              size: 1024,
              upload_date: new Date().toISOString(),
              status: 'completed' as const,
              metadata: {
                source: 'chat-upload',
                user_context: 'chat-interface'
              }
            }
          }
        ],
        [
          '2',
          {
            success: true,
            knowledgeId: 'knowledge-2',
            knowledgeContent: {
              id: 'knowledge-2',
              filename: 'test2.pdf',
              content_type: 'application/pdf',
              size: 2048,
              upload_date: new Date().toISOString(),
              status: 'completed' as const,
              metadata: {
                source: 'chat-upload',
                user_context: 'chat-interface'
              }
            }
          }
        ]
      ])

      vi.mocked(fileUploadService.uploadFilesToKnowledge).mockResolvedValue(mockResults)

      const { result } = renderHook(() => useFileUpload())

      await act(async () => {
        await result.current.uploadAllFiles()
      })

      await waitFor(() => {
        const state = useStore.getState()
        expect(state.knowledgeContents).toHaveLength(2)
      })
    })

    it('should skip if no pending attachments', async () => {
      useStore.setState({
        attachments: []
      })

      const { result } = renderHook(() => useFileUpload())

      await act(async () => {
        const results = await result.current.uploadAllFiles()
        expect(results.size).toBe(0)
      })

      expect(fileUploadService.uploadFilesToKnowledge).not.toHaveBeenCalled()
    })
  })

  describe('retryFailedUpload', () => {
    it('should retry a failed upload', async () => {
      const mockFile = createMockFile('test.pdf', 1024, 'application/pdf')
      const mockAttachment: FileAttachment = {
        id: '1',
        file: mockFile,
        uploadStatus: 'error',
        error: 'Previous error'
      }

      useStore.setState({
        attachments: [mockAttachment]
      })

      const mockResult = {
        success: true,
        knowledgeId: 'knowledge-123',
        knowledgeContent: {
          id: 'knowledge-123',
          filename: 'test.pdf',
          content_type: 'application/pdf',
          size: 1024,
          upload_date: new Date().toISOString(),
          status: 'completed' as const,
          metadata: {
            source: 'chat-upload',
            user_context: 'chat-interface'
          }
        }
      }

      vi.mocked(fileUploadService.retryUpload).mockImplementation(
        async (attachment, options) => {
          // Simulate progress and success callbacks
          options?.onProgress?.(50)
          options?.onProgress?.(100)
          options?.onSuccess?.('knowledge-123')
          return mockResult
        }
      )

      const { result } = renderHook(() => useFileUpload())

      await act(async () => {
        await result.current.retryFailedUpload('1')
      })

      await waitFor(() => {
        const state = useStore.getState()
        const attachment = state.attachments.find((a) => a.id === '1')
        expect(attachment?.uploadStatus).toBe('completed')
        expect(attachment?.knowledgeId).toBe('knowledge-123')
        expect(attachment?.error).toBeUndefined()
      })
    })
  })

  describe('getUploadStats', () => {
    it('should return correct upload statistics', () => {
      const mockFile1 = createMockFile('test1.pdf', 1024, 'application/pdf')
      const mockFile2 = createMockFile('test2.pdf', 2048, 'application/pdf')
      const mockFile3 = createMockFile('test3.pdf', 3072, 'application/pdf')
      const mockFile4 = createMockFile('test4.pdf', 4096, 'application/pdf')

      useStore.setState({
        attachments: [
          { id: '1', file: mockFile1, uploadStatus: 'pending' },
          { id: '2', file: mockFile2, uploadStatus: 'uploading' },
          { id: '3', file: mockFile3, uploadStatus: 'completed', knowledgeId: 'k-3' },
          { id: '4', file: mockFile4, uploadStatus: 'error', error: 'Failed' }
        ]
      })

      const { result } = renderHook(() => useFileUpload())

      const stats = result.current.getUploadStats()

      expect(stats.total).toBe(4)
      expect(stats.pending).toBe(1)
      expect(stats.uploading).toBe(1)
      expect(stats.completed).toBe(1)
      expect(stats.failed).toBe(1)
      expect(stats.hasFailedUploads).toBe(true)
      expect(stats.hasPendingUploads).toBe(true)
      expect(stats.isAllCompleted).toBe(false)
    })

    it('should indicate all completed when all uploads are done', () => {
      const mockFile1 = createMockFile('test1.pdf', 1024, 'application/pdf')
      const mockFile2 = createMockFile('test2.pdf', 2048, 'application/pdf')

      useStore.setState({
        attachments: [
          { id: '1', file: mockFile1, uploadStatus: 'completed', knowledgeId: 'k-1' },
          { id: '2', file: mockFile2, uploadStatus: 'completed', knowledgeId: 'k-2' }
        ]
      })

      const { result } = renderHook(() => useFileUpload())

      const stats = result.current.getUploadStats()

      expect(stats.isAllCompleted).toBe(true)
      expect(stats.hasFailedUploads).toBe(false)
      expect(stats.hasPendingUploads).toBe(false)
    })
  })
})
