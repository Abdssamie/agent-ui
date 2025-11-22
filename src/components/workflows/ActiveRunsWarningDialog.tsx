'use client'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import Icon from '@/components/ui/icon'

interface ActiveRunsWarningDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  activeRunCount: number
}

export const ActiveRunsWarningDialog = ({
  open,
  onConfirm,
  onCancel,
  activeRunCount
}: ActiveRunsWarningDialogProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <Icon type="alert-circle" size="sm" className="text-destructive" />
            </div>
            <AlertDialogTitle>Active Workflow Running</AlertDialogTitle>
          </div>
        </AlertDialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            You have <span className="font-semibold">{activeRunCount} active workflow{activeRunCount !== 1 ? 's' : ''}</span> currently running.
          </p>
          <p>
            Leaving this view will <span className="font-semibold text-destructive">disconnect the real-time WebSocket connection</span> and you will lose:
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>Live execution logs and streaming data</li>
            <li>Real-time status updates</li>
            <li>The ability to cancel the workflow</li>
          </ul>
          <p className="text-sm">
            The workflow will continue running on the server, but you won&apos;t be able to monitor or control it.
          </p>
        </div>
        <div className="flex gap-3 pt-4">
          <AlertDialogCancel onClick={onCancel}>
            Stay Here
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
            Leave Anyway
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
