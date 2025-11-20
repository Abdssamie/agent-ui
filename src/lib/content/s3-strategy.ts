import {
  StorageStrategy,
  ContentItem,
  ContentListResponse,
  ContentFilter,
} from '@/types/content'
import { getContentType, validateFile as validateFileUtil } from './validation'

export class S3Strategy implements StorageStrategy {
  async list(options?: {
    pageToken?: string
    limit?: number
    filter?: ContentFilter
  }): Promise<ContentListResponse> {
    const params = new URLSearchParams()
    if (options?.pageToken) params.set('pageToken', options.pageToken)
    if (options?.limit) params.set('limit', options.limit.toString())

    const response = await fetch(`/api/content/list?${params}`)
    if (!response.ok) throw new Error('Failed to list content')

    const data = await response.json()

    const items: ContentItem[] = data.items.map((item: any) => ({
      ...item,
      type: getContentType(this.getMimeType(item.id)),
      storageProvider: 's3' as const,
      metadata: { mimeType: this.getMimeType(item.id) },
    }))

    return {
      items,
      nextPageToken: data.nextPageToken,
      totalCount: data.totalCount,
    }
  }

  async upload(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ContentItem> {
    const validation = await this.validateFile(file)
    if (!validation.valid) throw new Error(validation.error)

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/content/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) throw new Error('Failed to upload file')

    if (onProgress) onProgress(100)

    const data = await response.json()
    return {
      ...data,
      type: getContentType(file.type),
      storageProvider: 's3',
    }
  }

  async delete(id: string): Promise<void> {
    const response = await fetch(`/api/content/delete?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })

    if (!response.ok) throw new Error('Failed to delete file')
  }

  async getUrl(id: string): Promise<string> {
    const response = await fetch(`/api/content/url?id=${encodeURIComponent(id)}`)
    if (!response.ok) throw new Error('Failed to get URL')

    const data = await response.json()
    return data.url
  }

  async validateFile(file: File): Promise<{ valid: boolean; error?: string }> {
    return validateFileUtil(file)
  }

  private getMimeType(key: string): string {
    const ext = key.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      txt: 'text/plain',
      csv: 'text/csv',
    }
    return mimeTypes[ext || ''] || 'application/octet-stream'
  }
}
