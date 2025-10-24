# Content Manager

A simple content management view for managing company assets stored in either Cloudflare R2 (S3) or Google Drive.

## Features

- **Multi-Storage Support**: Switch between Cloudflare R2 and Google Drive
- **File Upload**: Drag & drop or click to upload PDFs, images, videos, and documents
- **Content Grid**: Visual grid layout with thumbnails
- **Search**: Filter content by name
- **Batch Operations**: Select multiple items for batch deletion
- **Upload Progress**: Real-time upload progress tracking

## Storage Providers

### Cloudflare R2 (S3-compatible)
- Configured via environment variables
- Uses AWS SDK for S3 operations
- Requires backend API for signed URLs

### Google Drive
- OAuth-based authentication
- Direct integration with Google Drive API
- Requires backend API for authentication flow

## Implementation Status

The UI is complete and follows the app's design system. Backend API integration is required for:

1. **S3 Operations**: List, upload, delete, and generate signed URLs
2. **Google Drive Operations**: List, upload, delete, and get file URLs
3. **Authentication**: Google OAuth flow for Drive access

## Environment Variables

```env
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_ENDPOINT_URL=https://your_account.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_BUCKET_NAME=your_bucket_name
```

## Usage

The Content view is accessible from the main navigation. Users can:

1. Select storage provider (Cloudflare R2 or Google Drive)
2. Upload files via drag & drop or file picker
3. View content in a grid layout
4. Search and filter content
5. View details and delete items
