import Icon from '@/components/ui/icon'
import MarkdownRenderer from '@/components/ui/typography/MarkdownRenderer'
import { useStore } from '@/store'
import type { ChatMessage } from '@/types/os'
import Videos from './Multimedia/Videos'
import Images from './Multimedia/Images'
import Audios from './Multimedia/Audios'
import KnowledgeReferences from './KnowledgeReferences'
import { memo } from 'react'
import AgentThinkingLoader from './AgentThinkingLoader'

interface MessageProps {
  message: ChatMessage
}

const AgentMessage = ({ message }: MessageProps) => {
  const { streamingErrorMessage } = useStore()
  let messageContent
  if (message.streamingError) {
    messageContent = (
      <p className="text-destructive">
        Oops! Something went wrong while streaming.{' '}
        {streamingErrorMessage ? (
          <>{streamingErrorMessage}</>
        ) : (
          'Please try refreshing the page or try again later.'
        )}
      </p>
    )
  } else if (message.content) {
    messageContent = (
      <div className="flex w-full flex-col gap-4">
        <MarkdownRenderer>{message.content}</MarkdownRenderer>
        {message.videos && message.videos.length > 0 && (
          <Videos videos={message.videos} />
        )}
        {message.images && message.images.length > 0 && (
          <Images images={message.images} size={message.role === 'user' ? 'small' : 'normal'} />
        )}
        {message.audio && message.audio.length > 0 && (
          <Audios audio={message.audio} />
        )}
        {message.extra_data?.references && message.extra_data.references.length > 0 && (
          <KnowledgeReferences references={message.extra_data.references} />
        )}
      </div>
    )
  } else if (message.response_audio) {
    if (!message.response_audio.transcript) {
      messageContent = (
        <div className="mt-2 flex items-start">
          <AgentThinkingLoader />
        </div>
      )
    } else {
      messageContent = (
        <div className="flex w-full flex-col gap-4">
          <MarkdownRenderer>
            {message.response_audio.transcript}
          </MarkdownRenderer>
          {message.response_audio.content && message.response_audio && (
            <Audios audio={[message.response_audio]} />
          )}
          {message.extra_data?.references && message.extra_data.references.length > 0 && (
            <KnowledgeReferences references={message.extra_data.references} />
          )}
        </div>
      )
    }
  } else {
    messageContent = (
      <div className="mt-2">
        <AgentThinkingLoader />
      </div>
    )
  }

  return (
    <div className="flex flex-row items-start gap-4 font-geist">
      <div className="flex-shrink-0">
        <Icon type="agent" size="sm" />
      </div>
      {messageContent}
    </div>
  )
}

const UserMessage = memo(({ message }: MessageProps) => {
  // Separate images from documents based on mime_type
  const actualImages = message.images?.filter(img => 
    img.mime_type?.startsWith('image/')
  ) || []
  
  const documents = message.files?.filter(file =>
    file.mime_type && !file.mime_type.startsWith('image/')
  ) || []

  return (
    <div className="flex items-start gap-4 pt-4 text-start max-md:break-words">
      <div className="flex-shrink-0">
        <Icon type="user" size="sm" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-md rounded-lg font-geist text-secondary">
          {message.content}
        </div>
        {actualImages.length > 0 && (
          <Images images={actualImages} size="small" />
        )}
        {documents.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {documents.map((doc, index) => {
              const format = doc.format?.toUpperCase() || 
                            doc.mime_type?.split('/')[1]?.toUpperCase() || 
                            'FILE'
              return (
                <div 
                  key={doc.id || index}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-md border border-primary/30"
                  title={`Attached ${format} document`}
                >
                  <Icon type="file" size="xs" className="text-primary" />
                  <span className="text-xs font-semibold text-primary">
                    {format}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        {message.videos && message.videos.length > 0 && (
          <Videos videos={message.videos} />
        )}
        {message.audio && message.audio.length > 0 && (
          <Audios audio={message.audio} />
        )}
      </div>
    </div>
  )
})

AgentMessage.displayName = 'AgentMessage'
UserMessage.displayName = 'UserMessage'
export { AgentMessage, UserMessage }
