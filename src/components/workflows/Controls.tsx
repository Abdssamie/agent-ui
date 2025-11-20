"use client"
import {useEffect, useMemo, useRef, useState} from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/icon'
import { type IconType } from '@/components/ui/icon'
import { useWorkflowStore } from '@/stores/workflowStore'

export type StatusFilter = 'all' | 'active' | 'inactive'
export type SortKey = 'name' | 'date' | 'execCount'
export type ViewMode = 'grid' | 'list'

export interface FiltersState {
  query: string
  category: string | 'all'
  status: StatusFilter
  date: 'any' | '24h' | '7d' | '30d'
}

const defaultFilters: FiltersState = {
  query: '',
  category: 'all',
  status: 'all',
  date: 'any',
}

export function usePersistentState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initial
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return initial
      const parsed = JSON.parse(raw)
      return parsed as T
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {}
  }, [key, state])
  return [state, setState] as const
}

export function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [internalValue, setInternalValue] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <Icon type="search" size="xs" className="absolute left-3 top-1/2 -translate-y-1/2" />
      <Input value={internalValue} onChange={handleInputChange} placeholder="Search workflows..." className="pl-9 rounded-xl text-xs" />
    </div>
  );
}

export function FilterPanel({ filters, onChange }: { filters: FiltersState; onChange: (f: FiltersState) => void }) {
  const { workflows } = useWorkflowStore()
  const hasActiveRuns = useMemo(() => workflows.some(w => (w as any).status === 'running'), [workflows])
  return (
    <div className="flex flex-wrap gap-2">
      <Select value={filters.category} onValueChange={(v) => onChange({ ...filters, category: v as any })}>
        <SelectTrigger className="w-[140px] rounded-xl border border-primary/15 bg-accent text-primary text-xs font-medium uppercase">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border border-primary/15 bg-accent text-primary">
          <SelectItem value="all">All categories</SelectItem>
          <SelectItem value="system">System</SelectItem>
          <SelectItem value="user">User</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => onChange({ ...filters, status: v as any })}>
        <SelectTrigger className="w-[120px] rounded-xl border border-primary/15 bg-accent text-primary text-xs font-medium uppercase">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border border-primary/15 bg-accent text-primary">
          <SelectItem value="all">Any status</SelectItem>
          <SelectItem value="active">{hasActiveRuns ? '● ' : ''}Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.date} onValueChange={(v) => onChange({ ...filters, date: v as any })}>
        <SelectTrigger className="w-[120px] rounded-xl border border-primary/15 bg-accent text-primary text-xs font-medium uppercase">
          <SelectValue placeholder="Date" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border border-primary/15 bg-accent text-primary">
          <SelectItem value="any">Any time</SelectItem>
          <SelectItem value="24h">Last 24h</SelectItem>
          <SelectItem value="7d">Last 7d</SelectItem>
          <SelectItem value="30d">Last 30d</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="ghost" className="rounded-xl" onClick={() => onChange(defaultFilters)}>
        <Icon type="refresh" size="xs" />
        <span className="text-xs">Reset</span>
      </Button>
    </div>
  )
}

export function SortSelector({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortKey)}>
      <SelectTrigger className="w-[170px] rounded-xl border border-primary/15 bg-accent text-primary text-xs font-medium uppercase">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent className="rounded-xl border border-primary/15 bg-accent text-primary">
        <SelectItem value="name">Name</SelectItem>
        <SelectItem value="date">Date</SelectItem>
        <SelectItem value="execCount">Execution count</SelectItem>
      </SelectContent>
    </Select>
  )
}

export function ViewModeToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  // Fallback to existing icons: use 'sheet' for grid and 'list' alternative as 'references'
  const gridIcon: IconType = 'sheet'
  const listIcon: IconType = 'references'
  return (
    <div className="flex items-center gap-1 rounded-xl border border-primary/15 p-1">
      <Button variant={value === 'grid' ? 'default' : 'ghost'} size="sm" className="rounded-lg" onClick={() => onChange('grid')}>
        <Icon type={gridIcon} size="xs" />
      </Button>
      <Button variant={value === 'list' ? 'default' : 'ghost'} size="sm" className="rounded-lg" onClick={() => onChange('list')}>
        <Icon type={listIcon} size="xs" />
      </Button>
    </div>
  )
}
