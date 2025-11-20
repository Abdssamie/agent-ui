'use client'

import { ContentItem } from '@/types/content'
import { FileIcon } from 'lucide-react'
import { formatFileSize } from '@/lib/content/validation'

interface ContentGridProps {
  items: ContentItem[]
  onPreview: (item: ContentItem) => void
}

export function ContentGrid({ items, onPreview }: ContentGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
      {items.map((item) => (
        <div
          key={item.id}
          className="cursor-pointer overflow-hidden rounded-lg border bg-card transition-all hover:shadow-lg"
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
                <FileIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="p-2">
            <p className="truncate text-xs font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(item.size)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
