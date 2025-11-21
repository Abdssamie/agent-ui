'use client'

import { StorageProvider } from '@/types/content'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Database, Cloud } from 'lucide-react'

interface StorageProviderSelectProps {
  value: StorageProvider
  onChangeAction: (provider: StorageProvider) => void
}

export function StorageProviderSelect({
  value,
  onChangeAction,
}: StorageProviderSelectProps) {
  return (
    <Select value={value} onValueChange={onChangeAction}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="s3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>S3 / R2</span>
          </div>
        </SelectItem>
        <SelectItem value="google-drive" disabled>
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            <span>Google Drive (Coming Soon)</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
