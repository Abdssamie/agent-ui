import { NextRequest, NextResponse } from 'next/server'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.NEXT_PUBLIC_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_R2_SECRET_ACCESS_KEY!,
  },
})

function getMimeType(key: string): string {
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

function getContentType(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('text/') || mimeType.includes('document') || mimeType.includes('sheet')) return 'document'
  return 'other'
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const pageToken = searchParams.get('pageToken') || undefined
  const limit = parseInt(searchParams.get('limit') || '20')
  const search = searchParams.get('search')?.toLowerCase()
  const type = searchParams.get('type')
  const sortBy = searchParams.get('sortBy') || 'date'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  try {
    let allItems: any[] = []
    let continuationToken = pageToken

    // Fetch items until we have enough matching the filter
    while (allItems.length < limit) {
      const command = new ListObjectsV2Command({
        Bucket: process.env.NEXT_PUBLIC_R2_BUCKET!,
        MaxKeys: 100,
        ContinuationToken: continuationToken,
      })

      const response = await client.send(command)
      
      const items = (response.Contents || [])
        .filter((obj) => obj.Key && !obj.Key.endsWith('/') && obj.Size && obj.Size > 0)
        .map((obj) => {
          const mimeType = getMimeType(obj.Key!)
          const contentType = getContentType(mimeType)
          const name = obj.Key!.split('/').pop() || obj.Key!
          
          return {
            id: obj.Key!,
            name,
            size: obj.Size || 0,
            uploadedAt: obj.LastModified?.toISOString() || new Date().toISOString(),
            type: contentType,
            mimeType,
          }
        })
        .filter((item) => {
          // Apply search filter
          if (search && !item.name.toLowerCase().includes(search)) return false
          // Apply type filter
          if (type && type !== 'all' && item.type !== type) return false
          return true
        })

      allItems.push(...items)
      
      if (!response.NextContinuationToken) break
      continuationToken = response.NextContinuationToken
      
      // Safety: don't fetch more than 500 items total
      if (allItems.length >= 500) break
    }

    // Sort items
    allItems.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
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
      return sortOrder === 'desc' ? -comparison : comparison
    })

    // Return only the requested limit
    const paginatedItems = allItems.slice(0, limit)
    const hasMore = allItems.length > limit

    return NextResponse.json({
      items: paginatedItems,
      nextPageToken: hasMore ? continuationToken : undefined,
      totalCount: paginatedItems.length,
    })
  } catch (error) {
    console.error('List error:', error)
    return NextResponse.json(
      { error: 'Failed to list content' },
      { status: 500 }
    )
  }
}
