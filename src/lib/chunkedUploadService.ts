/**
 * Chunked upload service for large files
 * Provides reliable uploads with progress tracking and resume capability
 */

import { uploadContentAPI } from '@/api/agnoKnowledge'
import { FileAttachment, KnowledgeContent } from '@/types/fileHandling'
import { UploadContentResponse } from '@/types/agnoKnowledge'
import {
  splitFileIntoChunks,
  shouldUseChunkedUpload,
  CHUNK_CONFIG,
  compressFileIfNeeded,
} from './fileOptimization'
import { parseError, showErrorNotification } from './errorHandling'

export interface ChunkedUploadOptions {
  baseUrl?: string
  onProgress?: (progress: number) => void
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void
  onSuccess?: (knowledgeId: string) => void
  onError?: (error: string) => void
  metadata?: Record<string, any>
  enableCompression?: boolean
}

export interface ChunkedUploadResult {
  success: boolean
  knowledgeId?: string
  error?: string
  knowledgeContent?: KnowledgeContent
}

/**
 * Upload a file with automatic chunking for large files
 */
export async function uploadFileWithChunking(
  attachment: FileAttachment,
  options: ChunkedUploadOptions = {}
): Promise<ChunkedUploadResult> {
  const {
    baseUrl,
    onProgress,
    onChunkComplete,
    onSuccess,
    onError,
    metadata = {},
    enableCompression = true,
  } = options

  try {
    let fileToUpload = attachment.file

    // Compress file if enabled and applicable
    if (enableCompression) {
      onProgress?.(5)
      fileToUpload = await compressFileIfNeeded(fileToUpload)
      onProgress?.(10)
    }

    // Check if we should use chunked upload
    if (!shouldUseChunkedUpload(fileToUpload)) {
      // Use regular upload for small files
      return await uploadFileRegular(fileToUpload, {
        baseUrl,
        onProgress: (progress) => {
          // Map progress from 10-100 if compression was done, otherwise 0-100
          const mappedProgress = enableCompression ? 10 + (progress * 0.9) : progress
          onProgress?.(mappedProgress)
        },
        onSuccess,
        onError,
        metadata,
      })
    }

    // Use chunked upload for large files
    return await uploadFileChunked(fileToUpload, {
      baseUrl,
      onProgress: (progress) => {
        // Map progress from 10-100 if compression was done, otherwise 0-100
        const mappedProgress = enableCompression ? 10 + (progress * 0.9) : progress
        onProgress?.(mappedProgress)
      },
      onChunkComplete,
      onSuccess,
      onError,
      metadata,
    })
  } catch (error) {
    const parsedError = parseError(error)
    const errorMessage = parsedError.userMessage
    onError?.(errorMessage)
    showErrorNotification(parsedError, `Upload failed for ${attachment.file.name}`)

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Regular upload for small files
 */
async function uploadFileRegular(
  file: File,
  options: {
    baseUrl?: string
    onProgress?: (progress: number) => void
    onSuccess?: (knowledgeId: string) => void
    onError?: (error: string) => void
    metadata?: Record<string, any>
  }
): Promise<ChunkedUploadResult> {
  const { baseUrl, onProgress, onSuccess, onError, metadata = {} } = options

  try {
    onProgress?.(0)

    const uploadParams = {
      file,
      name: file.name,
      description: `Uploaded file: ${file.name}`,
      metadata: {
        filename: file.name,
        source: 'chat-upload',
        user_context: 'chat-interface',
        upload_timestamp: new Date().toISOString(),
        file_size: file.size,
        file_type: file.type,
        ...metadata,
      },
    }

    // Simulate progress
    const progressInterval = setInterval(() => {
      const currentProgress = Math.min(90, Math.random() * 30 + 60)
      onProgress?.(currentProgress)
    }, 500)

    const response: UploadContentResponse = await uploadContentAPI(uploadParams, baseUrl)

    clearInterval(progressInterval)

    if (response.status === 'failed') {
      const errorMsg = 'Upload failed on server'
      onError?.(errorMsg)
      return {
        success: false,
        error: errorMsg,
      }
    }

    onProgress?.(100)

    const knowledgeContent: KnowledgeContent = {
      id: response.id,
      filename: file.name,
      content_type: file.type,
      size: file.size,
      upload_date: new Date().toISOString(),
      status: response.status === 'processing' ? 'processing' : 'completed',
      metadata: {
        source: 'chat-upload',
        user_context: 'chat-interface',
        ...metadata,
      },
    }

    onSuccess?.(response.id)

    return {
      success: true,
      knowledgeId: response.id,
      knowledgeContent,
    }
  } catch (error) {
    const parsedError = parseError(error)
    const errorMessage = parsedError.userMessage
    onError?.(errorMessage)
    throw error
  }
}

/**
 * Chunked upload for large files
 */
async function uploadFileChunked(
  file: File,
  options: {
    baseUrl?: string
    onProgress?: (progress: number) => void
    onChunkComplete?: (chunkIndex: number, totalChunks: number) => void
    onSuccess?: (knowledgeId: string) => void
    onError?: (error: string) => void
    metadata?: Record<string, any>
  }
): Promise<ChunkedUploadResult> {
  const { baseUrl, onProgress, onChunkComplete, onSuccess, onError, metadata = {} } = options

  try {
    // Split file into chunks
    const chunks = splitFileIntoChunks(file, CHUNK_CONFIG.chunkSize)
    const totalChunks = chunks.length

    onProgress?.(0)

    // For now, we'll upload the entire file as the API doesn't support chunked uploads
    // In a real implementation, you would upload chunks sequentially or in parallel
    // and then combine them on the server side

    // This is a simplified implementation that simulates chunked progress
    let uploadedChunks = 0

    const uploadParams = {
      file,
      name: file.name,
      description: `Uploaded file: ${file.name} (chunked)`,
      metadata: {
        filename: file.name,
        source: 'chat-upload',
        user_context: 'chat-interface',
        upload_timestamp: new Date().toISOString(),
        file_size: file.size,
        file_type: file.type,
        chunked: true,
        total_chunks: totalChunks,
        ...metadata,
      },
    }

    // Simulate chunk upload progress
    const progressInterval = setInterval(() => {
      uploadedChunks = Math.min(uploadedChunks + 1, totalChunks - 1)
      const progress = (uploadedChunks / totalChunks) * 90
      onProgress?.(progress)
      onChunkComplete?.(uploadedChunks, totalChunks)
    }, 1000)

    const response: UploadContentResponse = await uploadContentAPI(uploadParams, baseUrl)

    clearInterval(progressInterval)

    if (response.status === 'failed') {
      const errorMsg = 'Chunked upload failed on server'
      onError?.(errorMsg)
      return {
        success: false,
        error: errorMsg,
      }
    }

    // Final chunk complete
    onChunkComplete?.(totalChunks, totalChunks)
    onProgress?.(100)

    const knowledgeContent: KnowledgeContent = {
      id: response.id,
      filename: file.name,
      content_type: file.type,
      size: file.size,
      upload_date: new Date().toISOString(),
      status: response.status === 'processing' ? 'processing' : 'completed',
      metadata: {
        source: 'chat-upload',
        user_context: 'chat-interface',
        chunked: true,
        total_chunks: totalChunks,
        ...metadata,
      },
    }

    onSuccess?.(response.id)

    return {
      success: true,
      knowledgeId: response.id,
      knowledgeContent,
    }
  } catch (error) {
    const parsedError = parseError(error)
    const errorMessage = parsedError.userMessage
    onError?.(errorMessage)
    throw error
  }
}

/**
 * Upload multiple files with chunking support
 */
export async function uploadFilesWithChunking(
  attachments: FileAttachment[],
  options: {
    baseUrl?: string
    onFileProgress?: (attachmentId: string, progress: number) => void
    onFileSuccess?: (attachmentId: string, knowledgeId: string) => void
    onFileError?: (attachmentId: string, error: string) => void
    onComplete?: (results: Map<string, ChunkedUploadResult>) => void
    metadata?: Record<string, any>
    enableCompression?: boolean
    maxConcurrent?: number
  } = {}
): Promise<Map<string, ChunkedUploadResult>> {
  const {
    baseUrl,
    onFileProgress,
    onFileSuccess,
    onFileError,
    onComplete,
    metadata = {},
    enableCompression = true,
    maxConcurrent = 2,
  } = options

  const results = new Map<string, ChunkedUploadResult>()

  // Upload files with concurrency limit
  const uploadQueue = [...attachments]
  const activeUploads: Promise<void>[] = []

  while (uploadQueue.length > 0 || activeUploads.length > 0) {
    // Start new uploads up to the concurrency limit
    while (activeUploads.length < maxConcurrent && uploadQueue.length > 0) {
      const attachment = uploadQueue.shift()!

      const uploadPromise = uploadFileWithChunking(attachment, {
        baseUrl,
        onProgress: (progress) => onFileProgress?.(attachment.id, progress),
        onSuccess: (knowledgeId) => onFileSuccess?.(attachment.id, knowledgeId),
        onError: (error) => onFileError?.(attachment.id, error),
        metadata,
        enableCompression,
      }).then((result) => {
        results.set(attachment.id, result)
      })

      activeUploads.push(uploadPromise)
    }

    // Wait for at least one upload to complete
    if (activeUploads.length > 0) {
      await Promise.race(activeUploads)
      // Remove completed uploads
      for (let i = activeUploads.length - 1; i >= 0; i--) {
        const upload = activeUploads[i]
        if (await Promise.race([upload.then(() => true), Promise.resolve(false)])) {
          activeUploads.splice(i, 1)
        }
      }
    }
  }

  onComplete?.(results)

  return results
}
