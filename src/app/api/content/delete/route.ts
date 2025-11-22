import { NextRequest, NextResponse } from 'next/server'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { authenticate, validateId } from '@/lib/auth'
import { s3Client } from '@/lib/s3Client'

export async function DELETE(request: NextRequest) {
  const authError = authenticate(request)
  if (authError) return authError

  const id = request.nextUrl.searchParams.get('id')
  const validationError = validateId(id)
  if (validationError) return validationError

  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: id!,
    }))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
