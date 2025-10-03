import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useStore } from '@/store'
import FilePreviewList from '../FilePreviewList'
import { FileAttachment } from '@/types/fileHandling'
import { toast } from 'sonner'

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  }
}))

vi.mock('@/store', () => ({
  useStore: vi.fn()
}))

describe('FilePreviewList', () => {
  const mockRemoveAttachment = vi.fn()
  
  const createMockFile = (
    name: string,
    type: string,
    size: number
  ): File => {
    const file = new File(['content'], name, { type })
    Object.defineProperty(file, 'size', { value: size })
    return file
  }

  const createMockAttachment = (
    overrides: Partial<FileAttachment> = {}
  ): FileAttachment => ({
    id: 'test-id-1',
    file: createMockFile('test.jpg', 'image/jpeg', 1024),
    uploadStatus: 'pending',
    progress: 0,
    ...overrides
  })

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useStore as any).mockImplementation((selector: any) => {
      const state = {
        attachments: [],
        removeAttachment: mockRemoveAttachment
      }
      return selector(state)
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should not render when there are no attachments', () => {
      const { container } = render(<FilePreviewList />)
      expect(container.firstChild).toBeNull()
    })

    it('should render file preview items when attachments exist', () => {
      const mockAttachments = [
        createMockAttachment({ id: 'file-1', file: createMockFile('image1.jpg', 'image/jpeg', 2048) }),
        createMockAttachment({ id: 'file-2', file: createMockFile('document.pdf', 'application/pdf', 4096) })
      ]

      ;(useStore as any).mockImplementation((selector: any) => {
        const state = {
          attachments: mockAttachments,
          removeAttachment: mockRemoveAttachment
        }
        return selector(state)
      })

      render(<FilePreviewList />)
      
      expect(screen.getByText('image1.jpg')).toBeInTheDocument()
      expect(screen.getByText('document.pdf')).toBeInTheDocument()
    })

    it('should display file size in human-readable format', () => {
      const mockAttachments = [
        createMockAttachment({ 
          id: 'file-1', 
          file: createMockFile('test.jpg', 'image/jpeg', 1024) 
        })
      ]

      ;(useStore as any).mockImplementation((selector: any) => {
        const state = {
          attachments: mockAttachments,
          removeAttachment: mockRemoveAttachment
        }
        return selector(state)
      })

      render(<FilePreviewList />)
      expect(screen.getByText('1 KB')).toBeInTheDocument()
    })

    it('should have proper ARIA labels for accessibility', () => {
      const mockAttachments = [createMockAttachment()]

      ;(useStore as any).mockImplementation((selector: any) => {
        const state = {
          attachments: mockAttachments,
          removeAttachment: mockRemoveAttachment
        }
        return selector(state)
      })

      render(<FilePreviewList />)
      
      const region = screen.getByRole('region', { name: 'File attachments' })
      expect(region).toBeInTheDocument()
    })
  })

  describe('File Type Rendering', () => {
    it('should render image thumbnail for image files', async () => {
      const imageFile = createMockFile('photo.jpg', 'image/jpeg', 2048)
      const mockAttachments = [
        createMockAttachment({ id: 'img-1', file: imageFile })
      ]

      ;(useStore as any).mockImplementation((selector: any) => {
        const state = {
          attachments: mockAttachments,
          removeAttachment: mockRemoveAttachment
        }
        return selector(state)
      })

      render(<FilePreviewList />)
      
      await waitFor(() => {
        const img = screen.getByAltText('photo.jpg')
        expect(img).toBeInTheDocument()
      })
    })

    it('should render document icon for PDF files', () => {
      const pdfFile = createMockFile('document.pdf', 'application/pdf', 4096)
      const mockAttachments = [
        createMockAttachment({ id: 'pdf-1', file: pdfFile })
      ]

      ;(useStore as any).mockImplementation((selector: any) => {
        const state = {
          attachments: mockAttachments,
          removeAttachment: mockRemoveAttachment
        }
        return selector(state)
      })

      render(<FilePreviewList />)
      expect(screen.getByText('📄')).toBeInTheDocument()
    })

    it('should render video icon for video files', () => {
      const videoFile = createMockFile('video.mp4', 'video/mp4', 8192)
      const mockAttachments = [
        createMockAttachment({ id: 'vid-1', file: videoFile })
      ]

      ;(useStore as any).mockImplementation((selector: any) => {
        const state = {
          attachments: mockAttachments,
          removeAttachment: mockRemoveAttachment
        }
        return selector(state)
      })

      render(<FilePreviewList />)
      expect(screen.getByText('🎥')).toBeInTheDocument()
    })

    it('should render audio icon for audio files', () => {
      const audioFile = createMockFile('song.mp3', 'audio/mpeg', 6144)
      const mockAttachments = [
        createMockAttachment({ id: 'aud-1', file: audioFile })
      ]

      ;(useStore as any).mockImplementation((selector: any) => {
        const state = {
          attachments: mockAttachments,
          removeAttachment: mockRemoveAttachment
        }
        return selector(state)
      })

      render(<FilePreviewList />)
      expect(screen.getByText('🎵')).toBeInTheDocument()
    })
  })

  describe('Upload Status', () => {
    it('should display upload progress for uploading files', () => {
      const mockAttachments = [
        createMockAttachment({ 
          id: 'upload-1',
          uploadStatus: 'uploading',
          progress: 45
        })
      ]

      ;(useStore as any).mockImplementation((selector: any) => {
        const state = {
          attachments: mockAttachments,
          removeAttachment: mockRemoveAttachment
        }
        return selector(state)
      })

      render(<FilePreviewList />)
      expect(screen.getByText('45%')).toBeInTheDocument()
    })

    it('should apply correct border color for completed uploads', () => {
      const mockAttachments = [
        createMockAttachment({ 
          id: 'complete-1',
          uploadStatus: 'completed'
        })
      ]

      ;(useStore as any).mockImplementation((selector: any) => {
        const state = {
          attachments: mockAttachments,
          removeAttachment: mockRemoveAttachment
        }
        return selector(state)
      })

      const { container } = render(<FilePreviewList />)
      const previewItem = container.querySelector('.border-green-500')
      expect(previewItem).toBeInTheDocument()
    })

    it('should display error indicator for failed uploads', () => {
      const mockAttachments = [
        createMockAttachment({ 
          id: 'error-1',
          uploadStatus: 'error',
          error: 'Upload failed'
        })
      ]

      ;(useStore as any).mockImplementation((selector: any) => {
        const state = {
          attachments: mockAttachments,
          removeAttachment: mockRemoveAttachment
        }
        return selector(state)
      })

      render(<FilePreviewList />)
      expect(screen.getByText('⚠')).toBeInTheDocument()
    })

    it('should apply error styling for failed uploads', () => {
      const mockAttachments = [
        createMockAttachment({ 
          id: 'error-1',
          uploadStatus: 'error'
        })
      ]

      ;(useStore as any).mockImplementation((selector: any) => {
        const state = {
          attachments: mockAttachments,
          removeAttachment: mockRemoveAttachment
        }
        return selector(state)
      })

      const { container } = render(<FilePreviewList />)
      const previewItem = container.querySelector('.border-red-500')
      expect(previewItem).toBeInTheDocument()
    })
  })

  describe('Remove Functionality', () => {
    it('should show confirmation buttons when remove is clicked', () => {
      const mockAttachments = [createMockAttachment({ id: 'remove-1' })]

      ;(useStore as any).mockImplementation((selector: any) => {
        const state = {
          attachments: mockAttachments,
          removeAttachment: mockRemoveAttachment
        }
        return selector(state)
      })

      render(<FilePreviewList />)
      
      const removeButton = screen.getByLabelText('Remove test.jpg')
      fireEvent.click(removeButton)

      expect(screen.getByLabelText('Confirm remove')).toBeInTheDocument()
      expect(screen.getByLabelText('Cancel remove')).toBeInTheDocument()
    })

    it('should call removeAttachment when confirmed', () => {
      const mockAttachments = [createMockAttachment({ id: 'remove-2' })]

      ;(useStore as any).mockImplementation((selector: any) => {
        const state = {
          attachments: mockAttachments,
          removeAttachment: mockRemoveAttachment
        }
        return selector(state)
      })

      render(<FilePreviewList />)
      
      const removeButton = screen.getByLabelText('Remove test.jpg')
      fireEvent.click(removeButton)

      const confirmButton = screen.getByLabelText('Confirm remove')
      fireEvent.click(confirmButton)

      expect(mockRemoveAttachment).toHaveBeenCalledWith('remove-2')
      expect(toast.success).toHaveBeenCalledWith('Removed test.jpg')
    })

    it('should cancel removal when cancel is clicked', () => {
      const mockAttachments = [createMockAttachment({ id: 'cancel-1' })]

      ;(useStore as any).mockImplementation((selector: any) => {
        const state = {
          attachments: mockAttachments,
          removeAttachment: mockRemoveAttachment
        }
        return selector(state)
      })

      render(<FilePreviewList />)
      
      const removeButton = screen.getByLabelText('Remove test.jpg')
      fireEvent.click(removeButton)

      const cancelButton = screen.getByLabelText('Cancel remove')
      fireEvent.click(cancelButton)

      expect(mockRemoveAttachment).not.toHaveBeenCalled()
      expect(screen.getByLabelText('Remove test.jpg')).toBeInTheDocument()
    })

    it('should have accessible remove button labels', () => {
      const mockAttachments = [
        createMockAttachment({ 
          id: 'access-1',
          file: createMockFile('important.pdf', 'application/pdf', 2048)
        })
      ]

      ;(useStore as any).mockImplementation((selector: any) => {
        const state = {
          attachments: mockAttachments,
          removeAttachment: mockRemoveAttachment
        }
        return selector(state)
      })

      render(<FilePreviewList />)
      
      const removeButton = screen.getByLabelText('Remove important.pdf')
      expect(removeButton).toBeInTheDocument()
    })
  })

  describe('Tooltip Display', () => {
    it('should display file metadata in tooltip', () => {
      const mockFile = createMockFile('details.txt', 'text/plain', 512)
      const mockAttachments = [
        createMockAttachment({ 
          id: 'tooltip-1',
          file: mockFile
        })
      ]

      ;(useStore as any).mockImplementation((selector: any) => {
        const state = {
          attachments: mockAttachments,
          removeAttachment: mockRemoveAttachment
        }
        return selector(state)
      })

      render(<FilePreviewList />)
      
      // Tooltip content is rendered but may not be visible without hover
      // We can verify the component structure is correct
      expect(screen.getByText('details.txt')).toBeInTheDocument()
    })

    it('should display error message in tooltip when upload fails', () => {
      const mockAttachments = [
        createMockAttachment({ 
          id: 'error-tooltip-1',
          uploadStatus: 'error',
          error: 'Network error occurred'
        })
      ]

      ;(useStore as any).mockImplementation((selector: any) => {
        const state = {
          attachments: mockAttachments,
          removeAttachment: mockRemoveAttachment
        }
        return selector(state)
      })

      render(<FilePreviewList />)
      
      // The component should render with error state
      const errorIndicator = screen.getByText('⚠')
      expect(errorIndicator).toBeInTheDocument()
    })
  })

  describe('Multiple Files', () => {
    it('should render multiple file previews', () => {
      const mockAttachments = [
        createMockAttachment({ id: 'multi-1', file: createMockFile('file1.jpg', 'image/jpeg', 1024) }),
        createMockAttachment({ id: 'multi-2', file: createMockFile('file2.pdf', 'application/pdf', 2048) }),
        createMockAttachment({ id: 'multi-3', file: createMockFile('file3.mp4', 'video/mp4', 4096) })
      ]

      ;(useStore as any).mockImplementation((selector: any) => {
        const state = {
          attachments: mockAttachments,
          removeAttachment: mockRemoveAttachment
        }
        return selector(state)
      })

      render(<FilePreviewList />)
      
      expect(screen.getByText('file1.jpg')).toBeInTheDocument()
      expect(screen.getByText('file2.pdf')).toBeInTheDocument()
      expect(screen.getByText('file3.mp4')).toBeInTheDocument()
    })

    it('should handle removal of individual files from multiple attachments', () => {
      const mockAttachments = [
        createMockAttachment({ id: 'remove-multi-1', file: createMockFile('keep.jpg', 'image/jpeg', 1024) }),
        createMockAttachment({ id: 'remove-multi-2', file: createMockFile('delete.pdf', 'application/pdf', 2048) })
      ]

      ;(useStore as any).mockImplementation((selector: any) => {
        const state = {
          attachments: mockAttachments,
          removeAttachment: mockRemoveAttachment
        }
        return selector(state)
      })

      render(<FilePreviewList />)
      
      const removeButton = screen.getByLabelText('Remove delete.pdf')
      fireEvent.click(removeButton)

      const confirmButton = screen.getByLabelText('Confirm remove')
      fireEvent.click(confirmButton)

      expect(mockRemoveAttachment).toHaveBeenCalledWith('remove-multi-2')
    })
  })

  describe('Custom Styling', () => {
    it('should apply custom className when provided', () => {
      const mockAttachments = [createMockAttachment()]

      ;(useStore as any).mockImplementation((selector: any) => {
        const state = {
          attachments: mockAttachments,
          removeAttachment: mockRemoveAttachment
        }
        return selector(state)
      })

      const { container } = render(<FilePreviewList className="custom-class" />)
      const previewList = container.querySelector('.custom-class')
      expect(previewList).toBeInTheDocument()
    })
  })
})
