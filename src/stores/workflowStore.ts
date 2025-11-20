import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  WorkflowSummary,
  WorkflowFilters,
  SortOption,
  ExecutionRecord,
  WorkflowSchedule,
  WorkflowCacheConfig
} from '@/types/workflow'
import { workflowCache } from '@/lib/workflowCache'
import { workflowHistoryDB } from '@/lib/workflowHistoryDB'

interface WorkflowState {
  // Workflow list state
  workflows: WorkflowSummary[]
  isLoadingWorkflows: boolean
  workflowsError: string | null
  lastFetchTime: number | null

  // Filtering and sorting
  searchQuery: string
  filters: WorkflowFilters
  sortBy: SortOption
  viewMode: 'grid' | 'list'

  // Selected workflow
  selectedWorkflow: WorkflowSummary | null

  // Execution state
  currentExecution: ExecutionRecord | null
  isExecuting: boolean
  executionError: string | null

  // Execution history
  executionHistory: ExecutionRecord[]
  isLoadingHistory: boolean

  // Favorites
  favoriteWorkflowIds: string[]

  // Schedules
  schedules: WorkflowSchedule[]

  // Cache configuration
  cacheConfig: WorkflowCacheConfig

  // Actions - Workflow list management
  setWorkflows: (workflows: WorkflowSummary[]) => void
  setIsLoadingWorkflows: (isLoading: boolean) => void
  setWorkflowsError: (error: string | null) => void
  updateLastFetchTime: () => void

  // Actions - Filtering and sorting
  setSearchQuery: (query: string) => void
  setFilters: (filters: Partial<WorkflowFilters>) => void
  resetFilters: () => void
  setSortBy: (sortBy: SortOption) => void
  setViewMode: (mode: 'grid' | 'list') => void

  // Actions - Workflow selection
  setSelectedWorkflow: (workflow: WorkflowSummary | null) => void

  // Actions - Execution management
  setCurrentExecution: (execution: ExecutionRecord | null) => void
  setIsExecuting: (isExecuting: boolean) => void
  setExecutionError: (error: string | null) => void
  updateExecutionStatus: (
    executionId: string,
    updates: Partial<ExecutionRecord>
  ) => void
  updateWorkflowStatus: (workflowId: string, status: 'running' | 'idle') => void
 
   // Actions - Execution history
   addExecutionToHistory: (execution: ExecutionRecord) => Promise<void>
  loadExecutionHistory: (workflowId?: string, limit?: number) => Promise<void>
  clearExecutionHistory: () => Promise<void>
  setIsLoadingHistory: (isLoading: boolean) => void

  // Actions - Favorites
  toggleFavorite: (workflowId: string) => void
  isFavorite: (workflowId: string) => boolean

  // Actions - Schedules
  addSchedule: (schedule: WorkflowSchedule) => void
  updateSchedule: (scheduleId: string, updates: Partial<WorkflowSchedule>) => void
  removeSchedule: (scheduleId: string) => void
  getActiveSchedules: () => WorkflowSchedule[]

  // Actions - Cache management
  setCacheConfig: (config: Partial<WorkflowCacheConfig>) => void
  invalidateCache: (pattern?: string) => void
  clearCache: () => void

  // Utility actions
  reset: () => void
}

const defaultFilters: WorkflowFilters = {
  categories: [],
  tags: [],
  status: []
}

const defaultSortBy: SortOption = {
  field: 'name',
  direction: 'asc'
}

const defaultCacheConfig: WorkflowCacheConfig = {
  enabled: true,
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      // Initial state
      workflows: [],
      isLoadingWorkflows: false,
      workflowsError: null,
      lastFetchTime: null,

      searchQuery: '',
      filters: defaultFilters,
      sortBy: defaultSortBy,
      viewMode: 'grid',

      selectedWorkflow: null,

      currentExecution: null,
      isExecuting: false,
      executionError: null,

      executionHistory: [],
      isLoadingHistory: false,

      favoriteWorkflowIds: [],

      schedules: [],

      cacheConfig: defaultCacheConfig,

      // Workflow list management
      setWorkflows: (workflows) => set({ workflows }),

      setIsLoadingWorkflows: (isLoading) => set({ isLoadingWorkflows: isLoading }),

      setWorkflowsError: (error) => set({ workflowsError: error }),

      updateLastFetchTime: () => set({ lastFetchTime: Date.now() }),

      // Filtering and sorting
      setSearchQuery: (query) => set({ searchQuery: query }),

      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters }
        })),

      resetFilters: () => set({ filters: defaultFilters, searchQuery: '' }),

      setSortBy: (sortBy) => set({ sortBy }),

      setViewMode: (mode) => set({ viewMode: mode }),

      // Workflow selection
      setSelectedWorkflow: (workflow) => set({ selectedWorkflow: workflow }),

      // Execution management
      setCurrentExecution: (execution) => set({ currentExecution: execution }),

      setIsExecuting: (isExecuting) => set({ isExecuting }),

      setExecutionError: (error) => set({ executionError: error }),

      updateExecutionStatus: (executionId, updates) =>
        set((state) => {
          if (state.currentExecution?.id === executionId) {
            return {
              currentExecution: {
                ...state.currentExecution,
                ...updates
              }
            }
          }
          return state
        }),
      updateWorkflowStatus: (workflowId, status) =>
        set(state => ({
          workflows: state.workflows.map(w =>
            w.id === workflowId ? { ...w, status } : w
          )
        })),
 
       // Execution history
       addExecutionToHistory: async (execution) => {
        try {
          await workflowHistoryDB.addExecution(execution)
          set((state) => ({
            executionHistory: [execution, ...state.executionHistory]
          }))
        } catch (error) {
          console.error('Failed to add execution to history:', error)
        }
      },

      loadExecutionHistory: async (workflowId, limit) => {
        set({ isLoadingHistory: true })
        try {
          const history = workflowId
            ? await workflowHistoryDB.getWorkflowExecutions(workflowId, limit)
            : await workflowHistoryDB.getAllExecutions({ limit })

          set({ executionHistory: history, isLoadingHistory: false })
        } catch (error) {
          console.error('Failed to load execution history:', error)
          set({ isLoadingHistory: false })
        }
      },

      clearExecutionHistory: async () => {
        try {
          await workflowHistoryDB.clearAll()
          set({ executionHistory: [] })
        } catch (error) {
          console.error('Failed to clear execution history:', error)
        }
      },

      setIsLoadingHistory: (isLoading) => set({ isLoadingHistory: isLoading }),

      // Favorites
      toggleFavorite: (workflowId) =>
        set((state) => {
          const isFavorite = state.favoriteWorkflowIds.includes(workflowId)
          return {
            favoriteWorkflowIds: isFavorite
              ? state.favoriteWorkflowIds.filter((id) => id !== workflowId)
              : [...state.favoriteWorkflowIds, workflowId]
          }
        }),

      isFavorite: (workflowId) => get().favoriteWorkflowIds.includes(workflowId),

      // Schedules
      addSchedule: (schedule) =>
        set((state) => ({
          schedules: [...state.schedules, schedule]
        })),

      updateSchedule: (scheduleId, updates) =>
        set((state) => ({
          schedules: state.schedules.map((schedule) =>
            schedule.id === scheduleId ? { ...schedule, ...updates } : schedule
          )
        })),

      removeSchedule: (scheduleId) =>
        set((state) => ({
          schedules: state.schedules.filter((schedule) => schedule.id !== scheduleId)
        })),

      getActiveSchedules: () =>
        get().schedules.filter((schedule) => schedule.enabled),

      // Cache management
      setCacheConfig: (config) =>
        set((state) => ({
          cacheConfig: { ...state.cacheConfig, ...config }
        })),

      invalidateCache: (pattern) => {
        if (pattern) {
          workflowCache.invalidatePattern(pattern)
        } else {
          workflowCache.clear()
        }
      },

      clearCache: () => {
        workflowCache.clear()
      },

      // Utility
      reset: () =>
        set({
          workflows: [],
          isLoadingWorkflows: false,
          workflowsError: null,
          lastFetchTime: null,
          searchQuery: '',
          filters: defaultFilters,
          sortBy: defaultSortBy,
          selectedWorkflow: null,
          currentExecution: null,
          isExecuting: false,
          executionError: null,
          executionHistory: [],
          isLoadingHistory: false
        })
    }),
    {
      name: 'workflow-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        favoriteWorkflowIds: state.favoriteWorkflowIds,
        schedules: state.schedules,
        cacheConfig: state.cacheConfig
      })
    }
  )
)

// Initialize IndexedDB on module load
if (typeof window !== 'undefined') {
  workflowHistoryDB.init().catch((error) => {
    console.error('Failed to initialize workflow history database:', error)
  })
}
