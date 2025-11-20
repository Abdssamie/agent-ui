'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useContentStore } from '@/stores/contentStore'
import { ContentGrid } from './ContentGrid'
import { ContentFilters } from './ContentFilters'
import { UploadQueue } from './UploadQueue'
import { StorageProviderSelect } from './StorageProviderSelect'
import { ContentPreviewDialog } from './ContentPreviewDialog'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/icon'
import { ContentItem } from '@/types/content'
import { getContentUrlAPI } from '@/api/content'

export function ContentManager() {
  const {
    items,
    loading,
    error,
    provider,
    filter,
    currentPage,
    hasNextPage,
    uploads,
    setProvider,
    setFilter,
    loadContent,
    goToPage,
    uploadFile,
    deleteItem,
    clearError,
  } = useContentStore()

  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadContent()
  }, [loadContent])

  const handleUpload = async (files: File[]) => {
    for (const file of files) {
      await uploadFile(file)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleUpload(files)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handlePreview = async (item: ContentItem) => {
    try {
      const url = await getContentUrlAPI(item.id, provider)
      setPreviewItem({ ...item, url })
      setDialogOpen(true)
    } catch (error) {
      console.error('Failed to get URL:', error)
    }
  }

  const handleDownload = async (item: ContentItem) => {
    if (item.url) {
      const a = document.createElement('a')
      a.href = item.url
      a.download = item.name
      a.click()
    }
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-hidden p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold">Content Manager</h2>
          <div className="group relative">
            <Icon type="info" size="xs" className="text-muted-foreground" />
            <div className="absolute left-0 top-6 z-50 hidden w-64 rounded-lg border bg-background p-2 text-xs shadow-md group-hover:block">
              Search loads up to 1000 items. For larger buckets, use pagination without search.
            </div>
          </div>
        </div>
        <StorageProviderSelect value={provider} onChange={setProvider} />
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-destructive/50 bg-destructive/10 p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="ghost" size="sm" onClick={clearError}>
              <Icon type="x" size="sm" />
            </Button>
          </div>
        </motion.div>
      )}

      <div className="flex w-full items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />
        <ContentFilters
          filter={filter}
          onChange={setFilter}
          loading={loading}
          uploadButton={
            <Button onClick={() => fileInputRef.current?.click()} variant="outline">
              <Icon type="upload" size="sm" className="mr-2" />
              Upload
            </Button>
          }
        />
      </div>

      {loading && items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <Icon type="loader" size="lg" className="animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">
            No content found. Upload files to get started.
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border p-4">
          <ContentGrid items={items} onPreview={handlePreview} />
          <div className="flex items-center justify-center gap-2">
            <Button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              variant="outline"
              size="sm"
            >
              ←
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage}
            </span>
            <Button
              onClick={() => goToPage(currentPage + 1)}
              disabled={!hasNextPage || loading}
              variant="outline"
              size="sm"
            >
              →
            </Button>
          </div>
        </div>
      )}

      <ContentPreviewDialog
        item={previewItem}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onDelete={deleteItem}
        onDownload={handleDownload}
      />

      <UploadQueue uploads={uploads} />
    </div>
  )
}
