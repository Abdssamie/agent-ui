// Upload Progress List Component
// Displays upload progress for files being uploaded to knowledge base

import React, { useEffect, useState } from 'react'
import Icon from '@/components/ui/icon'
import { cn } from '@/lib/utils'

interface UploadProgressItem {
  name: string
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

interface UploadProgressListProps {
  uploads: Map<string, UploadProgressItem>
  className?: string
}

interface DisplayItem extends UploadProgressItem {
  id: string
  isRemoving?: boolean
}

const CircularProgress = ({ progress }: { progress: number }) => {
  const radius = 16
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative w-10 h-10">
      <svg className="transform -rotate-90 w-10 h-10">
        {/* Background circle */}
        <circle
          cx="20"
          cy="20"
          r={radius}
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          className="text-muted"
        />
        {/* Progress circle */}
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
      {/* Percentage text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-medium text-primary">
          {progress}%
        </span>
      </div>
    </div>
  )
}

export const UploadProgressList = ({
  uploads,
  className
}: UploadProgressListProps) => {
  const [displayItems, setDisplayItems] = useState<DisplayItem[]>([])

  useEffect(() => {
    // Convert Map to array and merge with existing display items
    const currentUploads = Array.from(uploads.entries()).map(([id, upload]) => ({
      id,
      ...upload
    }))

    setDisplayItems(prev => {
      const newItems = [...prev]
      
      // Add or update items
      currentUploads.forEach(upload => {
        const existingIndex = newItems.findIndex(item => item.id === upload.id)
        if (existingIndex >= 0) {
          // Update existing item
          newItems[existingIndex] = { ...newItems[existingIndex], ...upload }
        } else {
          // Add new item
          newItems.push(upload)
        }
      })

      // Mark completed/error items for removal after delay
      newItems.forEach(item => {
        if ((item.status === 'success' || item.status === 'error') && !item.isRemoving) {
          // Start fade-out after 2 seconds
          setTimeout(() => {
            setDisplayItems(prev => 
              prev.map(i => i.id === item.id ? { ...i, isRemoving: true } : i)
            )
            // Remove completely after fade animation (500ms)
            setTimeout(() => {
              setDisplayItems(prev => prev.filter(i => i.id !== item.id))
            }, 500)
          }, 2000)
        }
      })

      return newItems
    })
  }, [uploads])

  if (displayItems.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      {displayItems.map((upload) => (
        <div
          key={upload.id}
          className={cn(
            "border border-primary/15 rounded-xl p-3 bg-accent transition-all duration-500",
            upload.isRemoving && "opacity-0 scale-95"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {upload.status === 'uploading' && (
                <CircularProgress progress={upload.progress} />
              )}
              {upload.status === 'success' && (
                <div className="w-10 h-10 flex items-center justify-center">
                  <Icon type="check-circle" size="lg" className="text-green-500" />
                </div>
              )}
              {upload.status === 'error' && (
                <div className="w-10 h-10 flex items-center justify-center">
                  <Icon type="x-circle" size="lg" className="text-destructive" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs font-medium truncate text-primary">{upload.name}</p>
                <span className="text-xs font-medium uppercase flex-shrink-0">
                  {upload.status === 'uploading' && (
                    <span className="text-primary">Uploading...</span>
                  )}
                  {upload.status === 'success' && (
                    <span className="text-green-600">Complete</span>
                  )}
                  {upload.status === 'error' && (
                    <span className="text-destructive">Failed</span>
                  )}
                </span>
              </div>

              {upload.status === 'uploading' && (
                <div className="w-full bg-accent rounded-xl h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-xl transition-all duration-300"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}

              {upload.status === 'error' && upload.error && (
                <p className="text-xs text-destructive mt-1">{upload.error}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
