import type {
  WorkflowEvent,
  WorkflowLogLine,
  WorkflowExecution,
  WorkflowStep,
} from '@/types/workflow'

/**
 * Parse a single workflow log line
 * Format: [timestamp]message or [timestamp][EventType] {json}
 */
export function parseWorkflowLogLine(line: string): WorkflowLogLine | null {
  if (!line.trim()) return null

  // Check if it's a JSON event first: [EventType] {...}
  const jsonEventMatch = line.match(/^\[([^\]]+)\]\s*(\{.+\})$/)
  
  if (jsonEventMatch) {
    const [, eventType, jsonStr] = jsonEventMatch
    try {
      const event = JSON.parse(jsonStr) as WorkflowEvent
      
      // Use created_at from the event if available, otherwise generate timestamp
      const timestamp = event.created_at 
        ? new Date(event.created_at * 1000).toLocaleTimeString()
        : new Date().toLocaleTimeString()
      
      return {
        timestamp,
        message: `[${eventType}]`,
        event,
      }
    } catch (e) {
      console.error('Failed to parse workflow event JSON:', e)
      // Fall through to plain text handling
    }
  }

  // Check for timestamped messages: [timestamp]message
  const timestampMatch = line.match(/^\[([^\]]+)\](.+)$/)
  if (timestampMatch) {
    const [, timestamp, rest] = timestampMatch
    return {
      timestamp,
      message: rest.trim(),
    }
  }

  // Plain text message without brackets
  return {
    timestamp: new Date().toLocaleTimeString(),
    message: line.trim(),
  }
}

/**
 * Parse multiple workflow log lines
 */
export function parseWorkflowLogs(logs: string): WorkflowLogLine[] {
  return logs
    .split('\n')
    .map(parseWorkflowLogLine)
    .filter((line): line is WorkflowLogLine => line !== null)
}

/**
 * Build a WorkflowExecution object from parsed log lines
 */
export function buildWorkflowExecution(
  logLines: WorkflowLogLine[]
): WorkflowExecution | null {
  const events = logLines
    .map((line) => line.event)
    .filter((event): event is WorkflowEvent => event !== undefined)

  if (events.length === 0) return null

  // Find workflow started event
  const startedEvent = events.find((e) => e.event === 'WorkflowStarted')
  if (!startedEvent || !startedEvent.workflow_id || !startedEvent.run_id) {
    return null
  }

  const steps = new Map<string, WorkflowStep>()
  const errors: string[] = []
  let status: WorkflowExecution['status'] = 'running'
  let completedAt: number | undefined
  const wasCancelled = false

  // Process events to build step states
  for (const event of events) {
    if (event.event == "WorkflowCancelled") {
      status = "cancelled";
      break
    };
    switch (event.event) {
      case 'StepStarted': {
        const stepStarted = event
        steps.set(stepStarted.step_id!, {
          step_id: stepStarted.step_id!,
          step_name: stepStarted.step_name,
          step_index: stepStarted.step_index,
          status: 'running',
          started_at: stepStarted.created_at,
        })
        break
      }

      case 'StepCompleted': {
        const stepCompleted = event
        const existingStep = steps.get(stepCompleted.step_id!)
        if (existingStep) {
          existingStep.status = 'completed'
          existingStep.completed_at = stepCompleted.created_at
          existingStep.content = stepCompleted.content
          existingStep.executor_name =
            stepCompleted.step_response?.executor_name
          existingStep.executor_type =
            stepCompleted.step_response?.executor_type
          existingStep.duration = existingStep.started_at
            ? stepCompleted.created_at - existingStep.started_at
            : undefined
        }
        break
      }

      case 'StepOutput': {
        const stepOutput = event
        const existingStep = steps.get(stepOutput.step_id!)
        if (existingStep && stepOutput.step_output) {
          existingStep.executor_name = stepOutput.step_output.executor_name
          existingStep.executor_type = stepOutput.step_output.executor_type
          if (stepOutput.step_output.error) {
            existingStep.status = 'error'
            existingStep.error = stepOutput.step_output.error
          }
        }
        break
      }

      case 'WorkflowError': {
        const errorEvent = event
        errors.push(errorEvent.error)
        status = 'error'
        // Mark any running steps as error
        for (const step of steps.values()) {
          if (step.status === 'running') {
            step.status = 'error'
          }
        }
        break
      }

      case 'WorkflowCompleted': {
        // Only set to completed if not already cancelled
        if (!wasCancelled) {
          status = 'completed'
        }
        completedAt = event.created_at
        break
      }
    }
  }

  // Sort steps by index
  const sortedSteps = Array.from(steps.values()).sort((a, b) => {
    const aIndex = Array.isArray(a.step_index) ? a.step_index[0] : a.step_index
    const bIndex = Array.isArray(b.step_index) ? b.step_index[0] : b.step_index
    return aIndex - bIndex
  })

  const execution: WorkflowExecution = {
    workflow_id: startedEvent.workflow_id,
    workflow_name: startedEvent.workflow_name || 'Unnamed Workflow',
    session_id: startedEvent.session_id || '',
    run_id: startedEvent.run_id,
    started_at: startedEvent.created_at,
    completed_at: completedAt,
    status,
    steps: sortedSteps,
    errors,
  }

  if (completedAt && execution.started_at) {
    execution.duration = completedAt - execution.started_at
  }

  return execution
}

/**
 * Parse raw workflow logs and return a structured execution object
 */
export function parseWorkflowExecution(logs: string): WorkflowExecution | null {
  const logLines = parseWorkflowLogs(logs)
  return buildWorkflowExecution(logLines)
}

