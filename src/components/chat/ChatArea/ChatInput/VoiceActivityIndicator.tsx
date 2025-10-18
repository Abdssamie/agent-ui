'use client'
import React from 'react'
import { cn } from '@/lib/utils'

interface VoiceActivityIndicatorProps {
  isListening: boolean
  transcript?: string
  className?: string
}

export default function VoiceActivityIndicator({
  isListening,
  transcript,
  className
}: VoiceActivityIndicatorProps) {
  if (!isListening && !transcript) {
    return null
  }

  return (
    <div
      className={cn(
        'mx-auto mb-2 flex w-full max-w-2xl items-center gap-3 rounded-lg border border-accent bg-primaryAccent px-4 py-3 transition-all',
        isListening && 'border-red-500/30 bg-red-500/5',
        className
      )}
    >
      {/* Animated microphone indicator */}
      {isListening && (
        <div className="flex items-center gap-2">
          <div className="relative flex h-8 w-8 items-center justify-center">
            {/* Pulsing circles */}
            <div className="absolute h-8 w-8 animate-ping rounded-full bg-red-500/30" />
            <div className="absolute h-6 w-6 animate-pulse rounded-full bg-red-500/50" />
            <div className="relative h-4 w-4 rounded-full bg-red-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-red-500">Listening...</span>
            {transcript && (
              <span className="text-xs text-muted-foreground">
                {transcript.length > 50 ? transcript.slice(0, 50) + '...' : transcript}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Transcript display when not listening */}
      {!isListening && transcript && (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
            <svg
              className="h-4 w-4 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="flex-1">
            <span className="text-xs font-medium text-green-500">Voice input captured</span>
            <p className="text-sm text-primary">{transcript}</p>
          </div>
        </div>
      )}
    </div>
  )
}
