'use client'
import React from 'react'
import { ImageAttachment } from '@/types/fileHandling'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/icon'
import Tooltip from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatFileSize } from '@/lib/fileValidation'

interface ImageAttachmentPreviewProps {
  attachments: ImageAttachment[]
  onRemove: (id: string) => void
  className?: string
  isProcessing?: boolean
}

/**
 * ImageAttachmentPreview component displays image attachments before sending
 * Features:
 * - Horizontal scrollable thumbnail grid
 * - Remove button for each image
 * - Max height 120px thumbnails
 * - Visually distinct from knowledge base file uploads
 * - Error states for failed image loads
 * - Loading states during processing
 */
const ImageAttachmentPreview: React.FC<ImageAttachmentPreviewProps> = ({
  attachments,
  onRemove,
  className,
  isProcessing = false
}) => {
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
      aria-label="Image attachments"
      aria-live="polite"
    >
      {/* Header with count */}
      <div className="mb-2 text-xs text-muted-foreground flex items-center gap-2">
        <Icon type="paperclip" className="h-3 w-3" />
        <span>
          {attachments.length} {attachments.length === 1 ? 'file' : 'files'} attached
        </span>
        {isProcessing && (
          <span className="flex items-center gap-1 text-primary">
            <Icon type="loader" className="h-3 w-3 animate-spin" />
            Processing...
          </span>
        )}
      </div>

      {/* Horizontal scrollable thumbnail grid */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent">
        {attachments.map((attachment) => (
          <ImageThumbnail
            key={attachment.id}
            attachment={attachment}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  )
}

interface ImageThumbnailProps {
  attachment: ImageAttachment
  onRemove: (id: string) => void
}

const ImageThumbnail: React.FC<ImageThumbnailProps> = ({ attachment, onRemove }) => {
  const [imageError, setImageError] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)

  // Check if this is an image or document
  const isImage = attachment.preview && attachment.preview.startsWith('blob:') && attachment.type.startsWith('image/')
  const isDocument = !isImage

  const handleRemove = () => {
    onRemove(attachment.id)
  }

  const handleImageLoad = () => {
    setIsLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    setIsLoading(false)
    setImageError(true)
  }

  // Get file extension for document icon
  const getFileExtension = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    return ext || 'file'
  }

  const fileExtension = getFileExtension(attachment.file.name)

  const tooltipContent = (
    <div className="text-xs">
      <div className="font-semibold">{attachment.file.name}</div>
      {imageError ? (
        <div className="text-destructive">
          Failed to load image preview
        </div>
      ) : (
        <>
          <div className="text-muted-foreground">
            Size: {formatFileSize(attachment.size)}
          </div>
          {attachment.width && attachment.height && (
            <div className="text-muted-foreground">
              Dimensions: {attachment.width} × {attachment.height}
            </div>
          )}
          <div className="text-muted-foreground">
            Type: {attachment.mimeType}
          </div>
        </>
      )}
    </div>
  )

  return (
    <div
      className={cn(
        'relative flex-shrink-0 rounded-lg border-2 transition-all',
        imageError
          ? 'border-destructive/50 bg-destructive/10'
          : 'border-primary/30 bg-background hover:border-primary/60',
        'group'
      )}
    >
      {/* File thumbnail */}
      <Tooltip content={tooltipContent} side="top">
        <div className="relative w-28 h-28 flex items-center justify-center rounded-md overflow-hidden bg-accent">
          {isDocument ? (
            // Document icon for PDFs and other files
            <div className="flex flex-col items-center justify-center gap-2 p-2">
              <Icon type="file" className="h-10 w-10 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase">
                {fileExtension}
              </span>
            </div>
          ) : (
            // Image preview
            <>
              {isLoading && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-accent">
                  <Icon type="loader" className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {imageError ? (
                <div className="flex flex-col items-center justify-center gap-1 text-destructive">
                  <Icon type="alert-circle" className="h-8 w-8" />
                  <span className="text-[10px] text-center px-1">Failed to load</span>
                </div>
              ) : (
                <img
                  src={attachment.preview || undefined}
                  alt={attachment.file.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              )}
            </>
          )}
        </div>
      </Tooltip>

      {/* Remove button */}
      <Button
        onClick={handleRemove}
        size="icon"
        variant="ghost"
        className={cn(
          'absolute -top-2 -right-2 h-6 w-6 rounded-full',
          'bg-destructive hover:bg-destructive/90 text-white p-0',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'focus:opacity-100'
        )}
        aria-label={`Remove ${attachment.file.name}`}
        title="Remove image"
      >
        <Icon type="x" className="h-3 w-3" />
      </Button>

      {/* File name (truncated) */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
        {attachment.file.name}
      </div>
    </div>
  )
}

export default ImageAttachmentPreview
