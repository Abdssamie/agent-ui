'use client'
import React, { useState, useRef } from 'react'
import { toast } from 'sonner'
import { TextArea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import useAIChatStreamHandler from '@/hooks/useAIStreamHandler'
import { useQueryState } from 'nuqs'
import Icon from '@/components/ui/icon'
import ImageAttachmentPreview from './ImageAttachmentPreview'
import { useImageAttachment } from '@/hooks/useImageAttachment'
import { FILE_VALIDATION } from '@/lib/fileValidation'

const ChatInput = () => {
  const { chatInputRef } = useStore()
  const imageInputRef = useRef<HTMLInputElement>(null)

  const { handleStreamResponse } = useAIChatStreamHandler()
  const [selectedAgent] = useQueryState('agent')
  const [teamId] = useQueryState('team')
  const [, setView] = useQueryState('view')
  const [inputMessage, setInputMessage] = useState('')
  const isStreaming = useStore((state) => state.isStreaming)

  // Image attachment state and actions
  const { imageAttachments, addImage, removeImage, clearImages, isProcessing } = useImageAttachment()

  const handleSubmit = async () => {
    if (!inputMessage.trim()) return

    const currentMessage = inputMessage
    const currentImageAttachments = [...imageAttachments]

    // Clear UI immediately for better UX
    setInputMessage('')
    clearImages()

    try {
      // Create FormData to include message and image attachments
      const formData = new FormData()
      formData.append('message', currentMessage)

      // Add image attachments using the 'files' parameter (matches API spec)
      if (currentImageAttachments.length > 0) {
        currentImageAttachments.forEach((img) => {
          formData.append('files', img.file)
        })
      }

      // Pass attachments for preview in user message
      // Documents don't have preview (empty string), but we still need to pass them for display
      const validAttachments = currentImageAttachments.filter(img => img && img.file)
      await handleStreamResponse(formData, validAttachments.length > 0 ? validAttachments : undefined)
    } catch (error) {
      // Restore message and images on error
      setInputMessage(currentMessage)
      currentImageAttachments.forEach((img) => {
        addImage(img.file).catch(console.error)
      })
      
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error(`Failed to send message: ${errorMessage}`)
      console.error('Error in handleSubmit:', error)
    }
  }

  const handleKnowledgeBaseClick = () => {
    setView('knowledge')
  }

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) {
      // User cancelled file selection
      return
    }

    const fileArray = Array.from(files)

    // Add each image using the hook
    for (const file of fileArray) {
      await addImage(file)
    }

    // Reset file input to allow selecting the same file again
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

  const handleImageAttachmentClick = () => {
    imageInputRef.current?.click()
  }

  return (
    <>
      {/* Processing indicator */}
      {isProcessing && (
        <div className="mx-auto mb-2 flex w-full max-w-2xl items-center gap-2 text-xs text-muted-foreground px-2">
          <Icon type="loader" className="h-3 w-3 animate-spin" />
          <span>Processing files...</span>
        </div>
      )}

      {/* File Attachment Preview - for images and documents that will be sent with message */}
      <ImageAttachmentPreview
        attachments={imageAttachments}
        onRemove={removeImage}
        isProcessing={isProcessing}
      />

      <div className="relative mx-auto mb-1 flex w-full max-w-2xl items-end justify-center gap-x-2 font-geist">
        {/* Hidden file input for image attachments */}
        <input
          ref={imageInputRef}
          type="file"
          multiple
          accept={[
            ...FILE_VALIDATION.images.allowedExtensions,
            ...FILE_VALIDATION.documents.allowedExtensions
          ].join(',')}
          onChange={handleImageSelect}
          className="hidden"
          aria-label="Select files to attach (images or documents)"
        />

        {/* Knowledge Base Navigation button */}
        <Button
          onClick={handleKnowledgeBaseClick}
          disabled={!(selectedAgent || teamId) || isStreaming}
          size="icon"
          variant="ghost"
          className="rounded-xl p-2 text-primary hover:bg-accent"
          aria-label="Go to Knowledge Base"
          title="Go to Knowledge Base"
        >
          <Icon type="database" color="primary" />
        </Button>

        {/* File Attachment button */}
        <Button
          onClick={handleImageAttachmentClick}
          disabled={!(selectedAgent || teamId) || isStreaming || isProcessing}
          size="icon"
          variant="ghost"
          className="rounded-xl p-2 text-primary hover:bg-accent"
          aria-label="Attach File"
          title="Attach File (Images or PDFs)"
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
            !(selectedAgent || teamId) ||
            !inputMessage.trim() ||
            isStreaming ||
            isProcessing
          }
          size="icon"
          className="rounded-xl bg-primary p-5 text-primaryAccent"
          title={
            isProcessing
              ? 'Processing images...'
              : 'Send message'
          }
        >
          <Icon type="send" color="primaryAccent" />
        </Button>
      </div>
    </>
  )
}

export default ChatInput
