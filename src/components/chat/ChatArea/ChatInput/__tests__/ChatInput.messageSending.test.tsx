import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import ChatInput from '../ChatInput'
import { useStore } from '@/store'
import useAIChatStreamHandler from '@/hooks/useAIStreamHandler'
import { toast } from 'sonner'

// Mock dependencies
vi.mock('@/hooks/useAIStreamHandler')
vi.mock('@/hooks/useFileUpload', () => ({
  useFileUpload: () => ({
    uploadFile: vi.fn(),
    uploadAllFiles: vi.fn(),
    retryFailedUpload: vi.fn(),
    getUploadStats: vi.fn(() => ({
      total: 0,
      pending: 0,
      uploading: 0,
      completed: 0,
      failed: 0,
      hasFailedUploads: false,
      hasPendingUploads: false,
      isAllCompleted: false
    }))
  })
}))
vi.mock('sonner')
vi.mock('nuqs', () => ({
  useQueryState: (key: string) => {
    if (key === 'agent') return ['test-agent-id', vi.fn()]
    if (key === 'team') return [null, vi.fn()]
    return [null, vi.fn()]
  }
}))

describe('ChatInput - Message Sending with Attachments', () => {
  const mockHandleStreamResponse = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAIChatStreamHandler as any).mockReturnValue({
      handleStreamResponse: mockHandleStreamResponse
    })
    
    // Reset store state
    useStore.setState({
      attachments: [],
      isStreaming: false,
      chatInputRef: { current: null }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should send message with text only when no attachments', async () => {
    render(<ChatInput />)

    const textarea = screen.getByPlaceholderText('Ask anything')
    const sendButton = screen.getByRole('button', { name: /send message/i })

    fireEvent.change(textarea, { target: { value: 'Hello AI' } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(mockHandleStreamResponse).toHaveBeenCalledWith(
        expect.any(FormData)
      )
    })

    const formData = mockHandleStreamResponse.mock.calls[0][0] as FormData
    expect(formData.get('message')).toBe('Hello AI')
    expect(formData.get('knowledge_ids')).toBeNull()
  })

  it('should include knowledge IDs when sending message with completed uploads', async () => {
    // Set up attachments with completed uploads
    useStore.setState({
      attachments: [
        {
          id: 'attachment-1',
          file: new File(['content'], 'test1.pdf', { type: 'application/pdf' }),
          uploadStatus: 'completed',
          knowledgeId: 'knowledge-id-1'
        },
        {
          id: 'attachment-2',
          file: new File(['content'], 'test2.txt', { type: 'text/plain' }),
          uploadStatus: 'completed',
          knowledgeId: 'knowledge-id-2'
        }
      ]
    })

    render(<ChatInput />)

    const textarea = screen.getByPlaceholderText('Ask anything')
    const sendButton = screen.getByRole('button', { name: /send message/i })

    fireEvent.change(textarea, { target: { value: 'Analyze these files' } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(mockHandleStreamResponse).toHaveBeenCalled()
    })

    const formData = mockHandleStreamResponse.mock.calls[0][0] as FormData
    expect(formData.get('message')).toBe('Analyze these files')
    
    const knowledgeIds = JSON.parse(formData.get('knowledge_ids') as string)
    expect(knowledgeIds).toEqual(['knowledge-id-1', 'knowledge-id-2'])
    
    const attachmentMetadata = JSON.parse(formData.get('attachment_metadata') as string)
    expect(attachmentMetadata).toHaveLength(2)
    expect(attachmentMetadata[0]).toMatchObject({
      id: 'attachment-1',
      filename: 'test1.pdf',
      knowledgeId: 'knowledge-id-1'
    })
  })

  it('should prevent sending when uploads are in progress', async () => {
    useStore.setState({
      attachments: [
        {
          id: 'attachment-1',
          file: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
          uploadStatus: 'uploading',
          progress: 50
        }
      ]
    })

    render(<ChatInput />)

    const textarea = screen.getByPlaceholderText('Ask anything')
    const sendButton = screen.getByTitle('Waiting for uploads to complete...')

    fireEvent.change(textarea, { target: { value: 'Test message' } })
    
    // Button should be disabled
    expect(sendButton).toBeDisabled()
    
    fireEvent.click(sendButton)

    // Should not call handleStreamResponse
    expect(mockHandleStreamResponse).not.toHaveBeenCalled()
  })

  it('should show error and prevent sending when uploads have failed', async () => {
    useStore.setState({
      attachments: [
        {
          id: 'attachment-1',
          file: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
          uploadStatus: 'error',
          error: 'Upload failed'
        }
      ]
    })

    render(<ChatInput />)

    const textarea = screen.getByPlaceholderText('Ask anything')
    const sendButton = screen.getByRole('button', { name: /send message/i })

    fireEvent.change(textarea, { target: { value: 'Test message' } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('failed to upload')
      )
    })

    expect(mockHandleStreamResponse).not.toHaveBeenCalled()
  })

  it('should disable send button when uploads are pending', async () => {
    useStore.setState({
      attachments: [
        {
          id: 'attachment-1',
          file: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
          uploadStatus: 'pending'
        }
      ]
    })

    render(<ChatInput />)

    const textarea = screen.getByPlaceholderText('Ask anything')
    const sendButton = screen.getByTitle('Waiting for uploads to complete...')

    fireEvent.change(textarea, { target: { value: 'Test message' } })
    
    // Button should be disabled when uploads are pending
    expect(sendButton).toBeDisabled()
    
    // Clicking disabled button should not trigger handler
    fireEvent.click(sendButton)
    expect(mockHandleStreamResponse).not.toHaveBeenCalled()
  })

  it('should clear attachments after successful message send', async () => {
    useStore.setState({
      attachments: [
        {
          id: 'attachment-1',
          file: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
          uploadStatus: 'completed',
          knowledgeId: 'knowledge-id-1'
        }
      ]
    })

    render(<ChatInput />)

    const textarea = screen.getByPlaceholderText('Ask anything')
    const sendButton = screen.getByRole('button', { name: /send message/i })

    fireEvent.change(textarea, { target: { value: 'Test message' } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(mockHandleStreamResponse).toHaveBeenCalled()
    })

    // Attachments should be cleared
    expect(useStore.getState().attachments).toHaveLength(0)
  })

  it('should handle mixed attachment states correctly', async () => {
    useStore.setState({
      attachments: [
        {
          id: 'attachment-1',
          file: new File(['content'], 'test1.pdf', { type: 'application/pdf' }),
          uploadStatus: 'completed',
          knowledgeId: 'knowledge-id-1'
        },
        {
          id: 'attachment-2',
          file: new File(['content'], 'test2.pdf', { type: 'application/pdf' }),
          uploadStatus: 'completed',
          knowledgeId: 'knowledge-id-2'
        },
        {
          id: 'attachment-3',
          file: new File(['content'], 'test3.pdf', { type: 'application/pdf' }),
          uploadStatus: 'completed'
          // No knowledgeId - should be filtered out
        }
      ]
    })

    render(<ChatInput />)

    const textarea = screen.getByPlaceholderText('Ask anything')
    const sendButton = screen.getByRole('button', { name: /send message/i })

    fireEvent.change(textarea, { target: { value: 'Test message' } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(mockHandleStreamResponse).toHaveBeenCalled()
    })

    const formData = mockHandleStreamResponse.mock.calls[0][0] as FormData
    const knowledgeIds = JSON.parse(formData.get('knowledge_ids') as string)
    
    // Should only include attachments with knowledgeId
    expect(knowledgeIds).toEqual(['knowledge-id-1', 'knowledge-id-2'])
  })

  it('should show tooltip on send button when uploads are in progress', async () => {
    useStore.setState({
      attachments: [
        {
          id: 'attachment-1',
          file: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
          uploadStatus: 'uploading',
          progress: 50
        }
      ]
    })

    render(<ChatInput />)

    const sendButton = screen.getByTitle('Waiting for uploads to complete...')
    
    expect(sendButton).toHaveAttribute('title', 'Waiting for uploads to complete...')
    expect(sendButton).toBeDisabled()
  })

  it('should handle error during message send gracefully', async () => {
    const error = new Error('Network error')
    mockHandleStreamResponse.mockRejectedValueOnce(error)
    
    useStore.setState({
      attachments: [
        {
          id: 'attachment-1',
          file: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
          uploadStatus: 'completed',
          knowledgeId: 'knowledge-id-1'
        }
      ]
    })

    render(<ChatInput />)

    const textarea = screen.getByPlaceholderText('Ask anything')
    const sendButton = screen.getByRole('button', { name: /send message/i })

    fireEvent.change(textarea, { target: { value: 'Test message' } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Network error')
      )
    })
  })
})
