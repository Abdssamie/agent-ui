import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useVoiceCommands, createOPCVoiceCommands } from '../useVoiceCommands'
import type { VoiceCommand } from '../useVoiceCommands'

describe('useVoiceCommands', () => {
  it('should match simple string trigger', () => {
    const mockAction = vi.fn()
    const commands: VoiceCommand[] = [
      {
        trigger: 'hello',
        action: mockAction,
        description: 'Say hello'
      }
    ]

    const { result } = renderHook(() =>
      useVoiceCommands({ commands })
    )

    const matched = result.current.processTranscript('hello world')
    expect(matched).toBe(true)
    expect(mockAction).toHaveBeenCalledTimes(1)
  })

  it('should match regex trigger', () => {
    const mockAction = vi.fn()
    const commands: VoiceCommand[] = [
      {
        trigger: /generate leads for (.+)/i,
        action: mockAction,
        description: 'Generate leads'
      }
    ]

    const { result } = renderHook(() =>
      useVoiceCommands({ commands })
    )

    const matched = result.current.processTranscript('generate leads for my business')
    expect(matched).toBe(true)
    expect(mockAction).toHaveBeenCalledWith(
      expect.arrayContaining(['generate leads for my business', 'my business'])
    )
  })

  it('should call onUnmatchedCommand when no command matches', () => {
    const mockUnmatched = vi.fn()
    const commands: VoiceCommand[] = [
      {
        trigger: 'hello',
        action: vi.fn(),
        description: 'Say hello'
      }
    ]

    const { result } = renderHook(() =>
      useVoiceCommands({ commands, onUnmatchedCommand: mockUnmatched })
    )

    const matched = result.current.processTranscript('goodbye')
    expect(matched).toBe(false)
    expect(mockUnmatched).toHaveBeenCalledWith('goodbye')
  })

  it('should be case insensitive', () => {
    const mockAction = vi.fn()
    const commands: VoiceCommand[] = [
      {
        trigger: 'HELLO',
        action: mockAction,
        description: 'Say hello'
      }
    ]

    const { result } = renderHook(() =>
      useVoiceCommands({ commands })
    )

    result.current.processTranscript('hello')
    expect(mockAction).toHaveBeenCalled()
  })

  it('should trim whitespace from transcript', () => {
    const mockAction = vi.fn()
    const commands: VoiceCommand[] = [
      {
        trigger: 'hello',
        action: mockAction,
        description: 'Say hello'
      }
    ]

    const { result } = renderHook(() =>
      useVoiceCommands({ commands })
    )

    result.current.processTranscript('  hello  ')
    expect(mockAction).toHaveBeenCalled()
  })

  it('should stop at first matching command', () => {
    const mockAction1 = vi.fn()
    const mockAction2 = vi.fn()
    const commands: VoiceCommand[] = [
      {
        trigger: 'test',
        action: mockAction1,
        description: 'First test'
      },
      {
        trigger: 'test',
        action: mockAction2,
        description: 'Second test'
      }
    ]

    const { result } = renderHook(() =>
      useVoiceCommands({ commands })
    )

    result.current.processTranscript('test')
    expect(mockAction1).toHaveBeenCalledTimes(1)
    expect(mockAction2).not.toHaveBeenCalled()
  })
})

describe('createOPCVoiceCommands', () => {
  it('should create generate leads command', () => {
    const mockGenerateLeads = vi.fn()
    const commands = createOPCVoiceCommands({
      onGenerateLeads: mockGenerateLeads
    })

    expect(commands.length).toBeGreaterThan(0)
    expect(commands[0].description).toContain('leads')
  })

  it('should match "generate leads for" pattern', () => {
    const mockGenerateLeads = vi.fn()
    const commands = createOPCVoiceCommands({
      onGenerateLeads: mockGenerateLeads
    })

    const { result } = renderHook(() =>
      useVoiceCommands({ commands })
    )

    result.current.processTranscript('generate leads for my SaaS product')
    // Text is normalized to lowercase
    expect(mockGenerateLeads).toHaveBeenCalledWith('my saas product')
  })

  it('should match "hey opc generate leads" pattern', () => {
    const mockGenerateLeads = vi.fn()
    const commands = createOPCVoiceCommands({
      onGenerateLeads: mockGenerateLeads
    })

    const { result } = renderHook(() =>
      useVoiceCommands({ commands })
    )

    result.current.processTranscript('hey opc generate leads for AI consulting')
    // Text is normalized to lowercase
    expect(mockGenerateLeads).toHaveBeenCalledWith('ai consulting')
  })

  it('should create content creation command', () => {
    const mockCreateContent = vi.fn()
    const commands = createOPCVoiceCommands({
      onCreateContent: mockCreateContent
    })

    const { result } = renderHook(() =>
      useVoiceCommands({ commands })
    )

    result.current.processTranscript('create content about productivity')
    expect(mockCreateContent).toHaveBeenCalledWith('productivity')
  })

  it('should create research command', () => {
    const mockResearch = vi.fn()
    const commands = createOPCVoiceCommands({
      onResearch: mockResearch
    })

    const { result } = renderHook(() =>
      useVoiceCommands({ commands })
    )

    result.current.processTranscript('research AI trends')
    // Text is normalized to lowercase
    expect(mockResearch).toHaveBeenCalledWith('ai trends')
  })

  it('should create new chat command', () => {
    const mockNewChat = vi.fn()
    const commands = createOPCVoiceCommands({
      onNewChat: mockNewChat
    })

    const { result } = renderHook(() =>
      useVoiceCommands({ commands })
    )

    result.current.processTranscript('new chat')
    expect(mockNewChat).toHaveBeenCalled()
  })

  it('should create clear chat command', () => {
    const mockClearChat = vi.fn()
    const commands = createOPCVoiceCommands({
      onClearChat: mockClearChat
    })

    const { result } = renderHook(() =>
      useVoiceCommands({ commands })
    )

    result.current.processTranscript('clear chat')
    expect(mockClearChat).toHaveBeenCalled()
  })

  it('should handle multiple commands together', () => {
    const mockGenerateLeads = vi.fn()
    const mockCreateContent = vi.fn()
    const mockResearch = vi.fn()

    const commands = createOPCVoiceCommands({
      onGenerateLeads: mockGenerateLeads,
      onCreateContent: mockCreateContent,
      onResearch: mockResearch
    })

    expect(commands.length).toBe(3)
  })

  it('should not create commands for undefined actions', () => {
    const commands = createOPCVoiceCommands({})
    expect(commands.length).toBe(0)
  })
})
