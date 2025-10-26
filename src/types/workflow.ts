export interface WorkflowSummary {
  id: string | null
  name: string | null
  description: string | null
  db_id: string | null
  input_schema?: Record<string, any> | null
  metadata?: Record<string, any> | null
}

export interface WorkflowExecutionInput {
  message: string
  stream?: boolean
  session_id?: string | null
  user_id?: string | null
}

export interface WorkflowExecutionResponse {
  // Non-streaming response - can be any type
  [key: string]: unknown
}

export interface WorkflowRunEvent {
  event: string
  data: WorkflowRunEventData
}

export interface WorkflowRunEventData {
  content?: string | object
  run_id?: string
  session_id?: string
  created_at?: number
  [key: string]: unknown
}

export interface WorkflowErrorResponse {
  detail: string
  error_code?: string | null
}

// Workflow Realtime Event Types
export type WorkflowEventType =
  | 'WorkflowStarted'
  | 'WorkflowCompleted'
  | 'WorkflowCancelled'
  | 'WorkflowError'
  | 'StepStarted'
  | 'StepCompleted'
  | 'StepOutput'
  | 'ConditionExecutionStarted'
  | 'ConditionExecutionCompleted'
  | 'ParallelExecutionStarted'
  | 'ParallelExecutionCompleted'
  | 'LoopExecutionStarted'
  | 'LoopIterationStarted'
  | 'LoopIterationCompleted'
  | 'LoopExecutionCompleted'
  | 'RouterExecutionStarted'
  | 'RouterExecutionCompleted'
  | 'StepsExecutionStarted'
  | 'StepsExecutionCompleted'

export interface BaseWorkflowEvent {
  created_at: number
  event: WorkflowEventType
  workflow_id?: string
  workflow_name?: string
  session_id?: string
  run_id?: string
  step_id?: string
  parent_step_id?: string
}

export interface WorkflowStartedEvent extends BaseWorkflowEvent {
  event: 'WorkflowStarted'
}

export interface WorkflowCompletedEvent extends BaseWorkflowEvent {
  event: 'WorkflowCompleted'
  content?: any
  content_type?: string
  step_results?: StepOutput[]
  metadata?: Record<string, any>
}

export interface WorkflowCancelledEvent extends BaseWorkflowEvent {
  event: 'WorkflowCancelled'
}

export interface WorkflowErrorEvent extends BaseWorkflowEvent {
  event: 'WorkflowError'
  error: string
}

export interface StepStartedEvent extends BaseWorkflowEvent {
  event: 'StepStarted'
  step_name: string
  step_index: number | [number, number]
}

export interface StepOutput {
  step_name: string
  step_id: string
  step_type: string
  executor_type: string
  executor_name: string
  content: any
  step_run_id: string | null
  images: any[] | null
  videos: any[] | null
  audio: any[] | null
  files: any[] | null
  metrics: any | null
  success: boolean
  error: string | null
  stop: boolean
  steps: any[] | null
}

export interface StepCompletedEvent extends BaseWorkflowEvent {
  event: 'StepCompleted'
  step_name: string
  step_index: number | [number, number]
  content: any
  content_type: string
  images?: any[]
  videos?: any[]
  audio?: any[]
  response_audio?: any
  step_response?: StepOutput
}

export interface StepOutputEvent extends BaseWorkflowEvent {
  event: 'StepOutput'
  step_name: string
  step_index: number | [number, number]
  step_output: StepOutput
}

export interface LoopIterationStartedEvent extends BaseWorkflowEvent {
  event: 'LoopIterationStarted'
  step_name: string
  step_index: number | [number, number]
  iteration: number
  max_iterations?: number
}

export interface LoopIterationCompletedEvent extends BaseWorkflowEvent {
  event: 'LoopIterationCompleted'
  step_name: string
  step_index: number | [number, number]
  iteration: number
  max_iterations?: number
  iteration_results: StepOutput[]
  should_continue: boolean
}

export interface ParallelExecutionStartedEvent extends BaseWorkflowEvent {
  event: 'ParallelExecutionStarted'
  step_name: string
  step_index: number | [number, number]
  parallel_step_count?: number
}

export interface ParallelExecutionCompletedEvent extends BaseWorkflowEvent {
  event: 'ParallelExecutionCompleted'
  step_name: string
  step_index: number | [number, number]
  parallel_step_count?: number
  step_results: StepOutput[]
}

export type WorkflowEvent =
  | WorkflowStartedEvent
  | WorkflowCompletedEvent
  | WorkflowCancelledEvent
  | WorkflowErrorEvent
  | StepStartedEvent
  | StepCompletedEvent
  | StepOutputEvent
  | LoopIterationStartedEvent
  | LoopIterationCompletedEvent
  | ParallelExecutionStartedEvent
  | ParallelExecutionCompletedEvent

export interface WorkflowLogLine {
  timestamp: string
  message: string
  event?: WorkflowEvent
}

export interface WorkflowStep {
  step_id: string
  step_name: string
  step_index: number | [number, number]
  status: 'pending' | 'running' | 'completed' | 'error' | 'cancelled'
  started_at?: number
  completed_at?: number
  content?: any
  error?: string
  executor_name?: string
  executor_type?: string
  duration?: number
}

export interface WorkflowExecution {
  workflow_id: string
  workflow_name: string
  session_id: string
  run_id: string
  started_at: number
  completed_at?: number
  status: 'running' | 'completed' | 'error' | 'cancelled'
  steps: WorkflowStep[]
  errors: string[]
  duration?: number
}
