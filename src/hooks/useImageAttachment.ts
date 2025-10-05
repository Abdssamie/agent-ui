import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { ImageAttachment } from '@/types/fileHandling'
import {
  validateFile,
  canAddFile,
  isImageFile,
} from '@/lib/fileValidation'

export interface UseImageAttachmentReturn {
  imageAttachments: ImageAttachment[]
  addImage: (file: File) => Promise<void>
  removeImage: (id: string) => void
  clearImages: () => void
  isProcessing: boolean
}

/**
 * Hook for managing image attachments in chat messages
 * Handles validation, preview generation, and cleanup
 */
export function useImageAttachment(): UseImageAttachmentReturn {
  const [imageAttachments, setImageAttachments] = useState<ImageAttachment[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  /**
   * Adds an image to the attachments list
   * Validates the image and creates a preview URL
   */
  const addImage = useCallback(
    async (file: File) => {
      setIsProcessing(true)
      let preview: string | null = null

      try {
        // Check if we can add more files
        const canAdd = canAddFile(imageAttachments.length)
        if (!canAdd.canAdd) {
          toast.error(canAdd.reason || 'Cannot add more files')
          return
        }

        // Validate the file
        const validation = validateFile(file)
        if (!validation.isValid) {
          toast.error(validation.errors[0] || 'Invalid file')
          return
        }

        // Show warnings if any
        if (validation.warnings.length > 0) {
          validation.warnings.forEach((warning) => toast.warning(warning))
        }

        // Create preview URL using createObjectURL (memory efficient)
        // Only for images - documents don't need preview
        if (isImageFile(file)) {
          preview = URL.createObjectURL(file)
        } else {
          // For documents, use a placeholder or file icon
          preview = '' // Will be handled by UI to show document icon
        }

        // Generate unique ID
        const id = generateImageId(file)

        // Create file attachment
        const imageAttachment: ImageAttachment = {
          id,
          file,
          preview,
          type: 'image', // Keep as 'image' for backward compatibility
          size: file.size,
          mimeType: file.type
        }

        // Optionally load image dimensions (only for images)
        if (isImageFile(file)) {
          try {
            const dimensions = await getImageDimensions(file)
            imageAttachment.width = dimensions.width
            imageAttachment.height = dimensions.height
          } catch (error) {
            // Dimensions are optional, continue without them
            console.warn('Failed to load image dimensions:', error)
          }
        }

        setImageAttachments((prev) => [...prev, imageAttachment])
      } catch (error) {
        console.error('Failed to add image:', error)
        
        // Provide specific error message based on error type
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Failed to process image. Please try again.'
        
        toast.error(errorMessage)
        
        // Clean up preview URL if it was created
        if (preview) {
          URL.revokeObjectURL(preview)
        }
      } finally {
        setIsProcessing(false)
      }
    },
    [imageAttachments.length]
  )

  /**
   * Removes an image from the attachments list
   * Cleans up the object URL to prevent memory leaks
   */
  const removeImage = useCallback((id: string) => {
    setImageAttachments((prev) => {
      const imageToRemove = prev.find((img) => img.id === id)
      if (imageToRemove && imageToRemove.preview.startsWith('blob:')) {
        URL.revokeObjectURL(imageToRemove.preview)
      }
      return prev.filter((img) => img.id !== id)
    })
  }, [])

  /**
   * Clears all image attachments
   * Cleans up all object URLs
   */
  const clearImages = useCallback(() => {
    setImageAttachments((prev) => {
      // Revoke all object URLs
      prev.forEach((img) => {
        if (img.preview.startsWith('blob:')) {
          URL.revokeObjectURL(img.preview)
        }
      })
      return []
    })
  }, [])

  /**
   * Cleanup effect: revoke all object URLs on unmount
   */
  useEffect(() => {
    return () => {
      imageAttachments.forEach((img) => {
        if (img.preview.startsWith('blob:')) {
          URL.revokeObjectURL(img.preview)
        }
      })
    }
  }, [imageAttachments])

  return {
    imageAttachments,
    addImage,
    removeImage,
    clearImages,
    isProcessing
  }
}

/**
 * Generates a unique ID for an image
 */
function generateImageId(file: File): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const nameHash = file.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8)
  return `img_${timestamp}_${nameHash}_${random}`
}

/**
 * Gets image dimensions by loading it
 */
function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({
        width: img.width,
        height: img.height
      })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}
