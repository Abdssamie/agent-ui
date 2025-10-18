# Voice Input Feature

## Overview

The Voice-First Interface allows users to interact with OPC agents using voice commands and natural speech. This feature makes the system more accessible and enables hands-free operation.

## Features

### 1. Voice Input
- **Real-time speech-to-text** using Web Speech API
- **Visual feedback** with animated microphone indicator
- **Interim results** showing what you're saying in real-time
- **Auto-focus** on text input after voice capture

### 2. Voice Commands
Natural language commands that trigger specific actions:

- **"Hey OPC, generate leads for [topic]"** - Initiates lead generation
- **"Hey OPC, create content about [topic]"** - Starts content creation
- **"Hey OPC, research [topic]"** - Begins research task
- **"Hey OPC, new chat"** - Starts a new conversation
- **"Hey OPC, clear chat"** - Clears the current conversation

Commands are flexible and support variations:
- "OPC, find leads for my SaaS product"
- "Generate leads about AI consulting"
- "Create a post about productivity tips"

### 3. Visual Indicators

**Listening State:**
- Pulsing red microphone icon
- Animated circles showing active listening
- Real-time transcript preview

**Completed State:**
- Green checkmark
- Full transcript display
- Auto-populated in chat input

## Usage

### Basic Voice Input

1. Click the microphone button in the chat input area
2. Speak your message
3. Click again to stop (or it stops automatically after silence)
4. Your speech is converted to text and added to the input
5. Press Enter or click Send to submit

### Voice Commands

1. Click the microphone button
2. Say "Hey OPC" or "OPC" followed by your command
3. The system recognizes the command and fills in the appropriate text
4. Review and press Enter to execute

### Example Workflows

**Lead Generation:**
```
User: "Hey OPC, generate leads for AI consulting services"
→ Input filled with: "Generate leads for AI consulting services"
→ User presses Enter
→ Lead Agent starts working
```

**Content Creation:**
```
User: "OPC, create content about remote work productivity"
→ Input filled with: "Create content about remote work productivity"
→ User presses Enter
→ Content Agent starts working
```

## Browser Support

The voice input feature uses the Web Speech API, which is supported in:
- ✅ Chrome/Edge (full support)
- ✅ Safari (full support)
- ⚠️ Firefox (limited support)
- ❌ Older browsers (gracefully hidden)

If your browser doesn't support voice input, the microphone button won't appear.

## Technical Details

### Components

**`VoiceInputButton`**
- Main UI component for voice input
- Handles start/stop of voice recognition
- Shows listening state with visual feedback

**`VoiceActivityIndicator`**
- Displays real-time voice activity
- Shows interim transcripts while speaking
- Confirms captured text when done

### Hooks

**`useVoiceInput`**
- Manages Web Speech API
- Provides transcript and interim results
- Handles errors and browser compatibility

**`useVoiceCommands`**
- Pattern matching for voice commands
- Regex-based command detection
- Extensible command system

### Type Definitions

Custom TypeScript declarations for Web Speech API are in:
- `src/types/speech.d.ts`

## Customization

### Adding New Voice Commands

Edit `ChatInput.tsx` and add commands to the `createOPCVoiceCommands` call:

```typescript
const voiceCommands = createOPCVoiceCommands({
  onGenerateLeads: (query) => {
    setInputMessage(`Generate leads for ${query}`)
  },
  onCreateContent: (topic) => {
    setInputMessage(`Create content about ${topic}`)
  },
  // Add your custom command
  onCustomAction: (param) => {
    setInputMessage(`Custom action: ${param}`)
  }
})
```

### Custom Command Patterns

Create custom regex patterns in `useVoiceCommands`:

```typescript
const customCommands: VoiceCommand[] = [
  {
    trigger: /schedule\s+(?:a\s+)?meeting\s+(?:with\s+)?(.+)/i,
    action: (match) => {
      const person = match?.[1]
      scheduleMeeting(person)
    },
    description: 'Schedule a meeting with [person]'
  }
]
```

### Changing Language

Modify the language in `VoiceInputButton.tsx`:

```typescript
const { isListening, transcript } = useVoiceInput({
  continuous: false,
  language: 'es-ES' // Spanish
  // language: 'fr-FR' // French
  // language: 'de-DE' // German
})
```

## Privacy & Security

- **No data sent to external servers** - Voice processing happens in your browser
- **No recordings stored** - Only text transcripts are kept
- **Microphone permission required** - Browser will ask for permission
- **Can be disabled** - Simply don't click the microphone button

## Troubleshooting

**Microphone button doesn't appear:**
- Your browser doesn't support Web Speech API
- Try Chrome or Edge for best support

**Voice input not working:**
- Check microphone permissions in browser settings
- Ensure microphone is not being used by another app
- Try refreshing the page

**Commands not recognized:**
- Speak clearly and at normal pace
- Include "Hey OPC" or "OPC" at the start
- Check the command patterns in the documentation

**Transcript is inaccurate:**
- Reduce background noise
- Speak closer to the microphone
- Try a different microphone if available

## Future Enhancements

Planned improvements:
- [ ] Voice output (text-to-speech responses)
- [ ] Multi-language support with auto-detection
- [ ] Custom wake word configuration
- [ ] Voice activity detection (auto-start on speech)
- [ ] Conversation mode (continuous back-and-forth)
- [ ] Voice command history and favorites
- [ ] Offline voice recognition
