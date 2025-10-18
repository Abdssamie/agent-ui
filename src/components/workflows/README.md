# Workflows Feature

This directory contains the implementation of the Workflows feature for the OPC Frontend application.

## Overview

The Workflows feature allows users to view, trigger, and monitor automated workflows from the AgentOS backend. It provides a clean, modern interface following the established design system.

## Components

### WorkflowManager
**Location:** `WorkflowManager.tsx`

Main container component that manages the workflow listing and execution flow.

**Features:**
- Lists all available workflows from AgentOS
- Search functionality to filter workflows
- Refresh button to reload workflows
- Handles workflow execution with real-time streaming
- Shows execution logs and status

**Props:**
- `baseUrl: string` - The AgentOS base URL
- `dbId?: string | null` - Optional database ID

### WorkflowCard
**Location:** `WorkflowCard.tsx`

Display component for individual workflow items.

**Features:**
- Shows workflow name, description, and ID
- Displays database ID if available
- Trigger button with loading state
- Smooth animations on mount

**Props:**
- `workflow: WorkflowSummary` - Workflow data
- `onTriggerAction: (workflowId: string) => void` - Trigger callback
- `isExecuting?: boolean` - Execution state

### WorkflowExecutionDialog
**Location:** `WorkflowExecutionDialog.tsx`

Modal dialog for executing workflows and viewing results.

**Features:**
- Input field for workflow message
- Real-time execution logs with auto-scroll
- Cancel button (UI ready, backend pending)
- Streaming event display
- Empty state when no execution

**Props:**
- `open: boolean` - Dialog visibility
- `onOpenChangeAction: (open: boolean) => void` - State setter
- `workflow: WorkflowSummary | null` - Selected workflow
- `onExecuteAction: (message: string) => void` - Execute callback
- `isExecuting: boolean` - Execution state
- `executionLogs: string[]` - Log messages
- `onCancel?: () => void` - Optional cancel handler

## API Integration

### Endpoints Used
- `GET /workflows` - List all workflows
- `POST /workflows/{workflow_id}/runs` - Execute workflow with streaming

### Functions
**Location:** `src/api/workflows.ts`

- `getWorkflowsAPI(baseUrl)` - Fetch all workflows
- `executeWorkflowAPI(baseUrl, workflowId, input, onEvent)` - Execute with streaming support
- `cancelWorkflowRunAPI(baseUrl, workflowId, runId)` - Cancel execution (future)

## Usage

### Adding to Routes
The workflow view is integrated into the main app routing:

```typescript
import { WorkflowManager } from '@/components/workflows'

// In your render switch
case 'workflows':
  return <WorkflowManager baseUrl={baseUrl} dbId={dbId} />
```

### Navigation
Added to `ViewToolbar` with the hammer icon for easy access.

## Design System

All components follow the established design patterns:

- **Colors:** Semantic tokens (`text-primary`, `text-muted`, `bg-accent`)
- **Typography:** `text-xs font-medium uppercase` for headers
- **Borders:** `rounded-xl` and `border-primary/15`
- **Backgrounds:** `bg-accent` for cards
- **Spacing:** Consistent `gap-2`, `gap-3`, `p-4` patterns
- **Animations:** Framer Motion with spring physics

## Future Enhancements

- [ ] Add workflow cancellation when API endpoint is available
- [ ] Session persistence for workflow executions
- [ ] Workflow execution history
- [ ] Workflow scheduling/automation
- [ ] Advanced filtering and sorting
- [ ] Export execution logs
- [ ] Workflow templates

## Testing

Run type checking:
```bash
pnpm typecheck
```

Run linting:
```bash
pnpm lint
```

## Related Files

- Types: `src/types/workflow.ts`
- API: `src/api/workflows.ts`
- Routes: `src/api/routes.ts`
- Main App: `src/app/page.tsx`
- Toolbar: `src/components/chat/ViewToolbar/ViewToolbar.tsx`
