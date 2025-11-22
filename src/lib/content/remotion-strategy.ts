import {
  StorageStrategy,
  ContentItem,
  ContentListResponse,
  ContentFilter,
} from '@/types/content'
import { getContentType, validateFile as validateFileUtil } from './validation'

export class RemotionStrategy implements StorageStrategy {
  async list(options?: {
    pageToken?: string
    limit?: number
    filter?: ContentFilter
  }): Promise<ContentListResponse> {
    const params = new URLSearchParams()
    if (options?.pageToken) params.set('pageToken', options.pageToken)
    if (options?.limit) params.set('limit', options.limit.toString())
    params.set('provider', 'remotion')

    const response = await fetch(`/api/content/list?${params}`)
    if (!response.ok) throw new Error('Failed to list content')

    const data = await response.json()

    const items: ContentItem[] = data.items.map((item: any) => ({
      ...item,
      type: getContentType(this.getMimeType(item.id)),
      storageProvider: 'remotion' as const,
      tags: this.extractTags(item.id),
      metadata: { 
        mimeType: this.getMimeType(item.id),
        ...item.metadata,
      },
    }))

    const filtered = this.applyFilters(items, options?.filter)

    return {
      items: filtered,
      nextPageToken: data.nextPageToken,
      totalCount: data.totalCount,
    }
  }

  async upload(): Promise<ContentItem> {
    throw new Error('Upload not supported for Remotion bucket (read-only)')
  }

  async delete(): Promise<void> {
    throw new Error('Delete not supported for Remotion bucket (read-only)')
  }

  async getUrl(id: string): Promise<string> {
    const response = await fetch(`/api/content/url?id=${encodeURIComponent(id)}&provider=remotion`)
    if (!response.ok) throw new Error('Failed to get URL')

    const data = await response.json()
    return data.url
  }

  async validateFile(): Promise<{ valid: boolean; error?: string }> {
    return { valid: false, error: 'Upload not supported for Remotion bucket' }
  }

  private getMimeType(key: string): string {
    const ext = key.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    }
    return mimeTypes[ext || ''] || 'application/octet-stream'
  }

  private extractTags(key: string): string[] {
    const parts = key.split('/')
    return parts.length > 1 ? parts.slice(0, -1) : []
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
