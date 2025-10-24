// Content Management Types
export type StorageProvider = 's3' | 'google-drive'

export type ContentType = 'pdf' | 'image' | 'video' | 'document' | 'other'

export interface ContentItem {
  id: string
  name: string
  type: ContentType
  size: number
  url?: string
  thumbnailUrl?: string
  storageProvider: StorageProvider
  uploadedAt: string
  updatedAt?: string
  metadata?: {
    mimeType?: string
    width?: number
    height?: number
    duration?: number
    [key: string]: any
  }
}

export interface ContentListResponse {
  items: ContentItem[]
  nextPageToken?: string
  totalCount?: number
}

export interface UploadProgress {
  id: string
  name: string
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}
