# Chat Attachment Preview Feature

## Overview

When users send messages with image attachments, a small preview is displayed in the sent message to indicate which files were attached. This provides visual confirmation that attachments were successfully included with the message.

## Features

### Visual Preview
- Shows thumbnail previews of attached images (48x48px)
- Displays up to 3 attachment previews per message
- Rounded corners with border styling for clean appearance

### Overflow Indicator
- When more than 3 attachments are sent, shows "+N more" badge
- Badge includes paperclip icon for visual consistency
- Clearly indicates additional attachments beyond the visible previews

### User Experience
- Previews appear below the message text
- Only shown for user messages (not agent responses)
- Maintains chat flow without cluttering the interface

## Implementation

### Components

#### AttachmentPreview
Location: `src/components/chat/ChatArea/Messages/AttachmentPreview.tsx`

Props:
- `attachments`: Array of attachment objects with `preview` and `file` properties
- `maxVisible`: Maximum number of previews to show (default: 3)

#### UserMessage
Updated to display AttachmentPreview when attachments are present.

### Type Definitions

The `ChatMessage` type in `src/types/os.ts` now includes:
```typescript
// Ephemeral UI-only field - not persisted to database
attachments?: Array<{
  preview: string  // Blob URL or base64
  name: string     // File name
  size: number     // File size in bytes
}>
```

**Important**: This field is ephemeral and UI-only:
- Not persisted to the database
- Only exists during the current session
- Cleared on page refresh
- Preview URLs (blob URLs) are temporary and session-specific
- Prevents unnecessary database storage consumption

### Data Flow

1. User attaches images via ChatInput
2. On submit, attachments are passed to `handleStreamResponse`
3. Attachments are converted to serializable format (removing File objects)
4. User message is created with lightweight attachment metadata
5. UserMessage component renders AttachmentPreview
6. Preview shows up to 3 thumbnails + overflow indicator
7. On page refresh, attachment previews are lost (by design)

**Note**: The actual files are sent to the API via FormData, but only minimal metadata (preview URL, name, size) is stored in the UI state for display purposes.

## Usage Example

When a user sends a message with 5 images attached:
- First 3 images show as small thumbnails
- A badge displays "+2 more" to indicate additional attachments
- All attachments are still sent to the agent

## Testing

Test file: `src/components/chat/ChatArea/Messages/__tests__/AttachmentPreview.test.tsx`

Tests cover:
- Empty attachments array
- Single attachment
- Multiple attachments within limit
- Overflow behavior
- Default maxVisible value

## Styling

- Preview thumbnails: 48x48px with rounded corners
- Border: Uses theme border color
- Background: Muted background for loading states
- Badge: Secondary variant with icon
- Spacing: 8px gap between previews
