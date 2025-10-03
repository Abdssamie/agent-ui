import { toast } from 'sonner'
import {
    DeleteAllContentParams,
    DeleteAllContentResponse,
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
 * Delete All Content API
 * Permanently remove all content from the knowledge base. 
 * This is a destructive operation that cannot be undone. Use with extreme caution.
 */
export const deleteAllContentAPI = async (
    params: DeleteAllContentParams = {},
    baseUrl?: string
): Promise<DeleteAllContentResponse> => {
    try {
        const queryString = buildQueryString(params)
        const endpoint = `/knowledge/content${queryString}`

        const response = await makeRequest(endpoint, { method: 'DELETE' }, baseUrl)
        const data: DeleteAllContentResponse = await response.json()

        toast.success('All content deleted successfully')
        return data
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete all content'
        toast.error(`Error deleting all content: ${errorMessage}`)
        throw error
    }
}