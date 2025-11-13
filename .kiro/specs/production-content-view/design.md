# Design Document

## Overview

The Production Content View is a comprehensive file management interface that enables users to store, organize, and manage company assets across multiple storage providers (Cloudflare R2 and Google Drive). The design focuses on providing seamless multi-storage support, robust file operations, advanced organization features, and integration with workflows and AI agents.

The architecture follows a provider-agnostic approach with a unified interface layer that abstracts storage-specific implementations, enabling easy addition of new storage providers in the future.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Content View Layer                       │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ ContentManager │  │ FileExplorer │  │ UploadManager   │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Storage Abstraction Layer                  │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Storage        │  │ File         │  │ Metadata        │ │
│  │ Provider API   │  │ Operations   │  │ Manager         │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                  Provider Implementation Layer               │
│  ┌────────────────┐  ┌──────────────┐                       │
│  │ Cloudflare R2  │  │ Google Drive │                       │
│  │ (S3 SDK)       │  │ (Drive API)  │                       │
│  └────────────────┘  └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                         Backend API                          │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
ContentView
├── ContentHeader
│   ├── StorageProviderSelector
│   ├── StorageQuotaIndicator
│   └── ViewModeToggle
├── ContentToolbar
│   ├── SearchBar
│   ├── FilterPanel
│   ├── SortSelector
│   └── BulkActions
├── ContentExplorer
│   ├── BreadcrumbNavigation
│   ├── FolderTree (sidebar)
│   └── ContentGrid/List
│       ├── FolderItem
│       ├── FileItem
│       │   ├── Thumbnail
│       │   ├── FileInfo
│       │   └── QuickActions
│       └── LoadingSkeletons
├── UploadZone
│   ├── DragDropArea
│   ├── FileSelector
│   └── UploadProgressList
├── FilePreviewDialog
│   ├── PreviewRenderer
│   │   ├── ImageViewer
│   │   ├── PDFViewer
│   │   ├── VideoPlayer
│   │   └── DocumentViewer
│   ├── FileDetails
│   └── ActionButtons
├── FileVersionHistory
│   ├── VersionList
│   ├── VersionComparison
│   └── RestoreButton
└── AutomationPanel
    ├── WorkflowIntegration
    ├── AutoUploadSettings
    └── AutomationLogs
```


## Components and Interfaces

### 1. ContentManager Component

**Purpose:** Main container component that orchestrates file management across storage providers.

**Props:**
```typescript
interface ContentManagerProps {
  initialProvider?: StorageProvider
  workflowIntegration?: boolean
}
```

**State:**
```typescript
interface ContentManagerState {
  provider: StorageProvider
  contents: ContentItem[]
  currentPath: string[]
  isLoading: boolean
  error: Error | null
  searchQuery: string
  filters: ContentFilters
  sortBy: SortOption
  viewMode: 'grid' | 'list'
  selectedIds: Set<string>
  storageQuota: StorageQuota
}
```

### 2. Storage Provider Abstraction

**Purpose:** Unified interface for all storage providers.

```typescript
interface IStorageProvider {
  // Core operations
  listContents(path: string, options?: ListOptions): Promise<ContentItem[]>
  uploadFile(file: File, path: string, options?: UploadOptions): Promise<ContentItem>
  downloadFile(id: string): Promise<Blob>
  deleteFile(id: string): Promise<void>
  moveFile(id: string, newPath: string): Promise<ContentItem>
  copyFile(id: string, newPath: string): Promise<ContentItem>
  
  // Folder operations
  createFolder(path: string, name: string): Promise<FolderItem>
  deleteFolder(path: string): Promise<void>
  
  // Metadata operations
  getMetadata(id: string): Promise<FileMetadata>
  updateMetadata(id: string, metadata: Partial<FileMetadata>): Promise<FileMetadata>
  
  // Advanced features
  getVersionHistory(id: string): Promise<FileVersion[]>
  restoreVersion(id: string, versionId: string): Promise<ContentItem>
  generateShareLink(id: string, options: ShareOptions): Promise<string>
  
  // Quota and stats
  getStorageQuota(): Promise<StorageQuota>
  getStorageStats(): Promise<StorageStats>
}
```

### 3. Cloudflare R2 Provider Implementation

```typescript
class CloudflareR2Provider implements IStorageProvider {
  private s3Client: S3Client
  private bucketName: string
  
  constructor(config: R2Config) {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    })
    this.bucketName = config.bucketName
  }
  
  async listContents(path: string): Promise<ContentItem[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: path,
      Delimiter: '/'
    })
    
    const response = await this.s3Client.send(command)
    return this.transformS3Response(response)
  }
  
  async uploadFile(file: File, path: string, options?: UploadOptions): Promise<ContentItem> {
    const key = `${path}/${file.name}`
    
    // Use multipart upload for large files
    if (file.size > 5 * 1024 * 1024) {
      return this.multipartUpload(file, key, options)
    }
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file,
      ContentType: file.type,
      Metadata: options?.metadata
    })
    
    await this.s3Client.send(command)
    return this.getMetadata(key)
  }
  
  private async multipartUpload(
    file: File,
    key: string,
    options?: UploadOptions
  ): Promise<ContentItem> {
    const chunkSize = 5 * 1024 * 1024 // 5MB chunks
    const chunks = Math.ceil(file.size / chunkSize)
    
    // Initiate multipart upload
    const initCommand = new CreateMultipartUploadCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: file.type
    })
    
    const { UploadId } = await this.s3Client.send(initCommand)
    const uploadedParts: CompletedPart[] = []
    
    // Upload chunks
    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const chunk = file.slice(start, end)
      
      const uploadCommand = new UploadPartCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId,
        PartNumber: i + 1,
        Body: chunk
      })
      
      const { ETag } = await this.s3Client.send(uploadCommand)
      uploadedParts.push({ PartNumber: i + 1, ETag })
      
      // Report progress
      options?.onProgress?.((end / file.size) * 100)
    }
    
    // Complete multipart upload
    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: this.bucketName,
      Key: key,
      UploadId,
      MultipartUpload: { Parts: uploadedParts }
    })
    
    await this.s3Client.send(completeCommand)
    return this.getMetadata(key)
  }
}
```

### 4. Google Drive Provider Implementation

```typescript
class GoogleDriveProvider implements IStorageProvider {
  private accessToken: string
  private apiBaseUrl = 'https://www.googleapis.com/drive/v3'
  
  constructor(accessToken: string) {
    this.accessToken = accessToken
  }
  
  async listContents(path: string): Promise<ContentItem[]> {
    const folderId = await this.resolvePath(path)
    
    const response = await fetch(
      `${this.apiBaseUrl}/files?q='${folderId}' in parents&fields=*`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      }
    )
    
    const data = await response.json()
    return this.transformDriveResponse(data.files)
  }
  
  async uploadFile(file: File, path: string, options?: UploadOptions): Promise<ContentItem> {
    const folderId = await this.resolvePath(path)
    
    // Use resumable upload for large files
    if (file.size > 5 * 1024 * 1024) {
      return this.resumableUpload(file, folderId, options)
    }
    
    const metadata = {
      name: file.name,
      parents: [folderId],
      mimeType: file.type
    }
    
    const formData = new FormData()
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    formData.append('file', file)
    
    const response = await fetch(
      `${this.apiBaseUrl}/files?uploadType=multipart`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        },
        body: formData
      }
    )
    
    return response.json()
  }
  
  private async resumableUpload(
    file: File,
    folderId: string,
    options?: UploadOptions
  ): Promise<ContentItem> {
    // Initiate resumable upload
    const metadata = {
      name: file.name,
      parents: [folderId],
      mimeType: file.type
    }
    
    const initResponse = await fetch(
      `${this.apiBaseUrl}/files?uploadType=resumable`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      }
    )
    
    const uploadUrl = initResponse.headers.get('Location')!
    
    // Upload file in chunks
    const chunkSize = 256 * 1024 // 256KB chunks
    let uploadedBytes = 0
    
    while (uploadedBytes < file.size) {
      const chunk = file.slice(uploadedBytes, uploadedBytes + chunkSize)
      const endByte = Math.min(uploadedBytes + chunkSize, file.size)
      
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Range': `bytes ${uploadedBytes}-${endByte - 1}/${file.size}`
        },
        body: chunk
      })
      
      uploadedBytes = endByte
      options?.onProgress?.((uploadedBytes / file.size) * 100)
      
      if (response.status === 200 || response.status === 201) {
        return response.json()
      }
    }
    
    throw new Error('Upload failed')
  }
}
```


## Data Models

### Content Models

```typescript
interface ContentItem {
  id: string
  name: string
  type: 'file' | 'folder'
  mimeType?: string
  size: number
  path: string
  storageProvider: StorageProvider
  uploadedAt: Date
  updatedAt?: Date
  thumbnailUrl?: string
  downloadUrl?: string
  metadata?: FileMetadata
  tags?: string[]
  versions?: FileVersion[]
}

interface FileMetadata {
  description?: string
  author?: string
  customFields?: Record<string, any>
  checksum?: string
  encoding?: string
}

interface FileVersion {
  id: string
  versionNumber: number
  size: number
  uploadedAt: Date
  uploadedBy?: string
  checksum: string
  isCurrentVersion: boolean
}

interface FolderItem extends ContentItem {
  type: 'folder'
  childCount: number
  children?: ContentItem[]
}

interface StorageProvider {
  type: 's3' | 'google-drive'
  name: string
  config: S3Config | GoogleDriveConfig
}

interface StorageQuota {
  used: number
  total: number
  percentage: number
}

interface StorageStats {
  totalFiles: number
  totalFolders: number
  filesByType: Record<string, number>
  largestFiles: ContentItem[]
  recentUploads: ContentItem[]
}
```

### Upload Models

```typescript
interface UploadTask {
  id: string
  file: File
  path: string
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled'
  progress: number
  uploadedBytes: number
  totalBytes: number
  speed: number // bytes per second
  estimatedTimeRemaining: number // seconds
  error?: Error
  startTime: Date
  endTime?: Date
}

interface UploadOptions {
  metadata?: FileMetadata
  tags?: string[]
  onProgress?: (progress: number) => void
  onComplete?: (item: ContentItem) => void
  onError?: (error: Error) => void
  chunkSize?: number
  concurrency?: number
}

interface BatchUploadResult {
  successful: ContentItem[]
  failed: Array<{ file: File; error: Error }>
  totalSize: number
  totalDuration: number
}
```

### Filter and Search Models

```typescript
interface ContentFilters {
  types: FileType[]
  dateRange?: {
    start: Date
    end: Date
  }
  sizeRange?: {
    min: number
    max: number
  }
  tags: string[]
  storageProviders: StorageProvider['type'][]
  hasVersions?: boolean
  isShared?: boolean
}

interface SortOption {
  field: 'name' | 'size' | 'uploadedAt' | 'updatedAt' | 'type'
  direction: 'asc' | 'desc'
}

interface SearchOptions {
  query: string
  filters: ContentFilters
  sort: SortOption
  includeMetadata: boolean
  includeTags: boolean
}
```

## Error Handling

### Error Types and Recovery

```typescript
enum ContentErrorType {
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  NOT_FOUND = 'NOT_FOUND'
}

interface ContentError {
  type: ContentErrorType
  message: string
  details?: any
  recoverable: boolean
  suggestedAction?: string
}

class ContentErrorHandler {
  async handleError(error: ContentError, context: ErrorContext): Promise<void> {
    // Log error
    this.logError(error, context)
    
    // Display user-friendly message
    this.displayErrorToUser(error)
    
    // Attempt recovery
    if (error.recoverable) {
      await this.attemptRecovery(error, context)
    }
    
    // Update UI state
    this.updateErrorState(error)
  }
  
  private async attemptRecovery(error: ContentError, context: ErrorContext): Promise<void> {
    switch (error.type) {
      case ContentErrorType.UPLOAD_FAILED:
        // Retry upload with exponential backoff
        await this.retryUpload(context)
        break
      
      case ContentErrorType.QUOTA_EXCEEDED:
        // Suggest cleanup or upgrade
        this.suggestQuotaManagement()
        break
      
      case ContentErrorType.AUTH_ERROR:
        // Refresh authentication
        await this.refreshAuth(context)
        break
      
      case ContentErrorType.NETWORK_ERROR:
        // Queue for retry when online
        this.queueForRetry(context)
        break
    }
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
describe('CloudflareR2Provider', () => {
  it('should upload file successfully', async () => {
    const provider = new CloudflareR2Provider(mockConfig)
    const file = new File(['content'], 'test.txt', { type: 'text/plain' })
    
    const result = await provider.uploadFile(file, '/documents')
    
    expect(result.name).toBe('test.txt')
    expect(result.storageProvider.type).toBe('s3')
  })
  
  it('should use multipart upload for large files', async () => {
    const provider = new CloudflareR2Provider(mockConfig)
    const largeFile = new File([new ArrayBuffer(10 * 1024 * 1024)], 'large.bin')
    
    const spy = jest.spyOn(provider as any, 'multipartUpload')
    await provider.uploadFile(largeFile, '/documents')
    
    expect(spy).toHaveBeenCalled()
  })
})

describe('ContentManager - Filtering', () => {
  it('should filter content by type', () => {
    const contents = [
      { id: '1', type: 'file', mimeType: 'image/png' },
      { id: '2', type: 'file', mimeType: 'application/pdf' }
    ]
    
    const filtered = filterContents(contents, { types: ['image'] })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('1')
  })
})
```

### Integration Tests

```typescript
describe('Content Upload Flow', () => {
  it('should upload file and display in grid', async () => {
    const { getByTestId, findByText } = render(<ContentManager />)
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    const input = getByTestId('file-input')
    
    fireEvent.change(input, { target: { files: [file] } })
    
    await waitFor(() => expect(findByText('test.pdf')).toBeInTheDocument())
  })
})
```

## Performance Optimizations

### 1. Lazy Loading and Virtualization

```typescript
function ContentGrid({ contents }: { contents: ContentItem[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: contents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 250,
    overscan: 10
  })
  
  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((item) => (
          <ContentCard
            key={item.key}
            content={contents[item.index]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${item.start}px)`
            }}
          />
        ))}
      </div>
    </div>
  )
}
```

### 2. Progressive Image Loading

```typescript
function ContentThumbnail({ url, alt }: { url: string; alt: string }) {
  const [loaded, setLoaded] = useState(false)
  const [blurDataUrl, setBlurDataUrl] = useState<string>()
  
  useEffect(() => {
    // Generate blur placeholder
    generateBlurDataUrl(url).then(setBlurDataUrl)
  }, [url])
  
  return (
    <div className="relative">
      {blurDataUrl && !loaded && (
        <img
          src={blurDataUrl}
          alt={alt}
          className="absolute inset-0 blur-sm"
        />
      )}
      <img
        src={url}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}
```

### 3. Upload Queue Management

```typescript
class UploadQueue {
  private queue: UploadTask[] = []
  private activeUploads: Map<string, UploadTask> = new Map()
  private maxConcurrent = 3
  
  async add(file: File, path: string, options?: UploadOptions): Promise<void> {
    const task: UploadTask = {
      id: generateId(),
      file,
      path,
      status: 'pending',
      progress: 0,
      uploadedBytes: 0,
      totalBytes: file.size,
      speed: 0,
      estimatedTimeRemaining: 0,
      startTime: new Date()
    }
    
    this.queue.push(task)
    this.processQueue()
  }
  
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.activeUploads.size < this.maxConcurrent) {
      const task = this.queue.shift()!
      this.activeUploads.set(task.id, task)
      
      this.uploadTask(task)
        .then(() => {
          task.status = 'completed'
          this.activeUploads.delete(task.id)
          this.processQueue()
        })
        .catch((error) => {
          task.status = 'failed'
          task.error = error
          this.activeUploads.delete(task.id)
          this.processQueue()
        })
    }
  }
  
  private async uploadTask(task: UploadTask): Promise<void> {
    task.status = 'uploading'
    
    const provider = getStorageProvider()
    await provider.uploadFile(task.file, task.path, {
      onProgress: (progress) => {
        task.progress = progress
        task.uploadedBytes = (progress / 100) * task.totalBytes
        this.updateTaskMetrics(task)
      }
    })
  }
  
  private updateTaskMetrics(task: UploadTask): void {
    const elapsed = (Date.now() - task.startTime.getTime()) / 1000
    task.speed = task.uploadedBytes / elapsed
    task.estimatedTimeRemaining = (task.totalBytes - task.uploadedBytes) / task.speed
  }
}
```

## Workflow Integration

### Auto-Upload from Workflows

```typescript
interface WorkflowContentConfig {
  enabled: boolean
  defaultFolder: string
  namingPattern: string // e.g., "{workflow_name}_{timestamp}_{filename}"
  autoTag: boolean
  tagPattern: string[] // e.g., ["workflow:{workflow_id}", "auto-generated"]
  metadata: Record<string, any>
}

class WorkflowContentIntegration {
  async handleWorkflowOutput(
    workflowId: string,
    output: any,
    config: WorkflowContentConfig
  ): Promise<ContentItem[]> {
    if (!config.enabled) return []
    
    const files = this.extractFilesFromOutput(output)
    const uploadedItems: ContentItem[] = []
    
    for (const file of files) {
      const filename = this.applyNamingPattern(file.name, config.namingPattern, {
        workflow_name: workflowId,
        timestamp: Date.now(),
        filename: file.name
      })
      
      const tags = config.autoTag
        ? this.generateTags(config.tagPattern, { workflow_id: workflowId })
        : []
      
      const item = await this.uploadFile(file, config.defaultFolder, {
        metadata: {
          ...config.metadata,
          source: 'workflow',
          workflow_id: workflowId,
          generated_at: new Date().toISOString()
        },
        tags
      })
      
      uploadedItems.push(item)
    }
    
    return uploadedItems
  }
  
  private extractFilesFromOutput(output: any): File[] {
    // Extract files from workflow output
    // Handle various output formats (URLs, base64, file paths, etc.)
    const files: File[] = []
    
    if (output.files) {
      files.push(...output.files)
    }
    
    if (output.images) {
      for (const image of output.images) {
        if (image.url) {
          files.push(await this.downloadFromUrl(image.url))
        } else if (image.base64) {
          files.push(this.base64ToFile(image.base64, image.filename))
        }
      }
    }
    
    return files
  }
}
```

## Security Considerations

### Secure File Handling

```typescript
class SecureFileHandler {
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4',
    'video/webm'
  ]
  
  async validateFile(file: File): Promise<ValidationResult> {
    const errors: string[] = []
    
    // Check file size
    if (file.size > 100 * 1024 * 1024) {
      errors.push('File size exceeds 100MB limit')
    }
    
    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`)
    }
    
    // Verify file signature (magic bytes)
    const isValid = await this.verifyFileSignature(file)
    if (!isValid) {
      errors.push('File signature does not match declared type')
    }
    
    // Scan for malware (if enabled)
    if (process.env.ENABLE_MALWARE_SCAN === 'true') {
      const isSafe = await this.scanForMalware(file)
      if (!isSafe) {
        errors.push('File failed malware scan')
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  private async verifyFileSignature(file: File): Promise<boolean> {
    const buffer = await file.slice(0, 12).arrayBuffer()
    const bytes = new Uint8Array(buffer)
    
    // Check magic bytes for common file types
    const signatures: Record<string, number[]> = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'application/pdf': [0x25, 0x50, 0x44, 0x46]
    }
    
    const signature = signatures[file.type]
    if (!signature) return true // Unknown type, skip verification
    
    return signature.every((byte, index) => bytes[index] === byte)
  }
}
```

This design provides a comprehensive, production-ready architecture for the Content View with robust multi-storage support, performance optimizations, and seamless workflow integration.
