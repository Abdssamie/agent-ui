// Content Upload Zone Component
import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Icon from '@/components/ui/icon'
import { cn } from '@/lib/utils'

interface ContentUploadZoneProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
  accept?: Record<string, string[]>
}

const DEFAULT_ACCEPT = {
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  'video/*': ['.mp4', '.webm', '.mov'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
}

export const ContentUploadZone = ({
  onFilesSelected,
  disabled = false,
  accept = DEFAULT_ACCEPT
}: ContentUploadZoneProps) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles)
      }
    },
    [onFilesSelected]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    accept,
    multiple: true
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative cursor-pointer rounded-xl border-2 border-dashed border-primary/15 bg-accent/50 p-6 transition-all',
        isDragActive && 'border-primary/40 bg-accent',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Icon type="upload" size="md" className="text-primary" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-primary">
            {isDragActive ? 'Drop files here' : 'Upload Content'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Drag & drop or click to browse
          </p>
        </div>
        <p className="text-xs text-muted">
          Supports images, videos, PDFs, and documents
        </p>
      </div>
    </div>
  )
}
