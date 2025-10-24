// Content Manager Hook
import { useState, useCallback } from 'react'
import { ContentItem, StorageProvider } from '@/types/content'
import { listContentAPI, uploadContentAPI, deleteContentAPI } from '@/api/content'
import { toast } from 'sonner'

interface UseContentManagerOptions {
  provider: StorageProvider
  autoLoad?: boolean
}

export const useContentManager = ({ provider, autoLoad = false }: UseContentManagerOptions) => {
  const [contents, setContents] = useState<ContentItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadContents = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await listContentAPI(provider)
      setContents(response.items)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load content'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [provider])

  const uploadContent = useCallback(
    async (file: File, onProgress?: (progress: number) => void) => {
      try {
        const item = await uploadContentAPI(file, provider, onProgress)
        setContents((prev) => [item, ...prev])
        toast.success(`${file.name} uploaded successfully`)
        return item
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Upload failed'
        toast.error(errorMessage)
        throw err
      }
    },
    [provider]
  )

  const deleteContent = useCallback(
    async (id: string) => {
      try {
        await deleteContentAPI(id, provider)
        setContents((prev) => prev.filter((item) => item.id !== id))
        toast.success('Content deleted successfully')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Delete failed'
        toast.error(errorMessage)
        throw err
      }
    },
    [provider]
  )

  const batchDelete = useCallback(
    async (ids: string[]) => {
      const results = { successful: 0, failed: 0 }
      for (const id of ids) {
        try {
          await deleteContentAPI(id, provider)
          results.successful++
        } catch {
          results.failed++
        }
      }
      setContents((prev) => prev.filter((item) => !ids.includes(item.id)))

      if (results.failed === 0) {
        toast.success(`Deleted ${results.successful} items`)
      } else {
        toast.warning(`Deleted ${results.successful} items, ${results.failed} failed`)
      }
    },
    [provider]
  )

  return {
    contents,
    isLoading,
    error,
    loadContents,
    uploadContent,
    deleteContent,
    batchDelete
  }
}
