import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import ChatInput from '../ChatInput'
import { useStore } from '@/store'
import useAIChatStreamHandler from '@/hooks/useAIStreamHandler'
import { toast } from 'sonner'

// Mock dependencies
vi.mock('@/hooks/useAIStreamHandler')
vi.mock('@/hooks/useImageAttachment', () => ({
  useImageAttachment: () => ({
    imageAttachments: [],
    addImage: vi.fn(),
    removeImage: vi.fn(),
    clearImages: vi.fn(),
    isProcessing: false
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

describe('ChatInput - Message Sending with Image Attachments', () => {
  const mockHandleStreamResponse = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAIChatStreamHandler as any).mockReturnValue({
      handleStreamResponse: mockHandleStreamResponse
    })
    
    // Reset store state
    useStore.setState({
      isStreaming: false,
      chatInputRef: { current: null }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should send message with text only when no image attachments', async () => {
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
  })

  it('should clear message input after successful send', async () => {
    render(<ChatInput />)

    const textarea = screen.getByPlaceholderText('Ask anything') as HTMLTextAreaElement
    const sendButton = screen.getByRole('button', { name: /send message/i })

    fireEvent.change(textarea, { target: { value: 'Test message' } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(mockHandleStreamResponse).toHaveBeenCalled()
    })

    // Message should be cleared
    expect(textarea.value).toBe('')
  })

  it('should handle error during message send gracefully', async () => {
    const error = new Error('Network error')
    mockHandleStreamResponse.mockRejectedValueOnce(error)

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

  it('should restore message on error', async () => {
    const error = new Error('Network error')
    mockHandleStreamResponse.mockRejectedValueOnce(error)

    render(<ChatInput />)

    const textarea = screen.getByPlaceholderText('Ask anything') as HTMLTextAreaElement
    const sendButton = screen.getByRole('button', { name: /send message/i })

    fireEvent.change(textarea, { target: { value: 'Test message' } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })

    // Message should be restored after error
    expect(textarea.value).toBe('Test message')
  })

  it('should disable send button when no message text', () => {
    render(<ChatInput />)

    const sendButton = screen.getByRole('button', { name: /send message/i })
    
    // Button should be disabled when no text
    expect(sendButton).toBeDisabled()
  })

  it('should disable send button when streaming', () => {
    useStore.setState({ isStreaming: true })

    render(<ChatInput />)

    const textarea = screen.getByPlaceholderText('Ask anything')
    const sendButton = screen.getByRole('button', { name: /send message/i })

    fireEvent.change(textarea, { target: { value: 'Test message' } })
    
    // Button should be disabled when streaming
    expect(sendButton).toBeDisabled()
  })

  it('should not send empty messages', async () => {
    render(<ChatInput />)

    const textarea = screen.getByPlaceholderText('Ask anything')
    const sendButton = screen.getByRole('button', { name: /send message/i })

    // Try to send with only whitespace
    fireEvent.change(textarea, { target: { value: '   ' } })
    fireEvent.click(sendButton)

    // Should not call handleStreamResponse
    expect(mockHandleStreamResponse).not.toHaveBeenCalled()
  })

  it('should send message on Enter key press', async () => {
    render(<ChatInput />)

    const textarea = screen.getByPlaceholderText('Ask anything')

    fireEvent.change(textarea, { target: { value: 'Test message' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect(mockHandleStreamResponse).toHaveBeenCalled()
    })
  })

  it('should not send message on Shift+Enter', async () => {
    render(<ChatInput />)

    const textarea = screen.getByPlaceholderText('Ask anything')

    fireEvent.change(textarea, { target: { value: 'Test message' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

    // Should not call handleStreamResponse
    expect(mockHandleStreamResponse).not.toHaveBeenCalled()
  })
})
