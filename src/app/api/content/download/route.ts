import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

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
  const id = searchParams.get('id')
  const name = searchParams.get('name')

  if (!id || !name) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_R2_BUCKET!,
      Key: id,
    })

    const response = await client.send(command)
    const body = await response.Body?.transformToByteArray()

    if (!body) {
      return NextResponse.json({ error: 'No content' }, { status: 404 })
    }

    return new NextResponse(body, {
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
