'use client'

import { ContentItem } from '@/types/content'
import { formatFileSize } from '@/lib/content/validation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/icon'

interface ContentPreviewDialogProps {
  item: ContentItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: (id: string) => void
  onDownload: (item: ContentItem) => void
  loading: boolean
}

export function ContentPreviewDialog({
  item,
  open,
  onOpenChange,
  onDelete,
  onDownload,
  loading,
}: ContentPreviewDialogProps) {
  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scrollbar-thick max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-2">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Icon type="loader" size="lg" className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {item.type === 'image' && item.url && (
                <div className="flex max-h-[50vh] items-center justify-center overflow-hidden rounded-lg border bg-muted">
                  <img
                    src={item.url}
                    alt={item.name}
                    className="max-h-[50vh] w-full object-contain"
                  />
                </div>
              )}
              {item.type === 'pdf' && item.url && (
                <div className="h-[60vh] overflow-hidden rounded-lg border">
                  <iframe
                    src={item.url}
                    className="h-full w-full"
                    title={item.name}
                  />
                </div>
              )}
              {item.type === 'video' && item.url && (
                <div className="overflow-hidden rounded-lg border bg-black">
                  <video
                    src={item.url}
                    controls
                    className="w-full"
                    preload="metadata"
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
              )}
            </>
          )}
          <div className="space-y-2">
            <div className="flex justify-between py-1.5">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="text-sm font-medium capitalize">{item.type}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-sm text-muted-foreground">Size</span>
              <span className="text-sm font-medium">{formatFileSize(item.size)}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-sm text-muted-foreground">Uploaded</span>
              <span className="text-sm font-medium">
                {new Date(item.uploadedAt).toLocaleDateString()}
              </span>
            </div>
            {item.metadata?.mimeType && (
              <div className="flex justify-between py-1.5">
                <span className="text-sm text-muted-foreground">MIME Type</span>
                <span className="text-sm font-medium">{item.metadata.mimeType}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3 pb-4 pt-2">
            <Button
              onClick={() => onDownload(item)}
              variant="outline"
              className="flex-1"
            >
              <Icon type="download" size="sm" className="mr-2" />
              Download
            </Button>
            <Button
              onClick={() => {
                onDelete(item.id)
                onOpenChange(false)
              }}
              variant="destructive"
              className="flex-1"
            >
              <Icon type="trash" size="sm" className="mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
