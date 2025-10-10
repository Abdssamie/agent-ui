/**
 * Tests for chunked upload service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { uploadFileWithChunking } from '../chunkedUploadService'
import { FileAttachment } from '@/types/fileHandling'
import * as agnoKnowledge from '@/api/agnoKnowledge'

// Mock the API
vi.mock('@/api/agnoKnowledge', () => ({
  uploadContentAPI: vi.fn(),
}))

// Mock file optimization
vi.mock('../fileOptimization', () => ({
  shouldUseChunkedUpload: vi.fn((file: File) => file.size > 5 * 1024 * 1024),
  splitFileIntoChunks: vi.fn((file: File) => {
    const chunkSize = 1024 * 1024
    const chunks = []
    let offset = 0
    while (offset < file.size) {
      chunks.push(file.slice(offset, offset + chunkSize))
      offset += chunkSize
    }
    return chunks
  }),
  compressFileIfNeeded: vi.fn((file: File) => Promise.resolve(file)),
  CHUNK_CONFIG: {
    chunkSize: 1024 * 1024,
    maxConcurrentChunks: 3,
    largeFileThreshold: 5 * 1024 * 1024,
  },
}))

describe('Chunked Upload Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should upload small files without chunking', async () => {
    const smallFile = new File([new ArrayBuffer(1024 * 1024)], 'small.pdf', { type: 'application/pdf' })
    const attachment: FileAttachment = {
      id: 'test-1',
      file: smallFile,
      uploadStatus: 'pending',
    }

    const mockResponse = {
      id: 'knowledge-123',
      status: 'completed' as const,
    }

    vi.mocked(agnoKnowledge.uploadContentAPI).mockResolvedValue(mockResponse)

    const result = await uploadFileWithChunking(attachment, {
      enableCompression: false,
    })

    expect(result.success).toBe(true)
    expect(result.knowledgeId).toBe('knowledge-123')
    expect(agnoKnowledge.uploadContentAPI).toHaveBeenCalledTimes(1)
  })

  it('should upload large files with chunking', async () => {
    const largeFile = new File([new ArrayBuffer(10 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' })
    const attachment: FileAttachment = {
      id: 'test-2',
      file: largeFile,
      uploadStatus: 'pending',
    }

    const mockResponse = {
      id: 'knowledge-456',
      status: 'completed' as const,
    }

    vi.mocked(agnoKnowledge.uploadContentAPI).mockResolvedValue(mockResponse)

    const result = await uploadFileWithChunking(attachment, {
      enableCompression: false,
    })

    expect(result.success).toBe(true)
    expect(result.knowledgeId).toBe('knowledge-456')
    expect(agnoKnowledge.uploadContentAPI).toHaveBeenCalledTimes(1)
  })

  it('should track upload progress', async () => {
    const file = new File([new ArrayBuffer(10 * 1024 * 1024)], 'test.pdf', { type: 'application/pdf' })
    const attachment: FileAttachment = {
      id: 'test-3',
      file,
      uploadStatus: 'pending',
    }

    const mockResponse = {
      id: 'knowledge-789',
      status: 'completed' as const,
    }

    vi.mocked(agnoKnowledge.uploadContentAPI).mockResolvedValue(mockResponse)

    const progressUpdates: number[] = []
    const onProgress = (progress: number) => {
      progressUpdates.push(progress)
    }

    await uploadFileWithChunking(attachment, {
      onProgress,
      enableCompression: false,
    })

    expect(progressUpdates.length).toBeGreaterThan(0)
    expect(progressUpdates[progressUpdates.length - 1]).toBe(100)
  })

  it('should handle upload errors', async () => {
    const file = new File([new ArrayBuffer(1024 * 1024)], 'test.pdf', { type: 'application/pdf' })
    const attachment: FileAttachment = {
      id: 'test-4',
      file,
      uploadStatus: 'pending',
    }

    vi.mocked(agnoKnowledge.uploadContentAPI).mockRejectedValue(new Error('Network error'))

    const result = await uploadFileWithChunking(attachment, {
      enableCompression: false,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should call success callback on successful upload', async () => {
    const file = new File([new ArrayBuffer(1024 * 1024)], 'test.pdf', { type: 'application/pdf' })
    const attachment: FileAttachment = {
      id: 'test-5',
      file,
      uploadStatus: 'pending',
    }

    const mockResponse = {
      id: 'knowledge-999',
      status: 'completed' as const,
    }

    vi.mocked(agnoKnowledge.uploadContentAPI).mockResolvedValue(mockResponse)

    const onSuccess = vi.fn()

    await uploadFileWithChunking(attachment, {
      onSuccess,
      enableCompression: false,
    })

    expect(onSuccess).toHaveBeenCalledWith('knowledge-999')
  })

  it('should call error callback on failed upload', async () => {
    const file = new File([new ArrayBuffer(1024 * 1024)], 'test.pdf', { type: 'application/pdf' })
    const attachment: FileAttachment = {
      id: 'test-6',
      file,
      uploadStatus: 'pending',
    }

    vi.mocked(agnoKnowledge.uploadContentAPI).mockRejectedValue(new Error('Upload failed'))

    const onError = vi.fn()

    await uploadFileWithChunking(attachment, {
      onError,
      enableCompression: false,
    })

    expect(onError).toHaveBeenCalled()
  })

  it('should include metadata in upload', async () => {
    const file = new File([new ArrayBuffer(1024 * 1024)], 'test.pdf', { type: 'application/pdf' })
    const attachment: FileAttachment = {
      id: 'test-7',
      file,
      uploadStatus: 'pending',
    }

    const mockResponse = {
      id: 'knowledge-111',
      status: 'completed' as const,
    }

    vi.mocked(agnoKnowledge.uploadContentAPI).mockResolvedValue(mockResponse)

    const metadata = {
      custom_field: 'test_value',
      session_id: 'session-123',
    }

    await uploadFileWithChunking(attachment, {
      metadata,
      enableCompression: false,
    })

    expect(agnoKnowledge.uploadContentAPI).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining(metadata),
      }),
      undefined
    )
  })

  it('should handle server-side upload failures', async () => {
    const file = new File([new ArrayBuffer(1024 * 1024)], 'test.pdf', { type: 'application/pdf' })
    const attachment: FileAttachment = {
      id: 'test-8',
      file,
      uploadStatus: 'pending',
    }

    const mockResponse = {
      id: 'knowledge-222',
      status: 'failed' as const,
    }

    vi.mocked(agnoKnowledge.uploadContentAPI).mockResolvedValue(mockResponse)

    const result = await uploadFileWithChunking(attachment, {
      enableCompression: false,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Upload failed on server')
  })
})
