'use client'
import { motion } from 'framer-motion'
import { WorkflowSummary } from '@/types/workflow'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/icon'

interface WorkflowCardProps {
  workflow: WorkflowSummary
  onTriggerAction: (workflowId: string) => void
  isExecuting?: boolean
}

export const WorkflowCard = ({ workflow, onTriggerAction, isExecuting }: WorkflowCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/15 bg-accent p-4 transition-colors hover:bg-primaryAccent/20"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primaryAccent border border-primary/15">
              <Icon type="database" size="sm" className="text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-primary">
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
              <span className="text-xs text-muted uppercase font-medium">DB:</span>
              <span className="text-xs text-muted-foreground font-mono">{workflow.db_id}</span>
            </div>
          )}
        </div>

        <Button
          onClick={() => workflow.id && onTriggerAction(workflow.id)}
          disabled={!workflow.id}
          size="sm"
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
              <span className="text-xs font-semibold uppercase">Trigger</span>
            </>
          )}
        </Button>
      </div>
    </motion.div>
  )
}
