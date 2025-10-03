import {
  FileValidationConfig,
  ValidationResult,
  FileValidationError,
  BatchProcessingResult,
  FileProcessingResult
} from '@/types/fileHandling'

// Default validation configuration based on requirements
export const DEFAULT_FILE_VALIDATION_CONFIG: FileValidationConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxTotalSize: 50 * 1024 * 1024, // 50MB
  maxFileCount: 10,
  allowedTypes: [
    // Images
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    // Documents
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    // Videos
    'video/mp4',
    'video/webm',
    // Audio
    'audio/mpeg', // mp3
    'audio/wav',
    'audio/mp4' // m4a
  ],
  allowedExtensions: [
    // Images
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    // Documents  
    '.pdf', '.txt', '.docx', '.xlsx',
    // Videos
    '.mp4', '.webm',
    // Audio
    '.mp3', '.wav', '.m4a'
  ]
}

/**
 * Validates a single file against the provided configuration
 */
export function validateFile(
  file: File, 
  config: FileValidationConfig = DEFAULT_FILE_VALIDATION_CONFIG
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate file size
  if (file.size > config.maxFileSize) {
    errors.push(
      `File "${file.name}" exceeds maximum size limit of ${formatFileSize(config.maxFileSize)}. ` +
      `Current size: ${formatFileSize(file.size)}`
    )
  }

  // Validate file type (MIME type)
  if (!config.allowedTypes.includes(file.type)) {
    errors.push(
      `File type "${file.type}" is not supported for file "${file.name}". ` +
      `Supported types: ${config.allowedTypes.join(', ')}`
    )
  }

  // Validate file extension
  const fileExtension = getFileExtension(file.name)
  if (fileExtension && !config.allowedExtensions.includes(fileExtension.toLowerCase())) {
    errors.push(
      `File extension "${fileExtension}" is not supported for file "${file.name}". ` +
      `Supported extensions: ${config.allowedExtensions.join(', ')}`
    )
  }

  // Add warnings for large files (but within limits)
  const warningThreshold = config.maxFileSize * 0.8 // 80% of max size
  if (file.size > warningThreshold && file.size <= config.maxFileSize) {
    warnings.push(
      `File "${file.name}" is large (${formatFileSize(file.size)}). ` +
      `Consider compressing if possible.`
    )
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates multiple files including count and total size limits
 */
export function validateFiles(
  files: File[], 
  existingFiles: File[] = [],
  config: FileValidationConfig = DEFAULT_FILE_VALIDATION_CONFIG
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  const allFiles = [...existingFiles, ...files]
  
  // Validate file count
  if (allFiles.length > config.maxFileCount) {
    errors.push(
      `Too many files selected. Maximum allowed: ${config.maxFileCount}, ` +
      `current total: ${allFiles.length}`
    )
  }

  // Validate total size
  const totalSize = allFiles.reduce((sum, file) => sum + file.size, 0)
  if (totalSize > config.maxTotalSize) {
    errors.push(
      `Total file size exceeds limit of ${formatFileSize(config.maxTotalSize)}. ` +
      `Current total: ${formatFileSize(totalSize)}`
    )
  }

  // Validate each individual file
  for (const file of files) {
    const fileValidation = validateFile(file, config)
    errors.push(...fileValidation.errors)
    warnings.push(...fileValidation.warnings)
  }

  // Check for duplicate filenames
  const filenames = allFiles.map(f => f.name)
  const duplicates = filenames.filter((name, index) => filenames.indexOf(name) !== index)
  if (duplicates.length > 0) {
    warnings.push(
      `Duplicate filenames detected: ${[...new Set(duplicates)].join(', ')}. ` +
      `Files with the same name may overwrite each other.`
    )
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Processes multiple files and returns successful and failed results
 */
export function processFiles(
  files: File[],
  existingFiles: File[] = [],
  config: FileValidationConfig = DEFAULT_FILE_VALIDATION_CONFIG
): BatchProcessingResult {
  const successful: any[] = [] // Will be FileAttachment[] when we have the full type
  const failed: Array<{ file: File; error: string }> = []

  // First validate the batch
  const batchValidation = validateFiles(files, existingFiles, config)
  
  // If batch validation fails due to count or total size, reject all
  const batchErrors = batchValidation.errors.filter(error => 
    error.includes('Too many files') || error.includes('Total file size exceeds')
  )
  
  if (batchErrors.length > 0) {
    files.forEach(file => {
      failed.push({
        file,
        error: batchErrors.join('; ')
      })
    })
    return { successful, failed }
  }

  // Process individual files
  files.forEach(file => {
    const validation = validateFile(file, config)
    if (validation.isValid) {
      // Create a basic attachment object (will be enhanced in later tasks)
      successful.push({
        id: generateFileId(file),
        file,
        uploadStatus: 'pending' as const,
        progress: 0
      })
    } else {
      failed.push({
        file,
        error: validation.errors.join('; ')
      })
    }
  })

  return { successful, failed }
}

/**
 * Checks if a file type is supported
 */
export function isFileTypeSupported(
  file: File,
  config: FileValidationConfig = DEFAULT_FILE_VALIDATION_CONFIG
): boolean {
  const validation = validateFile(file, config)
  return validation.isValid
}

/**
 * Gets the file category based on MIME type
 */
export function getFileCategory(file: File): 'image' | 'document' | 'video' | 'audio' | 'other' {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type === 'application/pdf' || 
      file.type === 'text/plain' ||
      file.type.includes('document') ||
      file.type.includes('spreadsheet')) {
    return 'document'
  }
  return 'other'
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Gets file extension from filename
 */
export function getFileExtension(filename: string): string | null {
  const lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return null
  }
  return filename.substring(lastDotIndex)
}

/**
 * Generates a unique ID for a file based on its properties
 */
export function generateFileId(file: File): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const nameHash = file.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8)
  return `file_${timestamp}_${nameHash}_${random}`
}

/**
 * Creates validation error objects with detailed information
 */
export function createValidationError(
  type: FileValidationError['type'],
  message: string,
  filename?: string,
  actualValue?: number | string,
  allowedValue?: number | string
): FileValidationError {
  return {
    type,
    message,
    filename,
    actualValue,
    allowedValue
  }
}

/**
 * Checks if files can be added without exceeding limits
 */
export function canAddFiles(
  newFiles: File[],
  existingFiles: File[] = [],
  config: FileValidationConfig = DEFAULT_FILE_VALIDATION_CONFIG
): { canAdd: boolean; reason?: string } {
  const totalCount = existingFiles.length + newFiles.length
  if (totalCount > config.maxFileCount) {
    return {
      canAdd: false,
      reason: `Would exceed maximum file count of ${config.maxFileCount}`
    }
  }

  const existingSize = existingFiles.reduce((sum, file) => sum + file.size, 0)
  const newSize = newFiles.reduce((sum, file) => sum + file.size, 0)
  const totalSize = existingSize + newSize

  if (totalSize > config.maxTotalSize) {
    return {
      canAdd: false,
      reason: `Would exceed maximum total size of ${formatFileSize(config.maxTotalSize)}`
    }
  }

  return { canAdd: true }
}