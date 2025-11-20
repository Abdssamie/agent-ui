import React, { memo, useState } from 'react'
import Icon from '@/components/ui/icon'
import Tooltip from '@/components/ui/tooltip'
import type { ReferenceData } from '@/types/os'

interface KnowledgeReferencesProps {
  references: ReferenceData[]
}

interface ReferenceItemProps {
  reference: ReferenceData
  index: number
}

const ReferenceItem = memo(({ reference, index }: ReferenceItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Extract unique file names from references
  const fileNames = Array.from(
    new Set(reference.references.map((ref) => ref.name))
  )
  
  const totalChunks = reference.references.length
  
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <Icon type="paperclip" size="sm" className="mt-0.5 flex-shrink-0" />
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {fileNames.map((fileName, idx) => (
                <Tooltip
                  key={idx}
                  content={
                    <div className="flex flex-col gap-1">
                      <div className="font-medium">{fileName}</div>
                      <div className="text-xs text-muted-foreground">
                        {totalChunks} chunk{totalChunks !== 1 ? 's' : ''} retrieved
                      </div>
                    </div>
                  }
                >
                  <span className="text-sm font-medium text-primary hover:underline cursor-help truncate">
                    {fileName}
                  </span>
                </Tooltip>
              ))}
            </div>
            {reference.query && (
              <div className="text-xs text-muted-foreground">
                Query: &quot;{reference.query}&quot;
              </div>
            )}
            {reference.time && (
              <div className="text-xs text-muted-foreground">
                Retrieved in {reference.time.toFixed(2)}s
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-primary hover:underline flex-shrink-0"
          aria-label={isExpanded ? 'Hide chunks' : 'Show chunks'}
        >
          {isExpanded ? 'Hide' : 'Show'} chunks
        </button>
      </div>
      
      {isExpanded && (
        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
          {reference.references.map((ref, idx) => (
            <div
              key={idx}
              className="rounded border border-border bg-background p-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-medium text-muted-foreground">
                  Chunk {ref.meta_data.chunk}
                </span>
                <span className="text-muted-foreground">
                  Size: {ref.meta_data.chunk_size} chars
                </span>
              </div>
              <div className="text-foreground whitespace-pre-wrap break-words">
                {ref.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

const KnowledgeReferences = ({ references }: KnowledgeReferencesProps) => {
  if (!references || references.length === 0) {
    return null
  }
  
  return (
    <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border">
      <div className="flex items-center gap-2">
        <Icon type="references" size="sm" />
        <span className="text-sm font-medium text-muted-foreground">
          Knowledge Base References ({references.length})
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {references.map((reference, index) => (
          <ReferenceItem key={index} reference={reference} index={index} />
        ))}
      </div>
    </div>
  )
}

ReferenceItem.displayName = 'ReferenceItem'
KnowledgeReferences.displayName = 'KnowledgeReferences'

export default memo(KnowledgeReferences)
