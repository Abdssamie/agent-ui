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

export const useContentStore = create<ContentState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  provider: 's3',
  filter: {},
  uploads: [],

  setProvider: (provider) => {
    set({ provider, items: [], nextPageToken: undefined })
    get().loadContent()
  },

  setFilter: (filter) => {
    set({ filter, items: [], nextPageToken: undefined })
    get().loadContent()
  },

  loadContent: async () => {
    set({ loading: true, error: null })
    try {
      const { provider, filter } = get()
      const response = await listContentAPI(provider, { filter, limit: 50 })
      set({
        items: response.items,
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
    const { nextPageToken, provider, filter, items } = get()
    if (!nextPageToken) return

    set({ loading: true })
    try {
      const response = await listContentAPI(provider, {
        filter,
        pageToken: nextPageToken,
        limit: 50,
      })
      set({
        items: [...items, ...response.items],
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
    const { provider } = get()

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

      set((state) => ({
        items: [item, ...state.items],
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
    const { provider } = get()
    try {
      await deleteContentAPI(id, provider)
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete',
      })
    }
  },

  clearError: () => set({ error: null }),
}))
