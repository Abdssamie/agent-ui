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
  tags?: string[]
  source?: string
  metadata?: {
    mimeType?: string
    width?: number
    height?: number
    duration?: number
    workflowId?: string
    agentId?: string
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

export interface ContentFilter {
  type?: ContentType
  search?: string
  tags?: string[]
  source?: string
  sortBy?: 'name' | 'date' | 'size'
  sortOrder?: 'asc' | 'desc'
}

export interface StorageStrategy {
  list(options?: { pageToken?: string; limit?: number; filter?: ContentFilter }): Promise<ContentListResponse>
  upload(file: File, onProgress?: (progress: number) => void, metadata?: Record<string, any>): Promise<ContentItem>
  delete(id: string): Promise<void>
  getUrl(id: string): Promise<string>
  validateFile(file: File): Promise<{ valid: boolean; error?: string }>
}
