'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  Clock,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react'
import type { WorkflowExecution, WorkflowStep } from '@/types/workflow'
import { formatDuration, formatTimestamp } from '@/utils/workflow'
import { cn } from '@/lib/utils'

interface WorkflowVisualizationProps {
  execution: WorkflowExecution
  className?: string
}

function getStatusIcon(status: WorkflowStep['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />
    case 'running':
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
    case 'error':
      return <XCircle className="h-5 w-5 text-red-500" />
    case 'cancelled':
      return <AlertCircle className="h-5 w-5 text-orange-500" />
    case 'pending':
      return <Circle className="h-5 w-5 text-muted-foreground" />
  }
}

function getStatusColor(status: WorkflowStep['status']) {
  switch (status) {
    case 'completed':
      return 'border-green-500/30 bg-green-500/5'
    case 'running':
      return 'border-blue-500/30 bg-blue-500/5'
    case 'error':
      return 'border-red-500/30 bg-red-500/5'
    case 'cancelled':
      return 'border-orange-500/30 bg-orange-500/5'
    case 'pending':
      return 'border-primary/15 bg-accent'
  }
}

function getWorkflowStatusBadge(status: WorkflowExecution['status']) {
  switch (status) {
    case 'completed':
      return (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-xs font-medium text-green-500">Completed</span>
        </div>
      )
    case 'running':
      return (
        <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-xs font-medium text-blue-500">Running</span>
        </div>
      )
    case 'error':
      return (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5">
          <XCircle className="h-4 w-4 text-red-500" />
          <span className="text-xs font-medium text-red-500">Error</span>
        </div>
      )
    case 'cancelled':
      return (
        <div className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <span className="text-xs font-medium text-orange-500">
            Cancelled
          </span>
        </div>
      )
  }
}

export function WorkflowVisualization({
  execution,
  className,
}: WorkflowVisualizationProps) {
  const [copiedSteps, setCopiedSteps] = useState<Set<string>>(new Set())

  const handleCopyContent = async (stepId: string, content: any) => {
    try {
      const textToCopy = typeof content === 'string' 
        ? content 
        : JSON.stringify(content, null, 2)
      await navigator.clipboard.writeText(textToCopy)
      setCopiedSteps(prev => new Set(prev).add(stepId))
      setTimeout(() => {
        setCopiedSteps(prev => {
          const newSet = new Set(prev)
          newSet.delete(stepId)
          return newSet
        })
      }, 2000)
    } catch (error) {
      console.error('Failed to copy content:', error)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-4', className)}
    >
      {/* Workflow Header */}
      <div className="rounded-xl border border-primary/15 bg-accent p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-medium text-primary">
              {execution.workflow_name}
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatTimestamp(execution.started_at)}</span>
              </div>
              {execution.duration && (
                <span>Duration: {formatDuration(execution.duration)}</span>
              )}
            </div>
          </div>
          {getWorkflowStatusBadge(execution.status)}
        </div>
      </div>

      {/* Error Messages */}
      {execution.errors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-red-500/30 bg-red-500/5 p-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-500">
                Workflow Errors
              </p>
              {[...new Set(execution.errors)].map((error, idx) => (
                    <p key={idx} className="text-xs text-red-500/80">
                      {error}
                    </p>
                  ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Steps Timeline */}
      <div className="space-y-3">
        {execution.steps.map((step, idx) => (
          <motion.div
            key={step.step_id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={cn(
              'relative rounded-xl border p-4 transition-all',
              getStatusColor(step.status)
            )}
          >
            <div className="flex items-start gap-3">
              {/* Status Icon */}
              <div className="mt-0.5 flex-shrink-0">{getStatusIcon(step.status)}</div>

              {/* Step Content */}
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium uppercase text-muted">
                        Step {typeof step.step_index === 'number' ? step.step_index : step.step_index.join('.')}
                      </span>
                      <h4 className="font-medium text-primary">
                        {step.step_name}
                      </h4>
                    </div>
                    {step.executor_name && (
                      <p className="text-xs text-muted-foreground">
                        {step.executor_type}: {step.executor_name}
                      </p>
                    )}
                  </div>
                  {step.duration !== undefined && (
                    <span className="flex-shrink-0 text-xs text-muted-foreground">
                      {formatDuration(step.duration)}
                    </span>
                  )}
                </div>

                {/* Step Content/Output */}
                {step.content !== undefined && (
                  <div className="relative rounded-lg border border-primary/10 bg-background/50 p-3">
                    <button
                      onClick={() => handleCopyContent(step.step_id, step.content)}
                      className="absolute right-2 top-2 rounded-md bg-accent/80 p-1.5 opacity-60 transition-all hover:bg-accent hover:opacity-100 hover:text-primary"
                      title="Copy content"
                    >
                      {copiedSteps.has(step.step_id) ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                    <pre className="overflow-x-auto text-xs text-muted-foreground pr-8">
                      {typeof step.content === 'string'
                        ? step.content
                        : JSON.stringify(step.content, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Error Message */}
                {step.error && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                    <p className="text-xs text-red-500">{step.error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline Connector */}
            {idx < execution.steps.length - 1 && (
              <div className="absolute -bottom-3 left-[22px] h-3 w-px bg-primary/15" />
            )}
          </motion.div>
        ))}
      </div>

      {/* Workflow Summary */}
      <div className="rounded-xl border border-primary/15 bg-accent p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium uppercase text-muted">Summary</span>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span>
              {execution.steps.filter((s) => s.status === 'completed').length}/
              {execution.status === 'cancelled' ? '?' : execution.steps.length} completed
            </span>
            {execution.steps.filter((s) => s.status === 'error').length > 0 && (
              <span className="text-red-500">
                {execution.steps.filter((s) => s.status === 'error').length}{' '}
                failed
              </span>
            )}
            {execution.steps.filter((s) => s.status === 'cancelled').length > 0 && (
              <span className="text-orange-500">
                {execution.steps.filter((s) => s.status === 'cancelled').length}{' '}
                cancelled
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}