import { toast } from 'sonner'
import {
    ListContentParams,
    ListContentResponse,
    UploadContentParams,
    UploadContentResponse,
    AgnoErrorResponse
} from '@/types/agnoKnowledge'

// Base configuration
const DEFAULT_RETRY_ATTEMPTS = 3
const DEFAULT_RETRY_DELAY = 1000
const DEFAULT_TIMEOUT = 30000

// Rate limiting configuration
const RATE_LIMIT_DELAY = 1000
let lastRequestTime = 0

// Utility function to handle rate limiting
const handleRateLimit = async (): Promise<void> => {
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTime

    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
        const delay = RATE_LIMIT_DELAY - timeSinceLastRequest
        await new Promise(resolve => setTimeout(resolve, delay))
    }

    lastRequestTime = Date.now()
}

// Utility function to handle retries with exponential backoff
const withRetry = async <T>(
    operation: () => Promise<T>,
    attempts: number = DEFAULT_RETRY_ATTEMPTS,
    delay: number = DEFAULT_RETRY_DELAY
): Promise<T> => {
    try {
        return await operation()
    } catch (error) {
        if (attempts <= 1) {
            throw error
        }

        // Check if it's a retryable error
        if (error instanceof Response) {
            const status = error.status
            if (status === 429 || status >= 500) {
                await new Promise(resolve => setTimeout(resolve, delay))
                return withRetry(operation, attempts - 1, delay * 2)
            }
        }

        throw error
    }
}

// Base API request function with error handling and authentication
const makeRequest = async (
    endpoint: string,
    options: RequestInit = {},
    baseUrl?: string
): Promise<Response> => {
    await handleRateLimit()

    const url = baseUrl ? `${baseUrl}${endpoint}` : endpoint

    const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>)
    }

    // Add authorization header if available
    const authToken = localStorage.getItem('agno_auth_token') || sessionStorage.getItem('agno_auth_token')
    if (authToken) {
        defaultHeaders.Authorization = `Bearer ${authToken}`
    }

    const requestOptions: RequestInit = {
        ...options,
        headers: defaultHeaders,
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT)
    }

    return withRetry(async () => {
        const response = await fetch(url, requestOptions)

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`
            let errorCode = 'HTTP_ERROR'

            try {
                const errorData: AgnoErrorResponse = await response.json()
                errorMessage = errorData.detail || errorMessage
                errorCode = errorData.error_code || errorCode
            } catch {
                // If we can't parse the error response, use the default message
            }

            const error = new Error(errorMessage) as Error & { code: string; status: number }
            error.code = errorCode
            error.status = response.status
            throw error
        }

        return response
    })
}

// Form data API request function for file uploads
const makeFormDataRequest = async (
    endpoint: string,
    formData: FormData,
    baseUrl?: string
): Promise<Response> => {
    await handleRateLimit()

    const url = baseUrl ? `${baseUrl}${endpoint}` : endpoint

    const defaultHeaders: Record<string, string> = {}

    // Add authorization header if available
    const authToken = localStorage.getItem('agno_auth_token') || sessionStorage.getItem('agno_auth_token')
    if (authToken) {
        defaultHeaders.Authorization = `Bearer ${authToken}`
    }

    // Note: Don't set Content-Type for FormData, let the browser set it with boundary
    const requestOptions: RequestInit = {
        method: 'POST',
        headers: defaultHeaders,
        body: formData,
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT)
    }

    return withRetry(async () => {
        const response = await fetch(url, requestOptions)

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`
            let errorCode = 'HTTP_ERROR'

            try {
                const errorData: AgnoErrorResponse = await response.json()
                errorMessage = errorData.detail || errorMessage
                errorCode = errorData.error_code || errorCode
            } catch {
                // If we can't parse the error response, use the default message
            }

            const error = new Error(errorMessage) as Error & { code: string; status: number }
            error.code = errorCode
            error.status = response.status
            throw error
        }

        return response
    })
}

// Build query string from parameters
const buildQueryString = (params: Record<string, any>): string => {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            searchParams.append(key, String(value))
        }
    })

    const queryString = searchParams.toString()
    return queryString ? `?${queryString}` : ''
}

/**
 * List Content API
 * Retrieve paginated list of all content in the knowledge base with filtering and sorting options
 */
export const listContentAPI = async (
    params: ListContentParams = {},
    baseUrl?: string
): Promise<ListContentResponse> => {
    try {
        const queryString = buildQueryString(params)
        const endpoint = `/knowledge/content${queryString}`

        const response = await makeRequest(endpoint, { method: 'GET' }, baseUrl)
        const data: ListContentResponse = await response.json()

        return data
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to list content'
        toast.error(`Error listing content: ${errorMessage}`)
        throw error
    }
}

/**
 * Upload Content API
 * Upload content to the knowledge base. Supports file uploads, text content, or URLs.
 * Content is processed asynchronously in the background.
 */
export const uploadContentAPI = async (
    params: UploadContentParams,
    baseUrl?: string
): Promise<UploadContentResponse> => {
    try {
        const formData = new FormData()

        // Add query parameter for db_id if provided
        let endpoint = '/knowledge/content'
        if (params.db_id) {
            endpoint += `?db_id=${encodeURIComponent(params.db_id)}`
        }

        // Add form fields
        if (params.name !== null && params.name !== undefined) {
            formData.append('name', params.name)
        }
        if (params.description !== null && params.description !== undefined) {
            formData.append('description', params.description)
        }
        if (params.url !== null && params.url !== undefined) {
            // Handle URL as string or array
            const urlValue = Array.isArray(params.url) ? JSON.stringify(params.url) : params.url
            formData.append('url', urlValue)
        }
        if (params.metadata !== null && params.metadata !== undefined) {
            formData.append('metadata', JSON.stringify(params.metadata))
        }
        if (params.file !== null && params.file !== undefined) {
            formData.append('file', params.file)
        }
        if (params.text_content !== null && params.text_content !== undefined) {
            formData.append('text_content', params.text_content)
        }
        if (params.reader_id !== null && params.reader_id !== undefined) {
            formData.append('reader_id', params.reader_id)
        }
        if (params.chunker !== null && params.chunker !== undefined) {
            formData.append('chunker', params.chunker)
        }

        const response = await makeFormDataRequest(endpoint, formData, baseUrl)
        const data: UploadContentResponse = await response.json()

        return data
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload content'
        toast.error(`Error uploading content: ${errorMessage}`)
        throw error
    }
}