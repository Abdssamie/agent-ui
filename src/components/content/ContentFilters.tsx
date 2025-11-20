'use client'

import { useEffect, useState } from 'react'
import { ContentFilter } from '@/types/content'
import { Input } from '@/components/ui/input'

interface ContentFiltersProps {
  filter: ContentFilter
  onChange: (filter: ContentFilter) => void
  uploadButton: React.ReactNode
}

export function ContentFilters({ filter, onChange, uploadButton }: ContentFiltersProps) {
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
      <Input
        placeholder="Search..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="flex-1"
      />
    </div>
  )
}
