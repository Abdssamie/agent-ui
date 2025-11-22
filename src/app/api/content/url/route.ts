import { NextRequest, NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3Client } from '@/lib/s3Client'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'No ID provided' }, { status: 400 })
  }

  try {
    const url = await getSignedUrl(s3Client, new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: id,
    }), { expiresIn: 3600 })

    return NextResponse.json({ url })
  } catch (error) {
    console.error('URL generation error:', error)
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 })
  }
}
