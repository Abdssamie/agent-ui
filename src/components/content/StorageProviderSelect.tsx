// Custom Storage Provider Select with proper styling
'use client'
import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { cn } from '@/lib/utils'
import Icon from '@/components/ui/icon'
import { StorageProvider } from '@/types/content'

interface StorageProviderSelectProps {
  value: StorageProvider
  onValueChange: (value: StorageProvider) => void
}

export const StorageProviderSelect = ({ value, onValueChange }: StorageProviderSelectProps) => {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={cn(
          'flex w-40 items-center justify-between whitespace-nowrap rounded-xl border border-primary/15 bg-accent p-3 text-xs font-medium uppercase text-primary shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon asChild>
          <Icon type="chevron-down" size="xs" className="opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={cn(
            'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-xl border border-primary/15 bg-accent text-primary shadow-md',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2'
          )}
          position="popper"
        >
          <SelectPrimitive.Viewport className="flex flex-col gap-1 p-1">
            <SelectPrimitive.Item
              value="s3"
              className={cn(
                'relative flex w-full cursor-pointer select-none items-center rounded-xl py-2.5 pl-2 pr-8 text-xs font-medium uppercase outline-none',
                'hover:bg-primary/10 focus:bg-primary/10',
                'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
              )}
            >
              <SelectPrimitive.ItemText>Cloudflare R2</SelectPrimitive.ItemText>
              <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                <SelectPrimitive.ItemIndicator>
                  <Icon type="check" size="xs" />
                </SelectPrimitive.ItemIndicator>
              </span>
            </SelectPrimitive.Item>

            <SelectPrimitive.Item
              value="google-drive"
              className={cn(
                'relative flex w-full cursor-pointer select-none items-center rounded-xl py-2.5 pl-2 pr-8 text-xs font-medium uppercase outline-none',
                'hover:bg-primary/10 focus:bg-primary/10',
                'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
              )}
            >
              <SelectPrimitive.ItemText>Google Drive</SelectPrimitive.ItemText>
              <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                <SelectPrimitive.ItemIndicator>
                  <Icon type="check" size="xs" />
                </SelectPrimitive.ItemIndicator>
              </span>
            </SelectPrimitive.Item>
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
