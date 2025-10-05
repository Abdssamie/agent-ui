import { useCallback } from 'react'
import { getSessionAPI, getAllSessionsAPI } from '@/api/os'
import { useStore } from '../store'
import { toast } from 'sonner'
import { ChatMessage, ToolCall, ReasoningMessage, ChatEntry, RunResponse, UserMessage} from '@/types/os'
import { getJsonMarkdown } from '@/lib/utils'

interface SessionResponse {
  session_id: string
  agent_id: string
  user_id: string | null
  runs?: ChatEntry[]
  memory: {
    runs?: ChatEntry[]
    chats?: ChatEntry[]
  }
  agent_data: Record<string, unknown>
}

interface LoaderArgs {
  entityType: 'agent' | 'team' | null
  agentId?: string | null
  teamId?: string | null
  dbId: string | null
}

const useSessionLoader = () => {
  const setMessages = useStore((state) => state.setMessages)
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const setIsSessionsLoading = useStore((state) => state.setIsSessionsLoading)
  const setSessionsData = useStore((state) => state.setSessionsData)

  const getSessions = useCallback(
    async ({ entityType, agentId, teamId, dbId }: LoaderArgs) => {
      const selectedId = entityType === 'agent' ? agentId : teamId
      if (!selectedEndpoint || !entityType || !selectedId || !dbId) return

      try {
        setIsSessionsLoading(true)

        const sessions = await getAllSessionsAPI(
          selectedEndpoint,
          entityType,
          selectedId,
          dbId
        )
        setSessionsData(sessions.data ?? [])
      } catch {
        toast.error('Error loading sessions')
        setSessionsData([])
      } finally {
        setIsSessionsLoading(false)
      }
    },
    [selectedEndpoint, setSessionsData, setIsSessionsLoading]
  )

  const getSession = useCallback(
    async (
      { entityType, agentId, teamId, dbId }: LoaderArgs,
      sessionId: string
    ) => {
      const selectedId = entityType === 'agent' ? agentId : teamId
      if (
        !selectedEndpoint ||
        !sessionId ||
        !entityType ||
        !selectedId ||
        !dbId
      )
        return

      try {
        const response: RunResponse[] = await getSessionAPI(
          selectedEndpoint,
          entityType,
          sessionId,
          dbId
        )
        if (response) {
          if (Array.isArray(response)) {
            const messagesFor = response.flatMap((run) => {
              const filteredMessages: ChatMessage[] = []

              // Extract user message from the messages array
              const userMessage = (run.messages as UserMessage[] | undefined)?.find(
                (msg: any) => msg.role === 'user' && !msg.from_history
              )

              const userContent = String(userMessage?.content ?? run.run_input ?? '')

              // Extract attachments from user message if they exist
              const userImages = userMessage?.images ? [...userMessage.images] : undefined
              const userVideos = userMessage?.videos ? [...userMessage.videos] : undefined
              const userAudio = userMessage?.audio ? [...userMessage.audio] : undefined

              filteredMessages.push({
                role: 'user',
                content: userContent,
                created_at: run.created_at,
                images: userImages,
                videos: userVideos,
                audio: userAudio,
                files: userMessage?.files ? [...userMessage.files] : undefined,
                  attachments: userMessage?.attachments ? [...userMessage.attachments] : undefined,
              })

              // Add agent message with tool calls
              const toolCalls = [
                ...(run.tools ?? []),
                ...(run.extra_data?.reasoning_messages ?? []).reduce(
                  (acc: ToolCall[], msg: ReasoningMessage) => {
                    if (msg.role === 'tool') {
                      acc.push({
                        role: msg.role,
                        content: msg.content,
                        tool_call_id: msg.tool_call_id ?? '',
                        tool_name: msg.tool_name ?? '',
                        tool_args: msg.tool_args ?? {},
                        tool_call_error: msg.tool_call_error ?? false,
                        metrics: msg.metrics ?? { time: 0 },
                        created_at:
                          msg.created_at ?? Math.floor(Date.now() / 1000)
                      })
                    }
                    return acc
                  },
                  []
                )
              ]

              const agentContent = String((run.content as string) ?? '')
              filteredMessages.push({
                role: 'agent',
                content: agentContent,
                tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
                extra_data: run.extra_data ? { ...run.extra_data } : undefined,
                images: run.images ? [...run.images] : undefined,
                videos: run.videos ? [...run.videos] : undefined,
                audio: run.audio ? [...run.audio] : undefined,
                response_audio: run.response_audio ? { ...run.response_audio } : undefined,
                created_at: run.created_at
              })

              return filteredMessages
            })

            const processedMessages = messagesFor.map(
              (message: ChatMessage) => {
                // Always create a new object to avoid reference issues
                const newMessage = { ...message }

                if (Array.isArray(newMessage.content)) {
                  const textContent = newMessage.content
                    .filter((item: { type: string }) => item.type === 'text')
                    .map((item) => item.text)
                    .join(' ')

                  return {
                    ...newMessage,
                    content: textContent
                  }
                }
                if (typeof newMessage.content !== 'string') {
                  return {
                    ...newMessage,
                    content: getJsonMarkdown(newMessage.content)
                  }
                }
                return newMessage
              }
            )

            setMessages(processedMessages)
            return processedMessages
          }
        }
      } catch {
        return null
      }
    },
    [selectedEndpoint, setMessages]
  )

  return { getSession, getSessions }
}

export default useSessionLoader
