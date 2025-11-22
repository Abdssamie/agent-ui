import { NextRequest, NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import { s3Client } from '@/lib/s3Client'
import { remotionS3Client, REMOTION_BUCKET, isRemotionAvailable } from '@/lib/remotionS3Client'
import { validateId } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  const name = request.nextUrl.searchParams.get('name')
  const provider = request.nextUrl.searchParams.get('provider') || 's3'

  const validationError = validateId(id)
  if (validationError) return validationError

  if (!name) {
    return NextResponse.json({ error: 'Missing name parameter' }, { status: 400 })
  }

  if (provider === 'remotion' && !isRemotionAvailable) {
    return NextResponse.json({ 
      error: 'Remotion bucket not configured' 
    }, { status: 503 })
  }

  const sanitizedName = name.replace(/["\r\n]/g, '_')
  const client = provider === 'remotion' ? remotionS3Client! : s3Client
  const bucket = provider === 'remotion' ? REMOTION_BUCKET : process.env.R2_BUCKET!

  try {
    const response = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: id!,
    }))

    if (!response.Body) {
      return NextResponse.json({ error: 'No content' }, { status: 404 })
    }

    const headers: Record<string, string> = {
      'Content-Type': response.ContentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${sanitizedName}"`,
    }

    if (typeof response.ContentLength === 'number') {
      headers['Content-Length'] = response.ContentLength.toString()
    }

    const webStream = Readable.toWeb(response.Body as Readable) as ReadableStream

    return new NextResponse(webStream, { headers })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }
}
