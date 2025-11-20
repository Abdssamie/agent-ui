'use client'

import { useEffect, useState } from 'react'
import { ContentFilter } from '@/types/content'
import { Input } from '@/components/ui/input'
import Icon from '@/components/ui/icon'

interface ContentFiltersProps {
  filter: ContentFilter
  onChange: (filter: ContentFilter) => void
  uploadButton: React.ReactNode
  loading: boolean
}

export function ContentFilters({ filter, onChange, uploadButton, loading }: ContentFiltersProps) {
  const [searchValue, setSearchValue] = useState(filter.search || '')

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filter.search) {
        onChange({ search: searchValue || undefined })
      }
    }, 500)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  useEffect(() => {
    setSearchValue(filter.search || '')
  }, [filter.search])

  return (
    <div className="flex w-full items-center gap-2">
      {uploadButton}
      <div className="relative flex-1">
        <Input
          placeholder="Search..."
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
    </div>
  )
}
