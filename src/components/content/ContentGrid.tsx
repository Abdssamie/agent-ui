'use client'

import { ContentItem } from '@/types/content'
import { FileIcon, Trash2 } from 'lucide-react'
import { formatFileSize } from '@/lib/content/validation'
import { Button } from '@/components/ui/button'

interface ContentGridProps {
  items: ContentItem[]
  onDelete: (id: string) => void
  onPreview: (item: ContentItem) => void
}

export function ContentGrid({ items, onDelete, onPreview }: ContentGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="group relative cursor-pointer overflow-hidden rounded-lg border bg-card transition-all hover:shadow-lg"
          onClick={() => onPreview(item)}
        >
          <div className="aspect-square bg-muted">
            {item.type === 'image' && item.url ? (
              <img
                src={item.url}
                alt={item.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <FileIcon className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="p-3">
            <p className="truncate text-sm font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(item.size)}
            </p>
          </div>
          <Button
            variant="destructive"
            size="icon"
            className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(item.id)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
