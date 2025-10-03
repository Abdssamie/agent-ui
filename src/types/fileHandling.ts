// File handling types and interfaces for chat file attachments and knowledge integration

export interface FileAttachment {
    id: string
    file: File
    preview?: string
    uploadStatus: 'pending' | 'uploading' | 'completed' | 'error'
    knowledgeId?: string
    error?: string
    progress?: number
}

export interface FileValidationConfig {
    maxFileSize: number // bytes
    maxTotalSize: number // bytes
    maxFileCount: number
    allowedTypes: string[] // MIME types
    allowedExtensions: string[] // file extensions with dots (e.g., '.pdf')
}

export interface ValidationResult {
    isValid: boolean
    errors: string[]
    warnings: string[]
}

export interface FileValidationError {
    type: 'size' | 'type' | 'count' | 'totalSize' | 'extension'
    message: string
    filename?: string
    actualValue?: number | string
    allowedValue?: number | string
}

// Agno Knowledge API types
export interface UploadContentRequest {
    content: string | Blob
    content_type: string
    metadata?: {
        filename?: string
        source?: string
        user_context?: string
    }
}

export interface UploadContentResponse {
    id: string
    status: 'uploaded' | 'processing' | 'completed' | 'error'
    message?: string
}

export interface UpdateContentRequest {
    content?: string | Blob
    content_type?: string
    metadata?: {
        filename?: string
        source?: string
        user_context?: string
    }
}

export interface KnowledgeContent {
    id: string
    filename: string
    content_type: string
    size: number
    upload_date: string
    status: 'uploaded' | 'processing' | 'completed' | 'error'
    metadata: {
        source: string
        user_context: string
        session_id?: string
    }
}

export interface ListContentResponse {
    contents: KnowledgeContent[]
    total: number
    page: number
    limit: number
}

export interface GetContentResponse {
    id: string
    content: string | Blob
    content_type: string
    metadata: {
        filename?: string
        source?: string
        user_context?: string
    }
}

export interface ContentStatusResponse {
    id: string
    status: 'uploaded' | 'processing' | 'completed' | 'error'
    progress?: number
    message?: string
}

// File handling state management
export interface FileHandlingState {
    attachments: FileAttachment[]
    isUploading: boolean
    uploadProgress: Record<string, number>
    knowledgeContents: KnowledgeContent[]
    validationConfig: FileValidationConfig
}

// Extended chat message with file attachments
export interface ChatMessageWithFiles {
    role: 'user' | 'agent' | 'system' | 'tool'
    content: string
    streamingError?: boolean
    created_at: number
    attachments?: FileAttachment[]
    knowledge_references?: string[] // Knowledge content IDs
    tool_calls?: any[]
    extra_data?: any
    images?: any[]
    videos?: any[]
    audio?: any[]
    response_audio?: any
}

// File preview types
export interface FilePreviewData {
    id: string
    type: 'image' | 'document' | 'video' | 'audio' | 'other'
    thumbnail?: string
    metadata: {
        name: string
        size: number
        type: string
        lastModified: number
    }
}

// Drag and drop types
export interface DragDropState {
    isDragging: boolean
    dragCounter: number
    isValidDrop: boolean
}

// File processing types
export interface FileProcessingResult {
    success: boolean
    attachment?: FileAttachment
    error?: string
}

export interface BatchProcessingResult {
    successful: FileAttachment[]
    failed: Array<{
        file: File
        error: string
    }>
}