# Knowledge Base Management System

## Overview

The Knowledge Base Management System provides comprehensive functionality for managing persistent content in the Agno Knowledge API. Content uploaded to the knowledge base persists across sessions and can be queried, updated, and deleted through a robust API client and UI interface.

## Architecture

### Components

1. **API Client Layer** (`src/api/agnoKnowledge/`)
   - Individual API endpoint functions
   - Error handling and retry logic
   - Rate limiting
   - Authentication support

2. **Service Layer** (`src/lib/knowledgeBaseService.ts`)
   - High-level business logic
   - Content management operations
   - Store integration
   - Status polling utilities

3. **Hook Layer** (`src/hooks/useKnowledgeBaseManager.ts`)
   - React integration
   - State management
   - Loading and error states
   - Batch operations

4. **UI Layer** (`src/components/knowledge/KnowledgeBaseManager.tsx`)
   - User interface for content management
   - Search and filtering
   - Bulk operations
   - Status visualization

## Features

### Content Listing
- Paginated content retrieval
- Sorting and filtering options
- Search functionality
- Metadata display

### Content Retrieval
- Get content by ID
- Access full content details
- View processing status
- Check embedding information

### Content Status Monitoring
- Real-time status updates
- Processing progress tracking
- Error detection
- Automatic polling

### Content Updates
- Modify content metadata
- Update descriptions
- Change processing configuration
- Version management

### Content Deletion
- Individual content deletion
- Batch deletion
- Delete all content (with confirmation)
- Automatic cleanup

### Cross-Session Persistence
- Content persists across browser sessions
- Permanent knowledge base storage
- Session-independent access
- Long-term content retention

## Usage

### Basic Service Usage

```typescript
import { knowledgeBaseService } from '@/lib/knowledgeBaseService'

// List all content
const { contents, pagination } = await knowledgeBaseService.listContent({
  page: 1,
  limit: 10,
  sort_by: 'created_at',
  sort_order: 'desc'
})

// Get specific content
const content = await knowledgeBaseService.getContentById('content-id')

// Check processing status
const status = await knowledgeBaseService.getContentStatus('content-id')

// Update content
const updated = await knowledgeBaseService.updateContent('content-id', {
  name: 'New Name',
  description: 'Updated description',
  metadata: { custom: 'value' }
})

// Delete content
await knowledgeBaseService.deleteContent('content-id')

// Wait for processing to complete
const finalStatus = await knowledgeBaseService.waitForProcessing('content-id', {
  onStatusUpdate: (status) => console.log('Status:', status.status)
})
```

### Using the React Hook

```typescript
import { useKnowledgeBaseManager } from '@/hooks/useKnowledgeBaseManager'

function MyComponent() {
  const {
    contents,
    isLoading,
    error,
    pagination,
    loadContents,
    getContent,
    updateContent,
    deleteContent,
    deleteAllContents,
    batchDelete,
    refreshContent,
    syncToStore
  } = useKnowledgeBaseManager({ autoLoad: true })

  // Contents are automatically loaded on mount
  // Use the provided functions to manage content

  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {contents.map(content => (
        <div key={content.id}>{content.name}</div>
      ))}
    </div>
  )
}
```

### Using the UI Component

```typescript
import { KnowledgeBaseManager } from '@/components/knowledge'

function App() {
  return (
    <KnowledgeBaseManager
      baseUrl="https://api.example.com"
      onContentSelect={(content) => {
        console.log('Selected:', content)
      }}
    />
  )
}
```

## API Reference

### KnowledgeBaseService

#### Methods

- `listContent(options)` - List all content with pagination
- `getContentById(contentId, dbId?, baseUrl?)` - Get specific content
- `getContentStatus(contentId, dbId?, baseUrl?)` - Get processing status
- `updateContent(contentId, options)` - Update content metadata
- `deleteContent(contentId, dbId?, baseUrl?)` - Delete content
- `deleteAllContent(dbId?, baseUrl?)` - Delete all content
- `uploadContent(options)` - Upload new content
- `waitForProcessing(contentId, options)` - Poll until processing completes
- `batchDeleteContent(contentIds, dbId?, baseUrl?)` - Delete multiple items
- `syncToStore(options)` - Sync contents to Zustand store

### useKnowledgeBaseManager Hook

#### Options
```typescript
interface UseKnowledgeBaseManagerOptions {
  autoLoad?: boolean  // Auto-load content on mount
  baseUrl?: string    // API base URL
}
```

#### Return Value
```typescript
interface UseKnowledgeBaseManagerReturn {
  // State
  contents: KnowledgeBaseContent[]
  isLoading: boolean
  error: string | null
  pagination: PaginationInfo

  // Operations
  loadContents: (options?) => Promise<void>
  getContent: (contentId, dbId?) => Promise<KnowledgeBaseContent | null>
  updateContent: (contentId, options) => Promise<void>
  deleteContent: (contentId, dbId?) => Promise<void>
  deleteAllContents: (dbId?) => Promise<void>
  batchDelete: (contentIds, dbId?) => Promise<void>
  refreshContent: (contentId, dbId?) => Promise<void>
  syncToStore: () => Promise<void>
}
```

## Content Status Flow

```
Upload → Processing → Completed
                   ↘ Failed
```

1. **Upload**: Content is uploaded to the knowledge base
2. **Processing**: Content is being embedded and indexed
3. **Completed**: Content is ready for querying
4. **Failed**: Processing encountered an error

## Store Integration

The knowledge base integrates with the Zustand store to maintain state:

```typescript
// Store state
interface Store {
  knowledgeContents: KnowledgeContent[]
  addKnowledgeContent: (content) => void
  removeKnowledgeContent: (id) => void
  updateKnowledgeContent: (id, updates) => void
  setKnowledgeContents: (contents) => void
}
```

## Error Handling

All API calls include:
- Automatic retry with exponential backoff
- Rate limiting protection
- Detailed error messages
- Toast notifications
- Error state management

## Testing

Comprehensive test coverage includes:
- Content listing and pagination
- Content retrieval by ID
- Status monitoring
- Content updates
- Content deletion (individual and bulk)
- Cross-session persistence
- Error handling
- Batch operations

Run tests:
```bash
pnpm vitest run src/lib/__tests__/knowledgeBaseService.test.ts
```

## Best Practices

1. **Always check status** before using content
2. **Use batch operations** for multiple deletions
3. **Implement loading states** in UI
4. **Handle errors gracefully** with user feedback
5. **Sync to store** for consistent state
6. **Poll status** for long-running operations
7. **Confirm destructive actions** (delete all)

## Security Considerations

- Authentication tokens are stored in localStorage/sessionStorage
- All API calls include authorization headers
- Rate limiting prevents abuse
- Timeouts prevent hanging requests
- Input validation on all operations

## Performance Optimization

- Pagination for large datasets
- Debounced search
- Lazy loading
- Efficient re-renders with React hooks
- Batch operations for multiple items
- Status polling with configurable intervals

## Future Enhancements

- Content versioning
- Advanced search and filtering
- Content tagging and categorization
- Bulk upload
- Export functionality
- Content analytics
- Sharing and permissions
