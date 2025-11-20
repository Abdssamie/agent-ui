// Upload Progress List Component
// Displays upload progress for files being uploaded to knowledge base

import React, { useEffect, useState, memo } from 'react'
import Icon from '@/components/ui/icon'
import { cn } from '@/lib/utils'

interface UploadProgressItemProps {
  id: string;
  name: string
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
  onRemove: (id: string) => void;
}

interface UploadProgressListProps {
  uploads: Map<string, Omit<UploadProgressItemProps, 'id' | 'onRemove'>>
  className?: string
  onRemoveUpload: (id: string) => void;
}

const CircularProgress = ({ progress }: { progress: number }) => {
  const radius = 16
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative w-10 h-10">
      <svg className="transform -rotate-90 w-10 h-10">
        <circle
          cx="20"
          cy="20"
          r={radius}
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          className="text-muted"
        />
        <circle
          cx="20"
          cy="20"
          r={radius}
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary transition-all duration-300"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-medium text-primary">
          {progress}%
        </span>
      </div>
    </div>
  )
}

const UploadProgressItem = memo(({
  id,
  name,
  progress,
  status,
  error,
  onRemove,
}: UploadProgressItemProps) => {
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (status === 'success' || status === 'error') {
      const removalTimer = setTimeout(() => {
        setIsRemoving(true);
        const unmountTimer = setTimeout(() => {
          onRemove(id);
        }, 500); // Corresponds to animation duration
        return () => clearTimeout(unmountTimer);
      }, 2000); // Wait 2 seconds before starting removal
      return () => clearTimeout(removalTimer);
    }
  }, [status, id, onRemove]);

  return (
    <div
      className={cn(
        "border border-primary/15 rounded-xl p-3 bg-accent transition-all duration-500",
        isRemoving && "opacity-0 scale-95"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {status === 'uploading' && (
            <CircularProgress progress={progress} />
          )}
          {status === 'success' && (
            <div className="w-10 h-10 flex items-center justify-center">
              <Icon type="check-circle" size="lg" className="text-green-500" />
            </div>
          )}
          {status === 'error' && (
            <div className="w-10 h-10 flex items-center justify-center">
              <Icon type="x-circle" size="lg" className="text-destructive" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-xs font-medium truncate text-primary">{name}</p>
            <span className="text-xs font-medium uppercase flex-shrink-0">
              {status === 'uploading' && (
                <span className="text-primary">Uploading...</span>
              )}
              {status === 'success' && (
                <span className="text-green-600">Complete</span>
              )}
              {status === 'error' && (
                <span className="text-destructive">Failed</span>
              )}
            </span>
          </div>
          {status === 'uploading' && (
            <div className="w-full bg-accent rounded-xl h-1.5">
              <div
                className="bg-primary h-1.5 rounded-xl transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          {status === 'error' && error && (
            <p className="text-xs text-destructive mt-1">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
});
UploadProgressItem.displayName = 'UploadProgressItem';

export const UploadProgressList = ({
  uploads,
  className,
  onRemoveUpload
}: UploadProgressListProps) => {

  const uploadItems = Array.from(uploads.entries());

  if (uploadItems.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      {uploadItems.map(([id, upload]) => (
        <UploadProgressItem
          key={id}
          id={id}
          name={upload.name}
          progress={upload.progress}
          status={upload.status}
          error={upload.error}
          onRemove={onRemoveUpload}
        />
      ))}
    </div>
  )
}
