// Knowledge Base Manager Component
// Provides UI for managing persistent knowledge base content

import React, { useState } from 'react'
import { useKnowledgeBaseManager } from '@/hooks/useKnowledgeBaseManager'
import { KnowledgeBaseContent } from '@/lib/knowledgeBaseService'
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

interface KnowledgeBaseManagerProps {
  baseUrl?: string
  onContentSelect?: (content: KnowledgeBaseContent) => void
}

export const KnowledgeBaseManager = ({
  baseUrl,
  onContentSelect
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
  } = useKnowledgeBaseManager({ autoLoad: true, baseUrl })

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false)
  const [contentToDelete, setContentToDelete] = useState<string | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedContent, setSelectedContent] = useState<KnowledgeBaseContent | null>(null)

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

  const handleDeleteAll = async () => {
    await deleteAllContents()
    setDeleteAllDialogOpen(false)
    setSelectedIds(new Set())
  }

  const handleRefresh = async (id: string) => {
    await refreshContent(id)
  }

  const handleViewDetails = (content: KnowledgeBaseContent) => {
    setSelectedContent(content)
    setDetailsDialogOpen(true)
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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToChat}
            className="h-8 w-8 p-0"
          >
            <Icon type="arrow-down" size="xs" className="rotate-90" />
          </Button>
          <h2 className="text-xl font-semibold">Knowledge Base</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadContents()}
            disabled={isLoading}
          >
            Refresh
          </Button>
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
              disabled={isLoading}
            >
              Delete Selected ({selectedIds.size})
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteAllDialogOpen(true)}
            disabled={isLoading || contents.length === 0}
          >
            Delete All
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">

      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          placeholder="Search content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading && contents.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredContents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <p>No content found</p>
        </div>
      ) : (
        <>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredContents.length}
                      onChange={handleSelectAll}
                      className="cursor-pointer"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Upload Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContents.map((content) => (
                  <TableRow
                    key={content.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewDetails(content)}
                  >
                    <TableCell onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(content.id)}
                        onChange={() => handleSelectOne(content.id)}
                        className="cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{content.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {content.type || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatSize(content.size)}
                    </TableCell>
                    <TableCell>{getStatusBadge(content.status)}</TableCell>
                    <TableCell className="text-sm">
                      {formatDate(content.createdAt)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(content.id)}
                        disabled={isLoading}
                        title="Delete"
                      >
                        ✕
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Showing {filteredContents.length} of {pagination.totalCount} items
            </div>
            <div>
              Page {pagination.page} of {pagination.totalPages}
            </div>
          </div>
        </>
      )}
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Content Details</DialogTitle>
            <DialogDescription>
              Detailed information about this knowledge base content
            </DialogDescription>
          </DialogHeader>
          {selectedContent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">Name</h3>
                  <p className="text-sm mt-1">{selectedContent.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">Upload Status</h3>
                  <div className="mt-1">{getStatusBadge(selectedContent.status)}</div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">Type</h3>
                  <p className="text-sm mt-1">{selectedContent.type || 'Unknown'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">Size</h3>
                  <p className="text-sm mt-1">{formatSize(selectedContent.size)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">Created</h3>
                  <p className="text-sm mt-1">{formatDate(selectedContent.createdAt)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">Updated</h3>
                  <p className="text-sm mt-1">{formatDate(selectedContent.updatedAt)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">ID</h3>
                  <p className="text-sm mt-1 font-mono break-all">{selectedContent.id}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">Access Count</h3>
                  <p className="text-sm mt-1">{selectedContent.accessCount || 0}</p>
                </div>
              </div>

              {selectedContent.description && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">Description</h3>
                  <p className="text-sm mt-1">{selectedContent.description}</p>
                </div>
              )}

              {selectedContent.statusMessage && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">Upload Status Message</h3>
                  <p className="text-sm mt-1">{selectedContent.statusMessage}</p>
                </div>
              )}

              {selectedContent.metadata && Object.keys(selectedContent.metadata).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Metadata</h3>
                  <div className="bg-muted/50 rounded-md p-3 space-y-2">
                    {Object.entries(selectedContent.metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="font-medium">{key}:</span>
                        <span className="text-muted-foreground">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Persistent Storage:</strong> This content is permanently stored in your
                  knowledge base and will remain available across all future sessions until you
                  explicitly delete it. AI agents can search and reference this content in any
                  conversation.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => handleRefresh(selectedContent.id)}
                  disabled={isLoading}
                >
                  Refresh Status
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDetailsDialogOpen(false)
                    handleDeleteClick(selectedContent.id)
                  }}
                  disabled={isLoading}
                >
                  Delete Content
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
