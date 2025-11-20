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
  currentPage: number
  pageTokens: string[]
  hasNextPage: boolean
  uploads: UploadProgress[]
  setProvider: (provider: StorageProvider) => void
  setFilter: (filter: ContentFilter) => void
  loadContent: () => Promise<void>
  goToPage: (page: number) => Promise<void>
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
  currentPage: 1,
  pageTokens: [''],
  hasNextPage: false,
  uploads: [],

  setProvider: (provider) => {
    set({ provider, items: [], currentPage: 1, pageTokens: [''], hasNextPage: false })
    get().loadContent()
  },

  setFilter: (filter) => {
    set({ filter, currentPage: 1, pageTokens: [''], hasNextPage: false })
    get().loadContent()
  },

  loadContent: async () => {
    set({ loading: true, error: null })
    try {
      const { provider, filter } = get()
      
      // If searching, load all items
      if (filter.search) {
        let allItems: ContentItem[] = []
        let continuationToken: string | undefined = undefined
        
        // Fetch all items (max 1000)
        while (allItems.length < 1000) {
          const response = await listContentAPI(provider, { 
            limit: 100,
            pageToken: continuationToken
          })
          
          allItems.push(...response.items)
          
          if (!response.nextPageToken) break
          continuationToken = response.nextPageToken
        }
        
        // Filter by search
        const search = filter.search.toLowerCase()
        const filtered = allItems.filter(item => item.name.toLowerCase().includes(search))
        
        set({
          items: filtered,
          hasNextPage: false,
          pageTokens: [''],
          currentPage: 1,
          loading: false,
        })
      } else {
        // Normal pagination
        const response = await listContentAPI(provider, { limit: 50 })
        
        set({
          items: response.items,
          hasNextPage: !!response.nextPageToken,
          pageTokens: ['', response.nextPageToken || ''],
          currentPage: 1,
          loading: false,
        })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load content',
        loading: false,
      })
    }
  },

  goToPage: async (page) => {
    const { provider, pageTokens, currentPage } = get()
    if (page === currentPage) return

    set({ loading: true })
    try {
      const pageToken = pageTokens[page - 1]
      const response = await listContentAPI(provider, {
        pageToken: pageToken || undefined,
        limit: 50,
      })

      const newPageTokens = [...pageTokens]
      if (response.nextPageToken && !newPageTokens[page]) {
        newPageTokens[page] = response.nextPageToken
      }

      set({
        items: response.items,
        hasNextPage: !!response.nextPageToken,
        pageTokens: newPageTokens,
        currentPage: page,
        loading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load page',
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
      await uploadContentAPI(file, provider, (progress) => {
        set((state) => ({
          uploads: state.uploads.map((u) =>
            u.id === uploadId ? { ...u, progress } : u
          ),
        }))
      })

      set((state) => ({
        uploads: state.uploads.map((u) =>
          u.id === uploadId ? { ...u, status: 'success', progress: 100 } : u
        ),
      }))

      setTimeout(() => {
        set((state) => ({
          uploads: state.uploads.filter((u) => u.id !== uploadId),
        }))
        get().loadContent()
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
      get().loadContent()
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete',
      })
    }
  },

  clearError: () => set({ error: null }),
}))
