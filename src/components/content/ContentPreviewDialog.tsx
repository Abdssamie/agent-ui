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
}

export function ContentPreviewDialog({
  item,
  open,
  onOpenChange,
  onDelete,
  onDownload,
}: ContentPreviewDialogProps) {
  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {item.type === 'image' && item.url && (
            <img
              src={item.url}
              alt={item.name}
              className="w-full rounded-lg"
            />
          )}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">{item.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size:</span>
              <span className="font-medium">{formatFileSize(item.size)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uploaded:</span>
              <span className="font-medium">
                {new Date(item.uploadedAt).toLocaleDateString()}
              </span>
            </div>
            {item.metadata?.mimeType && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">MIME Type:</span>
                <span className="font-medium">{item.metadata.mimeType}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
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
