import { toast } from 'sonner'
import { APIRoutes } from './routes'
import { apiClient } from '@/lib/apiClient'
import { workflowCache, CacheKeys } from '@/lib/workflowCache'
import type {
  WorkflowErrorResponse,
  WorkflowExecutionInput,
  WorkflowExecutionResponse,
  WorkflowSummary
} from '@/types/workflow'

const LOG_PREFIX = '[WorkflowAPI]'

/**
 * Fetch all available workflows from the AgentOS instance
 * Enhanced with caching, retry logic, and request deduplication
 */
export const getWorkflowsAPI = async (
  baseUrl: string,
  dbId?: string | null,
): Promise<WorkflowSummary[]> => {
  const url = APIRoutes.Workflows.ListWorkflows(baseUrl, dbId)
  const cacheKey = CacheKeys.workflowList(baseUrl, dbId)

  console.log(`${LOG_PREFIX} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`${LOG_PREFIX} getWorkflowsAPI called`)
  console.log(`${LOG_PREFIX} Base URL: ${baseUrl}`)
  console.log(`${LOG_PREFIX} DB ID: ${dbId || 'none'}`)
  console.log(`${LOG_PREFIX} Cache key: ${cacheKey}`)

  try {
    // Check if cached
    const cached = workflowCache.get<WorkflowSummary[]>(cacheKey)
    if (cached) {
      console.log(`${LOG_PREFIX} ⚡ Cache HIT! Returning ${cached.length} workflows from cache`)
      console.log(`${LOG_PREFIX} Cache stats:`, workflowCache.getStats())
      return cached
    }

    console.log(`${LOG_PREFIX} Cache MISS - fetching from API`)

    // Use cache with getOrSet pattern
    const result = await workflowCache.getOrSet(
      cacheKey,
      async () => {
        console.log(`${LOG_PREFIX} Executing API request...`)
        const workflows = await apiClient.request<WorkflowSummary[]>(url, {
          method: 'GET',
          deduplicate: true,
          retryConfig: {
            maxRetries: 3,
            initialDelay: 1000
          }
        })
        console.log(`${LOG_PREFIX} ✓ Received ${workflows.length} workflows from API`)
        return workflows
      }
    )

    console.log(`${LOG_PREFIX} ✓ Workflows cached successfully`)
    console.log(`${LOG_PREFIX} Cache stats:`, workflowCache.getStats())
    
    return result
  } catch (error: any) {
    console.error(`${LOG_PREFIX} ✗ Error fetching workflows:`, error)
    toast.error(error.data?.detail || 'Error fetching workflows')
    return []
  }
}

/**
 * Fetch detailed workflow information including input_schema
 * Enhanced with caching, retry logic, and schema validation
 */
export const getWorkflowDetailsAPI = async (
  baseUrl: string,
  workflowId: string,
  dbId?: string | null,
): Promise<WorkflowSummary> => {
  const url = `${baseUrl}/workflows/${workflowId}${dbId ? `?db_id=${dbId}` : ''}`
  const cacheKey = CacheKeys.workflowDetails(baseUrl, workflowId, dbId)

  console.log(`${LOG_PREFIX} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`${LOG_PREFIX} getWorkflowDetailsAPI called`)
  console.log(`${LOG_PREFIX} Workflow ID: ${workflowId}`)
  console.log(`${LOG_PREFIX} Cache key: ${cacheKey}`)

  try {
    // Check if cached
    const cached = workflowCache.get<WorkflowSummary>(cacheKey)
    if (cached) {
      console.log(`${LOG_PREFIX} ⚡ Cache HIT! Returning workflow details from cache`)
      console.log(`${LOG_PREFIX} Workflow: ${cached.name}`)
      console.log(`${LOG_PREFIX} Has schema: ${!!cached.input_schema}`)
      return cached
    }

    console.log(`${LOG_PREFIX} Cache MISS - fetching from API`)

    // Use cache with getOrSet pattern
    const result = await workflowCache.getOrSet(
      cacheKey,
      async () => {
        console.log(`${LOG_PREFIX} Executing API request...`)
        const workflow = await apiClient.request<WorkflowSummary>(url, {
          method: 'GET',
          deduplicate: true,
          retryConfig: {
            maxRetries: 2,
            initialDelay: 500
          }
        })

        console.log(`${LOG_PREFIX} ✓ Received workflow: ${workflow.name}`)

        // Validate and normalize schema if present
        if (workflow.input_schema) {
          console.log(`${LOG_PREFIX} Processing input_schema...`)
          try {
            // Ensure schema is valid JSON object
            if (typeof workflow.input_schema === 'string') {
              console.log(`${LOG_PREFIX} Parsing string schema to JSON`)
              workflow.input_schema = JSON.parse(workflow.input_schema)
            }
            console.log(`${LOG_PREFIX} ✓ Schema validated successfully`)
            if (workflow.input_schema && typeof workflow.input_schema === 'object') {
              console.log(`${LOG_PREFIX} Schema properties:`, Object.keys((workflow.input_schema as any).properties || {}))
            }
          } catch (error) {
            console.warn(`${LOG_PREFIX} ⚠ Invalid input_schema format:`, error)
            workflow.input_schema = null
          }
        } else {
          console.log(`${LOG_PREFIX} No input_schema present`)
        }

        return workflow
      },
      10 * 60 * 1000 // Cache for 10 minutes
    )

    console.log(`${LOG_PREFIX} ✓ Workflow details cached successfully (TTL: 10 minutes)`)
    console.log(`${LOG_PREFIX} Cache stats:`, workflowCache.getStats())
    
    return result
  } catch (error: any) {
    console.error(`${LOG_PREFIX} ✗ Error fetching workflow details:`, error)
    toast.error(error.data?.detail || 'Error fetching workflow details')
    throw error
  }
}

/**
 * Execute a workflow with the provided input
 * @param baseUrl - The AgentOS base URL
 * @param workflowId - The ID of the workflow to execute
 * @param input - The execution input parameters
 * @param onEvent - Optional callback for streaming events (SSE)
 * @returns Promise with the workflow execution response or null if streaming
 */
export const executeWorkflowAPI = async (
  baseUrl: string,
  workflowId: string,
  input: WorkflowExecutionInput,
  onEvent?: (event: string, data: string) => void
): Promise<WorkflowExecutionResponse | null> => {
  const url = APIRoutes.Workflows.ExecuteWorkflow(baseUrl, workflowId)

  console.log(`${LOG_PREFIX} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`${LOG_PREFIX} executeWorkflowAPI called`)
  console.log(`${LOG_PREFIX} Workflow ID: ${workflowId}`)
  console.log(`${LOG_PREFIX} Stream mode: ${input.stream ?? true}`)
  console.log(`${LOG_PREFIX} Session ID: ${input.session_id || 'none'}`)

  try {
    // Prepare form data
    const formData = new FormData()
    formData.append('message', input.message)
    formData.append('stream', String(input.stream ?? true))
    if (input.session_id) formData.append('session_id', input.session_id)
    if (input.user_id) formData.append('user_id', input.user_id)

    console.log(`${LOG_PREFIX} Form data prepared`)

    // Handle non-streaming response
    if (!input.stream) {
      console.log(`${LOG_PREFIX} Using non-streaming mode with enhanced API client`)
      const result = await apiClient.request<WorkflowExecutionResponse>(url, {
        method: 'POST',
        body: formData,
        deduplicate: false,
        retryConfig: {
          maxRetries: 1
        }
      })
      console.log(`${LOG_PREFIX} ✓ Workflow execution completed`)
      return result
    }

    console.log(`${LOG_PREFIX} Using streaming mode (SSE)`)

    // Handle streaming response (SSE) - use basic fetch for streaming
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData: WorkflowErrorResponse = await response.json()
      toast.error(`Workflow execution failed: ${errorData.detail}`)
      throw new Error(errorData.detail)
    }

    if (onEvent) {
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('Response body is not readable')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')

        // Keep the last incomplete line in buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event:')) {
            const eventType = line.substring(6).trim()
            continue
          }

          if (line.startsWith('data:')) {
            const eventData = line.substring(5).trim()

            // Parse the event if callback is provided
            if (onEvent && eventData) {
              try {
                const parsedData = JSON.parse(eventData)
                onEvent(parsedData.event || 'unknown', eventData)
              } catch {
                // If not JSON, pass as-is
                onEvent('data', eventData)
              }
            }
          }
        }
      }
    }

    return null // Streaming doesn't return a final response
  } catch (error) {
    console.error('Error executing workflow:', error)
    if (error instanceof Error) {
      toast.error(`Workflow execution error: ${error.message}`)
    }
    throw error
  }
}

/**
 * Cancel a running workflow execution
 * @param baseUrl - The AgentOS base URL
 * @param workflowId - The ID of the workflow
 * @param runId - The run ID to cancel
 */
export const cancelWorkflowRunAPI = async (
  baseUrl: string,
  workflowId: string,
  runId: string
): Promise<boolean> => {
  // Note: This endpoint may need to be added to the API if not yet available
  const url = `${baseUrl}/workflows/${workflowId}/runs/${runId}/cancel`

  try {
    const response = await fetch(url, {
      method: 'POST'
    })

    if (!response.ok) {
      const errorData: WorkflowErrorResponse = await response.json()
      toast.error(`Failed to cancel workflow: ${errorData.detail}`)
      return false
    }

    toast.success('Workflow marked for cancellation. Please wait')
    return true
  } catch (error) {
    console.error('Error cancelling workflow:', error)
    toast.error('Error cancelling workflow')
    return false
  }
}
