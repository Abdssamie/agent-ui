"use client"
import {useMemo, useRef} from 'react'
import {useVirtualizer, type VirtualItem} from '@tanstack/react-virtual'
import {WorkflowSummary} from '@/types/workflow'
import {WorkflowCard} from './WorkflowCard'
import {Skeleton} from '@/components/ui/skeleton'

export type ViewMode = 'grid'

interface WorkflowGridProps {
  workflows: WorkflowSummary[]
  isLoading?: boolean
  onTriggerAction: (id: string) => void
  isExecutingId?: string | null
  viewMode?: ViewMode
}

export function WorkflowGrid({ workflows, isLoading, onTriggerAction, isExecutingId }: WorkflowGridProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)

  const rowCount = workflows.length
  const estimateSize = 220

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 6,
  })

  const items = rowVirtualizer.getVirtualItems()

  return useMemo(() => {
      if (isLoading) {
          // loading skeletons
          return (
              <div className={'grid gap-4 md:grid-cols-2'}>
                  {Array.from({length: 6}).map((_, idx) => (
                      <Skeleton key={idx} className={'h-[200px] w-full rounded-xl'}/>
                  ))}
              </div>
          )
      }

      if (rowCount === 0) {
          return (
              <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-3">
                      <div
                          className="w-16 h-16 mx-auto rounded-xl bg-accent border border-primary/15 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">No Workflows</span>
                      </div>
                      <div>
                          <h3 className="text-xs font-medium uppercase text-primary mb-1">No workflows found</h3>
                          <p className="text-xs text-muted-foreground">Try adjusting your filters or create workflows in
                              the backend.</p>
                      </div>
                  </div>
              </div>
          )
      }

      return (
          <div
              ref={parentRef}
              className="relative h-[70vh] overflow-auto rounded-xl border border-primary/10"
          >
              <div
                  style={{
                      height: rowVirtualizer.getTotalSize(),
                      position: 'relative',
                      width: '100%'
                  }}
              >
                  {items.map((virtualRow: VirtualItem) => {
                      const w = workflows[virtualRow.index]
                      return (
                          <div
                              key={virtualRow.key}
                              className="absolute top-0 left-0 w-full p-2"
                              style={{
                                  transform: `translateY(${virtualRow.start}px)`
                              }}
                          >
                              <div className="grid gap-4 md:grid-cols-2">
                                  <WorkflowCard
                                      workflow={w}
                                      onTriggerAction={onTriggerAction}
                                      isExecuting={isExecutingId === w.id}
                                  />
                              </div>
                          </div>
                      )
                  })}
              </div>
          </div>
      )
  }, [isLoading, rowCount, items, workflows, onTriggerAction, isExecutingId, rowVirtualizer])
}
