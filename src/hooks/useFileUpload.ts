import { useCallback } from 'react'
import { useStore } from '@/store'
import { FileAttachment } from '@/types/fileHandling'
import { uploadFileToKnowledge, uploadFilesToKnowledge, retryUpload } from '@/lib/fileUploadService'
import { toast } from 'sonner'

export const useFileUpload = () => {
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const updateAttachment = useStore((state) => state.updateAttachment)
  const setUploadProgress = useStore((state) => state.setUploadProgress)
  const setIsUploading = useStore((state) => state.setIsUploading)
  const setAttachmentError = useStore((state) => state.setAttachmentError)
  const setAttachmentKnowledgeId = useStore((state) => state.setAttachmentKnowledgeId)
  const addKnowledgeContent = useStore((state) => state.addKnowledgeContent)
  const attachments = useStore((state) => state.attachments)

  /**
   * Upload a single file attachment
   */
  const uploadFile = useCallback(
    async (attachment: FileAttachment, metadata?: Record<string, any>) => {
      // Update status to uploading
      updateAttachment(attachment.id, { uploadStatus: 'uploading', progress: 0 })
      setIsUploading(true)

      try {
        const result = await uploadFileToKnowledge(attachment, {
          baseUrl: selectedEndpoint,
          onProgress: (progress) => {
            setUploadProgress(attachment.id, progress)
            updateAttachment(attachment.id, { progress })
          },
          onSuccess: (knowledgeId) => {
            setAttachmentKnowledgeId(attachment.id, knowledgeId)
            toast.success(`${attachment.file.name} uploaded successfully`)
          },
          onError: (error) => {
            setAttachmentError(attachment.id, error)
            toast.error(`Failed to upload ${attachment.file.name}: ${error}`)
          },
          metadata
        })

        // Add to knowledge contents if successful
        if (result.success && result.knowledgeContent) {
          addKnowledgeContent(result.knowledgeContent)
        }

        return result
      } finally {
        setIsUploading(false)
      }
    },
    [
      selectedEndpoint,
      updateAttachment,
      setUploadProgress,
      setIsUploading,
      setAttachmentError,
      setAttachmentKnowledgeId,
      addKnowledgeContent
    ]
  )

  /**
   * Upload all pending attachments
   */
  const uploadAllFiles = useCallback(
    async (metadata?: Record<string, any>) => {
      const pendingAttachments = attachments.filter(
        (attachment) => attachment.uploadStatus === 'pending'
      )

      if (pendingAttachments.length === 0) {
        return new Map()
      }

      setIsUploading(true)

      try {
        const results = await uploadFilesToKnowledge(pendingAttachments, {
          baseUrl: selectedEndpoint,
          onFileProgress: (attachmentId, progress) => {
            setUploadProgress(attachmentId, progress)
            updateAttachment(attachmentId, { progress })
          },
          onFileSuccess: (attachmentId, knowledgeId) => {
            setAttachmentKnowledgeId(attachmentId, knowledgeId)
            const attachment = attachments.find((a) => a.id === attachmentId)
            if (attachment) {
              toast.success(`${attachment.file.name} uploaded successfully`)
            }
          },
          onFileError: (attachmentId, error) => {
            setAttachmentError(attachmentId, error)
            const attachment = attachments.find((a) => a.id === attachmentId)
            if (attachment) {
              toast.error(`Failed to upload ${attachment.file.name}: ${error}`)
            }
          },
          onComplete: (results) => {
            const successCount = Array.from(results.values()).filter((r) => r.success).length
            const failCount = results.size - successCount

            if (successCount > 0) {
              toast.success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully`)
            }
            if (failCount > 0) {
              toast.error(`${failCount} file${failCount > 1 ? 's' : ''} failed to upload`)
            }
          },
          metadata
        })

        // Add successful uploads to knowledge contents
        results.forEach((result) => {
          if (result.success && result.knowledgeContent) {
            addKnowledgeContent(result.knowledgeContent)
          }
        })

        return results
      } finally {
        setIsUploading(false)
      }
    },
    [
      attachments,
      selectedEndpoint,
      updateAttachment,
      setUploadProgress,
      setIsUploading,
      setAttachmentError,
      setAttachmentKnowledgeId,
      addKnowledgeContent
    ]
  )

  /**
   * Retry a failed upload
   */
  const retryFailedUpload = useCallback(
    async (attachmentId: string, metadata?: Record<string, any>) => {
      const attachment = attachments.find((a) => a.id === attachmentId)
      if (!attachment) {
        toast.error('Attachment not found')
        return
      }

      // Reset error state
      updateAttachment(attachmentId, {
        uploadStatus: 'uploading',
        error: undefined,
        progress: 0
      })
      setIsUploading(true)

      try {
        const result = await retryUpload(attachment, {
          baseUrl: selectedEndpoint,
          onProgress: (progress) => {
            setUploadProgress(attachmentId, progress)
            updateAttachment(attachmentId, { progress })
          },
          onSuccess: (knowledgeId) => {
            setAttachmentKnowledgeId(attachmentId, knowledgeId)
            toast.success(`${attachment.file.name} uploaded successfully`)
          },
          onError: (error) => {
            setAttachmentError(attachmentId, error)
            toast.error(`Failed to upload ${attachment.file.name}: ${error}`)
          },
          metadata
        })

        // Add to knowledge contents if successful
        if (result.success && result.knowledgeContent) {
          addKnowledgeContent(result.knowledgeContent)
        }

        return result
      } finally {
        setIsUploading(false)
      }
    },
    [
      attachments,
      selectedEndpoint,
      updateAttachment,
      setUploadProgress,
      setIsUploading,
      setAttachmentError,
      setAttachmentKnowledgeId,
      addKnowledgeContent
    ]
  )

  /**
   * Get upload statistics
   */
  const getUploadStats = useCallback(() => {
    const total = attachments.length
    const pending = attachments.filter((a) => a.uploadStatus === 'pending').length
    const uploading = attachments.filter((a) => a.uploadStatus === 'uploading').length
    const completed = attachments.filter((a) => a.uploadStatus === 'completed').length
    const failed = attachments.filter((a) => a.uploadStatus === 'error').length

    return {
      total,
      pending,
      uploading,
      completed,
      failed,
      hasFailedUploads: failed > 0,
      hasPendingUploads: pending > 0,
      isAllCompleted: total > 0 && completed === total
    }
  }, [attachments])

  return {
    uploadFile,
    uploadAllFiles,
    retryFailedUpload,
    getUploadStats
  }
}
