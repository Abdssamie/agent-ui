// Knowledge Base Management Service
// Provides comprehensive content management for persistent knowledge base operations

import {
  listContentAPI,
  uploadContentAPI
} from '@/api/agnoKnowledge'
import {
  getContentByIdAPI,
  getContentStatusAPI,
  updateContentAPI,
  deleteContentByIdAPI,
  deleteAllContentAPI
} from '@/api/agnoKnowledge/index'
import {
  ListContentParams,
  ContentResponseSchema,
  GetContentStatusResponse,
  UpdateContentParams,
  UploadContentParams,
  UploadContentResponse
} from '@/types/agnoKnowledge'
import { useStore } from '@/store'
import {
  parseError,
  showErrorNotification,
  showSuccessNotification,
  handleFeatureUnavailable
} from './errorHandling'

export interface KnowledgeBaseContent {
  id: string
  name: string
  description?: string
  type?: string
  size?: string
  status: 'processing' | 'completed' | 'failed'
  statusMessage?: string
  metadata?: Record<string, any>
  createdAt?: string
  updatedAt?: string
  accessCount?: number
}

export interface ContentListOptions extends ListContentParams {
  baseUrl?: string
}

export interface ContentUpdateOptions {
  name?: string
  description?: string
  metadata?: Record<string, any>
  readerId?: string
  dbId?: string
  baseUrl?: string
}

export interface ContentUploadOptions extends UploadContentParams {
  baseUrl?: string
  onProgress?: (progress: number) => void
}

/**
 * Knowledge Base Service
 * Manages persistent knowledge base content across sessions
 */
export class KnowledgeBaseService {
  private baseUrl?: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl
  }

  /**
   * List all content in the knowledge base with pagination and filtering
   */
  async listContent(options: ContentListOptions = {}): Promise<{
    contents: KnowledgeBaseContent[]
    pagination: {
      page: number
      limit: number
      totalPages: number
      totalCount: number
    }
  }> {
    try {
      const { baseUrl, ...params } = options
      const response = await listContentAPI(params, baseUrl || this.baseUrl)

      const contents: KnowledgeBaseContent[] = response.data.map(this.mapContentResponse)

      return {
        contents,
        pagination: {
          page: response.meta.page || 1,
          limit: response.meta.limit || 10,
          totalPages: response.meta.total_pages || 0,
          totalCount: response.meta.total_count || 0
        }
      }
    } catch (error) {
      const parsedError = parseError(error)
      showErrorNotification(parsedError, 'Failed to list knowledge base content')
      throw parsedError
    }
  }

  /**
   * Get detailed information about a specific content item
   */
  async getContentById(
    contentId: string,
    dbId?: string,
    baseUrl?: string
  ): Promise<KnowledgeBaseContent> {
    const response = await getContentByIdAPI(
      { content_id: contentId, db_id: dbId },
      baseUrl || this.baseUrl
    )

    return this.mapContentResponse(response)
  }

  /**
   * Get the processing status of a content item
   */
  async getContentStatus(
    contentId: string,
    dbId?: string,
    baseUrl?: string
  ): Promise<GetContentStatusResponse> {
    return await getContentStatusAPI(
      { content_id: contentId, db_id: dbId },
      baseUrl || this.baseUrl
    )
  }

  /**
   * Update content metadata and properties
   */
  async updateContent(
    contentId: string,
    options: ContentUpdateOptions
  ): Promise<KnowledgeBaseContent> {
    const { baseUrl, ...updateParams } = options

    const params: UpdateContentParams = {
      content_id: contentId,
      name: updateParams.name,
      description: updateParams.description,
      metadata: updateParams.metadata,
      reader_id: updateParams.readerId,
      db_id: updateParams.dbId
    }

    const response = await updateContentAPI(params, baseUrl || this.baseUrl)
    return this.mapContentResponse(response)
  }

  /**
   * Delete a specific content item from the knowledge base
   */
  async deleteContent(
    contentId: string,
    dbId?: string,
    baseUrl?: string
  ): Promise<void> {
    try {
      await deleteContentByIdAPI(
        { content_id: contentId, db_id: dbId },
        baseUrl || this.baseUrl
      )
      showSuccessNotification('Content deleted successfully')
    } catch (error) {
      const parsedError = parseError(error)
      showErrorNotification(parsedError, 'Failed to delete content')
      throw parsedError
    }
  }

  /**
   * Delete all content from the knowledge base (use with caution)
   */
  async deleteAllContent(dbId?: string, baseUrl?: string): Promise<void> {
    await deleteAllContentAPI({ db_id: dbId }, baseUrl || this.baseUrl)
  }

  /**
   * Upload new content to the knowledge base
   */
  async uploadContent(
    options: ContentUploadOptions
  ): Promise<UploadContentResponse> {
    const { baseUrl, onProgress, ...uploadParams } = options

    // TODO: Implement progress tracking if needed
    const response = await uploadContentAPI(uploadParams, baseUrl || this.baseUrl)

    return response
  }

  /**
   * Poll content status until processing is complete
   */
  async waitForProcessing(
    contentId: string,
    options: {
      dbId?: string
      baseUrl?: string
      maxAttempts?: number
      pollInterval?: number
      onStatusUpdate?: (status: GetContentStatusResponse) => void
    } = {}
  ): Promise<GetContentStatusResponse> {
    const {
      dbId,
      baseUrl,
      maxAttempts = 60,
      pollInterval = 2000,
      onStatusUpdate
    } = options

    let attempts = 0

    while (attempts < maxAttempts) {
      const status = await this.getContentStatus(
        contentId,
        dbId,
        baseUrl || this.baseUrl
      )

      if (onStatusUpdate) {
        onStatusUpdate(status)
      }

      if (status.status === 'completed' || status.status === 'failed') {
        return status
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval))
      attempts++
    }

    throw new Error('Content processing timeout')
  }

  /**
   * Batch delete multiple content items
   */
  async batchDeleteContent(
    contentIds: string[],
    dbId?: string,
    baseUrl?: string
  ): Promise<{ successful: string[]; failed: Array<{ id: string; error: string }> }> {
    const results = {
      successful: [] as string[],
      failed: [] as Array<{ id: string; error: string }>
    }

    for (const contentId of contentIds) {
      try {
        await this.deleteContent(contentId, dbId, baseUrl || this.baseUrl)
        results.successful.push(contentId)
      } catch (error) {
        results.failed.push({
          id: contentId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }

  /**
   * Sync knowledge base contents to store
   */
  async syncToStore(options: ContentListOptions = {}): Promise<void> {
    try {
      const { contents } = await this.listContent(options)
      
      // Update store with knowledge contents
      const store = useStore.getState()
      const knowledgeContents = contents.map((content) => {
        // Map API status to store status
        let storeStatus: 'uploaded' | 'processing' | 'completed' | 'error'
        if (content.status === 'completed') {
          storeStatus = 'completed'
        } else if (content.status === 'processing') {
          storeStatus = 'processing'
        } else {
          storeStatus = 'error' // Map 'failed' to 'error'
        }

        return {
          id: content.id,
          filename: content.name,
          content_type: content.type || 'unknown',
          size: parseInt(content.size || '0', 10),
          upload_date: content.createdAt || new Date().toISOString(),
          status: storeStatus,
          metadata: {
            source: 'knowledge_base',
            user_context: 'persistent',
            session_id: undefined,
            ...content.metadata
          }
        }
      })

      store.setKnowledgeContents(knowledgeContents)
    } catch (error) {
      const parsedError = parseError(error)
      // Use graceful degradation - don't throw, just notify
      handleFeatureUnavailable(
        'Knowledge base sync',
        () => {
          // Fallback: keep existing store state
          console.warn('Failed to sync knowledge base, keeping existing state')
        }
      )
    }
  }

  /**
   * Map API response to internal content format
   */
  private mapContentResponse(response: ContentResponseSchema): KnowledgeBaseContent {
    return {
      id: response.id,
      name: response.name || 'Untitled',
      description: response.description || undefined,
      type: response.type || undefined,
      size: response.size || undefined,
      status: response.status || 'processing',
      statusMessage: response.status_message || undefined,
      metadata: response.metadata || undefined,
      createdAt: response.created_at || undefined,
      updatedAt: response.updated_at || undefined,
      accessCount: response.access_count || undefined
    }
  }
}

// Export singleton instance
export const knowledgeBaseService = new KnowledgeBaseService()

// Export hook for using the service with store integration
export const useKnowledgeBase = () => {
  const store = useStore()
  
  return {
    service: knowledgeBaseService,
    knowledgeContents: store.knowledgeContents,
    addKnowledgeContent: store.addKnowledgeContent,
    removeKnowledgeContent: store.removeKnowledgeContent,
    updateKnowledgeContent: store.updateKnowledgeContent,
    setKnowledgeContents: store.setKnowledgeContents
  }
}
