'use client'

import { UploadProgress } from '@/types/content'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface UploadQueueProps {
  uploads: UploadProgress[]
}

export function UploadQueue({ uploads }: UploadQueueProps) {
  if (uploads.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 w-80 space-y-2">
      {uploads.map((upload) => (
        <div
          key={upload.id}
          className="rounded-lg border bg-card p-4 shadow-lg"
        >
          <div className="flex items-center gap-3">
            {upload.status === 'uploading' && (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            )}
            {upload.status === 'success' && (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            {upload.status === 'error' && (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <div className="flex-1">
              <p className="truncate text-sm font-medium">{upload.name}</p>
              {upload.status === 'uploading' && (
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}
              {upload.error && (
                <p className="mt-1 text-xs text-destructive">{upload.error}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
