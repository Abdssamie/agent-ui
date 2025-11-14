'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useContentManager } from '@/hooks/useContentManager'
import { ContentItem, StorageProvider } from '@/types/content'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Icon from '@/components/ui/icon'
import { StorageProviderSelect } from './StorageProviderSelect'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { ContentUploadZone } from './ContentUploadZone'
import { Badge } from '@/components/ui/badge'

export const ContentManager = () => {
  const [provider, setProvider] = useState<StorageProvider>('s3')
  const { contents, isLoading, error, loadContents, uploadContent, deleteContent, batchDelete } =
    useContentManager({ provider })

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [contentToDelete, setContentToDelete] = useState<string | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null)
  const [uploadingFiles, setUploadingFiles] = useState<
    Map<string, { name: string; progress: number; status: 'uploading' | 'success' | 'error' }>
  >(new Map())

  useEffect(() => {
    loadContents()
  }, [loadContents])

  const filteredContents = contents.filter((content) =>
    content.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectAll = () => {
    if (selectedIds.size === filteredContents.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredContents.map((c) => c.id)))
    }
  }

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleDeleteClick = (id: string) => {
    setContentToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (contentToDelete) {
      await deleteContent(contentToDelete)
      setContentToDelete(null)
      setDeleteDialogOpen(false)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size > 0) {
      await batchDelete(Array.from(selectedIds))
      setSelectedIds(new Set())
    }
  }

  const handleViewDetails = (content: ContentItem) => {
    setSelectedContent(content)
    setDetailsDialogOpen(true)
  }

  const handleFilesSelected = async (files: File[]) => {
    for (const file of files) {
      const uploadId = `${Date.now()}-${file.name}`
      
      setUploadingFiles((prev) =>
        new Map(prev).set(uploadId, {
          name: file.name,
          progress: 0,
          status: 'uploading'
        })
      )

      try {
        await uploadContent(file, (progress) => {
          setUploadingFiles((prev) => {
            const updated = new Map(prev)
            const current = updated.get(uploadId)
            if (current) {
              updated.set(uploadId, { ...current, progress })
            }
            return updated
          })
        })

        setUploadingFiles((prev) => {
          const updated = new Map(prev)
          updated.set(uploadId, {
            name: file.name,
            progress: 100,
            status: 'success'
          })
          return updated
        })

        setTimeout(() => {
          setUploadingFiles((prev) => {
            const updated = new Map(prev)
            updated.delete(uploadId)
            return updated
          })
        }, 2000)
      } catch {
        setUploadingFiles((prev) => {
          const updated = new Map(prev)
          updated.set(uploadId, {
            name: file.name,
            progress: 0,
            status: 'error'
          })
          return updated
        })

        setTimeout(() => {
          setUploadingFiles((prev) => {
            const updated = new Map(prev)
            updated.delete(uploadId)
            return updated
          })
        }, 5000)
      }
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getTypeIcon = (type: ContentItem['type']) => {
    switch (type) {
      case 'image':
        return 'image'
      case 'video':
        return 'video'
      case 'pdf':
        return 'file'
      default:
        return 'file'
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-primary/15 bg-accent/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xs font-medium uppercase text-primary">Content Library</h2>
            <p className="text-xs text-muted-foreground">
              {contents.length} {contents.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <StorageProviderSelect
            value={provider}
            onValueChange={(v) => setProvider(v)}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={loadContents}
            disabled={isLoading}
            className="gap-2 rounded-xl border border-primary/15 bg-accent text-xs font-medium uppercase text-muted hover:bg-accent/80"
          >
            <Icon type="refresh" size="xs" />
            Refresh
          </Button>
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
              className="rounded-xl text-xs font-medium uppercase"
            >
              Delete {selectedIds.size}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thick">
        <div className="mx-auto max-w-6xl space-y-6 p-6">
          {/* Coming Soon Banner */}
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Icon type="info" size="md" className="text-primary" />
              </div>
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-xs font-medium uppercase text-primary">Coming Soon</h3>
                  <Badge variant="outline" className="border-primary/20 bg-primary/10 text-xs text-primary">
                    In Development
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This Content Library feature is currently under development. The UI below demonstrates the planned functionality for managing your company's PDFs, images, videos, and documents across Cloudflare R2 and Google Drive storage. Backend integration is in progress.
                </p>
              </div>
            </div>
          </div>

          {/* Upload Zone */}
          <div className="rounded-xl border border-primary/15 bg-accent p-4">
            <ContentUploadZone onFilesSelected={handleFilesSelected} disabled={isLoading} />
          </div>

          {/* Upload Progress */}
          {uploadingFiles.size > 0 && (
            <div className="space-y-2 rounded-xl border border-primary/15 bg-accent p-4">
              {Array.from(uploadingFiles.entries()).map(([id, upload]) => (
                <div key={id} className="flex items-center gap-3">
                  <Icon
                    type={
                      upload.status === 'success'
                        ? 'check-circle'
                        : upload.status === 'error'
                          ? 'x-circle'
                          : 'loader'
                    }
                    size="xs"
                    className={
                      upload.status === 'uploading' ? 'animate-spin text-primary' : ''
                    }
                  />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-primary">{upload.name}</p>
                    {upload.status === 'uploading' && (
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-primary/10">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* Search */}
          <div className="relative max-w-md">
            <Icon
              type="search"
              size="xs"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border-primary/15 bg-accent pl-9 text-xs font-medium text-muted"
            />
          </div>

          {/* Content Grid */}
          {isLoading && contents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="mt-4 text-xs text-muted-foreground">Loading content...</p>
            </div>
          ) : filteredContents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Icon type="file" size="md" className="text-muted-foreground" />
              </div>
              <p className="text-xs font-medium">No content found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'Upload files to get started'}
              </p>
            </div>
          ) : (
            <motion.div
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {filteredContents.map((content) => (
                <div
                  key={content.id}
                  className="group cursor-pointer overflow-hidden rounded-xl border border-primary/15 bg-accent transition-all hover:border-primary/30"
                  onClick={() => handleViewDetails(content)}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-primary/5">
                    {content.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={content.thumbnailUrl}
                        alt={content.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Icon
                          type={getTypeIcon(content.type)}
                          size="md"
                          className="text-muted"
                        />
                      </div>
                    )}
                    <div className="absolute right-2 top-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(content.id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          handleSelectOne(content.id)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="cursor-pointer rounded"
                      />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-primary line-clamp-1">
                        {content.name}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {content.type}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatSize(content.size)}</span>
                      <span>{formatDate(content.uploadedAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-primary/15 p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteClick(content.id)
                      }}
                      className="h-8 w-full gap-2 text-xs hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Icon type="trash" size="xs" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this content? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedContent?.name}</DialogTitle>
            <DialogDescription>Content details</DialogDescription>
          </DialogHeader>
          {selectedContent && (
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-xl border border-primary/15 bg-accent p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Icon type={getTypeIcon(selectedContent.type)} size="md" className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-primary">
                      {selectedContent.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(selectedContent.size)}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{selectedContent.storageProvider}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="mb-1 text-xs font-medium uppercase text-primary">Uploaded</h3>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(selectedContent.uploadedAt)}
                  </p>
                </div>
                {selectedContent.updatedAt && (
                  <div>
                    <h3 className="mb-1 text-xs font-medium uppercase text-primary">
                      Last Updated
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(selectedContent.updatedAt)}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDetailsDialogOpen(false)
                    handleDeleteClick(selectedContent.id)
                  }}
                  className="gap-2 rounded-xl text-xs font-medium uppercase"
                >
                  <Icon type="trash" size="xs" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
