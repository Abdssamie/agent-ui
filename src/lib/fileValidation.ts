import { ValidationResult } from '@/types/fileHandling'

// File attachment validation configuration
export const FILE_VALIDATION = {
  images: {
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  documents: {
    allowedTypes: ['application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json'],
    allowedExtensions: ['.pdf', '.txt', '.md', '.csv', '.json'],
    maxSize: 20 * 1024 * 1024, // 20MB
  },
  maxFilesPerMessage: 5
} as const

const ALL_ALLOWED_TYPES = [
  ...FILE_VALIDATION.images.allowedTypes,
  ...FILE_VALIDATION.documents.allowedTypes
] as readonly string[]

const ALL_ALLOWED_EXTENSIONS = [
  ...FILE_VALIDATION.images.allowedExtensions,
  ...FILE_VALIDATION.documents.allowedExtensions
] as readonly string[]

/**
 * Validates a file for message attachment
 */
export function validateFile(file: File): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const isImage = isImageFile(file)
  const isDocument = isDocumentFile(file)

  // Validate file type
  if (!isImage && !isDocument) {
    errors.push(
      `File type "${file.type}" is not supported. Supported: Images (JPG, PNG, GIF, WebP) and Documents (PDF, TXT, MD, CSV, JSON)`
    )
  }

  // Validate file extension
  const extension = getFileExtension(file.name)?.toLowerCase()
  if (extension && !ALL_ALLOWED_EXTENSIONS.includes(extension)) {
    errors.push(`File extension "${extension}" is not supported.`)
  }

  // Validate file size based on type
  const maxSize = isImage ? FILE_VALIDATION.images.maxSize : FILE_VALIDATION.documents.maxSize

  if (file.size > maxSize) {
    errors.push(
      `File "${file.name}" exceeds maximum size of ${formatFileSize(maxSize)}. Current size: ${formatFileSize(file.size)}`
    )
  }

  // Warning for large files (80% of max)
  const warningThreshold = maxSize * 0.8
  if (file.size > warningThreshold && file.size <= maxSize) {
    warnings.push(`File "${file.name}" is large (${formatFileSize(file.size)}).`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates multiple files including count limits
 */
export function validateFiles(newFiles: File[], existingFiles: File[] = []): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const totalCount = existingFiles.length + newFiles.length

  if (totalCount > FILE_VALIDATION.maxFilesPerMessage) {
    errors.push(
      `Maximum ${FILE_VALIDATION.maxFilesPerMessage} files per message. Attempting to add ${newFiles.length} to ${existingFiles.length} existing.`
    )
  }

  // Validate each individual file
  newFiles.forEach(file => {
    const { errors: fileErrors, warnings: fileWarnings } = validateFile(file)
    errors.push(...fileErrors)
    warnings.push(...fileWarnings)
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Checks if a file can be added without exceeding limits
 */
export function canAddFile(existingCount: number): { canAdd: boolean; reason?: string } {
  if (existingCount >= FILE_VALIDATION.maxFilesPerMessage) {
    return {
      canAdd: false,
      reason: `Maximum ${FILE_VALIDATION.maxFilesPerMessage} files per message`
    }
  }
  return { canAdd: true }
}

/**
 * Checks if a file is an image
 */
export function isImageFile(file: File): boolean {
  return (FILE_VALIDATION.images.allowedTypes as readonly string[]).includes(file.type)
}

/**
 * Checks if a file is a document
 */
export function isDocumentFile(file: File): boolean {
  return (FILE_VALIDATION.documents.allowedTypes as readonly string[]).includes(file.type)
}

/**
 * Gets file extension from filename
 */
function getFileExtension(filename: string): string | null {
  const lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) return null
  return filename.substring(lastDotIndex)
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Generates a unique ID for a file
 */
export function generateFileId(file: File): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  const nameHash = file.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)
  return `file_${timestamp}_${nameHash}_${random}`
}

// Backward compatibility export
export const IMAGE_VALIDATION = {
  allowedTypes: FILE_VALIDATION.images.allowedTypes,
  allowedExtensions: FILE_VALIDATION.images.allowedExtensions,
  maxSize: FILE_VALIDATION.images.maxSize,
  maxImages: FILE_VALIDATION.maxFilesPerMessage
} as const

// Knowledge base file validation (supports more file types)
export const DEFAULT_FILE_VALIDATION_CONFIG = {
  allowedTypes: [
    ...ALL_ALLOWED_TYPES,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ],
  allowedExtensions: [
    ...ALL_ALLOWED_EXTENSIONS,
    '.doc',
    '.docx'
  ],
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxFileCount: 10
} as const
