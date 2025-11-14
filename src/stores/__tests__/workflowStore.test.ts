import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkflowStore } from '../workflowStore'
import type { WorkflowSummary } from '@/types/workflow'

describe('useWorkflowStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useWorkflowStore.getState().reset()
  })

  const mockWorkflow: WorkflowSummary = {
    id: 'workflow-1',
    name: 'Test Workflow',
    description: 'A test workflow',
    db_id: 'db-1',
    input_schema: {},
    metadata: {}
  }

  describe('workflow list management', () => {
    it('should set workflows', () => {
      const { setWorkflows, workflows } = useWorkflowStore.getState()
      
      setWorkflows([mockWorkflow])
      
      expect(useWorkflowStore.getState().workflows).toHaveLength(1)
      expect(useWorkflowStore.getState().workflows[0]).toEqual(mockWorkflow)
    })

    it('should set loading state', () => {
      const { setIsLoadingWorkflows } = useWorkflowStore.getState()
      
      setIsLoadingWorkflows(true)
      expect(useWorkflowStore.getState().isLoadingWorkflows).toBe(true)
      
      setIsLoadingWorkflows(false)
      expect(useWorkflowStore.getState().isLoadingWorkflows).toBe(false)
    })

    it('should set error state', () => {
      const { setWorkflowsError } = useWorkflowStore.getState()
      
      setWorkflowsError('Test error')
      expect(useWorkflowStore.getState().workflowsError).toBe('Test error')
      
      setWorkflowsError(null)
      expect(useWorkflowStore.getState().workflowsError).toBeNull()
    })

    it('should update last fetch time', () => {
      const { updateLastFetchTime } = useWorkflowStore.getState()
      const before = Date.now()
      
      updateLastFetchTime()
      
      const lastFetchTime = useWorkflowStore.getState().lastFetchTime
      expect(lastFetchTime).toBeGreaterThanOrEqual(before)
    })
  })

  describe('filtering and sorting', () => {
    it('should set search query', () => {
      const { setSearchQuery } = useWorkflowStore.getState()
      
      setSearchQuery('test query')
      expect(useWorkflowStore.getState().searchQuery).toBe('test query')
    })

    it('should set filters', () => {
      const { setFilters } = useWorkflowStore.getState()
      
      setFilters({ categories: ['automation'], tags: ['test'] })
      
      const filters = useWorkflowStore.getState().filters
      expect(filters.categories).toEqual(['automation'])
      expect(filters.tags).toEqual(['test'])
    })

    it('should reset filters', () => {
      const { setFilters, resetFilters, setSearchQuery } = useWorkflowStore.getState()
      
      setFilters({ categories: ['automation'] })
      setSearchQuery('test')
      
      resetFilters()
      
      expect(useWorkflowStore.getState().filters.categories).toEqual([])
      expect(useWorkflowStore.getState().searchQuery).toBe('')
    })

    it('should set sort option', () => {
      const { setSortBy } = useWorkflowStore.getState()
      
      setSortBy({ field: 'lastExecuted', direction: 'desc' })
      
      const sortBy = useWorkflowStore.getState().sortBy
      expect(sortBy.field).toBe('lastExecuted')
      expect(sortBy.direction).toBe('desc')
    })

    it('should set view mode', () => {
      const { setViewMode } = useWorkflowStore.getState()
      
      setViewMode('list')
      expect(useWorkflowStore.getState().viewMode).toBe('list')
      
      setViewMode('grid')
      expect(useWorkflowStore.getState().viewMode).toBe('grid')
    })
  })

  describe('workflow selection', () => {
    it('should set selected workflow', () => {
      const { setSelectedWorkflow } = useWorkflowStore.getState()
      
      setSelectedWorkflow(mockWorkflow)
      expect(useWorkflowStore.getState().selectedWorkflow).toEqual(mockWorkflow)
      
      setSelectedWorkflow(null)
      expect(useWorkflowStore.getState().selectedWorkflow).toBeNull()
    })
  })

  describe('execution management', () => {
    it('should set execution state', () => {
      const { setIsExecuting, setExecutionError } = useWorkflowStore.getState()
      
      setIsExecuting(true)
      expect(useWorkflowStore.getState().isExecuting).toBe(true)
      
      setExecutionError('Execution failed')
      expect(useWorkflowStore.getState().executionError).toBe('Execution failed')
    })

    it('should update execution status', () => {
      const { setCurrentExecution, updateExecutionStatus } = useWorkflowStore.getState()
      
      const execution = {
        id: 'exec-1',
        workflowId: 'workflow-1',
        workflowName: 'Test',
        input: {},
        status: 'running' as const,
        startTime: Date.now(),
        duration: 0,
        logs: []
      }
      
      setCurrentExecution(execution)
      updateExecutionStatus('exec-1', { status: 'completed', duration: 1000 })
      
      const current = useWorkflowStore.getState().currentExecution
      expect(current?.status).toBe('completed')
      expect(current?.duration).toBe(1000)
    })
  })

  describe('favorites', () => {
    it('should toggle favorite', () => {
      const { toggleFavorite, isFavorite } = useWorkflowStore.getState()
      
      expect(isFavorite('workflow-1')).toBe(false)
      
      toggleFavorite('workflow-1')
      expect(isFavorite('workflow-1')).toBe(true)
      
      toggleFavorite('workflow-1')
      expect(isFavorite('workflow-1')).toBe(false)
    })
  })

  describe('schedules', () => {
    const mockSchedule = {
      id: 'schedule-1',
      workflowId: 'workflow-1',
      type: 'once' as const,
      input: {},
      enabled: true,
      executeAt: Date.now() + 10000
    }

    it('should add schedule', () => {
      const { addSchedule } = useWorkflowStore.getState()
      
      addSchedule(mockSchedule)
      
      expect(useWorkflowStore.getState().schedules).toHaveLength(1)
      expect(useWorkflowStore.getState().schedules[0]).toEqual(mockSchedule)
    })

    it('should update schedule', () => {
      const { addSchedule, updateSchedule } = useWorkflowStore.getState()
      
      addSchedule(mockSchedule)
      updateSchedule('schedule-1', { enabled: false })
      
      const schedule = useWorkflowStore.getState().schedules[0]
      expect(schedule.enabled).toBe(false)
    })

    it('should remove schedule', () => {
      const { addSchedule, removeSchedule } = useWorkflowStore.getState()
      
      addSchedule(mockSchedule)
      removeSchedule('schedule-1')
      
      expect(useWorkflowStore.getState().schedules).toHaveLength(0)
    })

    it('should get active schedules', () => {
      const { addSchedule, getActiveSchedules } = useWorkflowStore.getState()
      
      addSchedule(mockSchedule)
      addSchedule({ ...mockSchedule, id: 'schedule-2', enabled: false })
      
      const activeSchedules = getActiveSchedules()
      expect(activeSchedules).toHaveLength(1)
      expect(activeSchedules[0].id).toBe('schedule-1')
    })
  })

  describe('cache management', () => {
    it('should set cache config', () => {
      const { setCacheConfig } = useWorkflowStore.getState()
      
      setCacheConfig({ enabled: false, ttl: 10000 })
      
      const config = useWorkflowStore.getState().cacheConfig
      expect(config.enabled).toBe(false)
      expect(config.ttl).toBe(10000)
    })
  })

  describe('reset', () => {
    it('should reset all state', () => {
      const { 
        setWorkflows, 
        setSearchQuery, 
        setSelectedWorkflow,
        reset 
      } = useWorkflowStore.getState()
      
      setWorkflows([mockWorkflow])
      setSearchQuery('test')
      setSelectedWorkflow(mockWorkflow)
      
      reset()
      
      const state = useWorkflowStore.getState()
      expect(state.workflows).toEqual([])
      expect(state.searchQuery).toBe('')
      expect(state.selectedWorkflow).toBeNull()
    })
  })
})
