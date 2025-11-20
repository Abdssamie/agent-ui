'use client'

import { ContentFilter, ContentType } from '@/types/content'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ContentFiltersProps {
  filter: ContentFilter
  onChange: (filter: ContentFilter) => void
  uploadButton: React.ReactNode
}

export function ContentFilters({ filter, onChange, uploadButton }: ContentFiltersProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {uploadButton}
        <Input
          placeholder="Search..."
          value={filter.search || ''}
          onChange={(e) => onChange({ ...filter, search: e.target.value })}
          className="w-64"
        />
      </div>
      <div className="flex items-center gap-2">
        <Select
          value={filter.type || 'all'}
          onValueChange={(value) =>
            onChange({
              ...filter,
              type: value === 'all' ? undefined : (value as ContentType),
            })
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="document">Docs</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filter.sortBy || 'date'}
          onValueChange={(value) =>
            onChange({ ...filter, sortBy: value as ContentFilter['sortBy'] })
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="size">Size</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filter.sortOrder || 'desc'}
          onValueChange={(value) =>
            onChange({
              ...filter,
              sortOrder: value as ContentFilter['sortOrder'],
            })
          }
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">↑ Asc</SelectItem>
            <SelectItem value="desc">↓ Desc</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
