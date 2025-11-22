import { NextRequest, NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import { s3Client } from '@/lib/s3Client'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  const name = request.nextUrl.searchParams.get('name')

  if (!id || !name) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const sanitizedName = name.replace(/["\r\n]/g, '_')

  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: id,
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
