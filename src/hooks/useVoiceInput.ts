import { useState, useRef, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

interface VoiceInputOptions {
  onTranscript?: (transcript: string, isFinal: boolean) => void
  onError?: (error: Error) => void
  language?: string
  continuous?: boolean
}

interface VoiceInputReturn {
  isListening: boolean
  isSupported: boolean
  transcript: string
  interimTranscript: string
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
  error: Error | null
}

/**
 * Hook for voice input using Web Speech API
 * Provides real-time speech-to-text transcription
 */
export function useVoiceInput(options: VoiceInputOptions = {}): VoiceInputReturn {
  const {
    onTranscript,
    onError,
    language = 'en-US',
    continuous = true
  } = options

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<Error | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = 
      window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (SpeechRecognition) {
      setIsSupported(true)
      recognitionRef.current = new SpeechRecognition()
      
      const recognition = recognitionRef.current
      recognition.continuous = continuous
      recognition.interimResults = true
      recognition.lang = language
      recognition.maxAlternatives = 1

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimText = ''
        let finalText = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const text = result[0].transcript

          if (result.isFinal) {
            finalText += text
          } else {
            interimText += text
          }
        }

        if (finalText) {
          setTranscript(prev => prev + finalText + ' ')
          onTranscript?.(finalText, true)
        }

        setInterimTranscript(interimText)
        if (interimText) {
          onTranscript?.(interimText, false)
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const error = new Error(`Speech recognition error: ${event.error}`)
        setError(error)
        setIsListening(false)
        onError?.(error)
        
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          toast.error(`Voice input error: ${event.error}`)
        }
      }

      recognition.onend = () => {
        setIsListening(false)
      }
    } else {
      setIsSupported(false)
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [language, continuous, onTranscript, onError])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      const error = new Error('Speech recognition not supported')
      setError(error)
      toast.error('Voice input is not supported in your browser')
      return
    }

    try {
      setError(null)
      recognitionRef.current.start()
      setIsListening(true)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start voice input')
      setError(error)
      toast.error(error.message)
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }, [isListening])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
  }, [])

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    error
  }
}
