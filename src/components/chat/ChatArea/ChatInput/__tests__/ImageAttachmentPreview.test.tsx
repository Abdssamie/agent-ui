import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ImageAttachmentPreview from '../ImageAttachmentPreview'
import React from 'react'
import { ImageAttachment } from '@/types/fileHandling'

describe('ImageAttachmentPreview', () => {
    const mockAttachments: ImageAttachment[] = [
        {
            id: 'img1',
            file: new File(['test'], 'test1.jpg', { type: 'image/jpeg' }),
            preview: 'blob:http://localhost/test1',
            type: 'image',
            size: 1024,
            mimeType: 'image/jpeg',
            width: 800,
            height: 600
        },
        {
            id: 'img2',
            file: new File(['test'], 'test2.png', { type: 'image/png' }),
            preview: 'blob:http://localhost/test2',
            type: 'image',
            size: 2048,
            mimeType: 'image/png'
        }
    ]

    it('renders nothing when no attachments', () => {
        const { container } = render(
            <ImageAttachmentPreview attachments={[]} onRemove={vi.fn()} />
        )
        expect(container.firstChild).toBeNull()
    })

    it('renders image thumbnails', () => {
        render(<ImageAttachmentPreview attachments={mockAttachments} onRemove={vi.fn()} />)

        const images = screen.getAllByRole('img')
        expect(images).toHaveLength(2)
        expect(images[0]).toHaveAttribute('src', 'blob:http://localhost/test1')
        expect(images[1]).toHaveAttribute('src', 'blob:http://localhost/test2')
    })

    it('displays correct attachment count', () => {
        render(<ImageAttachmentPreview attachments={mockAttachments} onRemove={vi.fn()} />)
        expect(screen.getByText('2 images attached')).toBeInTheDocument()
    })

    it('displays singular form for single image', () => {
        render(
            <ImageAttachmentPreview attachments={[mockAttachments[0]]} onRemove={vi.fn()} />
        )
        expect(screen.getByText('1 image attached')).toBeInTheDocument()
    })

    it('calls onRemove when remove button is clicked', () => {
        const onRemove = vi.fn()
        render(<ImageAttachmentPreview attachments={mockAttachments} onRemove={onRemove} />)

        const removeButtons = screen.getAllByRole('button', { name: /remove/i })
        fireEvent.click(removeButtons[0])

        expect(onRemove).toHaveBeenCalledWith('img1')
    })

    it('displays file names', () => {
        render(<ImageAttachmentPreview attachments={mockAttachments} onRemove={vi.fn()} />)

        expect(screen.getByText('test1.jpg')).toBeInTheDocument()
        expect(screen.getByText('test2.png')).toBeInTheDocument()
    })

    it('has horizontal scrolling container', () => {
        const { container } = render(
            <ImageAttachmentPreview attachments={mockAttachments} onRemove={vi.fn()} />
        )

        const scrollContainer = container.querySelector('.overflow-x-auto')
        expect(scrollContainer).toBeInTheDocument()
    })

    it('applies custom className', () => {
        const { container } = render(
            <ImageAttachmentPreview
                attachments={mockAttachments}
                onRemove={vi.fn()}
                className="custom-class"
            />
        )

        expect(container.firstChild).toHaveClass('custom-class')
    })
})
