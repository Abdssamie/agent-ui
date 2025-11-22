import { S3Client } from '@aws-sdk/client-s3'

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY

if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  console.warn('Missing AWS credentials for Remotion bucket. Remotion content will not be available.')
}

export const remotionS3Client = AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY 
  ? new S3Client({
      region: 'eu-west-3',
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    })
  : null

export const REMOTION_BUCKET = 'remotionlambda-euwest3-x1kx4pjn4s'
export const isRemotionAvailable = !!remotionS3Client
