// Agno Knowledge API Types

export type ContentStatus = 'processing' | 'completed' | 'failed'

export type SortOrder = 'asc' | 'desc'

export interface ContentResponseSchema {
  id: string
  name?: string | null
  description?: string | null
  type?: string | null
  size?: string | null
  linked_to?: string | null
  metadata?: Record<string, any> | null
  access_count?: number | null
  status?: ContentStatus | null
  status_message?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface PaginationInfo {
  page?: number | null
  limit?: number | null
  total_pages?: number | null
  total_count?: number | null
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationInfo
}

// Request interfaces
export interface ListContentParams {
  limit?: number | null
  page?: number | null
  sort_by?: string | null
  sort_order?: SortOrder | null
  db_id?: string | null
}

export interface UploadContentParams {
  name?: string | null
  description?: string | null
  url?: string | string[] | null
  metadata?: Record<string, any> | null
  file?: File | null
  text_content?: string | null
  reader_id?: string | null
  chunker?: string | null
  db_id?: string | null
}

export interface DeleteAllContentParams {
  db_id?: string | null
}

export interface UpdateContentParams {
  content_id: string
  name?: string | null
  description?: string | null
  metadata?: Record<string, any> | null
  reader_id?: string | null
  db_id?: string | null
}

export interface GetContentByIdParams {
  content_id: string
  db_id?: string | null
}

export interface DeleteContentByIdParams {
  content_id: string
  db_id?: string | null
}

export interface GetContentStatusParams {
  content_id: string
  db_id?: string | null
}

export interface GetKnowledgeConfigParams {
  db_id?: string | null
}

// Response interfaces
export interface UploadContentResponse {
  id: string
  name?: string | null
  description?: string | null
  metadata?: Record<string, any> | null
  status: ContentStatus
}

export interface GetContentStatusResponse {
  status: ContentStatus
  status_message: string
}

export interface ReaderInfo {
  id: string
  name: string
  description: string
  chunkers: string[]
}

export interface ChunkerInfo {
  key: string
  name: string
  description: string
}

export interface GetKnowledgeConfigResponse {
  readers: Record<string, ReaderInfo>
  readersForType: Record<string, string[]>
  chunkers: Record<string, ChunkerInfo>
  filters: string[]
}

export type DeleteAllContentResponse = string

export type UpdateContentResponse = ContentResponseSchema

export type GetContentByIdResponse = ContentResponseSchema

export type DeleteContentByIdResponse = ContentResponseSchema

// Error response interfaces
export interface AgnoErrorResponse {
  detail: string
  error_code?: string | null
}

// API Response types
export type ListContentResponse = PaginatedResponse<ContentResponseSchema>