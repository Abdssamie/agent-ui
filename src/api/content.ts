import {
  ContentItem,
  ContentListResponse,
  StorageProvider,
  ContentFilter,
} from '@/types/content'
import { StorageFactory } from '@/lib/content/storage-factory'

export async function listContentAPI(
  provider: StorageProvider,
  options?: { pageToken?: string; limit?: number; filter?: ContentFilter }
): Promise<ContentListResponse> {
  const strategy = StorageFactory.getStrategy(provider)
  return strategy.list(options)
}

export async function uploadContentAPI(
  file: File,
  provider: StorageProvider,
  onProgress?: (progress: number) => void
): Promise<ContentItem> {
  const strategy = StorageFactory.getStrategy(provider)
  return strategy.upload(file, onProgress)
}

export async function deleteContentAPI(
  id: string,
  provider: StorageProvider
): Promise<void> {
  const strategy = StorageFactory.getStrategy(provider)
  return strategy.delete(id)
}

export async function getContentUrlAPI(
  id: string,
  provider: StorageProvider
): Promise<string> {
  const strategy = StorageFactory.getStrategy(provider)
  return strategy.getUrl(id)
}

export async function validateFileAPI(
  file: File,
  provider: StorageProvider
): Promise<{ valid: boolean; error?: string }> {
  const strategy = StorageFactory.getStrategy(provider)
  return strategy.validateFile(file)
}
