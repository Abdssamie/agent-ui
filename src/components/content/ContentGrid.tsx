'use client'

import { ContentItem } from '@/types/content'
import { FileIcon, PlayCircle } from 'lucide-react'
import { formatFileSize } from '@/lib/content/validation'

interface ContentGridProps {
  items: ContentItem[]
  onPreviewAction: (item: ContentItem) => void
}

export function ContentGrid({ items, onPreviewAction }: ContentGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
      {items.map((item) => (
        <div
          key={item.id}
          className="cursor-pointer overflow-hidden rounded-lg border bg-card transition-all hover:shadow-lg"
          onClick={() => onPreviewAction(item)}
        >
          <div className="aspect-square bg-muted">
            {item.type === 'image' && item.url ? (
              <img
                src={item.url}
                alt={item.name}
                className="h-full w-full object-cover"
              />
            ) : item.type === 'video' && item.url ? (
              <div className="relative h-full w-full">
                <video
                  src={item.url}
                  className="h-full w-full object-cover"
                  preload="metadata"
                  muted
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <PlayCircle className="h-12 w-12 text-white drop-shadow-lg" />
                </div>
              </div>
            ) : (
              <div className={`flex h-full flex-col items-center justify-center gap-2 ${
                item.type === 'pdf' ? 'bg-red-900' :
                item.type === 'document' ? 'bg-blue-900' :
                'bg-green-900'
              }`}>
                <FileIcon className="h-8 w-8 text-white" />
                <span className="text-xs font-medium uppercase text-white">{item.type}</span>
              </div>
            )}
          </div>
          <div className="p-2">
            <p className="truncate text-xs font-medium" title={item.name}>
              {item.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(item.size)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
