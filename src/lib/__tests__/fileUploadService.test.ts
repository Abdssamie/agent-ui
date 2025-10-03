import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { uploadFileToKnowledge, uploadFilesToKnowledge, retryUpload } from '../fileUploadService'
import { FileAttachment } from '@/types/fileHandling'
import * as agnoKnowledgeAPI from '@/api/agnoKnowledge'

// Mock the API
vi.mock('@/api/agnoKnowledge', () => ({
  uploadContentAPI: vi.fn()
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

describe('fileUploadService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const createMockFile = (name: string, size: number, type: string): File => {
    const file = new File(['test content'], name, { type })
    Object.defineProperty(file, 'size', { value: size })
    return file
  }

  const createMockAttachment = (id: string, file: File): FileAttachment => ({
    id,
    file,
    uploadStatus: 'pending'
  })

  describe('uploadFileToKnowledge', () => {
    it('should successfully upload a file', async () => {
      const mockFile = createMockFile('test.pdf', 1024, 'application/pdf')
      const mockAttachment = createMockAttachment('1', mockFile)
      const mockResponse = {
        id: 'knowledge-123',
        status: 'completed' as const,
        name: 'test.pdf'
      }

      vi.mocked(agnoKnowledgeAPI.uploadContentAPI).mockResolvedValue(mockResponse)

      const onProgress = vi.fn()
      const onSuccess = vi.fn()
      const onError = vi.fn()

      const resultPromise = uploadFileToKnowledge(mockAttachment, {
        onProgress,
        onSuccess,
        onError
      })

      // Fast-forward timers to simulate progress updates
      await vi.advanceTimersByTimeAsync(1500)

      const result = await resultPromise

      expect(result.success).toBe(true)
      expect(result.knowledgeId).toBe('knowledge-123')
      expect(result.knowledgeContent).toBeDefined()
      expect(result.knowledgeContent?.id).toBe('knowledge-123')
      expect(result.knowledgeContent?.filename).toBe('test.pdf')
      expect(onProgress).toHaveBeenCalled()
      expect(onSuccess).toHaveBeenCalledWith('knowledge-123')
      expect(onError).not.toHaveBeenCalled()
    })

    it('should handle upload failure', async () => {
      const mockFile = createMockFile('test.pdf', 1024, 'application/pdf')
      const mockAttachment = createMockAttachment('1', mockFile)
      const mockError = new Error('Network error')

      vi.mocked(agnoKnowledgeAPI.uploadContentAPI).mockRejectedValue(mockError)

      const onProgress = vi.fn()
      const onSuccess = vi.fn()
      const onError = vi.fn()

      const result = await uploadFileToKnowledge(mockAttachment, {
        onProgress,
        onSuccess,
        onError
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
      expect(onError).toHaveBeenCalledWith('Network error')
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('should include metadata in upload request', async () => {
      const mockFile = createMockFile('test.pdf', 1024, 'application/pdf')
      const mockAttachment = createMockAttachment('1', mockFile)
      const mockResponse = {
        id: 'knowledge-123',
        status: 'completed' as const
      }

      vi.mocked(agnoKnowledgeAPI.uploadContentAPI).mockResolvedValue(mockResponse)

      const customMetadata = {
        session_id: 'session-123',
        custom_field: 'custom_value'
      }

      await uploadFileToKnowledge(mockAttachment, {
        metadata: customMetadata
      })

      expect(agnoKnowledgeAPI.uploadContentAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          file: mockFile,
          name: 'test.pdf',
          metadata: expect.objectContaining({
            filename: 'test.pdf',
            source: 'chat-upload',
            user_context: 'chat-interface',
            session_id: 'session-123',
            custom_field: 'custom_value'
          })
        }),
        undefined
      )
    })

    it('should call progress callback with increasing values', async () => {
      const mockFile = createMockFile('test.pdf', 1024, 'application/pdf')
      const mockAttachment = createMockAttachment('1', mockFile)
      const mockResponse = {
        id: 'knowledge-123',
        status: 'completed' as const
      }

      vi.mocked(agnoKnowledgeAPI.uploadContentAPI).mockResolvedValue(mockResponse)

      const onProgress = vi.fn()

      const resultPromise = uploadFileToKnowledge(mockAttachment, {
        onProgress
      })

      // Fast-forward timers
      await vi.advanceTimersByTimeAsync(1500)

      await resultPromise

      // Should have been called with 0 at start and 100 at end
      expect(onProgress).toHaveBeenCalledWith(0)
      expect(onProgress).toHaveBeenCalledWith(100)
    })
  })

  describe('uploadFilesToKnowledge', () => {
    it('should upload multiple files sequentially', async () => {
      const mockFile1 = createMockFile('test1.pdf', 1024, 'application/pdf')
      const mockFile2 = createMockFile('test2.pdf', 2048, 'application/pdf')
      const mockAttachment1 = createMockAttachment('1', mockFile1)
      const mockAttachment2 = createMockAttachment('2', mockFile2)

      const mockResponse1 = { id: 'knowledge-1', status: 'completed' as const }
      const mockResponse2 = { id: 'knowledge-2', status: 'completed' as const }

      vi.mocked(agnoKnowledgeAPI.uploadContentAPI)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2)

      const onFileProgress = vi.fn()
      const onFileSuccess = vi.fn()
      const onFileError = vi.fn()
      const onComplete = vi.fn()

      const resultPromise = uploadFilesToKnowledge([mockAttachment1, mockAttachment2], {
        onFileProgress,
        onFileSuccess,
        onFileError,
        onComplete
      })

      // Fast-forward timers
      await vi.advanceTimersByTimeAsync(3000)

      const results = await resultPromise

      expect(results.size).toBe(2)
      expect(results.get('1')?.success).toBe(true)
      expect(results.get('2')?.success).toBe(true)
      expect(onFileSuccess).toHaveBeenCalledWith('1', 'knowledge-1')
      expect(onFileSuccess).toHaveBeenCalledWith('2', 'knowledge-2')
      expect(onComplete).toHaveBeenCalledWith(results)
    })

    it('should handle partial failures', async () => {
      const mockFile1 = createMockFile('test1.pdf', 1024, 'application/pdf')
      const mockFile2 = createMockFile('test2.pdf', 2048, 'application/pdf')
      const mockAttachment1 = createMockAttachment('1', mockFile1)
      const mockAttachment2 = createMockAttachment('2', mockFile2)

      const mockResponse1 = { id: 'knowledge-1', status: 'completed' as const }
      const mockError = new Error('Upload failed')

      vi.mocked(agnoKnowledgeAPI.uploadContentAPI)
        .mockResolvedValueOnce(mockResponse1)
        .mockRejectedValueOnce(mockError)

      const onFileError = vi.fn()

      const results = await uploadFilesToKnowledge([mockAttachment1, mockAttachment2], {
        onFileError
      })

      expect(results.size).toBe(2)
      expect(results.get('1')?.success).toBe(true)
      expect(results.get('2')?.success).toBe(false)
      expect(results.get('2')?.error).toBe('Upload failed')
      expect(onFileError).toHaveBeenCalledWith('2', 'Upload failed')
    })
  })

  describe('retryUpload', () => {
    it('should retry a failed upload', async () => {
      const mockFile = createMockFile('test.pdf', 1024, 'application/pdf')
      const mockAttachment = createMockAttachment('1', mockFile)
      const mockResponse = {
        id: 'knowledge-123',
        status: 'completed' as const
      }

      vi.mocked(agnoKnowledgeAPI.uploadContentAPI).mockResolvedValue(mockResponse)

      const result = await retryUpload(mockAttachment)

      expect(result.success).toBe(true)
      expect(result.knowledgeId).toBe('knowledge-123')
    })
  })
})
