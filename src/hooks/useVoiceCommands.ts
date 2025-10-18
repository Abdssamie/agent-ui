import { useCallback } from 'react'

export interface VoiceCommand {
  trigger: string | RegExp
  action: (match?: RegExpMatchArray) => void
  description: string
}

interface UseVoiceCommandsOptions {
  commands: VoiceCommand[]
  onUnmatchedCommand?: (text: string) => void
}

/**
 * Hook for detecting and executing voice commands
 * Supports pattern matching for natural language commands
 */
export function useVoiceCommands({ commands, onUnmatchedCommand }: UseVoiceCommandsOptions) {
  const processTranscript = useCallback(
    (transcript: string) => {
      const normalizedText = transcript.toLowerCase().trim()

      // Try to match against each command
      for (const command of commands) {
        if (typeof command.trigger === 'string') {
          // Simple string matching
          if (normalizedText.includes(command.trigger.toLowerCase())) {
            command.action()
            return true
          }
        } else {
          // Regex matching
          const match = normalizedText.match(command.trigger)
          if (match) {
            command.action(match)
            return true
          }
        }
      }

      // No command matched
      onUnmatchedCommand?.(transcript)
      return false
    },
    [commands, onUnmatchedCommand]
  )

  return { processTranscript }
}

/**
 * Pre-built voice commands for common OPC actions
 */
export const createOPCVoiceCommands = (actions: {
  onGenerateLeads?: (query: string) => void
  onCreateContent?: (topic: string) => void
  onResearch?: (topic: string) => void
  onNewChat?: () => void
  onClearChat?: () => void
}): VoiceCommand[] => {
  const commands: VoiceCommand[] = []

  if (actions.onGenerateLeads) {
    commands.push({
      trigger: /(?:hey opc|okay opc|opc)?,?\s*(?:generate|find|get|search for)\s+leads?\s+(?:for|about)?\s*(.+)/i,
      action: (match) => {
        const query = match?.[1]?.trim() || 'my business'
        actions.onGenerateLeads!(query)
      },
      description: 'Generate leads for [topic]'
    })
  }

  if (actions.onCreateContent) {
    commands.push({
      trigger: /(?:hey opc|okay opc|opc)?,?\s*(?:create|write|generate)\s+(?:content|post|article)\s+(?:about|on|for)?\s*(.+)/i,
      action: (match) => {
        const topic = match?.[1]?.trim() || 'my business'
        actions.onCreateContent!(topic)
      },
      description: 'Create content about [topic]'
    })
  }

  if (actions.onResearch) {
    commands.push({
      trigger: /(?:hey opc|okay opc|opc)?,?\s*(?:research|find information about|tell me about)\s+(.+)/i,
      action: (match) => {
        const topic = match?.[1]?.trim() || ''
        actions.onResearch!(topic)
      },
      description: 'Research [topic]'
    })
  }

  if (actions.onNewChat) {
    commands.push({
      trigger: /(?:hey opc|okay opc|opc)?,?\s*(?:new chat|start new conversation|clear conversation)/i,
      action: () => actions.onNewChat!(),
      description: 'Start a new chat'
    })
  }

  if (actions.onClearChat) {
    commands.push({
      trigger: /(?:hey opc|okay opc|opc)?,?\s*(?:clear chat|delete messages|reset)/i,
      action: () => actions.onClearChat!(),
      description: 'Clear the current chat'
    })
  }

  return commands
}
