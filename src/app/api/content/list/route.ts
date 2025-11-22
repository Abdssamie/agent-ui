import { NextRequest, NextResponse } from 'next/server'
import { ListObjectsV2Command } from '@aws-sdk/client-s3'
import { s3Client } from '@/lib/s3Client'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const pageToken = searchParams.get('pageToken') || undefined
  
  const parsedLimit = parseInt(searchParams.get('limit') || '50')
  const limit = Math.max(1, Math.min(isNaN(parsedLimit) ? 50 : parsedLimit, 1000))

  try {
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET!,
      MaxKeys: limit,
      ContinuationToken: pageToken,
    }))

    const items = (response.Contents || [])
      .filter((obj) => obj.Key && !obj.Key.endsWith('/') && obj.Size && obj.Size > 0)
      .map((obj) => ({
        id: obj.Key!,
        name: obj.Key!.replace(/\//g, '-'),
        size: obj.Size || 0,
        uploadedAt: obj.LastModified?.toISOString() || new Date().toISOString(),
      }))

    return NextResponse.json({
      items,
      nextPageToken: items.length > 0 ? response.NextContinuationToken : undefined,
      totalCount: items.length,
    })
  } catch (error) {
    console.error('List error:', error)
    return NextResponse.json({ error: 'Failed to list content' }, { status: 500 })
  }
}
