'use client'
import React, { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/icon'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { cn } from '@/lib/utils'

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void
  onListeningChange?: (isListening: boolean) => void
  onInterimTranscript?: (text: string) => void
  disabled?: boolean
  className?: string
}

export default function VoiceInputButton({
  onTranscript,
  onListeningChange,
  onInterimTranscript,
  disabled = false,
  className
}: VoiceInputButtonProps) {
  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript
  } = useVoiceInput({
    continuous: false,
    language: 'en-US'
  })

  // Notify parent of listening state changes
  useEffect(() => {
    onListeningChange?.(isListening)
  }, [isListening, onListeningChange])

  // Notify parent of interim transcripts
  useEffect(() => {
    if (interimTranscript) {
      onInterimTranscript?.(interimTranscript)
    }
  }, [interimTranscript, onInterimTranscript])

  // Send transcript when listening stops
  useEffect(() => {
    if (!isListening && transcript.trim()) {
      onTranscript(transcript.trim())
      resetTranscript()
    }
  }, [isListening, transcript, onTranscript, resetTranscript])

  const handleClick = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  if (!isSupported) {
    return null
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      size="icon"
      variant="ghost"
      className={cn(
        'rounded-xl p-2 transition-all',
        isListening
          ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 animate-pulse'
          : 'text-primary hover:bg-accent',
        className
      )}
      aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
      title={
        isListening
          ? interimTranscript
            ? `Listening: "${interimTranscript}"`
            : 'Listening... Click to stop'
          : 'Click to speak'
      }
    >
      <Icon type={isListening ? 'mic-off' : 'mic'} />
    </Button>
  )
}
