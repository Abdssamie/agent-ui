import { ValidationResult } from '@/types/fileHandling'

// Image-specific validation configuration
export const IMAGE_VALIDATION = {
  allowedTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  maxSize: 10 * 1024 * 1024, // 10MB
  maxImages: 5 // Maximum images per message
} as const

/**
 * Validates an image file for direct message attachment
 */
export function validateImageFile(file: File): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate file type
  if (!IMAGE_VALIDATION.allowedTypes.includes(file.type as "image/jpeg" | "image/jpg" | "image/png" | "image/gif" | "image/webp")) {
    errors.push(
      `Only images are supported (JPG, PNG, GIF, WebP). "${file.name}" has type "${file.type}".`
    )
  }

  // Validate file extension
  const extension = getFileExtension(file.name)
  if (extension && !IMAGE_VALIDATION.allowedExtensions.includes(extension.toLowerCase() as ".jpg" | ".jpeg" | ".png" | ".gif" | ".webp")) {
    errors.push(
      `File extension "${extension}" is not supported. Allowed: ${IMAGE_VALIDATION.allowedExtensions.join(', ')}`
    )
  }

  // Validate file size
  if (file.size > IMAGE_VALIDATION.maxSize) {
    errors.push(
      `Image "${file.name}" exceeds maximum size of ${formatFileSize(IMAGE_VALIDATION.maxSize)}. ` +
      `Current size: ${formatFileSize(file.size)}`
    )
  }

  // Warning for large files (80% of max)
  const warningThreshold = IMAGE_VALIDATION.maxSize * 0.8
  if (file.size > warningThreshold && file.size <= IMAGE_VALIDATION.maxSize) {
    warnings.push(
      `Image "${file.name}" is large (${formatFileSize(file.size)}). Consider compressing it.`
    )
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates multiple images including count limits
 */
export function validateImageFiles(
  newImages: File[],
  existingImages: File[] = []
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const totalCount = existingImages.length + newImages.length

  // Validate image count
  if (totalCount > IMAGE_VALIDATION.maxImages) {
    errors.push(
      `Maximum ${IMAGE_VALIDATION.maxImages} images per message. ` +
      `Attempting to add ${newImages.length} to ${existingImages.length} existing.`
    )
  }

  // Validate each individual image
  for (const image of newImages) {
    const imageValidation = validateImageFile(image)
    errors.push(...imageValidation.errors)
    warnings.push(...imageValidation.warnings)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Checks if an image can be added without exceeding limits
 */
export function canAddImage(
  existingCount: number
): { canAdd: boolean; reason?: string } {
  if (existingCount >= IMAGE_VALIDATION.maxImages) {
    return {
      canAdd: false,
      reason: `Maximum ${IMAGE_VALIDATION.maxImages} images per message`
    }
  }

  return { canAdd: true }
}

/**
 * Gets file extension from filename
 */
function getFileExtension(filename: string): string | null {
  const lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return null
  }
  return filename.substring(lastDotIndex)
}

/**
 * Formats file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
