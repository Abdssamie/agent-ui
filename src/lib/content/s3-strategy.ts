import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  StorageStrategy,
  ContentItem,
  ContentListResponse,
  ContentFilter,
} from '@/types/content'
import { getContentType, validateFile as validateFileUtil } from './validation'

export class S3Strategy implements StorageStrategy {
  private client: S3Client | null = null
  private bucket: string

  constructor() {
    this.bucket = process.env.NEXT_PUBLIC_R2_BUCKET || ''
    this.initClient()
  }

  private initClient() {
    const accountId = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID
    const accessKeyId = process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.NEXT_PUBLIC_R2_SECRET_ACCESS_KEY

    if (!accountId || !accessKeyId || !secretAccessKey) {
      console.warn('S3/R2 credentials not configured')
      return
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }

  async list(options?: {
    pageToken?: string
    limit?: number
    filter?: ContentFilter
  }): Promise<ContentListResponse> {
    if (!this.client) {
      throw new Error('S3 client not initialized. Please configure credentials.')
    }

    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      MaxKeys: options?.limit || 50,
      ContinuationToken: options?.pageToken,
    })

    const response = await this.client.send(command)

    const items: ContentItem[] = (response.Contents || []).map((obj) => ({
      id: obj.Key!,
      name: obj.Key!.split('/').pop() || obj.Key!,
      type: getContentType(this.getMimeType(obj.Key!)),
      size: obj.Size || 0,
      storageProvider: 's3' as const,
      uploadedAt: obj.LastModified?.toISOString() || new Date().toISOString(),
      metadata: {
        mimeType: this.getMimeType(obj.Key!),
      },
    }))

    const filtered = this.applyFilters(items, options?.filter)

    return {
      items: filtered,
      nextPageToken: response.NextContinuationToken,
      totalCount: response.KeyCount,
    }
  }

  async upload(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ContentItem> {
    if (!this.client) {
      throw new Error('S3 client not initialized. Please configure credentials.')
    }

    const validation = await this.validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const key = `${Date.now()}-${file.name}`
    const buffer = await file.arrayBuffer()

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: new Uint8Array(buffer),
      ContentType: file.type,
    })

    await this.client.send(command)

    if (onProgress) onProgress(100)

    return {
      id: key,
      name: file.name,
      type: getContentType(file.type),
      size: file.size,
      storageProvider: 's3',
      uploadedAt: new Date().toISOString(),
      metadata: {
        mimeType: file.type,
      },
    }
  }

  async delete(id: string): Promise<void> {
    if (!this.client) {
      throw new Error('S3 client not initialized. Please configure credentials.')
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: id,
    })

    await this.client.send(command)
  }

  async getUrl(id: string): Promise<string> {
    if (!this.client) {
      throw new Error('S3 client not initialized. Please configure credentials.')
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: id,
    })

    return getSignedUrl(this.client, command, { expiresIn: 3600 })
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

  private applyFilters(items: ContentItem[], filter?: ContentFilter): ContentItem[] {
    let filtered = [...items]

    if (filter?.type) {
      filtered = filtered.filter((item) => item.type === filter.type)
    }

    if (filter?.search) {
      const search = filter.search.toLowerCase()
      filtered = filtered.filter((item) => item.name.toLowerCase().includes(search))
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
