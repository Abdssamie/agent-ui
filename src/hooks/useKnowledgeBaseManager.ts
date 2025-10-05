// Custom hook for knowledge base content management
// Provides comprehensive operations for persistent knowledge base

import { useState, useCallback, useEffect, useRef } from 'react'
import { useStore } from '@/store'
import {
  knowledgeBaseService,
  KnowledgeBaseContent,
  ContentListOptions,
  ContentUpdateOptions
} from '@/lib/knowledgeBaseService'
import { toast } from 'sonner'

export interface UseKnowledgeBaseManagerOptions {
  autoLoad?: boolean
  baseUrl?: string
  dbId?: string
}

export interface UseKnowledgeBaseManagerReturn {
  // State
  contents: KnowledgeBaseContent[]
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    totalPages: number
    totalCount: number
  }

  // Operations
  loadContents: (options?: ContentListOptions) => Promise<void>
  getContent: (contentId: string, dbId?: string) => Promise<KnowledgeBaseContent | null>
  updateContent: (contentId: string, options: ContentUpdateOptions) => Promise<void>
  deleteContent: (contentId: string, dbId?: string) => Promise<void>
  deleteAllContents: (dbId?: string) => Promise<void>
  batchDelete: (contentIds: string[], dbId?: string) => Promise<void>
  refreshContent: (contentId: string, dbId?: string) => Promise<void>
  syncToStore: () => Promise<void>
}

/**
 * Hook for managing persistent knowledge base content
 * Provides operations for listing, updating, and deleting content
 */
export const useKnowledgeBaseManager = (
  options: UseKnowledgeBaseManagerOptions = {}
): UseKnowledgeBaseManagerReturn => {
  const { autoLoad = false, baseUrl, dbId } = options

  const [contents, setContents] = useState<KnowledgeBaseContent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 0,
    totalCount: 0
  })

  const store = useStore()

  // Track polling interval
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Load contents from knowledge base
   */
  const loadContents = useCallback(
    async (loadOptions: ContentListOptions = {}) => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await knowledgeBaseService.listContent({
          ...loadOptions,
          db_id: loadOptions.db_id || dbId,
          baseUrl: loadOptions.baseUrl || baseUrl
        })

        setContents(result.contents)
        setPagination(result.pagination)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load contents'
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    [baseUrl, dbId]
  )

  /**
   * Get a specific content item by ID
   */
  const getContent = useCallback(
    async (contentId: string, dbId?: string): Promise<KnowledgeBaseContent | null> => {
      try {
        const content = await knowledgeBaseService.getContentById(contentId, dbId, baseUrl)
        return content
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get content'
        toast.error(errorMessage)
        return null
      }
    },
    [baseUrl]
  )

  /**
   * Update content metadata
   */
  const updateContent = useCallback(
    async (contentId: string, updateOptions: ContentUpdateOptions) => {
      setIsLoading(true)
      setError(null)

      try {
        const updated = await knowledgeBaseService.updateContent(contentId, {
          ...updateOptions,
          baseUrl: updateOptions.baseUrl || baseUrl
        })

        // Update local state
        setContents((prev) =>
          prev.map((content) => (content.id === contentId ? updated : content))
        )

        toast.success('Content updated successfully')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update content'
        setError(errorMessage)
        toast.error(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [baseUrl]
  )

  /**
   * Delete a specific content item
   */
  const deleteContent = useCallback(
    async (contentId: string, dbId?: string) => {
      setIsLoading(true)
      setError(null)

      try {
        await knowledgeBaseService.deleteContent(contentId, dbId, baseUrl)

        // Update local state
        setContents((prev) => prev.filter((content) => content.id !== contentId))
        setPagination((prev) => ({
          ...prev,
          totalCount: Math.max(0, prev.totalCount - 1)
        }))

        // Update store
        store.removeKnowledgeContent(contentId)

        toast.success('Content deleted successfully')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete content'
        setError(errorMessage)
        toast.error(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [baseUrl, store]
  )

  /**
   * Delete all contents from knowledge base
   */
  const deleteAllContents = useCallback(
    async (dbId?: string) => {
      setIsLoading(true)
      setError(null)

      try {
        await knowledgeBaseService.deleteAllContent(dbId, baseUrl)

        // Clear local state
        setContents([])
        setPagination({
          page: 1,
          limit: 10,
          totalPages: 0,
          totalCount: 0
        })

        // Clear store
        store.setKnowledgeContents([])

        toast.success('All content deleted successfully')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete all content'
        setError(errorMessage)
        toast.error(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [baseUrl, store]
  )

  /**
   * Batch delete multiple content items
   */
  const batchDelete = useCallback(
    async (contentIds: string[], dbId?: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await knowledgeBaseService.batchDeleteContent(contentIds, dbId, baseUrl)

        // Update local state - remove successful deletions
        setContents((prev) =>
          prev.filter((content) => !result.successful.includes(content.id))
        )
        setPagination((prev) => ({
          ...prev,
          totalCount: Math.max(0, prev.totalCount - result.successful.length)
        }))

        // Update store
        result.successful.forEach((id) => {
          store.removeKnowledgeContent(id)
        })

        if (result.failed.length > 0) {
          toast.error(
            `${result.successful.length} deleted, ${result.failed.length} failed`
          )
        } else {
          toast.success(`${result.successful.length} items deleted successfully`)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to batch delete'
        setError(errorMessage)
        toast.error(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [baseUrl, store]
  )

  /**
   * Refresh a specific content item's data
   */
  const refreshContent = useCallback(
    async (contentId: string, dbId?: string) => {
      try {
        const updated = await knowledgeBaseService.getContentById(contentId, dbId, baseUrl)

        // Update local state
        setContents((prev) =>
          prev.map((content) => (content.id === contentId ? updated : content))
        )

        // Map API status to store status
        let storeStatus: 'uploaded' | 'processing' | 'completed' | 'error'
        if (updated.status === 'completed') {
          storeStatus = 'completed'
        } else if (updated.status === 'processing') {
          storeStatus = 'processing'
        } else {
          storeStatus = 'error' // Map 'failed' to 'error'
        }

        // Update store
        const storeContent = {
          id: updated.id,
          filename: updated.name,
          content_type: updated.type || 'unknown',
          size: parseInt(updated.size || '0', 10),
          upload_date: updated.createdAt || new Date().toISOString(),
          status: storeStatus,
          metadata: {
            source: 'knowledge_base',
            user_context: 'persistent',
            ...updated.metadata
          }
        }
        store.updateKnowledgeContent(contentId, storeContent)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to refresh content'
        toast.error(errorMessage)
      }
    },
    [baseUrl, store]
  )

  /**
   * Sync knowledge base contents to store
   */
  const syncToStore = useCallback(async () => {
    try {
      await knowledgeBaseService.syncToStore({ baseUrl })
      toast.success('Knowledge base synced')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync'
      toast.error(errorMessage)
    }
  }, [baseUrl])

  /**
   * Poll status for processing documents
   */
  const pollProcessingDocuments = useCallback(async () => {
    const processingDocs = contents.filter(c => c.status === 'processing')
    
    if (processingDocs.length === 0) {
      // No processing documents, stop polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      return
    }

    // Check status for each processing document
    for (const doc of processingDocs) {
      try {
        const status = await knowledgeBaseService.getContentStatus(doc.id, dbId, baseUrl)
        
        // Update if status changed
        if (status.status !== doc.status) {
          setContents(prev => 
            prev.map(content => 
              content.id === doc.id 
                ? { ...content, status: status.status, statusMessage: status.status_message }
                : content
            )
          )

          // Show notification when processing completes
          if (status.status === 'completed') {
            toast.success(`"${doc.name}" processing completed`)
          } else if (status.status === 'failed') {
            toast.error(`"${doc.name}" processing failed: ${status.status_message || 'Unknown error'}`)
          }
        }
      } catch (err) {
        console.error(`Failed to poll status for ${doc.id}:`, err)
      }
    }
  }, [contents, dbId, baseUrl])

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad) {
      loadContents()
    }
  }, [autoLoad, loadContents])

  // Set up polling for processing documents
  useEffect(() => {
    const hasProcessingDocs = contents.some(c => c.status === 'processing')
    
    if (hasProcessingDocs && !pollingIntervalRef.current) {
      // Start polling every 3 seconds
      pollingIntervalRef.current = setInterval(() => {
        pollProcessingDocuments()
      }, 3000)
    } else if (!hasProcessingDocs && pollingIntervalRef.current) {
      // Stop polling when no processing documents
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [contents, pollProcessingDocuments])

  return {
    contents,
    isLoading,
    error,
    pagination,
    loadContents,
    getContent,
    updateContent,
    deleteContent,
    deleteAllContents,
    batchDelete,
    refreshContent,
    syncToStore
  }
}
