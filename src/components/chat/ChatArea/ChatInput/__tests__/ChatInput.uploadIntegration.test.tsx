import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ChatInput from '../ChatInput'
import { useStore } from '@/store'
import * as agnoKnowledgeAPI from '@/api/agnoKnowledge'

// Mock dependencies
vi.mock('@/api/agnoKnowledge', () => ({
    uploadContentAPI: vi.fn()
}))

vi.mock('@/hooks/useAIStreamHandler', () => ({
    default: () => ({
        handleStreamResponse: vi.fn()
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

describe('ChatInput - Upload Integration', () => {
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
            validationConfig: {
                maxFileSize: 10 * 1024 * 1024,
                maxTotalSize: 50 * 1024 * 1024,
                maxFileCount: 10,
                allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
                allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png']
            }
        })
    })

    const createMockFile = (name: string, size: number, type: string): File => {
        return new File(['test content'], name, { type })
    }

    it('should automatically upload files when added', async () => {
        const mockResponse = {
            id: 'knowledge-123',
            status: 'completed' as const,
            name: 'test.pdf'
        }

        vi.mocked(agnoKnowledgeAPI.uploadContentAPI).mockResolvedValue(mockResponse)

        render(<ChatInput />)

        // Find the hidden file input
        const fileInput = screen.getByLabelText('Select files to attach') as HTMLInputElement

        // Create a mock file
        const mockFile = createMockFile('test.pdf', 1024, 'application/pdf')

        // Simulate file selection
        Object.defineProperty(fileInput, 'files', {
            value: [mockFile],
            writable: false
        })
        fireEvent.change(fileInput)

        // Wait for the file to be added to attachments
        await waitFor(() => {
            const state = useStore.getState()
            expect(state.attachments).toHaveLength(1)
        })

        // Wait for upload to complete
        await waitFor(
            () => {
                const state = useStore.getState()
                const attachment = state.attachments[0]
                expect(attachment.uploadStatus).toBe('completed')
                expect(attachment.knowledgeId).toBe('knowledge-123')
            },
            { timeout: 3000 }
        )

        // Verify API was called
        expect(agnoKnowledgeAPI.uploadContentAPI).toHaveBeenCalledWith(
            expect.objectContaining({
                file: mockFile,
                name: 'test.pdf',
                metadata: expect.objectContaining({
                    filename: 'test.pdf',
                    source: 'chat-upload',
                    user_context: 'chat-interface'
                })
            }),
            'http://localhost:7777'
        )

        // Verify knowledge content was added
        const state = useStore.getState()
        expect(state.knowledgeContents).toHaveLength(1)
        expect(state.knowledgeContents[0].id).toBe('knowledge-123')
    })

    it('should handle upload failures gracefully', async () => {
        const mockError = new Error('Network error')
        vi.mocked(agnoKnowledgeAPI.uploadContentAPI).mockRejectedValue(mockError)

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
                const attachment = state.attachments[0]
                expect(attachment.uploadStatus).toBe('error')
                expect(attachment.error).toBe('Network error')
            },
            { timeout: 3000 }
        )

        // Verify no knowledge content was added
        const state = useStore.getState()
        expect(state.knowledgeContents).toHaveLength(0)
    })

    it('should upload multiple files sequentially', async () => {
        const mockResponse1 = {
            id: 'knowledge-1',
            status: 'completed' as const,
            name: 'test1.pdf'
        }
        const mockResponse2 = {
            id: 'knowledge-2',
            status: 'completed' as const,
            name: 'test2.pdf'
        }

        vi.mocked(agnoKnowledgeAPI.uploadContentAPI)
            .mockResolvedValueOnce(mockResponse1)
            .mockResolvedValueOnce(mockResponse2)

        render(<ChatInput />)

        const fileInput = screen.getByLabelText('Select files to attach') as HTMLInputElement
        const mockFile1 = createMockFile('test1.pdf', 1024, 'application/pdf')
        const mockFile2 = createMockFile('test2.pdf', 2048, 'application/pdf')

        // Upload first file
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

        // Upload second file
        Object.defineProperty(fileInput, 'files', {
            value: [mockFile2],
            writable: false,
            configurable: true
        })
        fireEvent.change(fileInput)

        await waitFor(() => {
            const state = useStore.getState()
            expect(state.attachments).toHaveLength(2)
        })

        // Wait for both uploads to complete
        await waitFor(
            () => {
                const state = useStore.getState()
                const completedCount = state.attachments.filter(
                    (a) => a.uploadStatus === 'completed'
                ).length
                expect(completedCount).toBe(2)
            },
            { timeout: 5000 }
        )

        // Verify both knowledge contents were added
        const state = useStore.getState()
        expect(state.knowledgeContents).toHaveLength(2)
        expect(state.knowledgeContents.map((c) => c.id)).toEqual([
            'knowledge-1',
            'knowledge-2'
        ])
    })

    it('should track upload progress', async () => {
        const mockResponse = {
            id: 'knowledge-123',
            status: 'completed' as const,
            name: 'test.pdf'
        }

        vi.mocked(agnoKnowledgeAPI.uploadContentAPI).mockResolvedValue(mockResponse)

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
            const attachment = state.attachments[0]
            expect(attachment.uploadStatus).toBe('uploading')
        })

        // Verify progress is being tracked
        await waitFor(
            () => {
                const state = useStore.getState()
                const attachment = state.attachments[0]
                expect(attachment.progress).toBeDefined()
            },
            { timeout: 3000 }
        )

        // Wait for completion
        await waitFor(
            () => {
                const state = useStore.getState()
                const attachment = state.attachments[0]
                expect(attachment.uploadStatus).toBe('completed')
                expect(attachment.progress).toBe(100)
            },
            { timeout: 3000 }
        )
    })

    it('should include session metadata in upload', async () => {
        const mockResponse = {
            id: 'knowledge-123',
            status: 'completed' as const,
            name: 'test.pdf'
        }

        vi.mocked(agnoKnowledgeAPI.uploadContentAPI).mockResolvedValue(mockResponse)

        render(<ChatInput />)

        const fileInput = screen.getByLabelText('Select files to attach') as HTMLInputElement
        const mockFile = createMockFile('test.pdf', 1024, 'application/pdf')

        Object.defineProperty(fileInput, 'files', {
            value: [mockFile],
            writable: false
        })
        fireEvent.change(fileInput)

        // Wait for upload to complete
        await waitFor(
            () => {
                const state = useStore.getState()
                const attachment = state.attachments[0]
                expect(attachment.uploadStatus).toBe('completed')
            },
            { timeout: 3000 }
        )

        // Verify session_id was included in metadata
        expect(agnoKnowledgeAPI.uploadContentAPI).toHaveBeenCalledWith(
            expect.objectContaining({
                metadata: expect.objectContaining({
                    session_id: 'test-agent'
                })
            }),
            'http://localhost:7777'
        )
    })
})
