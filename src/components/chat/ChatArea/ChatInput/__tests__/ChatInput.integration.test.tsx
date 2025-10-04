import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ChatInput from '../ChatInput'
import { useStore } from '@/store'
import * as agnoKnowledgeAPI from '@/api/agnoKnowledge'

// Mock dependencies
vi.mock('@/api/agnoKnowledge')
vi.mock('@/hooks/useAIStreamHandler', () => ({
  default: () => ({
    handleStreamResponse: vi.fn().mockResolvedValue(undefined)
  })
}))
vi.mock('nuqs', () => ({
  useQueryState: (key: string) => {
    if (key === 'agent') return ['test-agent', vi.fn()]
    if (key === 'team') return [null, vi.fn()]
    return [null, vi.fn()]
  }
}))
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}))

describe('ChatInput - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset store state
    useStore.setState({
      attachments: [],
      isUploading: false,
      uploadProgress: {},
      knowledgeContents: [],
      selectedEndpoint: 'http://localhost:7777',
      chatInputRef: { current: null },
      isStreaming: false,
      messages: [],
      validationConfig: {
        maxFileSize: 10 * 1024 * 1024,
        maxTotalSize: 50 * 1024 * 1024,
        maxFileCount: 10,
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.txt']
      }
    })
  })

  const createMockFile = (name: string, size: number, type: string): File => {
    return new File(['test content'], name, { type })
  }

  it('should render file drop zone and preview list', () => {
    render(<ChatInput />)
    
    // Verify file input exists
    const fileInput = screen.getByLabelText('Select files to attach')
    expect(fileInput).toBeTruthy()
    
    // Verify attach button exists
    const attachButton = screen.getByLabelText('Attach files')
    expect(attachButton).toBeTruthy()
  })

  it('should add file to attachments when selected', async () => {
    vi.mocked(agnoKnowledgeAPI.uploadContentAPI).mockResolvedValue({
      id: 'knowledge-123',
      status: 'completed' as const,
      name: 'test.pdf'
    })

    render(<ChatInput />)

    const fileInput = screen.getByLabelText('Select files to attach') as HTMLInputElement
    const mockFile = createMockFile('test.pdf', 1024, 'application/pdf')

    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false
    })
    fireEvent.change(fileInput)

    // Wait for file to be added
    await waitFor(() => {
      const state = useStore.getState()
      expect(state.attachments).toHaveLength(1)
      expect(state.attachments[0].file.name).toBe('test.pdf')
    })
  })

  it('should upload file to knowledge base automatically', async () => {
    vi.mocked(agnoKnowledgeAPI.uploadContentAPI).mockResolvedValue({
      id: 'knowledge-abc',
      status: 'completed' as const,
      name: 'document.pdf'
    })

    render(<ChatInput />)

    const fileInput = screen.getByLabelText('Select files to attach') as HTMLInputElement
    const mockFile = createMockFile('document.pdf', 2048, 'application/pdf')

    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false
    })
    fireEvent.change(fileInput)

    // Wait for upload to complete
    await waitFor(
      () => {
        const state = useStore.getState()
        expect(state.attachments[0]?.uploadStatus).toBe('completed')
        expect(state.attachments[0]?.knowledgeId).toBe('knowledge-abc')
      },
      { timeout: 5000 }
    )

    // Verify API was called
    expect(agnoKnowledgeAPI.uploadContentAPI).toHaveBeenCalled()
  })

  it('should display upload progress', async () => {
    vi.mocked(agnoKnowledgeAPI.uploadContentAPI).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({
        id: 'knowledge-123',
        status: 'completed' as const,
        name: 'test.pdf'
      }), 1000))
    )

    render(<ChatInput />)

    const fileInput = screen.getByLabelText('Select files to attach') as HTMLInputElement
    const mockFile = createMockFile('test.pdf', 1024, 'application/pdf')

    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false
    })
    fireEvent.change(fileInput)

    // Wait for upload to start
    await waitFor(() => {
      const state = useStore.getState()
      expect(state.attachments[0]?.uploadStatus).toBe('uploading')
    })

    // Verify progress is tracked
    await waitFor(() => {
      const state = useStore.getState()
      expect(state.attachments[0]?.progress).toBeGreaterThan(0)
    })
  })

  it('should handle multiple file uploads', async () => {
    vi.mocked(agnoKnowledgeAPI.uploadContentAPI)
      .mockResolvedValueOnce({
        id: 'knowledge-1',
        status: 'completed' as const,
        name: 'file1.pdf'
      })
      .mockResolvedValueOnce({
        id: 'knowledge-2',
        status: 'completed' as const,
        name: 'file2.pdf'
      })

    render(<ChatInput />)

    const fileInput = screen.getByLabelText('Select files to attach') as HTMLInputElement
    
    // Add first file
    const mockFile1 = createMockFile('file1.pdf', 1024, 'application/pdf')
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile1],
      writable: false,
      configurable: true
    })
    fireEvent.change(fileInput)

    await waitFor(() => {
      const state = useStore.getState()
      expect(state.attachments).toHaveLength(1)
    })

    // Add second file
    const mockFile2 = createMockFile('file2.pdf', 2048, 'application/pdf')
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile2],
      writable: false,
      configurable: true
    })
    fireEvent.change(fileInput)

    // Wait for both files
    await waitFor(() => {
      const state = useStore.getState()
      expect(state.attachments).toHaveLength(2)
    })

    // Wait for both uploads to complete
    await waitFor(
      () => {
        const state = useStore.getState()
        const completed = state.attachments.filter(a => a.uploadStatus === 'completed')
        expect(completed).toHaveLength(2)
      },
      { timeout: 5000 }
    )
  })

  it('should handle upload failures', async () => {
    vi.mocked(agnoKnowledgeAPI.uploadContentAPI).mockRejectedValue(
      new Error('Network error')
    )

    render(<ChatInput />)

    const fileInput = screen.getByLabelText('Select files to attach') as HTMLInputElement
    const mockFile = createMockFile('test.pdf', 1024, 'application/pdf')

    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false
    })
    fireEvent.change(fileInput)

    // Wait for upload to fail
    await waitFor(
      () => {
        const state = useStore.getState()
        expect(state.attachments[0]?.uploadStatus).toBe('error')
        expect(state.attachments[0]?.error).toBeTruthy()
      },
      { timeout: 5000 }
    )
  })

  it('should store knowledge content after successful upload', async () => {
    vi.mocked(agnoKnowledgeAPI.uploadContentAPI).mockResolvedValue({
      id: 'knowledge-xyz',
      status: 'completed' as const,
      name: 'document.pdf'
    })

    render(<ChatInput />)

    const fileInput = screen.getByLabelText('Select files to attach') as HTMLInputElement
    const mockFile = createMockFile('document.pdf', 1024, 'application/pdf')

    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false
    })
    fireEvent.change(fileInput)

    // Wait for knowledge content to be stored
    await waitFor(
      () => {
        const state = useStore.getState()
        expect(state.knowledgeContents).toHaveLength(1)
        expect(state.knowledgeContents[0].id).toBe('knowledge-xyz')
      },
      { timeout: 5000 }
    )
  })

  it('should include session metadata in uploads', async () => {
    vi.mocked(agnoKnowledgeAPI.uploadContentAPI).mockResolvedValue({
      id: 'knowledge-123',
      status: 'completed' as const,
      name: 'test.pdf'
    })

    render(<ChatInput />)

    const fileInput = screen.getByLabelText('Select files to attach') as HTMLInputElement
    const mockFile = createMockFile('test.pdf', 1024, 'application/pdf')

    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false
    })
    fireEvent.change(fileInput)

    // Wait for upload
    await waitFor(
      () => {
        const state = useStore.getState()
        expect(state.attachments[0]?.uploadStatus).toBe('completed')
      },
      { timeout: 5000 }
    )

    // Verify session_id was included
    expect(agnoKnowledgeAPI.uploadContentAPI).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          session_id: 'test-agent'
        })
      }),
      'http://localhost:7777'
    )
  })

  it('should validate and reject invalid file types', async () => {
    render(<ChatInput />)

    const fileInput = screen.getByLabelText('Select files to attach') as HTMLInputElement
    const invalidFile = createMockFile('script.exe', 1000, 'application/x-msdownload')

    Object.defineProperty(fileInput, 'files', {
      value: [invalidFile],
      writable: false
    })
    fireEvent.change(fileInput)

    // Wait and verify file was not added
    await waitFor(() => {
      const state = useStore.getState()
      expect(state.attachments).toHaveLength(0)
    })
  })

  it('should validate and reject oversized files', async () => {
    render(<ChatInput />)

    const fileInput = screen.getByLabelText('Select files to attach') as HTMLInputElement
    // Create a file larger than 10MB
    const oversizedFile = new File(
      [new ArrayBuffer(11 * 1024 * 1024)],
      'huge.pdf',
      { type: 'application/pdf' }
    )

    Object.defineProperty(fileInput, 'files', {
      value: [oversizedFile],
      writable: false
    })
    fireEvent.change(fileInput)

    // Wait and verify file was not added
    await waitFor(() => {
      const state = useStore.getState()
      expect(state.attachments).toHaveLength(0)
    })
  })
})
