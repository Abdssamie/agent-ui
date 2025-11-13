# Design Document

## Overview

The Production Workflows View is a comprehensive workflow management interface that enables users to discover, execute, monitor, and manage automated workflows. The design focuses on providing a robust, performant, and user-friendly experience with advanced features including execution history, real-time monitoring, scheduling, and error recovery.

The architecture follows a modular component-based approach with clear separation of concerns, leveraging React hooks for state management, Zustand for global state, and optimistic updates for responsive UI interactions.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Workflows View Layer                     │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ WorkflowManager│  │ ExecutionMon │  │ HistoryManager  │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      State Management Layer                  │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Workflow Store │  │ Execution    │  │ History Store   │ │
│  │   (Zustand)    │  │ Store        │  │  (IndexedDB)    │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      API Integration Layer                   │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Workflow API   │  │ SSE Handler  │  │ Cache Manager   │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                         AgentOS Backend                      │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
WorkflowsView
├── WorkflowHeader
│   ├── StorageIndicator
│   ├── SearchBar
│   └── ActionButtons
├── WorkflowFilters
│   ├── CategoryFilter
│   ├── StatusFilter
│   └── DateRangeFilter
├── WorkflowGrid
│   ├── WorkflowCard (virtualized)
│   │   ├── WorkflowInfo
│   │   ├── ExecutionStats
│   │   └── QuickActions
│   └── LoadingSkeletons
├── WorkflowExecutionDialog
│   ├── InputSection
│   │   ├── SimpleInput
│   │   ├── JSONEditor
│   │   └── DynamicForm
│   ├── ExecutionMonitor
│   │   ├── ProgressVisualization
│   │   ├── StepList
│   │   └── OutputDisplay
│   └── ActionBar
├── WorkflowHistoryPanel
│   ├── ExecutionList
│   ├── ExecutionDetails
│   └── ExportOptions
└── WorkflowScheduleDialog
    ├── ScheduleForm
    ├── CronBuilder
    └── SchedulePreview
```

## Components and Interfaces

### 1. WorkflowManager Component

**Purpose:** Main container component that orchestrates workflow listing, filtering, and execution.

**Props:**
```typescript
interface WorkflowManagerProps {
  baseUrl: string
  dbId?: string | null
}
```

**State:**
```typescript
interface WorkflowManagerState {
  workflows: WorkflowSummary[]
  filteredWorkflows: WorkflowSummary[]
  isLoading: boolean
  error: Error | null
  searchQuery: string
  filters: WorkflowFilters
  sortBy: SortOption
  viewMode: 'grid' | 'list'
  selectedWorkflow: WorkflowSummary | null
}
```

**Key Methods:**
- `loadWorkflows()`: Fetch workflows with caching
- `refreshWorkflows()`: Force reload workflows
- `filterWorkflows()`: Apply search and filters
- `sortWorkflows()`: Sort by selected criteria
- `handleWorkflowTrigger()`: Open execution dialog

### 2. WorkflowExecutionDialog Component

**Purpose:** Modal dialog for executing workflows with dynamic input handling and real-time monitoring.

**Props:**
```typescript
interface WorkflowExecutionDialogProps {
  open: boolean
  workflow: WorkflowSummary | null
  onClose: () => void
  onExecute: (input: WorkflowInput) => Promise<void>
}
```

**State:**
```typescript
interface ExecutionDialogState {
  inputMode: 'simple' | 'json' | 'form'
  inputValue: string | object
  validationErrors: ValidationError[]
  isExecuting: boolean
  executionId: string | null
  executionLogs: ExecutionEvent[]
  executionStatus: 'idle' | 'running' | 'success' | 'error' | 'cancelled'
}
```

**Key Features:**
- Dynamic input detection based on workflow schema
- Real-time validation with inline error messages
- SSE-based execution monitoring
- Structured log visualization
- Cancellation support

### 3. ExecutionMonitor Component

**Purpose:** Real-time visualization of workflow execution with step-by-step progress.

**Props:**
```typescript
interface ExecutionMonitorProps {
  executionId: string
  events: ExecutionEvent[]
  status: ExecutionStatus
  onCancel: () => void
}
```

**Visualization Structure:**
```typescript
interface WorkflowExecution {
  id: string
  workflowName: string
  startTime: Date
  endTime?: Date
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  steps: ExecutionStep[]
  output?: any
  error?: Error
}

interface ExecutionStep {
  id: string
  name: string
  type: 'agent' | 'tool' | 'function'
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime: Date
  endTime?: Date
  input?: any
  output?: any
  error?: Error
  reasoning?: string[]
  toolCalls?: ToolCall[]
}
```

### 4. WorkflowHistoryManager Component

**Purpose:** Manage and display workflow execution history with filtering and export.

**Props:**
```typescript
interface WorkflowHistoryManagerProps {
  workflowId: string
  onSelectExecution: (execution: ExecutionRecord) => void
}
```

**Storage Strategy:**
```typescript
interface ExecutionRecord {
  id: string
  workflowId: string
  workflowName: string
  input: any
  output?: any
  status: ExecutionStatus
  startTime: Date
  endTime?: Date
  duration: number
  error?: Error
  logs: ExecutionEvent[]
}

// IndexedDB Schema
const historyStore = {
  name: 'workflow_executions',
  keyPath: 'id',
  indexes: [
    { name: 'workflowId', keyPath: 'workflowId' },
    { name: 'status', keyPath: 'status' },
    { name: 'startTime', keyPath: 'startTime' }
  ]
}
```

### 5. WorkflowScheduler Component

**Purpose:** Schedule workflows for automatic execution at specified times or intervals.

**Props:**
```typescript
interface WorkflowSchedulerProps {
  workflow: WorkflowSummary
  onScheduleCreated: (schedule: WorkflowSchedule) => void
}
```

**Schedule Types:**
```typescript
interface WorkflowSchedule {
  id: string
  workflowId: string
  type: 'once' | 'recurring' | 'cron'
  input: any
  enabled: boolean
  
  // For 'once' type
  executeAt?: Date
  
  // For 'recurring' type
  interval?: {
    value: number
    unit: 'minutes' | 'hours' | 'days' | 'weeks'
  }
  
  // For 'cron' type
  cronExpression?: string
  
  // Common fields
  nextExecution?: Date
  lastExecution?: Date
  retryPolicy?: {
    maxRetries: number
    retryDelay: number
  }
}
```

## Data Models

### Workflow Models

```typescript
interface WorkflowSummary {
  id: string
  name: string
  description?: string
  category?: string
  tags?: string[]
  input_schema?: JSONSchema
  output_schema?: JSONSchema
  db_id?: string
  metadata?: {
    version?: string
    author?: string
    created_at?: string
    updated_at?: string
    execution_count?: number
    last_executed?: string
    average_duration?: number
    success_rate?: number
  }
}

interface WorkflowInput {
  message?: string
  [key: string]: any
}

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

interface SortOption {
  field: 'name' | 'lastExecuted' | 'executionCount' | 'createdAt'
  direction: 'asc' | 'desc'
}
```

### Execution Models

```typescript
interface ExecutionEvent {
  id: string
  timestamp: Date
  type: 'workflow_started' | 'workflow_completed' | 'workflow_failed' | 
        'step_started' | 'step_completed' | 'step_failed' |
        'agent_thinking' | 'tool_call' | 'output'
  data: any
}

interface ExecutionStatus {
  state: 'idle' | 'running' | 'success' | 'error' | 'cancelled'
  progress: number // 0-100
  currentStep?: string
  message?: string
}

interface ValidationError {
  field: string
  message: string
  type: 'required' | 'type' | 'format' | 'custom'
}
```

## Error Handling

### Error Types and Recovery Strategies

```typescript
enum WorkflowErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  EXECUTION_ERROR = 'EXECUTION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR'
}

interface WorkflowError {
  type: WorkflowErrorType
  message: string
  details?: any
  recoverable: boolean
  suggestedAction?: string
}

// Error Recovery Strategies
const errorRecoveryStrategies = {
  NETWORK_ERROR: {
    retry: true,
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    userAction: 'Check your internet connection and try again'
  },
  VALIDATION_ERROR: {
    retry: false,
    userAction: 'Please correct the highlighted fields and try again'
  },
  EXECUTION_ERROR: {
    retry: true,
    maxRetries: 1,
    userAction: 'Review the error details and retry with different input'
  },
  TIMEOUT_ERROR: {
    retry: true,
    maxRetries: 2,
    retryDelay: 2000,
    userAction: 'The workflow is taking longer than expected. Retry or contact support'
  }
}
```

### Error Handling Flow

```typescript
class WorkflowErrorHandler {
  async handleError(error: WorkflowError, context: ErrorContext): Promise<void> {
    // Log error for debugging
    this.logError(error, context)
    
    // Display user-friendly message
    this.displayErrorToUser(error)
    
    // Attempt recovery if possible
    if (error.recoverable) {
      const strategy = errorRecoveryStrategies[error.type]
      if (strategy.retry) {
        await this.retryWithBackoff(context, strategy)
      }
    }
    
    // Update UI state
    this.updateErrorState(error)
  }
  
  private async retryWithBackoff(
    context: ErrorContext,
    strategy: RetryStrategy
  ): Promise<void> {
    for (let attempt = 1; attempt <= strategy.maxRetries; attempt++) {
      const delay = strategy.exponentialBackoff
        ? strategy.retryDelay * Math.pow(2, attempt - 1)
        : strategy.retryDelay
      
      await this.sleep(delay)
      
      try {
        await context.retryOperation()
        return // Success
      } catch (error) {
        if (attempt === strategy.maxRetries) {
          throw error // Final attempt failed
        }
      }
    }
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
// Test workflow filtering
describe('WorkflowManager - Filtering', () => {
  it('should filter workflows by search query', () => {
    const workflows = [
      { id: '1', name: 'Email Automation', description: 'Send emails' },
      { id: '2', name: 'Invoice Generator', description: 'Create invoices' }
    ]
    const filtered = filterWorkflows(workflows, 'email')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('1')
  })
  
  it('should filter workflows by category', () => {
    const workflows = [
      { id: '1', name: 'Workflow 1', category: 'automation' },
      { id: '2', name: 'Workflow 2', category: 'reporting' }
    ]
    const filtered = filterWorkflows(workflows, '', { categories: ['automation'] })
    expect(filtered).toHaveLength(1)
  })
})

// Test execution monitoring
describe('ExecutionMonitor - Event Parsing', () => {
  it('should parse workflow execution events correctly', () => {
    const events = [
      { type: 'workflow_started', data: { workflow_id: '1' } },
      { type: 'step_started', data: { step_name: 'Step 1' } },
      { type: 'step_completed', data: { step_name: 'Step 1', output: 'result' } }
    ]
    const execution = parseWorkflowExecution(events)
    expect(execution.steps).toHaveLength(1)
    expect(execution.steps[0].status).toBe('completed')
  })
})
```

### Integration Tests

```typescript
// Test workflow execution flow
describe('Workflow Execution Flow', () => {
  it('should execute workflow and display results', async () => {
    const { getByText, getByRole } = render(<WorkflowManager baseUrl="http://localhost:7777" />)
    
    // Wait for workflows to load
    await waitFor(() => expect(getByText('Email Automation')).toBeInTheDocument())
    
    // Click trigger button
    fireEvent.click(getByRole('button', { name: /trigger/i }))
    
    // Enter input
    const input = getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Test message' } })
    
    // Execute
    fireEvent.click(getByRole('button', { name: /execute/i }))
    
    // Verify execution started
    await waitFor(() => expect(getByText(/running/i)).toBeInTheDocument())
  })
})
```

### Performance Tests

```typescript
// Test virtual scrolling performance
describe('WorkflowGrid - Performance', () => {
  it('should render 1000 workflows without lag', () => {
    const workflows = generateMockWorkflows(1000)
    const startTime = performance.now()
    
    render(<WorkflowGrid workflows={workflows} />)
    
    const endTime = performance.now()
    expect(endTime - startTime).toBeLessThan(100) // Should render in < 100ms
  })
  
  it('should handle rapid search input without lag', async () => {
    const { getByRole } = render(<WorkflowManager />)
    const searchInput = getByRole('textbox', { name: /search/i })
    
    // Simulate rapid typing
    for (let i = 0; i < 20; i++) {
      fireEvent.change(searchInput, { target: { value: `query${i}` } })
    }
    
    // Should debounce and not cause performance issues
    await waitFor(() => expect(searchInput.value).toBe('query19'))
  })
})
```

## Performance Optimizations

### 1. Caching Strategy

```typescript
class WorkflowCache {
  private cache: Map<string, CacheEntry> = new Map()
  private readonly TTL = 5 * 60 * 1000 // 5 minutes
  
  async get(key: string): Promise<any | null> {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }
  
  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }
  
  invalidate(key: string): void {
    this.cache.delete(key)
  }
}
```

### 2. Virtual Scrolling

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

function WorkflowGrid({ workflows }: { workflows: WorkflowSummary[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: workflows.length,
    getScrollElement: () => parentRef.current,
   stimeight
    overscan: 5 // Render 5 extra items
  })
  
  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`
            }}
          >
            <WorkflowCard workflow={workflows[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 3. Optimistic Updates

```typescript
async function executeWorkflow(workflow: WorkflowSummary, input: any) {
  // Optimistically update UI
  const optimisticExecution = {
    id: generateTempId(),
    status: 'running',
    startTime: new Date()
  }
  
  updateExecutionState(optimisticExecution)
  
  try {
    const result = await executeWorkflowAPI(workflow.id, input)
    // Update with real data
    updateExecutionState(result)
  } catch (error) {
    // Rollback optimistic update
    rollbackExecutionState(optimisticExecution.id)
    throw error
  }
}
```

### 4. Debouncing and Throttling

```typescript
import { useDebouncedCallback } from 'use-debounce'

function SearchBar() {
  const [searchQuery, setSearchQuery] = useState('')
  
  const debouncedSearch = useDebouncedCallback(
    (query: string) => {
      // Perform search
      filterWorkflows(query)
    },
    300 // Wait 300ms after user stops typing
  )
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    debouncedSearch(value)
  }
  
  return <input value={searchQuery} onChange={handleChange} />
}
```

## Accessibility Features

### Keyboard Navigation

```typescript
function WorkflowCard({ workflow }: { workflow: WorkflowSummary }) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        onTrigger(workflow.id)
        break
      case 'ArrowRight':
        focusNextCard()
        break
      case 'ArrowLeft':
        focusPreviousCard()
        break
    }
  }
  
  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`Workflow: ${workflow.name}`}
    >
      {/* Card content */}
    </div>
  )
}
```

### ARIA Labels

```typescript
<div
  role="region"
  aria-label="Workflow execution monitor"
  aria-live="polite"
  aria-atomic="true"
>
  <div role="status" aria-label={`Execution status: ${status}`}>
    {status}
  </div>
  <div role="log" aria-label="Execution logs">
    {logs.map(log => (
      <div key={log.id} role="listitem">
        {log.message}
      </div>
    ))}
  </div>
</div>
```

## Security Considerations

### Input Sanitization

```typescript
function sanitizeWorkflowInput(input: any): any {
  // Remove potentially dangerous properties
  const sanitized = { ...input }
  delete sanitized.__proto__
  delete sanitized.constructor
  
  // Sanitize string values
  if (typeof sanitized === 'string') {
    return DOMPurify.sanitize(sanitized)
  }
  
  // Recursively sanitize objects
  if (typeof sanitized === 'object') {
    for (const key in sanitized) {
      sanitized[key] = sanitizeWorkflowInput(sanitized[key])
    }
  }
  
  return sanitized
}
```

### Secure Storage

```typescript
// Store sensitive data encrypted
class SecureStorage {
  private encryptionKey: CryptoKey
  
  async store(key: string, data: any): Promise<void> {
    const encrypted = await this.encrypt(JSON.stringify(data))
    localStorage.setItem(key, encrypted)
  }
  
  async retrieve(key: string): Promise<any | null> {
    const encrypted = localStorage.getItem(key)
    if (!encrypted) return null
    
    const decrypted = await this.decrypt(encrypted)
    return JSON.parse(decrypted)
  }
  
  private async encrypt(data: string): Promise<string> {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: this.generateIV() },
      this.encryptionKey,
      dataBuffer
    )
    return this.bufferToBase64(encryptedBuffer)
  }
}
```

## Deployment Considerations

### Environment Configuration

```typescript
// config/workflows.ts
export const workflowsConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_AGENTOS_URL || 'http://localhost:7777',
  cacheEnabled: process.env.NODE_ENV === 'production',
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  maxConcurrentExecutions: 3,
  executionTimeout: 5 * 60 * 1000, // 5 minutes
  historyRetentionDays: 30,
  enableScheduling: process.env.NEXT_PUBLIC_ENABLE_SCHEDULING === 'true',
  enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'
}
```

### Feature Flags

```typescript
const featureFlags = {
  workflowScheduling: true,
  executionHistory: true,
  advancedFiltering: true,
  exportLogs: true,
  workflowTemplates: false // Coming soon
}

function useFeatureFlag(flag: keyof typeof featureFlags): boolean {
  return featureFlags[flag]
}
```

This design provides a comprehensive, production-ready architecture for the Workflows View with robust error handling, performance optimizations, and extensibility for future enhancements.
