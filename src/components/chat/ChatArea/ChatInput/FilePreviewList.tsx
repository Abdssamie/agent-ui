'use client'
import React, { useEffect, useState } from 'react'
import { useStore } from '@/store'
import { FileAttachment } from '@/types/fileHandling'
import { formatFileSize, getFileCategory } from '@/lib/fileValidation'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/icon'
import Tooltip from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useFileUpload } from '@/hooks/useFileUpload'

interface FilePreviewItemProps {
  attachment: FileAttachment
  onRemove: (id: string) => void
  onRetry: (id: string) => void
}

const FilePreviewItem: React.FC<FilePreviewItemProps> = ({ attachment, onRemove, onRetry }) => {
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const category = getFileCategory(attachment.file)
  const isUploading = useStore((state) => state.isUploading)

  // Generate thumbnail for images
  useEffect(() => {
    if (category === 'image' && attachment.file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnail(reader.result as string)
      }
      reader.readAsDataURL(attachment.file)
    }

    return () => {
      if (thumbnail) {
        URL.revokeObjectURL(thumbnail)
      }
    }
  }, [attachment.file, category])

  const handleRemoveClick = () => {
    setShowConfirmation(true)
  }

  const handleConfirmRemove = () => {
    onRemove(attachment.id)
    setShowConfirmation(false)
    toast.success(`Removed ${attachment.file.name}`)
  }

  const handleCancelRemove = () => {
    setShowConfirmation(false)
  }

  const handleRetry = () => {
    onRetry(attachment.id)
  }

  const getFileIcon = () => {
    switch (category) {
      case 'image':
        return null // Will show thumbnail
      case 'document':
        return '📄'
      case 'video':
        return '🎥'
      case 'audio':
        return '🎵'
      default:
        return '📎'
    }
  }

  const getStatusColor = () => {
    switch (attachment.uploadStatus) {
      case 'completed':
        return 'border-green-500'
      case 'uploading':
        return 'border-blue-500'
      case 'error':
        return 'border-red-500'
      default:
        return 'border-accent'
    }
  }

  const tooltipContent = (
    <div className="text-xs">
      <div className="font-semibold">{attachment.file.name}</div>
      <div className="text-muted-foreground">
        Size: {formatFileSize(attachment.file.size)}
      </div>
      <div className="text-muted-foreground">
        Type: {attachment.file.type || 'Unknown'}
      </div>
      {attachment.error && (
        <div className="text-red-500 mt-1">Error: {attachment.error}</div>
      )}
    </div>
  )

  return (
    <div
      className={cn(
        'relative flex flex-col items-center gap-1 p-2 rounded-lg border-2 bg-background transition-all',
        getStatusColor(),
        attachment.uploadStatus === 'error' && 'opacity-70'
      )}
    >
      {/* Thumbnail or Icon */}
      <Tooltip content={tooltipContent} side="top">
        <div className="relative w-16 h-16 flex items-center justify-center bg-accent rounded-md overflow-hidden">
          {category === 'image' && thumbnail ? (
            <img
              src={thumbnail}
              alt={attachment.file.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-3xl">{getFileIcon()}</span>
          )}
          
          {/* Upload progress overlay */}
          {attachment.uploadStatus === 'uploading' && attachment.progress !== undefined && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-xs font-semibold">
                {Math.round(attachment.progress)}%
              </span>
            </div>
          )}

          {/* Error overlay */}
          {attachment.uploadStatus === 'error' && (
            <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
              <span className="text-red-500 text-xl">⚠</span>
            </div>
          )}
        </div>
      </Tooltip>

      {/* File name (truncated) */}
      <div className="w-16 text-xs text-center truncate text-primary">
        {attachment.file.name}
      </div>

      {/* File size */}
      <div className="text-[10px] text-muted-foreground">
        {formatFileSize(attachment.file.size)}
      </div>

      {/* Action buttons */}
      {!showConfirmation ? (
        <div className="absolute -top-2 -right-2 flex gap-1">
          {/* Retry button for failed uploads */}
          {attachment.uploadStatus === 'error' && (
            <Button
              onClick={handleRetry}
              size="icon"
              variant="default"
              disabled={isUploading}
              className="h-6 w-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white p-0"
              aria-label={`Retry upload ${attachment.file.name}`}
              title="Retry upload"
            >
              <Icon type="refresh" className="h-3 w-3" />
            </Button>
          )}
          
          {/* Remove button */}
          <Button
            onClick={handleRemoveClick}
            size="icon"
            variant="ghost"
            disabled={attachment.uploadStatus === 'uploading'}
            className="h-6 w-6 rounded-full bg-destructive hover:bg-destructive/90 text-white p-0"
            aria-label={`Remove ${attachment.file.name}`}
          >
            <Icon type="x" className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="absolute -top-2 -right-2 flex gap-1">
          <Button
            onClick={handleConfirmRemove}
            size="icon"
            variant="default"
            className="h-6 w-6 rounded-full bg-green-600 hover:bg-green-700 text-white p-0"
            aria-label="Confirm remove"
          >
            <Icon type="check" className="h-3 w-3" />
          </Button>
          <Button
            onClick={handleCancelRemove}
            size="icon"
            variant="ghost"
            className="h-6 w-6 rounded-full bg-accent hover:bg-accent/80 p-0"
            aria-label="Cancel remove"
          >
            <Icon type="x" className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}

interface FilePreviewListProps {
  className?: string
}

const FilePreviewList: React.FC<FilePreviewListProps> = ({ className }) => {
  const attachments = useStore((state) => state.attachments)
  const removeAttachment = useStore((state) => state.removeAttachment)
  const { retryFailedUpload, getUploadStats } = useFileUpload()
  const stats = getUploadStats()

  const handleRetry = (attachmentId: string) => {
    retryFailedUpload(attachmentId)
  }

  if (attachments.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'w-full max-w-2xl mx-auto mb-2 px-2',
        className
      )}
      role="region"
      aria-label="File attachments"
    >
      {/* Upload status summary */}
      {stats.total > 0 && (
        <div className="mb-2 text-xs text-muted-foreground flex items-center gap-2">
          <span>
            {stats.completed} of {stats.total} uploaded
          </span>
          {stats.uploading > 0 && (
            <span className="text-blue-500">• {stats.uploading} uploading</span>
          )}
          {stats.failed > 0 && (
            <span className="text-red-500">• {stats.failed} failed</span>
          )}
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <FilePreviewItem
            key={attachment.id}
            attachment={attachment}
            onRemove={removeAttachment}
            onRetry={handleRetry}
          />
        ))}
      </div>
    </div>
  )
}

export default FilePreviewList;
