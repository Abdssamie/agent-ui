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
      tags: this.extractTags(item.id),
      source: item.metadata?.source || 'manual',
      metadata: { 
        mimeType: this.getMimeType(item.id),
        ...item.metadata,
        ...this.extractMetadata(item.id)
      },
    }))

    const filtered = this.applyFilters(items, options?.filter)

    return {
      items: filtered,
      nextPageToken: data.nextPageToken,
      totalCount: data.totalCount,
    }
  }

  async upload(
    file: File,
    onProgress?: (progress: number) => void,
    metadata?: Record<string, any>
  ): Promise<ContentItem> {
    const validation = await this.validateFile(file)
    if (!validation.valid) throw new Error(validation.error)

    const formData = new FormData()
    formData.append('file', file)
    if (metadata) formData.append('metadata', JSON.stringify(metadata))

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

  private extractTags(key: string): string[] {
    const parts = key.split('/')
    return parts.length > 1 ? parts.slice(0, -1) : []
  }

  private extractMetadata(key: string): Record<string, any> {
    const metadata: Record<string, any> = {}
    
    const workflowMatch = key.match(/workflow-([^/-]+)/)
    if (workflowMatch) metadata.workflowId = workflowMatch[1]
    
    const agentMatch = key.match(/agent-([^/-]+)/)
    if (agentMatch) metadata.agentId = agentMatch[1]
    
    return metadata
  }

  private applyFilters(items: ContentItem[], filter?: ContentFilter): ContentItem[] {
    let filtered = [...items]

    if (filter?.type) {
      filtered = filtered.filter((item) => item.type === filter.type)
    }

    if (filter?.search) {
      const search = filter.search.toLowerCase()
      filtered = filtered.filter((item) => 
        item.id.toLowerCase().includes(search)
      )
    }

    if (filter?.tags && filter.tags.length > 0) {
      filtered = filtered.filter((item) => 
        item.tags?.some(tag => filter.tags?.includes(tag))
      )
    }

    if (filter?.source) {
      filtered = filtered.filter((item) => item.source === filter.source)
    }

    if (filter?.sortBy) {
      filtered.sort((a, b) => {
        let comparison = 0
        switch (filter.sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name)
            break
          case 'date':
            comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
            break
          case 'size':
            comparison = a.size - b.size
            break
        }
        return filter.sortOrder === 'desc' ? -comparison : comparison
      })
    }

    return filtered
  }
}
