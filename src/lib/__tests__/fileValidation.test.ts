import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateFile,
  validateFiles,
  processFiles,
  isFileTypeSupported,
  getFileCategory,
  formatFileSize,
  getFileExtension,
  generateFileId,
  canAddFiles,
  DEFAULT_FILE_VALIDATION_CONFIG
} from '../fileValidation';
import type { FileValidationConfig } from '@/types/fileHandling';

// Helper function to create mock File objects
function createMockFile(
  name: string,
  size: number,
  type: string,
  lastModified: number = Date.now()
): File {
  const file = new File([''], name, { type, lastModified })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('fileValidation', () => {
  let testConfig: FileValidationConfig

  beforeEach(() => {
    testConfig = {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      maxTotalSize: 20 * 1024 * 1024, // 20MB
      maxFileCount: 5,
      allowedTypes: ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf', '.txt']
    }
  })

  describe('validateFile', () => {
    it('should validate a valid file', () => {
      const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg') // 1MB
      const result = validateFile(file, testConfig)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject file exceeding size limit', () => {
      const file = createMockFile('large.jpg', 10 * 1024 * 1024, 'image/jpeg') // 10MB
      const result = validateFile(file, testConfig)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('exceeds maximum size limit')
      expect(result.errors[0]).toContain('large.jpg')
    })

    it('should reject unsupported MIME type', () => {
      const file = createMockFile('test.exe', 1024, 'application/x-executable')
      const result = validateFile(file, testConfig)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(2) // Both MIME type and extension errors
      expect(result.errors.some(error => error.includes('File type "application/x-executable" is not supported'))).toBe(true)
    })

    it('should reject unsupported file extension', () => {
      const file = createMockFile('test.xyz', 1024, 'image/jpeg')
      const result = validateFile(file, testConfig)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('File extension ".xyz" is not supported')
    })

    it('should add warning for large files within limits', () => {
      const file = createMockFile('large.jpg', 4.5 * 1024 * 1024, 'image/jpeg') // 4.5MB (90% of 5MB limit)
      const result = validateFile(file, testConfig)

      expect(result.isValid).toBe(true)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toContain('is large')
    })

    it('should use default config when none provided', () => {
      const file = createMockFile('test.jpg', 1024, 'image/jpeg')
      const result = validateFile(file)

      expect(result.isValid).toBe(true)
    })

    it('should handle files without extensions', () => {
      const file = createMockFile('README', 1024, 'text/plain')
      const result = validateFile(file, testConfig)

      expect(result.isValid).toBe(true) // Should pass MIME type validation
    })
  })

  describe('validateFiles', () => {
    it('should validate multiple valid files', () => {
      const files = [
        createMockFile('test1.jpg', 1024 * 1024, 'image/jpeg'),
        createMockFile('test2.png', 2 * 1024 * 1024, 'image/png'),
        createMockFile('doc.pdf', 1024 * 1024, 'application/pdf')
      ]
      const result = validateFiles(files, [], testConfig)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject when file count exceeds limit', () => {
      const files = Array.from({ length: 6 }, (_, i) => 
        createMockFile(`test${i}.jpg`, 1024, 'image/jpeg')
      )
      const result = validateFiles(files, [], testConfig)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Too many files selected')
      expect(result.errors[0]).toContain('Maximum allowed: 5')
    })

    it('should reject when total size exceeds limit', () => {
      const files = [
        createMockFile('large1.jpg', 12 * 1024 * 1024, 'image/jpeg'), // 12MB
        createMockFile('large2.jpg', 10 * 1024 * 1024, 'image/jpeg')  // 10MB (total 22MB > 20MB limit)
      ]
      const result = validateFiles(files, [], testConfig)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(3) // Total size error + 2 individual file size errors
      expect(result.errors.some(error => error.includes('Total file size exceeds'))).toBe(true)
    })

    it('should consider existing files in count and size calculations', () => {
      const existingFiles = [
        createMockFile('existing1.jpg', 5 * 1024 * 1024, 'image/jpeg'),
        createMockFile('existing2.jpg', 5 * 1024 * 1024, 'image/jpeg')
      ]
      const newFiles = [
        createMockFile('new1.jpg', 5 * 1024 * 1024, 'image/jpeg'),
        createMockFile('new2.jpg', 6 * 1024 * 1024, 'image/jpeg') // This would exceed total size
      ]
      
      const result = validateFiles(newFiles, existingFiles, testConfig)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('Total file size exceeds'))).toBe(true)
    })

    it('should warn about duplicate filenames', () => {
      const files = [
        createMockFile('duplicate.jpg', 1024, 'image/jpeg'),
        createMockFile('duplicate.jpg', 2048, 'image/jpeg')
      ]
      const result = validateFiles(files, [], testConfig)

      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toContain('Duplicate filenames detected')
      expect(result.warnings[0]).toContain('duplicate.jpg')
    })
  })

  describe('processFiles', () => {
    it('should process valid files successfully', () => {
      const files = [
        createMockFile('test1.jpg', 1024, 'image/jpeg'),
        createMockFile('test2.png', 2048, 'image/png')
      ]
      const result = processFiles(files, [], testConfig)

      expect(result.successful).toHaveLength(2)
      expect(result.failed).toHaveLength(0)
      expect(result.successful[0]).toHaveProperty('id')
      expect(result.successful[0]).toHaveProperty('file')
      expect(result.successful[0]).toHaveProperty('uploadStatus', 'pending')
    })

    it('should separate valid and invalid files', () => {
      const files = [
        createMockFile('valid.jpg', 1024, 'image/jpeg'),
        createMockFile('invalid.exe', 1024, 'application/x-executable'),
        createMockFile('toolarge.jpg', 10 * 1024 * 1024, 'image/jpeg')
      ]
      const result = processFiles(files, [], testConfig)

      expect(result.successful).toHaveLength(1)
      expect(result.failed).toHaveLength(2)
      expect(result.successful[0].file.name).toBe('valid.jpg')
      expect(result.failed.map(f => f.file.name)).toEqual(['invalid.exe', 'toolarge.jpg'])
    })

    it('should reject all files if batch validation fails', () => {
      const files = Array.from({ length: 6 }, (_, i) => 
        createMockFile(`test${i}.jpg`, 1024, 'image/jpeg')
      )
      const result = processFiles(files, [], testConfig)

      expect(result.successful).toHaveLength(0)
      expect(result.failed).toHaveLength(6)
      expect(result.failed[0].error).toContain('Too many files')
    })
  })

  describe('isFileTypeSupported', () => {
    it('should return true for supported file types', () => {
      const file = createMockFile('test.jpg', 1024, 'image/jpeg')
      expect(isFileTypeSupported(file, testConfig)).toBe(true)
    })

    it('should return false for unsupported file types', () => {
      const file = createMockFile('test.exe', 1024, 'application/x-executable')
      expect(isFileTypeSupported(file, testConfig)).toBe(false)
    })
  })

  describe('getFileCategory', () => {
    it('should categorize image files', () => {
      const file = createMockFile('test.jpg', 1024, 'image/jpeg')
      expect(getFileCategory(file)).toBe('image')
    })

    it('should categorize video files', () => {
      const file = createMockFile('test.mp4', 1024, 'video/mp4')
      expect(getFileCategory(file)).toBe('video')
    })

    it('should categorize audio files', () => {
      const file = createMockFile('test.mp3', 1024, 'audio/mpeg')
      expect(getFileCategory(file)).toBe('audio')
    })

    it('should categorize document files', () => {
      const pdfFile = createMockFile('test.pdf', 1024, 'application/pdf')
      expect(getFileCategory(pdfFile)).toBe('document')

      const txtFile = createMockFile('test.txt', 1024, 'text/plain')
      expect(getFileCategory(txtFile)).toBe('document')
    })

    it('should categorize unknown files as other', () => {
      const file = createMockFile('test.xyz', 1024, 'application/unknown')
      expect(getFileCategory(file)).toBe('other')
    })
  })

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
      expect(formatFileSize(1536)).toBe('1.5 KB') // 1.5 KB
    })
  })

  describe('getFileExtension', () => {
    it('should extract file extensions correctly', () => {
      expect(getFileExtension('test.jpg')).toBe('.jpg')
      expect(getFileExtension('document.pdf')).toBe('.pdf')
      expect(getFileExtension('file.name.with.dots.txt')).toBe('.txt')
    })

    it('should return null for files without extensions', () => {
      expect(getFileExtension('README')).toBe(null)
      expect(getFileExtension('file.')).toBe(null)
      expect(getFileExtension('')).toBe(null)
    })
  })

  describe('generateFileId', () => {
    it('should generate unique IDs for files', () => {
      const file1 = createMockFile('test.jpg', 1024, 'image/jpeg')
      const file2 = createMockFile('test.jpg', 1024, 'image/jpeg')
      
      const id1 = generateFileId(file1)
      const id2 = generateFileId(file2)

      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^file_\d+_\w+_\w+$/)
      expect(id2).toMatch(/^file_\d+_\w+_\w+$/)
    })

    it('should include filename in ID', () => {
      const file = createMockFile('myimage.jpg', 1024, 'image/jpeg')
      const id = generateFileId(file)
      
      expect(id).toContain('myimage')
    })
  })

  describe('canAddFiles', () => {
    it('should allow adding files within limits', () => {
      const existingFiles = [
        createMockFile('existing.jpg', 1024 * 1024, 'image/jpeg')
      ]
      const newFiles = [
        createMockFile('new.jpg', 1024 * 1024, 'image/jpeg')
      ]

      const result = canAddFiles(newFiles, existingFiles, testConfig)
      expect(result.canAdd).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should reject when adding would exceed file count', () => {
      const existingFiles = Array.from({ length: 4 }, (_, i) => 
        createMockFile(`existing${i}.jpg`, 1024, 'image/jpeg')
      )
      const newFiles = Array.from({ length: 2 }, (_, i) => 
        createMockFile(`new${i}.jpg`, 1024, 'image/jpeg')
      )

      const result = canAddFiles(newFiles, existingFiles, testConfig)
      expect(result.canAdd).toBe(false)
      expect(result.reason).toContain('exceed maximum file count')
    })

    it('should reject when adding would exceed total size', () => {
      const existingFiles = [
        createMockFile('existing.jpg', 15 * 1024 * 1024, 'image/jpeg') // 15MB
      ]
      const newFiles = [
        createMockFile('new.jpg', 6 * 1024 * 1024, 'image/jpeg') // 6MB (total would be 21MB > 20MB limit)
      ]

      const result = canAddFiles(newFiles, existingFiles, testConfig)
      expect(result.canAdd).toBe(false)
      expect(result.reason).toContain('exceed maximum total size')
    })
  })

  describe('DEFAULT_FILE_VALIDATION_CONFIG', () => {
    it('should have reasonable default values', () => {
      expect(DEFAULT_FILE_VALIDATION_CONFIG.maxFileSize).toBe(10 * 1024 * 1024) // 10MB
      expect(DEFAULT_FILE_VALIDATION_CONFIG.maxTotalSize).toBe(50 * 1024 * 1024) // 50MB
      expect(DEFAULT_FILE_VALIDATION_CONFIG.maxFileCount).toBe(10)
      expect(DEFAULT_FILE_VALIDATION_CONFIG.allowedTypes).toContain('image/jpeg')
      expect(DEFAULT_FILE_VALIDATION_CONFIG.allowedTypes).toContain('application/pdf')
      expect(DEFAULT_FILE_VALIDATION_CONFIG.allowedExtensions).toContain('.jpg')
      expect(DEFAULT_FILE_VALIDATION_CONFIG.allowedExtensions).toContain('.pdf')
    })

    it('should support all required file types from requirements', () => {
      const requiredTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', // Images
        'application/pdf', 'text/plain', // Documents
        'video/mp4', 'video/webm', // Videos
        'audio/mpeg', 'audio/wav', 'audio/mp4' // Audio
      ]

      requiredTypes.forEach(type => {
        expect(DEFAULT_FILE_VALIDATION_CONFIG.allowedTypes).toContain(type)
      })
    })

    it('should support all required file extensions from requirements', () => {
      const requiredExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.webp', // Images
        '.pdf', '.txt', '.docx', '.xlsx', // Documents
        '.mp4', '.webm', // Videos
        '.mp3', '.wav', '.m4a' // Audio
      ]

      requiredExtensions.forEach(ext => {
        expect(DEFAULT_FILE_VALIDATION_CONFIG.allowedExtensions).toContain(ext)
      })
    })
  })
})