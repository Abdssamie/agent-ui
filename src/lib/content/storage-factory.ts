import { StorageProvider, StorageStrategy } from '@/types/content'
import { S3Strategy } from './s3-strategy'
import { RemotionStrategy } from './remotion-strategy'

export class StorageFactory {
  private static strategies: Map<StorageProvider, StorageStrategy> = new Map()

  static getStrategy(provider: StorageProvider): StorageStrategy {
    if (!this.strategies.has(provider)) {
      switch (provider) {
        case 's3':
          this.strategies.set(provider, new S3Strategy())
          break
        case 'remotion':
          this.strategies.set(provider, new RemotionStrategy())
          break
        default:
          throw new Error(`Unknown storage provider: ${provider}`)
      }
    }
    return this.strategies.get(provider)!
  }
}
