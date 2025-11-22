import { NextRequest, NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3Client } from '@/lib/s3Client'
import { remotionS3Client, REMOTION_BUCKET, isRemotionAvailable } from '@/lib/remotionS3Client'
import { validateId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  const provider = request.nextUrl.searchParams.get('provider') || 's3'
  
  const validationError = validateId(id)
  if (validationError) return validationError

  if (provider === 'remotion' && !isRemotionAvailable) {
    return NextResponse.json({ 
      error: 'Remotion bucket not configured' 
    }, { status: 503 })
  }

  const client = provider === 'remotion' ? remotionS3Client! : s3Client
  const bucket = provider === 'remotion' ? REMOTION_BUCKET : process.env.R2_BUCKET!

  try {
    const url = await getSignedUrl(client, new GetObjectCommand({
      Bucket: bucket,
      Key: id!,
    }), { expiresIn: 3600 })

    return NextResponse.json({ url })
  } catch (error) {
    console.error('URL generation error:', error)
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 })
  }
}
