'use client'

import { useEffect, useState } from 'react'
import { useContentStore } from '@/stores/contentStore'
import { ContentGrid } from './ContentGrid'
import { ContentFilters } from './ContentFilters'
import { UploadQueue } from './UploadQueue'
import { ContentUploadZone } from './ContentUploadZone'
import { StorageProviderSelect } from './StorageProviderSelect'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { ContentItem } from '@/types/content'

export function ContentManager() {
  const {
    items,
    loading,
    error,
    provider,
    filter,
    nextPageToken,
    uploads,
    setProvider,
    setFilter,
    loadContent,
    loadMore,
    uploadFile,
    deleteItem,
    clearError,
  } = useContentStore()

  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null)

  useEffect(() => {
    loadContent()
  }, [loadContent])

  const handleUpload = async (files: File[]) => {
    for (const file of files) {
      await uploadFile(file)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Content Manager</h2>
        <StorageProviderSelect value={provider} onChange={setProvider} />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearError}
            className="mt-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      <ContentUploadZone onUpload={handleUpload} />

      <ContentFilters filter={filter} onChange={setFilter} />

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No content found. Upload files to get started.
        </div>
      ) : (
        <>
          <ContentGrid
            items={items}
            onDelete={deleteItem}
            onPreview={setPreviewItem}
          />
          {nextPageToken && (
            <div className="flex justify-center">
              <Button onClick={loadMore} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </>
      )}

      <UploadQueue uploads={uploads} />
    </div>
  )
}
