import { memo } from 'react'

import { type ImageData } from '@/types/os'
import { cn } from '@/lib/utils'

interface ImagesProps {
  images: ImageData[]
  size?: 'small' | 'normal'
}

const Images = ({ images, size = 'normal' }: ImagesProps) => {
  const getImageSrc = (image: ImageData): string => {
    // If image has base64 content, use it
    if (image.content) {
      const mimeType = image.mime_type || `image/${image.format || 'jpeg'}`
      return `data:${mimeType};base64,${image.content}`
    }
    // Otherwise use URL
    return image.url || ''
  }

  const getImageKey = (image: ImageData): string => {
    return image.id || image.url || Math.random().toString()
  }

  return (
    <div
      className={cn(
        'grid gap-2',
        size === 'small' ? 'max-w-xs' : 'max-w-xl',
        size === 'small' && images.length > 1 ? 'grid-cols-4' : images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
      )}
    >
      {images.map((image) => {
        const imageSrc = getImageSrc(image)
        
        // Skip rendering if no valid src
        if (!imageSrc) {
          return null
        }
        
        return (
          <div key={getImageKey(image)} className={cn(
            "group relative overflow-hidden rounded-lg",
            size === 'small' ? 'h-16 w-16' : ''
          )}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt={image.revised_prompt || 'Image'}
              className={cn(
                'rounded-lg object-cover',
                size === 'small' ? 'h-16 w-16' : 'w-full'
              )}
              onError={(e) => {
                const parent = e.currentTarget.parentElement
                if (parent) {
                  parent.innerHTML = `
                        <div class="flex ${size === 'small' ? 'h-16 w-16' : 'h-40'} flex-col items-center justify-center gap-2 rounded-md bg-secondary/50 text-muted" >
                          <p class="text-primary text-xs">Image unavailable</p>
                          ${image.url ? `<a href="${imageSrc}" target="_blank" class="max-w-md truncate underline text-primary text-xs w-full text-center p-2">
                            ${imageSrc.substring(0, 50)}...
                          </a>` : ''}
                        </div>
                      `
                }
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

Images.displayName = 'Images'

export default memo(Images)
