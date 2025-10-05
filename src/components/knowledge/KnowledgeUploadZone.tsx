// Knowledge Upload Zone Component
// Provides drag-and-drop and file picker interface for uploading files to knowledge base

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react'
import Icon from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { DEFAULT_FILE_VALIDATION_CONFIG } from '@/lib/fileValidation'

interface KnowledgeUploadZoneProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
  className?: string
}

export const KnowledgeUploadZone = ({
  onFilesSelected,
  disabled = false,
  className
}: KnowledgeUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    setDragCounter((prev) => prev + 1)
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    setDragCounter((prev) => {
      const newCounter = prev - 1
      if (newCounter === 0) {
        setIsDragging(false)
      }
      return newCounter
    })
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsDragging(false)
    setDragCounter(0)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      onFilesSelected(files)
    }
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return

    const files = e.target.files
    if (files && files.length > 0) {
      onFilesSelected(Array.from(files))
    }

    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleButtonClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Format supported file types for display
  const supportedTypes = DEFAULT_FILE_VALIDATION_CONFIG.allowedExtensions
    .map(ext => ext.replace('.', '').toUpperCase())
    .join(', ')

  return (
    <div
      className={cn(
        'rounded-lg p-6 text-center transition-colors cursor-pointer',
        isDragging && !disabled && 'bg-primary/5',
        !isDragging && 'hover:bg-accent/5',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleButtonClick}
    >
      <div className="flex flex-col items-center gap-3">
        <div className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center',
          isDragging && !disabled ? 'bg-primary/10' : 'bg-muted'
        )}>
          <Icon 
            type="upload" 
            size="md" 
            className={cn(
              isDragging && !disabled ? 'text-primary' : 'text-muted-foreground'
            )}
          />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium">
            {isDragging ? 'Drop files here' : 'Upload to Knowledge Base'}
          </p>
          <p className="text-xs text-muted-foreground">
            Drag and drop files or click to browse
          </p>
        </div>

        <div className="text-xs text-muted-foreground">
          {supportedTypes} • Max {DEFAULT_FILE_VALIDATION_CONFIG.maxFileSize / (1024 * 1024)}MB per file
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={DEFAULT_FILE_VALIDATION_CONFIG.allowedExtensions.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
      </div>
    </div>
  )
}
