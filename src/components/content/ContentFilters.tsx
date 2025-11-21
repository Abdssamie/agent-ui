'use client'

import { useEffect, useState } from 'react'
import { ContentFilter, ContentType } from '@/types/content'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/icon'

interface ContentFiltersProps {
  filter: ContentFilter
  onChangeAction: (filter: ContentFilter) => void
  uploadButton: React.ReactNode
  loading: boolean
}

export function ContentFilters({ filter, onChangeAction, uploadButton, loading }: ContentFiltersProps) {
  const [searchValue, setSearchValue] = useState(filter.search || '')

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filter.search) {
        onChangeAction({ ...filter, search: searchValue || undefined })
      }
    }, 500)

    return () => clearTimeout(timer)
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, onChangeAction])

  const hasFilters = filter.type || filter.search

  return (
    <div className="flex w-full items-center gap-2">
      {uploadButton}
      <Select
        value={filter.type || 'all'}
        onValueChange={(value) => onChangeAction({ ...filter, type: value === 'all' ? undefined : value as ContentType })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="image">Images</SelectItem>
          <SelectItem value="pdf">PDFs</SelectItem>
          <SelectItem value="video">Videos</SelectItem>
          <SelectItem value="document">Documents</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>
      <div className="relative flex-1">
        <Input
          placeholder="Search by path or name..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pr-8"
        />
        {loading && filter.search && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Icon type="loader" size="sm" className="animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearchValue('')
            onChangeAction({})
          }}
          title="Clear filters"
        >
          <Icon type="x" size="sm" />
        </Button>
      )}
    </div>
  )
}
