import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

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

  if (!id) {
    return NextResponse.json({ error: 'No ID provided' }, { status: 400 })
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: id,
    })

    const url = await getSignedUrl(client, command, { expiresIn: 3600 })

    return NextResponse.json({ url })
  } catch (error) {
    console.error('URL generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate URL' },
      { status: 500 }
    )
  }
}
