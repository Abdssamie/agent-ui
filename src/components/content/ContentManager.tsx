'use client'

import {useEffect, useState, useRef, useMemo, useCallback} from 'react'
import { motion } from 'framer-motion'
import { useContentStore } from '@/stores/contentStore'
import { ContentGrid } from './ContentGrid'
import { ContentFilters } from './ContentFilters'
import { UploadQueue } from './UploadQueue'
import { StorageProviderSelect } from './StorageProviderSelect'
import { ContentPreviewDialog } from './ContentPreviewDialog'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/icon'
import {ContentFilter, ContentItem} from '@/types/content'
import { getContentUrlAPI } from '@/api/content'
import { toast } from 'sonner'

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
    updateItemUrl,
  } = useContentStore()

  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewRequestIdRef = useRef(0)
  const isFetchingRef = useRef(false)

  useEffect(() => {
    loadContent()
  }, [loadContent])

  const itemsKey = useMemo(() => items.map(i => i.id).join(','), [items])

  useEffect(() => {
    const fetchPreviews = async () => {
      if (isFetchingRef.current) return
      
      const itemsNeedingUrls = items.filter(
        (item) => (item.type === 'image' || item.type === 'pdf' || item.type === 'video') && !item.url
      )

      if (itemsNeedingUrls.length === 0) return

      isFetchingRef.current = true

      const promises = itemsNeedingUrls.map(async (item) => {
        try {
          const url = await getContentUrlAPI(item.id, provider)
          return { id: item.id, url, success: true }
        } catch (error) {
          console.error(`Failed to fetch preview for ${item.id}:`, error)
          return { id: item.id, url: '', success: false }
        }
      })

      const results = await Promise.allSettled(promises)
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          updateItemUrl(result.value.id, result.value.url)
        }
      })

      isFetchingRef.current = false
    }

    if (items.length > 0) {
      fetchPreviews()
    }
  }, [itemsKey, provider, updateItemUrl])

    const onChangeAction = useCallback((filter: ContentFilter) => {
       setFilter(filter);
    }, [setFilter]);

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
    const requestId = ++previewRequestIdRef.current
    setDialogOpen(true)
    setPreviewItem(item)
    
    // If URL already exists, no need to fetch
    if (item.url) {
      setLoadingPreview(false)
      return
    }
    
    setLoadingPreview(true)
    try {
      const url = await getContentUrlAPI(item.id, provider)
      if (previewRequestIdRef.current !== requestId) return
      const updatedItem = { ...item, url }
      setPreviewItem(updatedItem)
      updateItemUrl(item.id, url)
    } catch (error) {
      console.error('Failed to get URL:', error)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleDownload = (item: ContentItem) => {
    const url = `/api/content/download?id=${encodeURIComponent(item.id)}&name=${encodeURIComponent(item.name)}&provider=${provider}`
    const a = document.createElement('a')
    a.href = url
    a.download = item.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteItem(id)
      toast.success('File deleted successfully')
    } catch (error) {
      toast.error('Failed to delete file')
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
        <StorageProviderSelect value={provider} onChangeAction={setProvider} />
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
          onChangeAction={onChangeAction}
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
          <ContentGrid items={items} onPreviewAction={handlePreview} />
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
        onOpenChangeAction={setDialogOpen}
        onDeleteAction={handleDelete}
        onDownloadAction={handleDownload}
        loading={loadingPreview}
      />

      <UploadQueue uploads={uploads} />
    </div>
  )
}
