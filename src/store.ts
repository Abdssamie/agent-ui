import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import {
  AgentDetails,
  SessionEntry,
  TeamDetails,
  type ChatMessage
} from '@/types/os'
import {
  FileAttachment,
  FileHandlingState,
  KnowledgeContent,
  FileValidationConfig
} from '@/types/fileHandling'

interface Store {
  hydrated: boolean
  setHydrated: () => void
  streamingErrorMessage: string
  setStreamingErrorMessage: (streamingErrorMessage: string) => void
  endpoints: {
    endpoint: string
    id__endpoint: string
  }[]
  setEndpoints: (
    endpoints: {
      endpoint: string
      id__endpoint: string
    }[]
  ) => void
  isStreaming: boolean
  setIsStreaming: (isStreaming: boolean) => void
  isEndpointActive: boolean
  setIsEndpointActive: (isActive: boolean) => void
  isEndpointLoading: boolean
  setIsEndpointLoading: (isLoading: boolean) => void
  messages: ChatMessage[]
  setMessages: (
    messages: ChatMessage[] | ((prevMessages: ChatMessage[]) => ChatMessage[])
  ) => void
  chatInputRef: React.RefObject<HTMLTextAreaElement | null>
  selectedEndpoint: string
  setSelectedEndpoint: (selectedEndpoint: string) => void
  agents: AgentDetails[]
  setAgents: (agents: AgentDetails[]) => void
  teams: TeamDetails[]
  setTeams: (teams: TeamDetails[]) => void
  selectedModel: string
  setSelectedModel: (model: string) => void
  mode: 'agent' | 'team'
  setMode: (mode: 'agent' | 'team') => void
  sessionsData: SessionEntry[] | null
  setSessionsData: (
    sessionsData:
      | SessionEntry[]
      | ((prevSessions: SessionEntry[] | null) => SessionEntry[] | null)
  ) => void
  isSessionsLoading: boolean
  setIsSessionsLoading: (isSessionsLoading: boolean) => void
  
  // File attachment state management
  attachments: FileAttachment[]
  isUploading: boolean
  uploadProgress: Record<string, number>
  knowledgeContents: KnowledgeContent[]
  validationConfig: FileValidationConfig
  
  // File attachment actions
  addAttachment: (attachment: FileAttachment) => void
  addAttachments: (attachments: FileAttachment[]) => void
  removeAttachment: (id: string) => void
  updateAttachment: (id: string, updates: Partial<FileAttachment>) => void
  clearAttachments: () => void
  setUploadProgress: (id: string, progress: number) => void
  setIsUploading: (isUploading: boolean) => void
  setAttachmentError: (id: string, error: string) => void
  setAttachmentKnowledgeId: (id: string, knowledgeId: string) => void
  addKnowledgeContent: (content: KnowledgeContent) => void
  removeKnowledgeContent: (id: string) => void
  updateKnowledgeContent: (id: string, updates: Partial<KnowledgeContent>) => void
  setKnowledgeContents: (contents: KnowledgeContent[]) => void
  setValidationConfig: (config: FileValidationConfig) => void
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      streamingErrorMessage: '',
      setStreamingErrorMessage: (streamingErrorMessage) =>
        set(() => ({ streamingErrorMessage })),
      endpoints: [],
      setEndpoints: (endpoints) => set(() => ({ endpoints })),
      isStreaming: false,
      setIsStreaming: (isStreaming) => set(() => ({ isStreaming })),
      isEndpointActive: false,
      setIsEndpointActive: (isActive) =>
        set(() => ({ isEndpointActive: isActive })),
      isEndpointLoading: true,
      setIsEndpointLoading: (isLoading) =>
        set(() => ({ isEndpointLoading: isLoading })),
      messages: [],
      setMessages: (messages) =>
        set((state) => ({
          messages:
            typeof messages === 'function' ? messages(state.messages) : messages
        })),
      chatInputRef: { current: null },
      selectedEndpoint: 'http://localhost:7777',
      setSelectedEndpoint: (selectedEndpoint) =>
        set(() => ({ selectedEndpoint })),
      agents: [],
      setAgents: (agents) => set({ agents }),
      teams: [],
      setTeams: (teams) => set({ teams }),
      selectedModel: '',
      setSelectedModel: (selectedModel) => set(() => ({ selectedModel })),
      mode: 'agent',
      setMode: (mode) => set(() => ({ mode })),
      sessionsData: null,
      setSessionsData: (sessionsData) =>
        set((state) => ({
          sessionsData:
            typeof sessionsData === 'function'
              ? sessionsData(state.sessionsData)
              : sessionsData
        })),
      isSessionsLoading: false,
      setIsSessionsLoading: (isSessionsLoading) =>
        set(() => ({ isSessionsLoading })),

      // File attachment state initialization
      attachments: [],
      isUploading: false,
      uploadProgress: {},
      knowledgeContents: [],
      validationConfig: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxTotalSize: 50 * 1024 * 1024, // 50MB
        maxFileCount: 10,
        allowedTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'text/plain',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'video/mp4',
          'video/webm',
          'audio/mpeg',
          'audio/wav',
          'audio/mp4'
        ],
        allowedExtensions: [
          '.jpg',
          '.jpeg',
          '.png',
          '.gif',
          '.webp',
          '.pdf',
          '.txt',
          '.docx',
          '.xlsx',
          '.mp4',
          '.webm',
          '.mp3',
          '.wav',
          '.m4a'
        ]
      },

      // File attachment actions
      addAttachment: (attachment) =>
        set((state) => ({
          attachments: [...state.attachments, attachment]
        })),

      addAttachments: (attachments) =>
        set((state) => ({
          attachments: [...state.attachments, ...attachments]
        })),

      removeAttachment: (id) =>
        set((state) => ({
          attachments: state.attachments.filter((attachment) => attachment.id !== id),
          uploadProgress: Object.fromEntries(
            Object.entries(state.uploadProgress).filter(([key]) => key !== id)
          )
        })),

      updateAttachment: (id, updates) =>
        set((state) => ({
          attachments: state.attachments.map((attachment) =>
            attachment.id === id ? { ...attachment, ...updates } : attachment
          )
        })),

      clearAttachments: () =>
        set(() => ({
          attachments: [],
          uploadProgress: {},
          isUploading: false
        })),

      setUploadProgress: (id, progress) =>
        set((state) => ({
          uploadProgress: {
            ...state.uploadProgress,
            [id]: progress
          }
        })),

      setIsUploading: (isUploading) =>
        set(() => ({ isUploading })),

      setAttachmentError: (id, error) =>
        set((state) => ({
          attachments: state.attachments.map((attachment) =>
            attachment.id === id
              ? { ...attachment, uploadStatus: 'error' as const, error }
              : attachment
          )
        })),

      setAttachmentKnowledgeId: (id, knowledgeId) =>
        set((state) => ({
          attachments: state.attachments.map((attachment) =>
            attachment.id === id
              ? { ...attachment, knowledgeId, uploadStatus: 'completed' as const }
              : attachment
          )
        })),

      addKnowledgeContent: (content) =>
        set((state) => ({
          knowledgeContents: [...state.knowledgeContents, content]
        })),

      removeKnowledgeContent: (id) =>
        set((state) => ({
          knowledgeContents: state.knowledgeContents.filter((content) => content.id !== id)
        })),

      updateKnowledgeContent: (id, updates) =>
        set((state) => ({
          knowledgeContents: state.knowledgeContents.map((content) =>
            content.id === id ? { ...content, ...updates } : content
          )
        })),

      setKnowledgeContents: (contents) =>
        set(() => ({ knowledgeContents: contents })),

      setValidationConfig: (config) =>
        set(() => ({ validationConfig: config }))
    }),
    {
      name: 'endpoint-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedEndpoint: state.selectedEndpoint,
        validationConfig: state.validationConfig
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated?.()
      }
    }
  )
)
