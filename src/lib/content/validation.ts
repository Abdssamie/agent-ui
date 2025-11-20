import { ContentType } from '@/types/content'

const MIME_TYPE_MAP: Record<string, ContentType> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'application/pdf': 'pdf',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    'document',
  'text/plain': 'document',
  'text/csv': 'document',
}

export function getContentType(mimeType: string): ContentType {
  return MIME_TYPE_MAP[mimeType] || 'other'
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!file.type) {
    return { valid: false, error: 'Unknown file type' }
  }

  const contentType = getContentType(file.type)
  if (contentType === 'other') {
    return { valid: false, error: 'Unsupported file type' }
  }

  return { valid: true }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
