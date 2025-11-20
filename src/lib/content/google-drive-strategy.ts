import {
  StorageStrategy,
  ContentItem,
  ContentListResponse,
  ContentFilter,
} from '@/types/content'

export class GoogleDriveStrategy implements StorageStrategy {
  async list(_options?: {
    pageToken?: string
    limit?: number
    filter?: ContentFilter
  }): Promise<ContentListResponse> {
    throw new Error('Google Drive integration coming soon')
  }

  async upload(
    _file: File,
    _onProgress?: (progress: number) => void
  ): Promise<ContentItem> {
    throw new Error('Google Drive integration coming soon')
  }

  async delete(_id: string): Promise<void> {
    throw new Error('Google Drive integration coming soon')
  }

  async getUrl(_id: string): Promise<string> {
    throw new Error('Google Drive integration coming soon')
  }

  async validateFile(_file: File): Promise<{ valid: boolean; error?: string }> {
    throw new Error('Google Drive integration coming soon')
  }
}
