/**
 * @deprecated This component is deprecated and should not be used.
 * File attachments are now handled directly by the file input in ChatInput.
 * This component is kept for backward compatibility but is disabled by default.
 * 
 * Use the paperclip button in ChatInput to attach files instead.
 */

'use client'
import React, { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { useStore } from '@/store'
import { DragDropState, FileAttachment } from '@/types/fileHandling'

interface FileDropZoneProps {
  children: React.ReactNode
  onFilesAdded?: (files: FileAttachment[]) => void
  disabled?: boolean
}

const FileDropZone = ({ children, onFilesAdded, disabled = true }: FileDropZoneProps) => {
  const [dragState, setDragState] = useState<DragDropState>({
    isDragging: false,
    dragCounter: 0,
    isValidDrop: false
  })

  const dropZoneRef = useRef<HTMLDivElement>(null)
  
  const attachments = useStore((state) => state.attachments)
  const validationConfig = useStore((state) => state.validationConfig)
  const addAttachments = useStore((state) => state.addAttachments)

  // Prevent default drag behavior on the entire component
  useEffect(() => {
    const preventDefault = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    // Prevent default behavior for drag events on the document
    document.addEventListener('dragover', preventDefault)
    document.addEventListener('drop', preventDefault)

    return () => {
      document.removeEventListener('dragover', preventDefault)
      document.removeEventListener('drop', preventDefault)
    }
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (disabled) return

    setDragState((prev) => {
      const newCounter = prev.dragCounter + 1
      
      // Check if the drag contains files
      const hasFiles = e.dataTransfer.types.includes('Files')
      
      return {
        isDragging: newCounter > 0,
        dragCounter: newCounter,
        isValidDrop: hasFiles
      }
    })
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (disabled) return

    setDragState((prev) => {
      const newCounter = prev.dragCounter - 1
      
      return {
        isDragging: newCounter > 0,
        dragCounter: newCounter,
        isValidDrop: newCounter > 0 ? prev.isValidDrop : false
      }
    })
  }, [disabled])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (disabled) return

    // Set the drop effect to indicate this is a valid drop zone
    e.dataTransfer.dropEffect = 'copy'
  }, [disabled])

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (disabled) {
      setDragState({
        isDragging: false,
        dragCounter: 0,
        isValidDrop: false
      })
      return
    }

    // Reset drag state
    setDragState({
      isDragging: false,
      dragCounter: 0,
      isValidDrop: false
    })

    // Get files from the drop event
    const droppedFiles = Array.from(e.dataTransfer.files)

    if (droppedFiles.length === 0) {
      return
    }

    // Simple file handling - just notify about dropped files
    // Actual file processing is handled by useImageAttachment hook in ChatInput
    if (droppedFiles.length > 0) {
      const fileWord = droppedFiles.length === 1 ? 'file' : 'files'
      toast.info(`${droppedFiles.length} ${fileWord} dropped. Use the attachment button to add files.`)
    }
  }, [disabled, attachments, validationConfig, addAttachments, onFilesAdded])

  return (
    <div
      ref={dropZoneRef}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative ${dragState.isDragging ? 'pointer-events-auto' : ''}`}
    >
      {/* Drag overlay with visual feedback */}
      {dragState.isDragging && (
        <div
          className={`absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed transition-all ${
            dragState.isValidDrop
              ? 'border-primary bg-primary/10 backdrop-blur-sm'
              : 'border-red-500 bg-red-500/10 backdrop-blur-sm'
          }`}
          style={{ pointerEvents: 'none' }}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <div
              className={`text-4xl ${
                dragState.isValidDrop ? 'text-primary' : 'text-red-500'
              }`}
            >
              {dragState.isValidDrop ? '📎' : '⚠️'}
            </div>
            <p
              className={`text-sm font-medium ${
                dragState.isValidDrop ? 'text-primary' : 'text-red-500'
              }`}
            >
              {dragState.isValidDrop
                ? 'Drop files here to attach'
                : 'Invalid file type or size'}
            </p>
          </div>
        </div>
      )}

      {/* Original children */}
      {children}
    </div>
  )
}

export default FileDropZone;
