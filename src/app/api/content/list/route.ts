import { NextRequest, NextResponse } from 'next/server'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const pageToken = searchParams.get('pageToken') || undefined
  const limit = parseInt(searchParams.get('limit') || '50')

  console.log('[LIST API] Request:', { pageToken, limit })

  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET!,
      MaxKeys: limit,
      ContinuationToken: pageToken,
    })

    const response = await client.send(command)
    console.log('[LIST API] S3 Response:', {
      totalObjects: response.Contents?.length,
      hasNextToken: !!response.NextContinuationToken
    })

    const items = (response.Contents || [])
      .filter((obj) => {
        const isValid = obj.Key && !obj.Key.endsWith('/') && obj.Size && obj.Size > 0
        if (!isValid && obj.Key) {
          console.log('[LIST API] Filtered out:', obj.Key, { size: obj.Size, endsWithSlash: obj.Key.endsWith('/') })
        }
        return isValid
      })
      .map((obj) => {
        const displayName = obj.Key!.replace(/\//g, '-')
        console.log('[LIST API] Mapping:', obj.Key, '->', displayName)
        return {
          id: obj.Key!,
          name: displayName,
          size: obj.Size || 0,
          uploadedAt: obj.LastModified?.toISOString() || new Date().toISOString(),
        }
      })

    console.log('[LIST API] Final items:', items.length, 'nextToken:', items.length > 0 ? !!response.NextContinuationToken : 'none')

    return NextResponse.json({
      items,
      nextPageToken: items.length > 0 ? response.NextContinuationToken : undefined,
      totalCount: items.length,
    })
  } catch (error) {
    console.error('[LIST API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to list content' },
      { status: 500 }
    )
  }
}
