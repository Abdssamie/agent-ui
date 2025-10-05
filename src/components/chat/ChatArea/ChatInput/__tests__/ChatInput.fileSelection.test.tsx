import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useStore } from '@/store'
import ChatInput from '../ChatInput'
import { toast } from 'sonner'

// Mock dependencies
vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        warning: vi.fn(),
        success: vi.fn()
    }
}))

const mockAddImage = vi.fn()
const mockRemoveImage = vi.fn()
const mockClearImages = vi.fn()

vi.mock('@/hooks/useImageAttachment', () => ({
    useImageAttachment: () => ({
        imageAttachments: [],
        addImage: mockAddImage,
        removeImage: mockRemoveImage,
        clearImages: mockClearImages,
        isProcessing: false
    })
}))

vi.mock('@/hooks/useAIStreamHandler', () => ({
    default: () => ({
        handleStreamResponse: vi.fn()
    })
}))

const mockSetView = vi.fn()

vi.mock('nuqs', () => ({
    useQueryState: (key: string) => {
        if (key === 'agent') return ['test-agent', mockSetView]
        if (key === 'team') return [null, vi.fn()]
        if (key === 'view') return [null, mockSetView]
        return [null, vi.fn()]
    }
}))

// Helper function to create mock File objects
function createMockFile(
    name: string,
    size: number,
    type: string
): File {
    const file = new File([''], name, { type })
    Object.defineProperty(file, 'size', { value: size })
    return file
}

describe('ChatInput - Image Attachment', () => {
    beforeEach(() => {
        // Reset store state
        useStore.setState({
            isStreaming: false,
            chatInputRef: { current: null }
        })

        // Clear all mocks
        vi.clearAllMocks()
        mockAddImage.mockClear()
        mockRemoveImage.mockClear()
        mockClearImages.mockClear()
        mockSetView.mockClear()
    })

    it('should render knowledge base navigation and image attachment buttons', () => {
        render(<ChatInput />)

        const knowledgeButton = screen.getByLabelText('Go to Knowledge Base')
        expect(knowledgeButton).toBeInTheDocument()
        
        const imageButton = screen.getByLabelText('Attach Image')
        expect(imageButton).toBeInTheDocument()
    })

    it('should have hidden file input for images with correct attributes', () => {
        render(<ChatInput />)
        
        const imageInput = screen.getByLabelText('Select images to attach') as HTMLInputElement
        expect(imageInput).toBeInTheDocument()
        expect(imageInput.type).toBe('file')
        expect(imageInput.multiple).toBe(true)
        expect(imageInput.accept).toContain('.jpg')
        expect(imageInput.accept).toContain('.png')
        expect(imageInput).toHaveClass('hidden')
    })

    it('should navigate to knowledge base when database button is clicked', () => {
        render(<ChatInput />)

        const knowledgeButton = screen.getByLabelText('Go to Knowledge Base')
        fireEvent.click(knowledgeButton)

        expect(mockSetView).toHaveBeenCalledWith('knowledge')
    })

    it('should add valid image files', async () => {
        render(<ChatInput />)

        const fileInput = screen.getByLabelText('Select images to attach') as HTMLInputElement
        const validFile = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg') // 1MB

        fireEvent.change(fileInput, {
            target: { files: [validFile] }
        })

        await waitFor(() => {
            expect(mockAddImage).toHaveBeenCalledWith(validFile)
        })
    })

    it('should add multiple valid image files', async () => {
        render(<ChatInput />)

        const fileInput = screen.getByLabelText('Select images to attach') as HTMLInputElement
        const files = [
            createMockFile('test1.jpg', 1024 * 1024, 'image/jpeg'),
            createMockFile('test2.png', 2 * 1024 * 1024, 'image/png')
        ]

        fireEvent.change(fileInput, {
            target: { files }
        })

        await waitFor(() => {
            expect(mockAddImage).toHaveBeenCalledTimes(2)
            expect(mockAddImage).toHaveBeenCalledWith(files[0])
            expect(mockAddImage).toHaveBeenCalledWith(files[1])
        })
    })

    it('should handle cancellation (no files selected)', async () => {
        render(<ChatInput />)

        const fileInput = screen.getByLabelText('Select images to attach') as HTMLInputElement

        fireEvent.change(fileInput, {
            target: { files: null }
        })

        // Should not call addImage
        expect(mockAddImage).not.toHaveBeenCalled()
    })

    it('should reset file input after selection', async () => {
        render(<ChatInput />)

        const fileInput = screen.getByLabelText('Select images to attach') as HTMLInputElement
        const validFile = createMockFile('test.jpg', 1024, 'image/jpeg')

        fireEvent.change(fileInput, {
            target: { files: [validFile] }
        })

        await waitFor(() => {
            expect(fileInput.value).toBe('')
        })
    })

    it('should disable attachment buttons when streaming', () => {
        useStore.setState({ isStreaming: true })

        render(<ChatInput />)

        const knowledgeButton = screen.getByLabelText('Go to Knowledge Base')
        expect(knowledgeButton).toBeDisabled()
        
        const imageButton = screen.getByLabelText('Attach Image')
        expect(imageButton).toBeDisabled()
    })

    it('should open file dialog when image attachment button is clicked', () => {
        render(<ChatInput />)

        const fileInput = screen.getByLabelText('Select images to attach') as HTMLInputElement
        const clickSpy = vi.spyOn(fileInput, 'click')

        const imageButton = screen.getByLabelText('Attach Image')
        fireEvent.click(imageButton)

        expect(clickSpy).toHaveBeenCalled()
    })
})
