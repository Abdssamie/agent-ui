import { toast } from 'sonner'
import {
    UpdateContentParams,
    UpdateContentResponse,
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

// Form-encoded API request function for updates
const makeFormEncodedRequest = async (
    endpoint: string,
    formData: URLSearchParams,
    baseUrl?: string
): Promise<Response> => {
    await handleRateLimit()

    const url = baseUrl ? `${baseUrl}${endpoint}` : endpoint

    const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }

    // Add authorization header if available
    const authToken = localStorage.getItem('agno_auth_token') || sessionStorage.getItem('agno_auth_token')
    if (authToken) {
        defaultHeaders.Authorization = `Bearer ${authToken}`
    }

    const requestOptions: RequestInit = {
        method: 'PUT',
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
 * Update Content API
 * Update content properties such as name, description, metadata, or processing configuration.
 * Allows modification of existing content without re-uploading.
 */
export const updateContentAPI = async (
    params: UpdateContentParams,
    baseUrl?: string
): Promise<UpdateContentResponse> => {
    try {
        const { content_id, db_id, ...bodyParams } = params

        // Build endpoint with content_id
        let endpoint = `/knowledge/content/${encodeURIComponent(content_id)}`

        // Add query parameter for db_id if provided
        if (db_id) {
            const queryString = buildQueryString({ db_id })
            endpoint += queryString
        }

        // Build form-encoded body
        const formData = new URLSearchParams()

        if (bodyParams.name !== null && bodyParams.name !== undefined) {
            formData.append('name', bodyParams.name)
        }
        if (bodyParams.description !== null && bodyParams.description !== undefined) {
            formData.append('description', bodyParams.description)
        }
        if (bodyParams.metadata !== null && bodyParams.metadata !== undefined) {
            formData.append('metadata', JSON.stringify(bodyParams.metadata))
        }
        if (bodyParams.reader_id !== null && bodyParams.reader_id !== undefined) {
            formData.append('reader_id', bodyParams.reader_id)
        }

        const response = await makeFormEncodedRequest(endpoint, formData, baseUrl)
        const data: UpdateContentResponse = await response.json()

        toast.success('Content updated successfully')
        return data
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update content'
        toast.error(`Error updating content: ${errorMessage}`)
        throw error
    }
}