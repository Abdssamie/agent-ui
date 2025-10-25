'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { WorkflowCard } from './WorkflowCard'
import { WorkflowExecutionDialog } from './WorkflowExecutionDialog'
import { getWorkflowsAPI, executeWorkflowAPI, cancelWorkflowRunAPI } from '@/api/workflows'
import { WorkflowSummary } from '@/types/workflow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Icon from '@/components/ui/icon'
import { toast } from 'sonner'

interface WorkflowManagerProps {
  baseUrl: string
  dbId?: string | null
}

export const WorkflowManager = ({ baseUrl, dbId }: WorkflowManagerProps) => {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowSummary | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionLogs, setExecutionLogs] = useState<string[]>([])
  const [executingWorkflowId, setExecutingWorkflowId] = useState<string | null>(null)
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const wasCancelledRef = useRef(false)
  const hasLoadedRef = useRef(false)

  const loadWorkflows = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getWorkflowsAPI(baseUrl, dbId)
      setWorkflows(data)
    } catch (error) {
      console.error('Error loading workflows:', error)
      toast.error('Failed to load workflows')
    } finally {
      setIsLoading(false)
    }
  }, [baseUrl, dbId])

  // Load workflows on mount (only once)
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadWorkflows()
    }
  }, [loadWorkflows])

  const handleTrigger = (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId)
    
    if (workflow) {
      setSelectedWorkflow(workflow)
      // Only reset logs if this is a different workflow or not currently executing
      if (executingWorkflowId !== workflowId) {
        setExecutionLogs([])
      }
      setDialogOpen(true)
    }
  }

  const handleExecute = async (message: string) => {
    if (!selectedWorkflow?.id) return

    setIsExecuting(true)
    setExecutingWorkflowId(selectedWorkflow.id)
    setCurrentRunId(null)
    wasCancelledRef.current = false
    setExecutionLogs([`Starting workflow: ${selectedWorkflow.name}`])

    try {
      await executeWorkflowAPI(
        baseUrl,
        selectedWorkflow.id,
        {
          message,
          stream: true,
          session_id: null,
          user_id: null
        },
        (event, data) => {
          // Handle streaming events
          setExecutionLogs(prev => [...prev, `[${event}] ${data}`])
          
          // Extract workflow_run_id from workflow events
          try {
            const parsedData = JSON.parse(data)
            // Use workflow_run_id for workflow cancellation, not agent run_id
            if (parsedData.workflow_run_id && !currentRunId) {
              setCurrentRunId(parsedData.workflow_run_id)
            }
            // Fallback to run_id only if it's a WorkflowStarted event (which has the workflow run_id)
            else if (parsedData.event === 'WorkflowStarted' && parsedData.run_id && !currentRunId) {
              setCurrentRunId(parsedData.run_id)
            }
          } catch {
            // Ignore parsing errors - data might not be JSON
          }
        }
      )
      
      // Only show success if not cancelled
      if (!wasCancelledRef.current) {
        setExecutionLogs(prev => [...prev, 'Workflow completed successfully'])
        toast.success('Workflow executed successfully')
      }
    } catch (error) {
      console.error('Workflow execution error:', error)
      // Only show error if not cancelled
      if (!wasCancelledRef.current) {
        setExecutionLogs(prev => [...prev, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`])
        toast.error('Workflow execution failed')
      }
    } finally {
      setIsExecuting(false)
      setExecutingWorkflowId(null)
      setCurrentRunId(null)
    }
  }

  const handleCancel = async () => {
    if (!selectedWorkflow?.id || !currentRunId) {
      toast.error('Unable to cancel: workflow or run ID not available')
      return
    }

    // Prevent multiple cancel requests
    if (isCancelling) {
      return
    }

    setIsCancelling(true)
    wasCancelledRef.current = true
    setExecutionLogs(prev => [...prev, 'Cancelling workflow...'])

    try {
      const success = await cancelWorkflowRunAPI(
        baseUrl,
        selectedWorkflow.id,
        currentRunId
      )
      
      if (success) {
        setIsExecuting(false)
        setExecutingWorkflowId(null)
        setCurrentRunId(null)
        setExecutionLogs(prev => [...prev, 'Workflow cancelled by user'])
      }
    } catch (error) {
      console.error('Error cancelling workflow:', error)
      toast.error('Failed to cancel workflow')
    } finally {
      setIsCancelling(false)
    }
  }

  // Filter workflows based on search
  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workflow.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workflow.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-full flex-col bg-background pt-16">
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-xs font-medium uppercase text-primary">
              Workflows
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage and execute automated workflows
            </p>
          </div>

          {/* Search and Refresh */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Icon
                type="search"
                size="xs"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workflows..."
                className="pl-9 rounded-xl border-primary/15 bg-accent text-xs text-primary placeholder:text-muted"
              />
            </div>
            <Button
              onClick={loadWorkflows}
              disabled={isLoading}
              variant="outline"
              className="rounded-xl border-primary/15"
            >
              <Icon
                type="refresh"
                size="xs"
                className={isLoading ? 'animate-spin' : ''}
              />
              <span className="text-xs font-medium uppercase">Refresh</span>
            </Button>
          </div>

          {/* Workflows List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <Icon type="loader" size="md" className="mx-auto animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Loading workflows...</p>
              </div>
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-xl bg-accent border border-primary/15 flex items-center justify-center">
                  <Icon type="database" size="md" className="text-muted" />
                </div>
                <div>
                  <h3 className="text-xs font-medium uppercase text-primary mb-1">
                    {searchQuery ? 'No workflows found' : 'No workflows available'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {searchQuery
                      ? 'Try adjusting your search query'
                      : 'No workflows configured in this AgentOS instance'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <motion.div
              className="grid gap-4 md:grid-cols-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {filteredWorkflows.map((workflow) => (
                <WorkflowCard
                  key={workflow.id}
                  workflow={workflow}
                  onTriggerAction={handleTrigger}
                  isExecuting={executingWorkflowId === workflow.id}
                />
              ))}
            </motion.div>
          )}

          {/* Stats */}
          {!isLoading && workflows.length > 0 && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Total: {workflows.length} workflows</span>
              {searchQuery && (
                <span>Showing: {filteredWorkflows.length} results</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Execution Dialog */}
      <WorkflowExecutionDialog
        open={dialogOpen}
        onOpenChangeAction={setDialogOpen}
        workflow={selectedWorkflow}
        onExecuteAction={handleExecute}
        isExecuting={isExecuting}
        executionLogs={executionLogs}
        onCancel={handleCancel}
        isCancelling={isCancelling}
      />
    </div>
  )
}
