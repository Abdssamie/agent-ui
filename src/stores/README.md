# Workflow State Management Infrastructure

This directory contains the state management infrastructure for the Production Workflows View, including Zustand stores, caching, and persistent storage.

## Overview

The workflow state management system provides:

- **Zustand Store**: Global state management for workflows, executions, filters, and schedules
- **Cache Manager**: In-memory caching with TTL and invalidation support
- **IndexedDB Storage**: Persistent storage for execution history with automatic cleanup

## Components

### 1. Workflow Store (`workflowStore.ts`)

The main Zustand store that manages all workflow-related state.

#### State Structure

```typescript
interface WorkflowState {
  // Workflow list
  workflows: WorkflowSummary[]
  isLoadingWorkflows: boolean
  workflowsError: string | null
  lastFetchTime: number | null

  // Filtering and sorting
  searchQuery: string
  filters: WorkflowFilters
  sortBy: SortOption
  viewMode: 'grid' | 'list'

  // Selected workflow
  selectedWorkflow: WorkflowSummary | null

  // Execution state
  currentExecution: ExecutionRecord | null
  isExecuting: boolean
  executionError: string | null

  // Execution history
  executionHistory: ExecutionRecord[]
  isLoadingHistory: boolean

  // Favorites
  favoriteWorkflowIds: string[]

  // Schedules
  schedules: WorkflowSchedule[]

  // Cache configuration
  cacheConfig: WorkflowCacheConfig
}
```

#### Usage Example

```typescript
import { useWorkflowStore } from '@/stores/workflowStore'

function WorkflowComponent() {
  const workflows = useWorkflowStore((state) => state.workflows)
  const setWorkflows = useWorkflowStore((state) => state.setWorkflows)
  const isLoading = useWorkflowStore((state) => state.isLoadingWorkflows)

  // Use the state and actions
  useEffect(() => {
    loadWorkflows()
  }, [])

  return (
    <div>
      {isLoading ? <Spinner /> : <WorkflowList workflows={workflows} />}
    </div>
  )
}
```

#### Persistence

The store persists the following fields to localStorage:
- `viewMode`: User's preferred view mode (grid/list)
- `sortBy`: User's preferred sort option
- `favoriteWorkflowIds`: List of favorited workflow IDs
- `schedules`: Workflow schedules
- `cacheConfig`: Cache configuration

### 2. Cache Manager (`workflowCache.ts`)

In-memory cache with TTL (Time To Live) and pattern-based invalidation.

#### Features

- **TTL Support**: Automatic expiration of cached entries
- **LRU Eviction**: Least Recently Used eviction when max size is reached
- **Pattern Invalidation**: Invalidate multiple entries matching a pattern
- **Get-or-Set Pattern**: Fetch from cache or compute and cache

#### Usage Example

```typescript
import { workflowCache, CacheKeys } from '@/lib/workflowCache'

// Cache workflow list
const cacheKey = CacheKeys.workflowList(baseUrl, dbId)
workflowCache.set(cacheKey, workflows, 5 * 60 * 1000) // 5 minutes TTL

// Retrieve from cache
const cached = workflowCache.get(cacheKey)

// Get or set pattern
const workflows = await workflowCache.getOrSet(
  cacheKey,
  async () => await fetchWorkflows(),
  5 * 60 * 1000
)

// Invalidate specific cache
workflowCache.invalidate(cacheKey)

// Invalidate all workflow caches
workflowCache.invalidatePattern(/^workflows:/)

// Clear all cache
workflowCache.clear()
```

#### Cache Keys

Predefined cache key generators:

```typescript
CacheKeys.workflowList(baseUrl, dbId)
CacheKeys.workflowDetails(baseUrl, workflowId, dbId)
CacheKeys.workflowExecution(workflowId, runId)
CacheKeys.workflowHistory(workflowId)
CacheKeys.allWorkflows()
```

### 3. History Database (`workflowHistoryDB.ts`)

IndexedDB-based persistent storage for workflow execution history.

#### Features

- **Persistent Storage**: Execution records survive page reloads
- **Indexed Queries**: Fast queries by workflow ID, status, and date
- **Automatic Cleanup**: Remove old executions based on retention policy
- **Statistics**: Get execution statistics and storage info

#### Usage Example

```typescript
import { workflowHistoryDB } from '@/lib/workflowHistoryDB'

// Initialize (done automatically on module load)
await workflowHistoryDB.init()

// Add execution record
await workflowHistoryDB.addExecution({
  id: 'exec-123',
  workflowId: 'workflow-1',
  workflowName: 'Email Automation',
  input: { message: 'Send email' },
  status: 'completed',
  startTime: Date.now(),
  duration: 1500,
  logs: []
})

// Get workflow executions (newest first)
const executions = await workflowHistoryDB.getWorkflowExecutions('workflow-1', 10)

// Get all executions with filters
const filtered = await workflowHistoryDB.getAllExecutions({
  status: ['completed'],
  startDate: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
  limit: 50
})

// Update execution
await workflowHistoryDB.updateExecution({
  ...execution,
  status: 'completed',
  endTime: Date.now()
})

// Get statistics
const stats = await workflowHistoryDB.getStats()
console.log(`Total executions: ${stats.totalExecutions}`)
console.log(`By status:`, stats.byStatus)

// Cleanup old executions (based on retention policy)
const deletedCount = await workflowHistoryDB.cleanup()

// Set retention period (default: 30 days)
workflowHistoryDB.setRetentionDays(60)

// Clear all history
await workflowHistoryDB.clearAll()
```

#### Database Schema

```typescript
// Object Store: 'executions'
// Key Path: 'id'
// Indexes:
//   - workflowId (non-unique)
//   - status (non-unique)
//   - startTime (non-unique)
//   - [workflowId, startTime] (compound, non-unique)
```

## Data Models

### WorkflowFilters

```typescript
interface WorkflowFilters {
  categories: string[]
  tags: string[]
  status: ('active' | 'inactive')[]
  dateRange?: {
    start: Date
    end: Date
  }
  executionFrequency?: {
    min: number
    max: number
  }
}
```

### SortOption

```typescript
interface SortOption {
  field: 'name' | 'lastExecuted' | 'executionCount' | 'createdAt'
  direction: 'asc' | 'desc'
}
```

### ExecutionRecord

```typescript
interface ExecutionRecord {
  id: string
  workflowId: string
  workflowName: string
  input: any
  output?: any
  status: 'running' | 'completed' | 'error' | 'cancelled'
  startTime: number
  endTime?: number
  duration: number
  error?: string
  logs: WorkflowEvent[]
  sessionId?: string
  runId?: string
}
```

### WorkflowSchedule

```typescript
interface WorkflowSchedule {
  id: string
  workflowId: string
  type: 'once' | 'recurring' | 'cron'
  input: any
  enabled: boolean
  executeAt?: number
  interval?: {
    value: number
    unit: 'minutes' | 'hours' | 'days' | 'weeks'
  }
  cronExpression?: string
  nextExecution?: number
  lastExecution?: number
  retryPolicy?: {
    maxRetries: number
    retryDelay: number
  }
}
```

## Best Practices

### 1. Cache Management

- Use appropriate TTL values based on data volatility
- Invalidate cache when data is modified
- Use pattern invalidation for related cache entries
- Monitor cache size and hit rate

```typescript
// Good: Invalidate related caches after workflow execution
await executeWorkflow(workflowId, input)
workflowCache.invalidatePattern(`workflows:${workflowId}`)
```

### 2. History Storage

- Add executions to history immediately after completion
- Use filters to limit query results
- Run cleanup periodically to manage storage
- Handle IndexedDB errors gracefully

```typescript
// Good: Add to history with error handling
try {
  await workflowHistoryDB.addExecution(execution)
} catch (error) {
  console.error('Failed to save execution history:', error)
  // Continue execution - history is not critical
}
```

### 3. Store Usage

- Use selectors to avoid unnecessary re-renders
- Batch related state updates
- Reset state when appropriate (e.g., logout)

```typescript
// Good: Use selector to avoid re-renders
const workflows = useWorkflowStore((state) => state.workflows)

// Bad: Subscribes to entire store
const store = useWorkflowStore()
```

## Testing

Tests are located in `__tests__` directories:

- `src/lib/__tests__/workflowCache.test.ts`: Cache manager tests
- `src/stores/__tests__/workflowStore.test.ts`: Store tests

Run tests:

```bash
npm test -- src/stores/__tests__/workflowStore.test.ts
npm test -- src/lib/__tests__/workflowCache.test.ts
```

Note: IndexedDB tests require a browser environment and are not included in the unit test suite.

## Performance Considerations

### Cache Configuration

Default configuration:
- TTL: 5 minutes
- Max Size: 100 entries
- Enabled: true

Adjust based on your needs:

```typescript
const { setCacheConfig } = useWorkflowStore.getState()

setCacheConfig({
  enabled: true,
  ttl: 10 * 60 * 1000, // 10 minutes
  maxSize: 200
})
```

### History Retention

Default retention: 30 days

Adjust based on storage constraints:

```typescript
workflowHistoryDB.setRetentionDays(60) // 60 days
```

### Cleanup Schedule

Run cleanup periodically:

```typescript
// Run cleanup daily
setInterval(async () => {
  const deleted = await workflowHistoryDB.cleanup()
  console.log(`Cleaned up ${deleted} old executions`)
}, 24 * 60 * 60 * 1000)
```

## Browser Compatibility

- **Zustand Store**: All modern browsers
- **Cache Manager**: All modern browsers
- **IndexedDB**: All modern browsers (IE 10+)

IndexedDB is not available in:
- Node.js (use alternative storage in SSR)
- Private/Incognito mode (some browsers)
- Browsers with storage disabled

Handle gracefully:

```typescript
try {
  await workflowHistoryDB.init()
} catch (error) {
  console.warn('IndexedDB not available, history will not persist')
  // Fall back to in-memory storage or disable history feature
}
```

## Migration Guide

If you need to migrate from an older state management system:

1. Export existing data
2. Transform to new data models
3. Import into new stores
4. Update component imports
5. Test thoroughly

Example migration:

```typescript
// Export old data
const oldWorkflows = oldStore.getWorkflows()

// Transform and import
const { setWorkflows } = useWorkflowStore.getState()
setWorkflows(oldWorkflows.map(transformWorkflow))
```

## Troubleshooting

### Cache not working

- Check if cache is enabled in config
- Verify TTL is not too short
- Check for cache invalidation calls

### IndexedDB errors

- Check browser compatibility
- Verify storage quota
- Check for private browsing mode
- Handle initialization errors

### Store not persisting

- Check localStorage availability
- Verify partialize configuration
- Check for storage quota errors

## Future Enhancements

Planned improvements:

- [ ] Cache statistics and monitoring
- [ ] Export/import execution history
- [ ] Compression for large execution logs
- [ ] Background sync for offline support
- [ ] WebWorker for heavy operations
