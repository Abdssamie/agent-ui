import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import KnowledgeReferences from '../KnowledgeReferences'
import type { ReferenceData } from '@/types/os'

describe('KnowledgeReferences', () => {
  const mockReferences: ReferenceData[] = [
    {
      query: 'test query',
      references: [
        {
          content: 'This is the first chunk of content',
          meta_data: {
            chunk: 1,
            chunk_size: 35
          },
          name: 'document1.pdf'
        },
        {
          content: 'This is the second chunk of content',
          meta_data: {
            chunk: 2,
            chunk_size: 36
          },
          name: 'document1.pdf'
        }
      ],
      time: 0.5
    },
    {
      query: 'another query',
      references: [
        {
          content: 'Content from another document',
          meta_data: {
            chunk: 1,
            chunk_size: 29
          },
          name: 'document2.txt'
        }
      ],
      time: 0.3
    }
  ]

  it('should render nothing when references array is empty', () => {
    const { container } = render(<KnowledgeReferences references={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render nothing when references is undefined', () => {
    const { container } = render(<KnowledgeReferences references={undefined as any} />)
    expect(container.firstChild).toBeNull()
  })

  it('should display the correct number of references', () => {
    render(<KnowledgeReferences references={mockReferences} />)
    expect(screen.getByText(/Knowledge Base References \(2\)/i)).toBeInTheDocument()
  })

  it('should display file names for each reference', () => {
    render(<KnowledgeReferences references={mockReferences} />)
    expect(screen.getByText('document1.pdf')).toBeInTheDocument()
    expect(screen.getByText('document2.txt')).toBeInTheDocument()
  })

  it('should display query text for each reference', () => {
    render(<KnowledgeReferences references={mockReferences} />)
    expect(screen.getByText(/Query: "test query"/i)).toBeInTheDocument()
    expect(screen.getByText(/Query: "another query"/i)).toBeInTheDocument()
  })

  it('should display retrieval time for each reference', () => {
    render(<KnowledgeReferences references={mockReferences} />)
    expect(screen.getByText(/Retrieved in 0\.50s/i)).toBeInTheDocument()
    expect(screen.getByText(/Retrieved in 0\.30s/i)).toBeInTheDocument()
  })

  it('should not display retrieval time when time is not provided', () => {
    const referencesWithoutTime: ReferenceData[] = [
      {
        query: 'test query',
        references: [
          {
            content: 'Test content',
            meta_data: {
              chunk: 1,
              chunk_size: 12
            },
            name: 'test.pdf'
          }
        ]
      }
    ]
    render(<KnowledgeReferences references={referencesWithoutTime} />)
    expect(screen.queryByText(/Retrieved in/i)).not.toBeInTheDocument()
  })

  it('should initially hide chunk details', () => {
    render(<KnowledgeReferences references={mockReferences} />)
    expect(screen.queryByText('This is the first chunk of content')).not.toBeInTheDocument()
    expect(screen.queryByText('This is the second chunk of content')).not.toBeInTheDocument()
  })

  it('should show chunk details when "Show chunks" button is clicked', () => {
    render(<KnowledgeReferences references={mockReferences} />)
    
    const showButtons = screen.getAllByText('Show chunks')
    fireEvent.click(showButtons[0])
    
    expect(screen.getByText('This is the first chunk of content')).toBeInTheDocument()
    expect(screen.getByText('This is the second chunk of content')).toBeInTheDocument()
  })

  it('should hide chunk details when "Hide chunks" button is clicked', () => {
    render(<KnowledgeReferences references={mockReferences} />)
    
    const showButtons = screen.getAllByText('Show chunks')
    fireEvent.click(showButtons[0])
    
    expect(screen.getByText('This is the first chunk of content')).toBeInTheDocument()
    
    const hideButton = screen.getByText('Hide chunks')
    fireEvent.click(hideButton)
    
    expect(screen.queryByText('This is the first chunk of content')).not.toBeInTheDocument()
  })

  it('should display chunk metadata correctly', () => {
    render(<KnowledgeReferences references={mockReferences} />)
    
    const showButtons = screen.getAllByText('Show chunks')
    fireEvent.click(showButtons[0])
    
    expect(screen.getByText('Chunk 1')).toBeInTheDocument()
    expect(screen.getByText('Size: 35 chars')).toBeInTheDocument()
    expect(screen.getByText('Chunk 2')).toBeInTheDocument()
    expect(screen.getByText('Size: 36 chars')).toBeInTheDocument()
  })

  it('should handle multiple chunks from the same file', () => {
    render(<KnowledgeReferences references={mockReferences} />)
    
    const showButtons = screen.getAllByText('Show chunks')
    fireEvent.click(showButtons[0])
    
    // Should show both chunks from document1.pdf
    const chunks = screen.getAllByText(/Chunk \d/)
    expect(chunks.length).toBeGreaterThanOrEqual(2)
  })

  it('should display unique file names only once per reference', () => {
    const referencesWithDuplicates: ReferenceData[] = [
      {
        query: 'test',
        references: [
          {
            content: 'Content 1',
            meta_data: { chunk: 1, chunk_size: 9 },
            name: 'same-file.pdf'
          },
          {
            content: 'Content 2',
            meta_data: { chunk: 2, chunk_size: 9 },
            name: 'same-file.pdf'
          },
          {
            content: 'Content 3',
            meta_data: { chunk: 3, chunk_size: 9 },
            name: 'same-file.pdf'
          }
        ]
      }
    ]
    
    render(<KnowledgeReferences references={referencesWithDuplicates} />)
    
    // Should only show the filename once
    const fileNameElements = screen.getAllByText('same-file.pdf')
    expect(fileNameElements).toHaveLength(1)
  })

  it('should handle references with multiple different files', () => {
    const multiFileReferences: ReferenceData[] = [
      {
        query: 'test',
        references: [
          {
            content: 'Content from file 1',
            meta_data: { chunk: 1, chunk_size: 19 },
            name: 'file1.pdf'
          },
          {
            content: 'Content from file 2',
            meta_data: { chunk: 1, chunk_size: 19 },
            name: 'file2.pdf'
          },
          {
            content: 'Content from file 3',
            meta_data: { chunk: 1, chunk_size: 19 },
            name: 'file3.pdf'
          }
        ]
      }
    ]
    
    render(<KnowledgeReferences references={multiFileReferences} />)
    
    expect(screen.getByText('file1.pdf')).toBeInTheDocument()
    expect(screen.getByText('file2.pdf')).toBeInTheDocument()
    expect(screen.getByText('file3.pdf')).toBeInTheDocument()
  })

  it('should preserve whitespace and line breaks in chunk content', () => {
    const referencesWithFormatting: ReferenceData[] = [
      {
        query: 'test',
        references: [
          {
            content: 'Line 1\nLine 2\n  Indented line',
            meta_data: { chunk: 1, chunk_size: 30 },
            name: 'formatted.txt'
          }
        ]
      }
    ]
    
    render(<KnowledgeReferences references={referencesWithFormatting} />)
    
    const showButton = screen.getByText('Show chunks')
    fireEvent.click(showButton)
    
    const contentElement = screen.getByText(/Line 1/)
    expect(contentElement).toHaveClass('whitespace-pre-wrap')
  })

  it('should handle long content with word breaking', () => {
    const referencesWithLongContent: ReferenceData[] = [
      {
        query: 'test',
        references: [
          {
            content: 'verylongwordwithoutspaces'.repeat(10),
            meta_data: { chunk: 1, chunk_size: 250 },
            name: 'long.txt'
          }
        ]
      }
    ]
    
    render(<KnowledgeReferences references={referencesWithLongContent} />)
    
    const showButton = screen.getByText('Show chunks')
    fireEvent.click(showButton)
    
    const contentElement = screen.getByText(/verylongword/)
    expect(contentElement).toHaveClass('break-words')
  })

  it('should have proper accessibility attributes', () => {
    render(<KnowledgeReferences references={mockReferences} />)
    
    const showButtons = screen.getAllByLabelText(/Show chunks/i)
    expect(showButtons.length).toBeGreaterThan(0)
    
    fireEvent.click(showButtons[0])
    
    const hideButton = screen.getByLabelText(/Hide chunks/i)
    expect(hideButton).toBeInTheDocument()
  })

  it('should render references icon', () => {
    const { container } = render(<KnowledgeReferences references={mockReferences} />)
    
    // Check that the icon component is rendered (it should have the references type)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
