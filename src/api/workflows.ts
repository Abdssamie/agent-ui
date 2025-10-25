import { toast } from 'sonner'
import { APIRoutes } from './routes'
import type {
  WorkflowErrorResponse,
  WorkflowExecutionInput,
  WorkflowExecutionResponse,
  WorkflowSummary
} from '@/types/workflow'

/**
 * Fetch all available workflows from the AgentOS instance
 */
export const getWorkflowsAPI = async (
  baseUrl: string,
  dbId?: string | null,
): Promise<WorkflowSummary[]> => {
  const url = APIRoutes.Workflows.ListWorkflows(baseUrl, dbId)
  
  try {
    const response = await fetch(url, { method: 'GET' })
    
    if (!response.ok) {
      const errorData: WorkflowErrorResponse = await response.json()
      toast.error(`Failed to fetch workflows: ${errorData.detail}`)
      return []
    }
    


    return await response.json()
  } catch (error) {
    console.error('Error fetching workflows:', error)
    toast.error('Error fetching workflows')
    return []
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
  
  try {
    // Prepare form data
    const formData = new FormData()
    formData.append('message', input.message)
    formData.append('stream', String(input.stream ?? true))
    if (input.session_id) formData.append('session_id', input.session_id)
    if (input.user_id) formData.append('user_id', input.user_id)

    const response = await fetch(url, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData: WorkflowErrorResponse = await response.json()
      toast.error(`Workflow execution failed: ${errorData.detail}`)
      throw new Error(errorData.detail)
    }

    // Handle streaming response (SSE)
    if (input.stream && onEvent) {
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
      
      return null // Streaming doesn't return a final response
    }

    // Handle non-streaming response

    return await response.json()
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
