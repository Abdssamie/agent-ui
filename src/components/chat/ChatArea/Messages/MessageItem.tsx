import Icon from '@/components/ui/icon'
import MarkdownRenderer from '@/components/ui/typography/MarkdownRenderer'
import { useStore } from '@/store'
import type { ChatMessage } from '@/types/os'
import Videos from './Multimedia/Videos'
import Images from './Multimedia/Images'
import Audios from './Multimedia/Audios'
import KnowledgeReferences from './KnowledgeReferences'
import React, { memo } from 'react'
import { FileText, File, FileSpreadsheet } from 'lucide-react'
import AgentThinkingLoader from './AgentThinkingLoader'
import Image from 'next/image'

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
  return (
    <div className="flex items-start gap-4 pt-4 text-start max-md:break-words">
      <div className="flex-shrink-0">
        <Icon type="user" size="sm" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-md rounded-lg font-geist text-secondary">
          {message.content}
        </div>
        {message.images && message.images.length > 0 && (
          <Images images={message.images} size="small" />
        )}
        {message.files && message.files.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {message.files.map((doc, index) => {
              const mimeType = doc.mime_type?.toLowerCase() || ''
              const fileExt = doc.filename?.split('.').pop()?.toLowerCase() || ''
              const fileName = doc.filename || `document_${index + 1}`

              const PDF_ICON_PATH = '/icons/pdf-svgrepo-com.svg';

              // Default values
              let FileIcon: React.ElementType | 'img' = File; // Can be a component or 'img' string
              let iconColor = 'text-gray-500';
              let isSvgFromPublic = false; // Flag to use <Image> for public SVG

              if (mimeType.includes('pdf')) {
                // Use a flag and the static path for the SVG
                isSvgFromPublic = true;
                iconColor = 'text-red-500'; // Color is now mostly for the background/container
              } else if (mimeType.startsWith('text/') || ['txt', 'md', 'markdown'].includes(fileExt)) {
                FileIcon = FileText;
                iconColor = 'text-blue-500';
              } else if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
                iconColor = 'text-orange-500';
              } else if (mimeType.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(fileExt)) {
                FileIcon = FileSpreadsheet;
                iconColor = 'text-green-600';
              } else {
                FileIcon = File;
                iconColor = 'text-gray-500';
              }

              const format = doc.format?.toUpperCase() ||
                            doc.mime_type?.split('/')[1]?.toUpperCase() ||
                            'FILE'

              return (
                <div
                  key={doc.id || index}
                  className="inline-flex items-center gap-3 p-3 bg-card rounded-lg border border-border hover:bg-accent transition-colors"
                  title={fileName}
                >
                  <div className={`p-2 rounded-md bg-${iconColor.split('-')[1]}/10`}>
                    {/* Conditional rendering for the icon */}
                    {isSvgFromPublic ? (
                      // Use <Image> tag for the SVG from the public folder
                      <Image
                        src={PDF_ICON_PATH}
                        alt="PDF Icon"
                        className="w-5 h-5"
                      />
                    ) : (
                      // Use the imported component for other file types
                      <FileIcon className={`w-5 h-5 ${iconColor}`} />
                    )}
                  </div>
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
