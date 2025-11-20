import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'

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
  const id = searchParams.get('id')
  const name = searchParams.get('name')

  if (!id || !name) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  // TODO: Fix video download corruption issue - some videos download corrupted
  // Possible causes: stream conversion, large file handling, or specific codecs
  // Consider: direct signed URL download or chunked streaming approach
  
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: id,
    })

    const response = await client.send(command)

    if (!response.Body) {
      return NextResponse.json({ error: 'No content' }, { status: 404 })
    }

    // Convert SDK stream to web stream
    const nodeStream = response.Body as Readable
    const webStream = Readable.toWeb(nodeStream) as ReadableStream

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': response.ContentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${name}"`,
        'Content-Length': response.ContentLength?.toString() || '',
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    )
  }
}
