import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { authenticate } from '@/lib/auth'
import { s3Client } from '@/lib/s3Client'

export async function POST(request: NextRequest) {
  const authError = authenticate(request)
  if (authError) return authError

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const key = `${Date.now()}-${file.name}`
    const buffer = await file.arrayBuffer()

    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: new Uint8Array(buffer),
      ContentType: file.type,
    }))

    return NextResponse.json({
      id: key,
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      metadata: { mimeType: file.type },
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
