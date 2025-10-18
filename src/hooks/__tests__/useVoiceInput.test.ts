import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useVoiceInput } from '../useVoiceInput'

// Mock SpeechRecognition
class MockSpeechRecognition {
  continuous = false
  interimResults = false
  lang = 'en-US'
  maxAlternatives = 1
  onresult: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  onend: (() => void) | null = null
  onstart: (() => void) | null = null

  start() {
    if (this.onstart) {
      this.onstart()
    }
  }

  stop() {
    if (this.onend) {
      this.onend()
    }
  }

  abort() {
    if (this.onend) {
      this.onend()
    }
  }

  // Helper method for testing
  simulateResult(transcript: string, isFinal: boolean = true) {
    if (this.onresult) {
      const event = {
        resultIndex: 0,
        results: [
          {
            0: { transcript, confidence: 0.9 },
            isFinal,
            length: 1,
            item: (index: number) => ({ transcript, confidence: 0.9 })
          }
        ]
      }
      this.onresult(event)
    }
  }

  simulateError(error: string) {
    if (this.onerror) {
      this.onerror({ error, message: `Error: ${error}` })
    }
  }
}

describe('useVoiceInput', () => {
  let mockRecognition: MockSpeechRecognition

  beforeEach(() => {
    mockRecognition = new MockSpeechRecognition()
    ;(global as any).SpeechRecognition = vi.fn(() => mockRecognition)
    ;(global as any).webkitSpeechRecognition = vi.fn(() => mockRecognition)
  })

  afterEach(() => {
    delete (global as any).SpeechRecognition
    delete (global as any).webkitSpeechRecognition
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useVoiceInput())

    expect(result.current.isListening).toBe(false)
    expect(result.current.isSupported).toBe(true)
    expect(result.current.transcript).toBe('')
    expect(result.current.interimTranscript).toBe('')
    expect(result.current.error).toBe(null)
  })

  it('should detect browser support', () => {
    const { result } = renderHook(() => useVoiceInput())
    expect(result.current.isSupported).toBe(true)
  })

  it('should detect lack of browser support', () => {
    delete (global as any).SpeechRecognition
    delete (global as any).webkitSpeechRecognition

    const { result } = renderHook(() => useVoiceInput())
    expect(result.current.isSupported).toBe(false)
  })

  it('should start listening', () => {
    const { result } = renderHook(() => useVoiceInput())

    act(() => {
      result.current.startListening()
    })

    expect(result.current.isListening).toBe(true)
  })

  it('should stop listening', () => {
    const { result } = renderHook(() => useVoiceInput())

    act(() => {
      result.current.startListening()
    })

    expect(result.current.isListening).toBe(true)

    act(() => {
      result.current.stopListening()
    })

    expect(result.current.isListening).toBe(false)
  })

  it('should capture final transcript', async () => {
    const { result } = renderHook(() => useVoiceInput())

    act(() => {
      result.current.startListening()
    })

    act(() => {
      mockRecognition.simulateResult('hello world', true)
    })

    await waitFor(() => {
      expect(result.current.transcript).toContain('hello world')
    })
  })

  it('should capture interim transcript', async () => {
    const { result } = renderHook(() => useVoiceInput())

    act(() => {
      result.current.startListening()
    })

    act(() => {
      mockRecognition.simulateResult('hello', false)
    })

    await waitFor(() => {
      expect(result.current.interimTranscript).toBe('hello')
    })
  })

  it('should call onTranscript callback with final transcript', async () => {
    const onTranscript = vi.fn()
    const { result } = renderHook(() => useVoiceInput({ onTranscript }))

    act(() => {
      result.current.startListening()
    })

    act(() => {
      mockRecognition.simulateResult('test message', true)
    })

    await waitFor(() => {
      expect(onTranscript).toHaveBeenCalledWith('test message', true)
    })
  })

  it('should call onTranscript callback with interim transcript', async () => {
    const onTranscript = vi.fn()
    const { result } = renderHook(() => useVoiceInput({ onTranscript }))

    act(() => {
      result.current.startListening()
    })

    act(() => {
      mockRecognition.simulateResult('test', false)
    })

    await waitFor(() => {
      expect(onTranscript).toHaveBeenCalledWith('test', false)
    })
  })

  it('should handle errors', async () => {
    const onError = vi.fn()
    const { result } = renderHook(() => useVoiceInput({ onError }))

    act(() => {
      result.current.startListening()
    })

    act(() => {
      mockRecognition.simulateError('network')
    })

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
      expect(onError).toHaveBeenCalled()
      expect(result.current.isListening).toBe(false)
    })
  })

  it('should reset transcript', () => {
    const { result } = renderHook(() => useVoiceInput())

    act(() => {
      result.current.startListening()
    })

    act(() => {
      mockRecognition.simulateResult('test', true)
    })

    act(() => {
      result.current.resetTranscript()
    })

    expect(result.current.transcript).toBe('')
    expect(result.current.interimTranscript).toBe('')
  })

  it('should use custom language', () => {
    renderHook(() => useVoiceInput({ language: 'es-ES' }))
    expect(mockRecognition.lang).toBe('es-ES')
  })

  it('should use continuous mode when specified', () => {
    renderHook(() => useVoiceInput({ continuous: true }))
    expect(mockRecognition.continuous).toBe(true)
  })

  it('should accumulate multiple final transcripts', async () => {
    const { result } = renderHook(() => useVoiceInput())

    act(() => {
      result.current.startListening()
    })

    act(() => {
      mockRecognition.simulateResult('hello', true)
    })

    act(() => {
      mockRecognition.simulateResult('world', true)
    })

    await waitFor(() => {
      expect(result.current.transcript).toContain('hello')
      expect(result.current.transcript).toContain('world')
    })
  })

  it('should not start if not supported', () => {
    delete (global as any).SpeechRecognition
    delete (global as any).webkitSpeechRecognition

    const { result } = renderHook(() => useVoiceInput())

    act(() => {
      result.current.startListening()
    })

    expect(result.current.isListening).toBe(false)
    expect(result.current.error).toBeTruthy()
  })

  it('should cleanup on unmount', () => {
    const stopSpy = vi.spyOn(mockRecognition, 'stop')
    const { unmount } = renderHook(() => useVoiceInput())

    unmount()

    expect(stopSpy).toHaveBeenCalled()
  })
})
