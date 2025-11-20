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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const pageToken = searchParams.get('pageToken') || undefined
  const limit = parseInt(searchParams.get('limit') || '50')

  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.NEXT_PUBLIC_R2_BUCKET!,
      MaxKeys: limit,
      ContinuationToken: pageToken,
    })

    const response = await client.send(command)

    return NextResponse.json({
      items: (response.Contents || []).map((obj) => ({
        id: obj.Key!,
        name: obj.Key!.split('/').pop() || obj.Key!,
        size: obj.Size || 0,
        uploadedAt: obj.LastModified?.toISOString() || new Date().toISOString(),
      })),
      nextPageToken: response.NextContinuationToken,
      totalCount: response.KeyCount,
    })
  } catch (error) {
    console.error('List error:', error)
    return NextResponse.json(
      { error: 'Failed to list content' },
      { status: 500 }
    )
  }
}
