import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import VoiceInputButton from '../VoiceInputButton'
import * as useVoiceInputModule from '@/hooks/useVoiceInput'

// Mock the useVoiceInput hook
vi.mock('@/hooks/useVoiceInput', () => ({
  useVoiceInput: vi.fn()
}))

describe('VoiceInputButton', () => {
  const mockOnTranscript = vi.fn()
  const mockStartListening = vi.fn()
  const mockStopListening = vi.fn()
  const mockResetTranscript = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Set default mock implementation
    vi.mocked(useVoiceInputModule.useVoiceInput).mockReturnValue({
      isListening: false,
      isSupported: true,
      transcript: '',
      interimTranscript: '',
      startListening: mockStartListening,
      stopListening: mockStopListening,
      resetTranscript: mockResetTranscript,
      error: null
    })
  })

  it('should render the button when supported', () => {
    render(<VoiceInputButton onTranscript={mockOnTranscript} />)
    
    const button = screen.getByRole('button', { name: /start voice input/i })
    expect(button).toBeInTheDocument()
  })

  it('should not render when not supported', () => {
    vi.mocked(useVoiceInputModule.useVoiceInput).mockReturnValue({
      isListening: false,
      isSupported: false,
      transcript: '',
      interimTranscript: '',
      startListening: mockStartListening,
      stopListening: mockStopListening,
      resetTranscript: mockResetTranscript,
      error: null
    })

    const { container } = render(<VoiceInputButton onTranscript={mockOnTranscript} />)
    expect(container.firstChild).toBeNull()
  })

  it('should show mic icon when not listening', () => {
    render(<VoiceInputButton onTranscript={mockOnTranscript} />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Start voice input')
  })

  it('should show mic-off icon when listening', () => {
    vi.mocked(useVoiceInputModule.useVoiceInput).mockReturnValue({
      isListening: true,
      isSupported: true,
      transcript: '',
      interimTranscript: 'speaking...',
      startListening: mockStartListening,
      stopListening: mockStopListening,
      resetTranscript: mockResetTranscript,
      error: null
    })

    render(<VoiceInputButton onTranscript={mockOnTranscript} />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Stop voice input')
  })

  it('should call startListening when clicked while not listening', () => {
    render(<VoiceInputButton onTranscript={mockOnTranscript} />)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(mockStartListening).toHaveBeenCalledTimes(1)
  })

  it('should call stopListening when clicked while listening', () => {
    vi.mocked(useVoiceInputModule.useVoiceInput).mockReturnValue({
      isListening: true,
      isSupported: true,
      transcript: '',
      interimTranscript: '',
      startListening: mockStartListening,
      stopListening: mockStopListening,
      resetTranscript: mockResetTranscript,
      error: null
    })

    render(<VoiceInputButton onTranscript={mockOnTranscript} />)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(mockStopListening).toHaveBeenCalledTimes(1)
  })

  it('should be disabled when disabled prop is true', () => {
    render(<VoiceInputButton onTranscript={mockOnTranscript} disabled={true} />)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('should apply custom className', () => {
    render(<VoiceInputButton onTranscript={mockOnTranscript} className="custom-class" />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('should show interim transcript in title when listening', () => {
    vi.mocked(useVoiceInputModule.useVoiceInput).mockReturnValue({
      isListening: true,
      isSupported: true,
      transcript: '',
      interimTranscript: 'hello world',
      startListening: mockStartListening,
      stopListening: mockStopListening,
      resetTranscript: mockResetTranscript,
      error: null
    })

    render(<VoiceInputButton onTranscript={mockOnTranscript} />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('title', 'Listening: "hello world"')
  })

  it('should call onTranscript when transcript is available and listening stops', async () => {
    const mockResetTranscript = vi.fn()
    const { useVoiceInput } = await import('@/hooks/useVoiceInput')
    
    // First render - listening with transcript
    const { rerender } = render(<VoiceInputButton onTranscript={mockOnTranscript} />)
    
    // Simulate listening stopped with transcript
    vi.mocked(useVoiceInput).mockReturnValue({
      isListening: false,
      isSupported: true,
      transcript: 'test transcript',
      interimTranscript: '',
      startListening: vi.fn(),
      stopListening: vi.fn(),
      resetTranscript: mockResetTranscript,
      error: null
    })
    
    rerender(<VoiceInputButton onTranscript={mockOnTranscript} />)

    await waitFor(() => {
      expect(mockOnTranscript).toHaveBeenCalledWith('test transcript')
      expect(mockResetTranscript).toHaveBeenCalled()
    })
  })

  it('should call onListeningChange when listening state changes', async () => {
    const mockOnListeningChange = vi.fn()
    const { useVoiceInput } = await import('@/hooks/useVoiceInput')
    
    vi.mocked(useVoiceInput).mockReturnValue({
      isListening: true,
      isSupported: true,
      transcript: '',
      interimTranscript: '',
      startListening: vi.fn(),
      stopListening: vi.fn(),
      resetTranscript: vi.fn(),
      error: null
    })

    render(
      <VoiceInputButton 
        onTranscript={mockOnTranscript} 
        onListeningChange={mockOnListeningChange}
      />
    )

    await waitFor(() => {
      expect(mockOnListeningChange).toHaveBeenCalledWith(true)
    })
  })

  it('should call onInterimTranscript when interim text changes', async () => {
    const mockOnInterimTranscript = vi.fn()
    const { useVoiceInput } = await import('@/hooks/useVoiceInput')
    
    vi.mocked(useVoiceInput).mockReturnValue({
      isListening: true,
      isSupported: true,
      transcript: '',
      interimTranscript: 'speaking',
      startListening: vi.fn(),
      stopListening: vi.fn(),
      resetTranscript: vi.fn(),
      error: null
    })

    render(
      <VoiceInputButton 
        onTranscript={mockOnTranscript} 
        onInterimTranscript={mockOnInterimTranscript}
      />
    )

    await waitFor(() => {
      expect(mockOnInterimTranscript).toHaveBeenCalledWith('speaking')
    })
  })

  it('should have pulsing animation when listening', async () => {
    const { useVoiceInput } = await import('@/hooks/useVoiceInput')
    vi.mocked(useVoiceInput).mockReturnValue({
      isListening: true,
      isSupported: true,
      transcript: '',
      interimTranscript: '',
      startListening: vi.fn(),
      stopListening: vi.fn(),
      resetTranscript: vi.fn(),
      error: null
    })

    render(<VoiceInputButton onTranscript={mockOnTranscript} />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('animate-pulse')
  })
})
