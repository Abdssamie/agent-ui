import { uploadContentAPI } from '@/api/agnoKnowledge'
import { FileAttachment, KnowledgeContent } from '@/types/fileHandling'
import { UploadContentResponse } from '@/types/agnoKnowledge'
import { toast } from 'sonner'

export interface UploadOptions {
  baseUrl?: string
  onProgress?: (progress: number) => void
  onSuccess?: (knowledgeId: string) => void
  onError?: (error: string) => void
  metadata?: Record<string, any>
}

export interface UploadResult {
  success: boolean
  knowledgeId?: string
  error?: string
  knowledgeContent?: KnowledgeContent
}

/**
 * Upload a single file to the Agno Knowledge API
 * Handles progress tracking, error handling, and retry logic
 */
export const uploadFileToKnowledge = async (
  attachment: FileAttachment,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  const { baseUrl, onProgress, onSuccess, onError, metadata = {} } = options

  try {
    // Notify upload start
    onProgress?.(0)

    // Prepare upload parameters
    const uploadParams = {
      file: attachment.file,
      name: attachment.file.name,
      description: `Uploaded file: ${attachment.file.name}`,
      metadata: {
        filename: attachment.file.name,
        source: 'chat-upload',
        user_context: 'chat-interface',
        upload_timestamp: new Date().toISOString(),
        file_size: attachment.file.size,
        file_type: attachment.file.type,
        ...metadata
      }
    }

    // Simulate progress during upload (since we don't have real progress from fetch)
    const progressInterval = setInterval(() => {
      // Simulate progress up to 90% while uploading
      const currentProgress = Math.min(90, Math.random() * 30 + 60)
      onProgress?.(currentProgress)
    }, 500)

    // Upload to Knowledge API
    const response: UploadContentResponse = await uploadContentAPI(uploadParams, baseUrl)

    // Clear progress interval
    clearInterval(progressInterval)

    // Complete progress
    onProgress?.(100)

    // Create knowledge content object
    const knowledgeContent: KnowledgeContent = {
      id: response.id,
      filename: attachment.file.name,
      content_type: attachment.file.type,
      size: attachment.file.size,
      upload_date: new Date().toISOString(),
      status: response.status === 'failed' ? 'error' : response.status,
      metadata: {
        source: 'chat-upload',
        user_context: 'chat-interface',
        ...metadata
      }
    }

    // Notify success
    onSuccess?.(response.id)

    return {
      success: true,
      knowledgeId: response.id,
      knowledgeContent
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file'
    
    // Notify error
    onError?.(errorMessage)

    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Upload multiple files to the Agno Knowledge API
 * Handles batch uploads with individual progress tracking
 */
export const uploadFilesToKnowledge = async (
  attachments: FileAttachment[],
  options: {
    baseUrl?: string
    onFileProgress?: (attachmentId: string, progress: number) => void
    onFileSuccess?: (attachmentId: string, knowledgeId: string) => void
    onFileError?: (attachmentId: string, error: string) => void
    onComplete?: (results: Map<string, UploadResult>) => void
    metadata?: Record<string, any>
  } = {}
): Promise<Map<string, UploadResult>> => {
  const {
    baseUrl,
    onFileProgress,
    onFileSuccess,
    onFileError,
    onComplete,
    metadata = {}
  } = options

  const results = new Map<string, UploadResult>()

  // Upload files sequentially to avoid overwhelming the API
  for (const attachment of attachments) {
    const result = await uploadFileToKnowledge(attachment, {
      baseUrl,
      onProgress: (progress) => onFileProgress?.(attachment.id, progress),
      onSuccess: (knowledgeId) => onFileSuccess?.(attachment.id, knowledgeId),
      onError: (error) => onFileError?.(attachment.id, error),
      metadata
    })

    results.set(attachment.id, result)
  }

  // Notify completion
  onComplete?.(results)

  return results
}

/**
 * Retry a failed upload
 */
export const retryUpload = async (
  attachment: FileAttachment,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  toast.info(`Retrying upload for ${attachment.file.name}...`)
  return uploadFileToKnowledge(attachment, options)
}
