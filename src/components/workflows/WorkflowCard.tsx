'use client'
import { motion } from 'framer-motion'
import { WorkflowSummary } from '@/types/workflow'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/icon'

interface WorkflowCardProps {
  workflow: WorkflowSummary
  onTriggerAction: (workflowId: string) => void
  isExecuting?: boolean
  variant?: 'card' | 'list'
}

export const WorkflowCard = ({ workflow, onTriggerAction, isExecuting, variant = 'card' }: WorkflowCardProps) => {
  const containerClass = 'rounded-xl border p-4'
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={containerClass}
    >
      <div className={variant === 'list' ? 'flex items-center justify-between gap-3' : 'flex items-start justify-between gap-4'}>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border">
              <Icon type="database" size="sm" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium">
                {workflow.name || 'Unnamed Workflow'}
              </h3>
              {workflow.id && (
                <p className="text-xs text-muted-foreground font-mono">
                  {workflow.id}
                </p>
              )}
            </div>
          </div>

          {workflow.description && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {workflow.description}
            </p>
          )}

          {workflow.db_id && (
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-medium">DB:</span>
              <span className="text-xs text-muted-foreground font-mono">{workflow.db_id}</span>
            </div>
          )}
        </div>

        <Button
          onClick={() => workflow.id && onTriggerAction(workflow.id)}
          disabled={!workflow.id}
          size="sm"
          className="flex items-center gap-2 rounded-xl bg-accent text-primary border border-primary/15"
        >
          {isExecuting ? (
            <>
              <Icon type="loader" size="xs" className="animate-spin" />
              <span className="text-xs font-semibold uppercase">Running</span>
            </>
          ) : (
            <>
              <Icon type="send" size="xs" />
              <span className="text-xs font-semibold uppercase">Trigger</span>
            </>
          )}
        </Button>
      </div>
    </motion.div>
  )
}
