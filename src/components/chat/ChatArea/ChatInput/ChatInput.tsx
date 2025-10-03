'use client'
import React, { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { TextArea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import useAIChatStreamHandler from '@/hooks/useAIStreamHandler'
import { useQueryState } from 'nuqs'
import Icon from '@/components/ui/icon'
import FileDropZone from './FileDropZone'
import FilePreviewList from './FilePreviewList'
import { validateFiles, processFiles } from '@/lib/fileValidation'
import { useFileUpload } from '@/hooks/useFileUpload'

const ChatInput = () => {
  const { chatInputRef } = useStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previousAttachmentCount, setPreviousAttachmentCount] = useState(0)

  const { handleStreamResponse } = useAIChatStreamHandler()
  const [selectedAgent] = useQueryState('agent')
  const [teamId] = useQueryState('team')
  const [inputMessage, setInputMessage] = useState('')
  const isStreaming = useStore((state) => state.isStreaming)
  
  // File attachment state and actions
  const attachments = useStore((state) => state.attachments)
  const addAttachments = useStore((state) => state.addAttachments)
  const validationConfig = useStore((state) => state.validationConfig)
  const { uploadFile } = useFileUpload()

  // Auto-upload files when new attachments are added
  useEffect(() => {
    const newAttachments = attachments.filter(
      (attachment) => attachment.uploadStatus === 'pending'
    )

    // Only upload if we have new attachments (count increased)
    if (newAttachments.length > 0 && attachments.length > previousAttachmentCount) {
      // Upload each new attachment
      newAttachments.forEach((attachment) => {
        uploadFile(attachment, {
          session_id: selectedAgent || teamId || undefined
        })
      })
    }

    setPreviousAttachmentCount(attachments.length)
  }, [attachments, previousAttachmentCount, uploadFile, selectedAgent, teamId])
  const handleSubmit = async () => {
    if (!inputMessage.trim()) return

    const currentMessage = inputMessage
    setInputMessage('')

    try {
      await handleStreamResponse(currentMessage)
    } catch (error) {
      toast.error(
        `Error in handleSubmit: ${error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) {
      // User cancelled file selection
      return
    }

    const fileArray = Array.from(files)
    const existingFiles = attachments.map((attachment) => attachment.file)

    // Validate files before adding
    const validation = validateFiles(fileArray, existingFiles, validationConfig)

    if (!validation.isValid) {
      // Show all validation errors
      validation.errors.forEach((error) => {
        toast.error(error)
      })
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Show warnings if any
    validation.warnings.forEach((warning) => {
      toast.warning(warning)
    })

    // Process files and add successful ones
    const result = processFiles(fileArray, existingFiles, validationConfig)

    if (result.successful.length > 0) {
      addAttachments(result.successful)
      toast.success(
        `Added ${result.successful.length} file${result.successful.length > 1 ? 's' : ''}`
      )
    }

    // Show errors for failed files
    result.failed.forEach(({ file, error }) => {
      toast.error(`Failed to add ${file.name}: ${error}`)
    })

    // Reset file input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAttachmentClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <FileDropZone disabled={!(selectedAgent || teamId)}>
      {/* File Preview List */}
      <FilePreviewList />
      
      <div className="relative mx-auto mb-1 flex w-full max-w-2xl items-end justify-center gap-x-2 font-geist">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={validationConfig.allowedExtensions.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Select files to attach"
        />
        
        {/* Attachment button */}
        <Button
          onClick={handleAttachmentClick}
          disabled={!(selectedAgent || teamId) || isStreaming}
          size="icon"
          variant="ghost"
          className="rounded-xl p-2 text-primary hover:bg-accent"
          aria-label="Attach files"
          title="Attach files"
        >
          <Icon type="paperclip" color="primary" />
        </Button>

        <TextArea
          placeholder={'Ask anything'}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              !e.nativeEvent.isComposing &&
              !e.shiftKey &&
              !isStreaming
            ) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          className="w-full border border-accent bg-primaryAccent px-4 text-sm text-primary focus:border-accent"
          disabled={!(selectedAgent || teamId)}
          ref={chatInputRef}
        />
        <Button
          onClick={handleSubmit}
          disabled={
            !(selectedAgent || teamId) || !inputMessage.trim() || isStreaming
          }
          size="icon"
          className="rounded-xl bg-primary p-5 text-primaryAccent"
        >
          <Icon type="send" color="primaryAccent" />
        </Button>
      </div>
    </FileDropZone>
  )
}

export default ChatInput
