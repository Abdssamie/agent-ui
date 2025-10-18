// Knowledge Base Manager Component
// Provides UI for managing persistent knowledge base content

import React, { useState } from 'react'
import { useKnowledgeBaseManager } from '@/hooks/useKnowledgeBaseManager'
import { KnowledgeBaseContent } from '@/lib/knowledgeBaseService'
import { uploadFileToKnowledge } from '@/lib/fileUploadService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useQueryState } from 'nuqs'
import Icon from '@/components/ui/icon'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
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
import { Badge } from '@/components/ui/badge'
import { KnowledgeUploadZone } from './KnowledgeUploadZone'
import { UploadProgressList } from './UploadProgressList'
import { validateFiles, generateFileId } from '@/lib/fileValidation'
import { FileAttachment } from '@/types/fileHandling'
import { toast } from 'sonner'

interface KnowledgeBaseManagerProps {
  baseUrl?: string
  dbId?: string | null
  onContentSelect?: (content: KnowledgeBaseContent) => void
}

export const KnowledgeBaseManager = ({
  baseUrl,
  dbId,
  // onContentSelect
}: KnowledgeBaseManagerProps) => {
  const {
    contents,
    isLoading,
    error,
    pagination,
    loadContents,
    deleteContent,
    deleteAllContents,
    batchDelete,
    refreshContent
  } = useKnowledgeBaseManager({ autoLoad: true, baseUrl, dbId: dbId || undefined })

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false)
  const [contentToDelete, setContentToDelete] = useState<string | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedContent, setSelectedContent] = useState<KnowledgeBaseContent | null>(null)
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, { name: string; progress: number; status: 'uploading' | 'success' | 'error'; error?: string }>>(new Map())

  // Filter contents based on search query
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
      await deleteContent(contentToDelete, dbId ?? undefined)
      setContentToDelete(null)
      setDeleteDialogOpen(false)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size > 0) {
      await batchDelete(Array.from(selectedIds), dbId ?? undefined)
      setSelectedIds(new Set())
    }
  }

  const handleDeleteAll = async () => {
    await deleteAllContents(dbId ?? undefined)
    setDeleteAllDialogOpen(false)
    setSelectedIds(new Set())
  }

  const handleRefresh = async (id: string) => {
    await refreshContent(id, dbId ?? undefined)
  }

  const handleViewDetails = (content: KnowledgeBaseContent) => {
    setSelectedContent(content)
    setDetailsDialogOpen(true)
  }

  const handleFilesSelected = async (files: File[]) => {
    // Validate files
    const validation = validateFiles(files)
    
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error))
      return
    }

    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => toast.warning(warning))
    }

    // Check for duplicates
    const duplicates: string[] = []
    const filesToUpload: File[] = []
    
    for (const file of files) {
      const isDuplicate = contents.some(content => content.name === file.name)
      if (isDuplicate) {
        duplicates.push(file.name)
      } else {
        filesToUpload.push(file)
      }
    }

    // Show duplicate warnings
    if (duplicates.length > 0) {
      duplicates.forEach(name => {
        toast.error(`File "${name}" already exists in knowledge base`)
      })
    }

    // If no files to upload, return early
    if (filesToUpload.length === 0) {
      return
    }

    // Process each file
    for (const file of filesToUpload) {
      const attachmentId = generateFileId(file)
      const attachment: FileAttachment = {
        id: attachmentId,
        file,
        uploadStatus: 'pending',
        progress: 0
      }

      // Add to uploading files map
      setUploadingFiles(prev => new Map(prev).set(attachmentId, {
        name: file.name,
        progress: 0,
        status: 'uploading'
      }))

      // Upload file with progress tracking
      try {
        const result = await uploadFileToKnowledge(attachment, {
          baseUrl,
          dbId: dbId || undefined,
          onProgress: (progress) => {
            setUploadingFiles(prev => {
              const updated = new Map(prev)
              const current = updated.get(attachmentId)
              if (current) {
                updated.set(attachmentId, {
                  ...current,
                  progress: Math.round(progress)
                })
              }
              return updated
            })
          },
          onSuccess: () => {
            // Success notification is handled by the service
          },
          onError: () => {
            // Error notification is handled by the service
          }
        })
        
        if (result.success) {
          // Update status to success
          setUploadingFiles(prev => {
            const updated = new Map(prev)
            updated.set(attachmentId, {
              name: file.name,
              progress: 100,
              status: 'success'
            })
            return updated
          })

          // Remove from uploading files after a delay
          setTimeout(() => {
            setUploadingFiles(prev => {
              const updated = new Map(prev)
              updated.delete(attachmentId)
              return updated
            })
          }, 2000)

          // Refresh content list
          await loadContents()
        } else {
          throw new Error(result.error || 'Upload failed')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed'
        
        // Update status to error
        setUploadingFiles(prev => {
          const updated = new Map(prev)
          updated.set(attachmentId, {
            name: file.name,
            progress: 0,
            status: 'error',
            error: errorMessage
          })
          return updated
        })

        // Remove from uploading files after a delay
        setTimeout(() => {
          setUploadingFiles(prev => {
            const updated = new Map(prev)
            updated.delete(attachmentId)
            return updated
          })
        }, 5000)
      }
    }
  }

  const getStatusBadge = (status: 'processing' | 'completed' | 'failed') => {
    const variants = {
      processing: 'default',
      completed: 'success',
      failed: 'destructive'
    } as const

    return (
      <Badge variant={variants[status] || 'default'}>
        {status}
      </Badge>
    )
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const formatSize = (sizeString?: string) => {
    if (!sizeString) return 'N/A'
    const bytes = parseInt(sizeString, 10)
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const [, setView] = useQueryState('view')

  const handleBackToChat = () => {
    setView(null)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-primary/15 bg-accent/50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToChat}
            className="h-9 w-9 p-0 hover:bg-accent"
          >
            <Icon type="arrow-down" size="xs" className="rotate-90" />
          </Button>
          <div>
            <h2 className="text-xs font-medium uppercase text-primary">Knowledge Base</h2>
            <p className="text-xs text-muted-foreground">
              {pagination.totalCount} {pagination.totalCount === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadContents()}
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
              disabled={isLoading}
              className="rounded-xl text-xs font-medium uppercase"
            >
              Delete {selectedIds.size}
            </Button>
          )}
          {contents.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteAllDialogOpen(true)}
              disabled={isLoading}
              className="rounded-xl border-primary/15 text-xs font-medium uppercase text-destructive hover:text-destructive"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thick">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* Compact Upload Zone */}
          <div className="bg-accent rounded-xl border border-primary/15 p-4">
            <KnowledgeUploadZone
              onFilesSelected={handleFilesSelected}
              disabled={isLoading}
            />
          </div>

          {/* Upload Progress */}
          {uploadingFiles.size > 0 && (
            <div className="bg-accent rounded-xl border border-primary/15 p-4">
              <UploadProgressList uploads={uploadingFiles} />
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg border border-destructive/20">
              {error}
            </div>
          )}

          {/* Search Bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Icon type="search" size="xs" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl border-primary/15 bg-accent text-xs font-medium text-muted"
              />
            </div>
          </div>

          {/* Content List */}
          {isLoading && contents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
              <p className="text-sm text-muted-foreground mt-4">Loading knowledge base...</p>
            </div>
          ) : filteredContents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Icon type="file" size="md" className="text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No content found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? 'Try a different search term' : 'Upload files to get started'}
              </p>
            </div>
          ) : (
            <>
              <div className="bg-accent rounded-xl border border-primary/15 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredContents.length && filteredContents.length > 0}
                          onChange={handleSelectAll}
                          className="cursor-pointer rounded"
                        />
                      </TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Size</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContents.map((content) => (
                      <TableRow
                        key={content.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => handleViewDetails(content)}
                      >
                        <TableCell onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(content.id)}
                            onChange={() => handleSelectOne(content.id)}
                            className="cursor-pointer rounded"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{content.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {content.type || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatSize(content.size)}
                        </TableCell>
                        <TableCell>{getStatusBadge(content.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(content.createdAt)}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(content.id)}
                            disabled={isLoading}
                            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                            title="Delete"
                          >
                            <Icon type="trash" size="xs" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
                  <div>
                    Showing {filteredContents.length} of {pagination.totalCount}
                  </div>
                  <div>
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
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

      {/* Delete all confirmation dialog */}
      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete ALL content from your knowledge base? This
              action cannot be undone and will permanently remove all {pagination.totalCount}{' '}
              items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Content details dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedContent?.name}</DialogTitle>
            <DialogDescription>
              Knowledge base content details
            </DialogDescription>
          </DialogHeader>
          {selectedContent && (
            <div className="space-y-6">
              {/* Status Banner */}
              <div className="flex items-center justify-between p-4 bg-accent rounded-xl border border-primary/15">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon type="file" size="md" className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-primary">{selectedContent.type || 'Document'}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(selectedContent.size)}</p>
                  </div>
                </div>
                {getStatusBadge(selectedContent.status)}
              </div>

              {/* Key Information */}
              <div className="space-y-4">
                {selectedContent.description && (
                  <div>
                    <h3 className="text-xs font-medium uppercase text-primary mb-2">Description</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {selectedContent.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs font-medium uppercase text-primary mb-1">Created</h3>
                    <p className="text-xs text-muted-foreground">{formatDate(selectedContent.createdAt)}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium uppercase text-primary mb-1">Last Updated</h3>
                    <p className="text-xs text-muted-foreground">{formatDate(selectedContent.updatedAt)}</p>
                  </div>
                </div>

                {selectedContent.accessCount !== undefined && selectedContent.accessCount > 0 && (
                  <div>
                    <h3 className="text-xs font-medium uppercase text-primary mb-1">Usage</h3>
                    <p className="text-xs text-muted-foreground">
                      Referenced {selectedContent.accessCount} {selectedContent.accessCount === 1 ? 'time' : 'times'}
                    </p>
                  </div>
                )}

                {selectedContent.statusMessage && (
                  <div>
                    <h3 className="text-xs font-medium uppercase text-primary mb-1">Status Message</h3>
                    <p className="text-xs text-muted-foreground">{selectedContent.statusMessage}</p>
                  </div>
                )}
              </div>

              {/* Info Banner */}
              <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
                <div className="flex gap-3">
                  <Icon type="info" size="sm" className="text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <p className="text-xs font-medium uppercase text-primary mb-1">Persistent Storage</p>
                    <p>
                      This content is permanently stored and available across all sessions. 
                      AI agents can search and reference it in any conversation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => handleRefresh(selectedContent.id)}
                  disabled={isLoading}
                  className="gap-2 rounded-xl border-primary/15 text-xs font-medium uppercase"
                >
                  <Icon type="refresh" size="xs" />
                  Refresh
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDetailsDialogOpen(false)
                    handleDeleteClick(selectedContent.id)
                  }}
                  disabled={isLoading}
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
