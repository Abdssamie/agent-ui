'use client'
import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Icon from '@/components/ui/icon'
import { WorkflowSummary } from '@/types/workflow'
import { WorkflowVisualization } from './WorkflowVisualization'
import { parseWorkflowExecution } from '@/lib/workflowParser'
import { toast } from 'sonner'

interface WorkflowExecutionDialogProps {
  open: boolean
  onOpenChangeAction: (open: boolean) => void
  workflow: WorkflowSummary | null
  onExecuteAction: (message: string) => void
  isExecuting: boolean
  executionLogs: string[]
  onCancel?: () => void
  isCancelling?: boolean
}

export const WorkflowExecutionDialog = ({
  open,
  onOpenChangeAction,
  workflow,
  onExecuteAction,
  isExecuting,
  executionLogs,
  onCancel,
  isCancelling = false
}: WorkflowExecutionDialogProps) => {
  const [message, setMessage] = useState('')
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Parse logs into workflow execution object
  const workflowExecution = useMemo(() => {
    if (executionLogs.length === 0) return null

    const combinedLogs = executionLogs.join('\n')
    const result = parseWorkflowExecution(combinedLogs)

    if (result) {
      console.log('✅ Parsed workflow:', result.workflow_name, 'with', result.steps.length, 'steps')
    }

    return result
  }, [executionLogs])

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [executionLogs])

  const handleExecute = () => {
    if (message.trim() && !isExecuting) {
      onExecuteAction(message.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleExecute()
    }
  }

  const handleCopyLogs = () => {
    const logsText = executionLogs.join('\n')
    navigator.clipboard.writeText(logsText)
      .then(() => {
        toast.success('Raw logs copied to clipboard')
      })
      .catch(() => {
        toast.error('Failed to copy logs')
      })
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}  >
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col bg-background/95 backdrop-blur-sm rounded-xl border !scrollbar-thick border-primary/15">
        <DialogHeader>
          <DialogTitle className="text-xs font-medium uppercase text-primary">
            Execute Workflow
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {workflow?.name || 'Unknown Workflow'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden px-2">
          {/* Input Section */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase text-muted">
              Message
            </label>
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter workflow message..."
                disabled={isExecuting}
                className="flex-1 rounded-xl border-primary/15 bg-accent text-xs text-primary placeholder:text-muted"
              />
              <Button
                onClick={handleExecute}
                disabled={!message.trim() || isExecuting}
                className="flex items-center gap-2 rounded-xl bg-primary text-background hover:bg-primary/90 disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <Icon type="loader" size="xs" className="animate-spin text-background" />
                    <span className="text-xs font-semibold uppercase">Running</span>
                  </>
                ) : (
                  <>
                    <Icon type="send" size="xs" className="text-background" />
                    <span className="text-xs font-semibold uppercase">Execute</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Execution Results */}
          {executionLogs.length > 0 && (
            <div className="flex-1 flex flex-col gap-2 overflow-hidden">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium uppercase text-muted">
                  Execution Results
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleCopyLogs}
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-primary/15 text-xs"
                  >
                    <Icon type="copy" size="xs" />
                    <span className="text-xs font-medium uppercase">Copy Raw Logs</span>
                  </Button>
                  {isExecuting && onCancel && (
                    <Button
                      onClick={onCancel}
                      variant="outline"
                      size="sm"
                      disabled={isCancelling}
                      className="rounded-xl border-primary/15 text-xs"
                    >
                      {isCancelling ? (
                        <>
                          <Icon type="loader" size="xs" className="animate-spin" />
                          <span className="text-xs font-medium uppercase">Cancelling...</span>
                        </>
                      ) : (
                        <>
                          <Icon type="x" size="xs" />
                          <span className="text-xs font-medium uppercase">Cancel</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <div className="h-full rounded-xl border border-primary/15 bg-accent/50 p-4 overflow-y-auto">
                  {workflowExecution ? (
                    <WorkflowVisualization execution={workflowExecution} />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center space-y-2">
                        <Icon type="loader" size="md" className="mx-auto text-muted" />
                        <p className="text-xs text-muted-foreground">
                          {isExecuting ? 'Parsing workflow execution...' : 'No workflow execution data available'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {executionLogs.length === 0 && !isExecuting && (
            <div className="flex-1 flex items-center justify-center rounded-xl border border-primary/15 bg-accent/50 p-8">
              <div className="text-center space-y-2">
                <Icon type="info" size="md" className="mx-auto text-muted" />
                <p className="text-xs text-muted-foreground">
                  Enter a message and click Execute to start the workflow
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
