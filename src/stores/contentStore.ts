import { create } from 'zustand'
import {
  ContentItem,
  StorageProvider,
  ContentFilter,
  UploadProgress,
} from '@/types/content'
import {
  listContentAPI,
  uploadContentAPI,
  deleteContentAPI,
} from '@/api/content'

interface ContentState {
  allItems: ContentItem[]
  items: ContentItem[]
  loading: boolean
  error: string | null
  provider: StorageProvider
  filter: ContentFilter
  nextPageToken?: string
  uploads: UploadProgress[]
  setProvider: (provider: StorageProvider) => void
  setFilter: (filter: ContentFilter) => void
  loadContent: () => Promise<void>
  loadMore: () => Promise<void>
  uploadFile: (file: File) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  clearError: () => void
}

function applyFilters(items: ContentItem[], filter: ContentFilter): ContentItem[] {
  let filtered = [...items]

  if (filter.type) {
    filtered = filtered.filter((item) => item.type === filter.type)
  }

  if (filter.search) {
    const search = filter.search.toLowerCase()
    filtered = filtered.filter((item) => item.name.toLowerCase().includes(search))
  }

  if (filter.sortBy) {
    filtered.sort((a, b) => {
      let comparison = 0
      switch (filter.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'date':
          comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
          break
        case 'size':
          comparison = a.size - b.size
          break
      }
      return filter.sortOrder === 'desc' ? -comparison : comparison
    })
  }

  return filtered
}

export const useContentStore = create<ContentState>((set, get) => ({
  allItems: [],
  items: [],
  loading: false,
  error: null,
  provider: 's3',
  filter: {},
  uploads: [],

  setProvider: (provider) => {
    set({ provider, allItems: [], items: [], nextPageToken: undefined })
    get().loadContent()
  },

  setFilter: (filter) => {
    const { allItems } = get()
    const filtered = applyFilters(allItems, filter)
    set({ filter, items: filtered })
  },

  loadContent: async () => {
    set({ loading: true, error: null })
    try {
      const { provider, filter } = get()
      const response = await listContentAPI(provider, { limit: 20 })
      const filtered = applyFilters(response.items, filter)
      set({
        allItems: response.items,
        items: filtered,
        nextPageToken: response.nextPageToken,
        loading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load content',
        loading: false,
      })
    }
  },

  loadMore: async () => {
    const { nextPageToken, provider, filter, allItems } = get()
    if (!nextPageToken) return

    set({ loading: true })
    try {
      const response = await listContentAPI(provider, {
        pageToken: nextPageToken,
        limit: 20,
      })
      const newAllItems = [...allItems, ...response.items]
      const filtered = applyFilters(newAllItems, filter)
      set({
        allItems: newAllItems,
        items: filtered,
        nextPageToken: response.nextPageToken,
        loading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load more',
        loading: false,
      })
    }
  },

  uploadFile: async (file) => {
    const uploadId = `${Date.now()}-${file.name}`
    const { provider, filter, allItems } = get()

    set((state) => ({
      uploads: [
        ...state.uploads,
        { id: uploadId, name: file.name, progress: 0, status: 'uploading' },
      ],
    }))

    try {
      const item = await uploadContentAPI(file, provider, (progress) => {
        set((state) => ({
          uploads: state.uploads.map((u) =>
            u.id === uploadId ? { ...u, progress } : u
          ),
        }))
      })

      const newAllItems = [item, ...allItems]
      const filtered = applyFilters(newAllItems, filter)

      set((state) => ({
        allItems: newAllItems,
        items: filtered,
        uploads: state.uploads.map((u) =>
          u.id === uploadId ? { ...u, status: 'success', progress: 100 } : u
        ),
      }))

      setTimeout(() => {
        set((state) => ({
          uploads: state.uploads.filter((u) => u.id !== uploadId),
        }))
      }, 2000)
    } catch (error) {
      set((state) => ({
        uploads: state.uploads.map((u) =>
          u.id === uploadId
            ? {
                ...u,
                status: 'error',
                error:
                  error instanceof Error ? error.message : 'Upload failed',
              }
            : u
        ),
      }))
    }
  },

  deleteItem: async (id) => {
    const { provider, filter, allItems } = get()
    try {
      await deleteContentAPI(id, provider)
      const newAllItems = allItems.filter((item) => item.id !== id)
      const filtered = applyFilters(newAllItems, filter)
      set({
        allItems: newAllItems,
        items: filtered,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete',
      })
    }
  },

  clearError: () => set({ error: null }),
}))
