'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { WorkflowGrid } from './WorkflowGrid'
import { FilterPanel, SearchBar, SortSelector, usePersistentState } from './Controls'
import { WorkflowExecutionDialog } from './WorkflowExecutionDialog'
import { ActiveRunsWarningDialog } from './ActiveRunsWarningDialog'
import { getWorkflowsAPI, getWorkflowDetailsAPI, executeWorkflowAPI, cancelWorkflowRunAPI } from '@/api/workflows'
import { parseWorkflowLogLine } from '@/lib/workflowParser'
import { WorkflowSummary } from '@/types/workflow'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/icon'
import { toast } from 'sonner'
import { useWorkflowStore } from '@/stores/workflowStore'

interface WorkflowManagerProps {
  baseUrl: string
  dbId?: string | null
}

export const WorkflowManager = ({ baseUrl, dbId }: WorkflowManagerProps) => {
  const { isExecuting, setIsExecuting } = useWorkflowStore()
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = usePersistentState<string>('wf.query', '')
  const [filters, setFilters] = usePersistentState<{ query: string; category: 'all' | string; status: 'all' | 'active' | 'inactive'; date: 'any' | '24h' | '7d' | '30d' }>('wf.filters', { query: '', category: 'all', status: 'all', date: 'any' })
  const [sortKey, setSortKey] = usePersistentState<'name' | 'date' | 'execCount'>('wf.sort', 'name')
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowSummary | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [executionLogs, setExecutionLogs] = useState<string[]>([])
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showNavigationWarning, setShowNavigationWarning] = useState(false)
  const wasCancelledRef = useRef(false)
  const hasLoadedRef = useRef(false)

  const executingWorkflowId = selectedWorkflow?.id || null

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

  const handleTrigger = async (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId)
    
    if (workflow) {
      // Fetch detailed workflow info (including input_schema)
      try {
        const detailedWorkflow = await getWorkflowDetailsAPI(baseUrl, workflowId, dbId)
        setSelectedWorkflow(detailedWorkflow)
      } catch (error) {
        console.error('Error fetching workflow details:', error)
        // Fallback to basic workflow info
        setSelectedWorkflow(workflow)
      }
      
      setDialogOpen(true)
    }
  }

  // Prevent closing dialog while workflow is running
  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open && isExecuting) {
      setShowNavigationWarning(true)
    } else {
      setDialogOpen(open)
    }
  }, [isExecuting])

  const handleExecute = async (message: string) => {
    if (!selectedWorkflow?.id) return

    setIsExecuting(true)
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

          const logLine = parseWorkflowLogLine(`[${event}] ${data}`)
          if (logLine?.event) {
            switch (logLine.event.event) {
              case 'WorkflowCompleted':
              case 'WorkflowCancelled':
              case 'WorkflowError':
                setIsExecuting(false)
                break
            }
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

  // Memoize filters object to prevent infinite re-renders
  const filtersWithQuery = useMemo(() => ({ ...filters, query: searchQuery }), [filters, searchQuery])

  // Search + filter + sort with memoization
  const filteredWorkflows = useMemo(() => {
    const q = (searchQuery || filters.query || '').toLowerCase()
    const list = workflows.filter(w => {
      const matchesQuery = q
        ? (w.name?.toLowerCase().includes(q) || w.id?.toLowerCase().includes(q) || w.description?.toLowerCase().includes(q))
        : true
      const matchesCategory = filters.category === 'all' ? true : (w as any).category === filters.category
      const matchesStatus = filters.status === 'all' ? true : ((w as any).active ? 'active' : 'inactive') === filters.status
      const matchesDate = (() => {
        const ts = (w as any).updated_at || (w as any).created_at
        if (!ts || filters.date === 'any') return true
        const now = Date.now()
        const t = new Date(ts).getTime()
        const diff = now - t
        if (filters.date === '24h') return diff <= 24 * 60 * 60 * 1000
        if (filters.date === '7d') return diff <= 7 * 24 * 60 * 60 * 1000
        if (filters.date === '30d') return diff <= 30 * 24 * 60 * 60 * 1000
        return true
      })()
      return matchesQuery && matchesCategory && matchesStatus && matchesDate
    })

    list.sort((a, b) => {
      if (sortKey === 'name') return (a.name || '').localeCompare(b.name || '')
      if (sortKey === 'date') {
        const ad = new Date((a as any).updated_at || (a as any).created_at || 0).getTime()
        const bd = new Date((b as any).updated_at || (b as any).created_at || 0).getTime()
        return bd - ad
      }
      // execCount
      const ae = (a as any).execution_count || 0
      const be = (b as any).execution_count || 0
      return be - ae
    })

    return list
  }, [workflows, searchQuery, filters, sortKey])

  return (
    <div className="flex h-full flex-col bg-background pt-16">
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-xs font-medium uppercase">
              Workflows
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage and execute automated workflows
            </p>
          </div>

          {/* Search / Filters / Controls */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
              </div>
              <SortSelector value={sortKey} onChange={setSortKey} />
              <Button onClick={loadWorkflows} disabled={isLoading} variant="outline" className="rounded-xl border-primary/15">
                <Icon type="refresh" size="xs" className={isLoading ? 'animate-spin' : ''} />
                <span className="text-xs font-medium uppercase">Refresh</span>
              </Button>
            </div>
            <FilterPanel filters={filtersWithQuery} onChange={setFilters} />
          </div>

          {/* Workflows List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <Icon type="loader" size="md" className="mx-auto animate-spin" />
                <p className="text-xs text-muted-foreground">Loading workflows...</p>
              </div>
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-xl bg-accent border border-primary/15 flex items-center justify-center">
                  <Icon type="database" size="md" />
                </div>
                <div>
                  <h3 className="text-xs font-medium uppercase mb-1">
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <WorkflowGrid
                workflows={filteredWorkflows}
                isLoading={isLoading}
                onTriggerAction={handleTrigger}
                isExecutingId={executingWorkflowId}
              />
            </motion.div>
          )}

          {/* Stats */}
          {!isLoading && workflows.length > 0 && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Total: {workflows.length} workflows</span>
              {(searchQuery || filters.category !== 'all' || filters.status !== 'all' || filters.date !== 'any') && (
                <span>Showing: {filteredWorkflows.length} results</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Execution Dialog */}
      <WorkflowExecutionDialog
        open={dialogOpen}
        onOpenChangeAction={handleDialogOpenChange}
        workflow={selectedWorkflow}
        onExecuteAction={handleExecute}
        isExecuting={isExecuting}
        executionLogs={executionLogs}
        onCancel={handleCancel}
        isCancelling={isCancelling}
      />

      <ActiveRunsWarningDialog
        open={showNavigationWarning}
        onConfirm={() => {
          setShowNavigationWarning(false)
          setDialogOpen(false)
        }}
        onCancel={() => setShowNavigationWarning(false)}
        activeRunCount={1}
      />
      </div>
  )
}
