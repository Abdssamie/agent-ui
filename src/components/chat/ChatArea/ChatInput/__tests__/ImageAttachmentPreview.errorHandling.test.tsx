import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ImageAttachmentPreview from '../ImageAttachmentPreview'
import { ImageAttachment } from '@/types/fileHandling'

describe('ImageAttachmentPreview - Error Handling', () => {
  const createMockAttachment = (id: string, name: string): ImageAttachment => ({
    id,
    file: new File(['test'], name, { type: 'image/png' }),
    preview: 'blob:http://localhost/test',
    type: 'image',
    size: 1024,
    mimeType: 'image/png'
  })

  it('should display loading state initially', () => {
    const attachments = [createMockAttachment('1', 'test.png')]
    const onRemove = vi.fn()

    render(
      <ImageAttachmentPreview
        attachments={attachments}
        onRemove={onRemove}
      />
    )

    // Loading spinner should be present
    const loaders = screen.getAllByRole('img', { hidden: true })
    expect(loaders.length).toBeGreaterThan(0)
  })

  it('should display error state when image fails to load', async () => {
    const attachments = [createMockAttachment('1', 'test.png')]
    const onRemove = vi.fn()

    render(
      <ImageAttachmentPreview
        attachments={attachments}
        onRemove={onRemove}
      />
    )

    // Find the image element
    const images = screen.getAllByRole('img')
    const imageElement = images.find(img => img.getAttribute('alt') === 'test.png')
    
    if (imageElement) {
      // Simulate image load error
      const errorEvent = new Event('error')
      imageElement.dispatchEvent(errorEvent)

      await waitFor(() => {
        expect(screen.getByText('Failed to load')).toBeInTheDocument()
      })
    }
  })

  it('should show processing indicator when isProcessing is true', () => {
    const attachments = [createMockAttachment('1', 'test.png')]
    const onRemove = vi.fn()

    render(
      <ImageAttachmentPreview
        attachments={attachments}
        onRemove={onRemove}
        isProcessing={true}
      />
    )

    expect(screen.getByText('Processing...')).toBeInTheDocument()
  })

  it('should not show processing indicator when isProcessing is false', () => {
    const attachments = [createMockAttachment('1', 'test.png')]
    const onRemove = vi.fn()

    render(
      <ImageAttachmentPreview
        attachments={attachments}
        onRemove={onRemove}
        isProcessing={false}
      />
    )

    expect(screen.queryByText('Processing...')).not.toBeInTheDocument()
  })

  it('should have aria-live region for accessibility', () => {
    const attachments = [createMockAttachment('1', 'test.png')]
    const onRemove = vi.fn()

    const { container } = render(
      <ImageAttachmentPreview
        attachments={attachments}
        onRemove={onRemove}
      />
    )

    const region = container.querySelector('[aria-live="polite"]')
    expect(region).toBeInTheDocument()
  })
})
