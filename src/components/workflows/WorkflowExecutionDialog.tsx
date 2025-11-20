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
import { TextArea } from '@/components/ui/textarea'
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
  const prevWorkflowIdRef = useRef<string | null>(null)
  const [message, setMessage] = useState('')
  const [inputMode, setInputMode] = useState<'simple' | 'json'>('simple')
  const [jsonInput, setJsonInput] = useState('{\n  "message": "",\n  "images": []\n}')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Determine input type from schema
  const inputType = useMemo(() => {
    // If no input_schema, default to string input (message field)
    if (!workflow?.input_schema) {
      return 'string'
    }
    
    const schema = workflow.input_schema
    
    // Check if it's a string type (simple message)
    if (schema.type === 'string') return 'string'
    
    // Check if it's an object type (structured JSON)
    if (schema.type === 'object' || schema.properties) return 'object'
    
    // Check if schema has anyOf with string type (Pydantic sometimes generates this)
    if (schema.anyOf) {
      const hasString = schema.anyOf.some((s: any) => s.type === 'string')
      if (hasString) return 'string'
    }
    
    // Default to string for unknown types
    return 'string'
  }, [workflow])

  // Helper function to generate template from schema
  const generateTemplateFromSchema = (schema: Record<string, any>): Record<string, any> => {
    const template: Record<string, any> = {}
    
    if (!schema.properties) {
      return { message: '' }
    }

    for (const [key, value] of Object.entries(schema.properties)) {
      const prop = value as any
      
      if (prop.type === 'string') {
        template[key] = prop.default || ''
      } else if (prop.type === 'array') {
        template[key] = prop.default || []
      } else if (prop.type === 'object') {
        template[key] = prop.default || {}
      } else if (prop.type === 'boolean') {
        template[key] = prop.default || false
      } else if (prop.type === 'number' || prop.type === 'integer') {
        template[key] = prop.default || 0
      } else {
        template[key] = prop.default || null
      }
    }

    return template
  }

  // Reset state when workflow changes
  if (workflow?.id !== prevWorkflowIdRef.current) {
    prevWorkflowIdRef.current = workflow?.id || null
    
    if (inputType === 'string') {
      setInputMode('simple')
      setMessage('')
      if (workflow?.metadata?.json_input_example) {
        setJsonInput(JSON.stringify(workflow.metadata.json_input_example, null, 2))
      } else {
        setJsonInput('{\n  "message": ""\n}')
      }
    } else {
      setInputMode('json')
      setMessage('')
      const template = generateTemplateFromSchema(workflow?.input_schema || {})
      setJsonInput(JSON.stringify(template, null, 2))
    }
  }

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
    if (isExecuting) return

    if (inputMode === 'simple') {
      // String input - wrap in JSON object with "message" field
      if (message.trim()) {
        const inputData = { message: message.trim() }
        onExecuteAction(JSON.stringify(inputData))
      }
    } else {
      // JSON mode
      try {
        const parsed = JSON.parse(jsonInput)
        setJsonError(null)
        onExecuteAction(JSON.stringify(parsed))
      } catch (error) {
        setJsonError(error instanceof Error ? error.message : 'Invalid JSON')
        toast.error('Invalid JSON input')
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && inputMode === 'simple') {
      e.preventDefault()
      handleExecute()
    }
  }

  const handleJsonChange = (value: string) => {
    setJsonInput(value)
    // Clear error when user starts typing
    if (jsonError) {
      setJsonError(null)
    }
  }

  const toggleInputMode = () => {
    const newMode = inputMode === 'simple' ? 'json' : 'simple'
    setInputMode(newMode)
    
    // Convert between modes
    if (newMode === 'json' && message.trim()) {
      setJsonInput(JSON.stringify({ message: message.trim(), images: [] }, null, 2))
    } else if (newMode === 'simple' && jsonInput.trim()) {
      try {
        const parsed = JSON.parse(jsonInput)
        if (parsed.message) {
          setMessage(parsed.message)
        }
      } catch {
        // Ignore parse errors when switching modes
      }
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
        <DialogHeader className="pr-12">
          <DialogTitle className="text-xs font-medium uppercase text-primary">
            Execute Workflow
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground break-words pr-2">
            {workflow?.name || 'Unknown Workflow'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden px-2">
          {/* Input Section */}
          <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium uppercase text-muted">
                  {inputMode === 'simple' ? 'Message' : 'JSON Input'}
                </label>
                {inputType === 'string' && (
                  <Button
                    onClick={toggleInputMode}
                    variant="ghost"
                    size="sm"
                    disabled={isExecuting}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                  >
                    <Icon type={inputMode === 'simple' ? 'file' : 'edit'} size="xs" />
                    <span className="ml-1">{inputMode === 'simple' ? 'JSON Mode' : 'Simple Mode'}</span>
                  </Button>
                )}
              </div>

              {inputMode === 'simple' ? (
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
            ) : (
              <div className="space-y-2">
                <TextArea
                  value={jsonInput}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleJsonChange(e.target.value)}
                  placeholder='{\n  "message": "Your message here",\n  "images": [\n    {\n      "image_path": "uploads/image.png",\n      "description": "Image description",\n      "ratio": "landscape"\n    }\n  ]\n}'
                  disabled={isExecuting}
                  className={`min-h-[120px] font-mono text-xs rounded-xl border-primary/15 bg-accent text-primary placeholder:text-muted ${
                    jsonError ? 'border-red-500' : ''
                  }`}
                />
                {jsonError && (
                  <p className="text-xs text-red-500">{jsonError}</p>
                )}
                <Button
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-background hover:bg-primary/90 disabled:opacity-50"
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
            )}
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
