// Comprehensive error handling utilities for file upload and knowledge base operations

import { toast } from 'sonner'

/**
 * Error types for file handling operations
 */
export enum FileErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UPLOAD_ERROR = 'UPLOAD_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Structured error class for file handling operations
 */
export class FileHandlingError extends Error {
  type: FileErrorType
  code?: string
  statusCode?: number
  retryable: boolean
  userMessage: string
  technicalDetails?: string

  constructor(
    type: FileErrorType,
    message: string,
    options: {
      code?: string
      statusCode?: number
      retryable?: boolean
      userMessage?: string
      technicalDetails?: string
    } = {}
  ) {
    super(message)
    this.name = 'FileHandlingError'
    this.type = type
    this.code = options.code
    this.statusCode = options.statusCode
    this.retryable = options.retryable ?? false
    this.userMessage = options.userMessage || message
    this.technicalDetails = options.technicalDetails
  }
}

/**
 * Parse and classify errors from various sources
 */
export function parseError(error: unknown): FileHandlingError {
  // Already a FileHandlingError
  if (error instanceof FileHandlingError) {
    return error
  }

  // Network/Fetch errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new FileHandlingError(
      FileErrorType.NETWORK_ERROR,
      'Network connection failed',
      {
        retryable: true,
        userMessage: 'Unable to connect to the server. Please check your internet connection and try again.',
        technicalDetails: error.message
      }
    )
  }

  // Timeout errors
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return new FileHandlingError(
      FileErrorType.TIMEOUT_ERROR,
      'Request timed out',
      {
        retryable: true,
        userMessage: 'The request took too long to complete. Please try again.',
        technicalDetails: error.message
      }
    )
  }

  // API errors with status codes
  if (error instanceof Error && 'status' in error) {
    const statusCode = (error as any).status
    const code = (error as any).code

    if (statusCode === 401 || statusCode === 403) {
      return new FileHandlingError(
        FileErrorType.AUTHENTICATION_ERROR,
        'Authentication failed',
        {
          statusCode,
          code,
          retryable: false,
          userMessage: 'You are not authorized to perform this action. Please log in again.',
          technicalDetails: error.message
        }
      )
    }

    if (statusCode === 429) {
      return new FileHandlingError(
        FileErrorType.RATE_LIMIT_ERROR,
        'Rate limit exceeded',
        {
          statusCode,
          code,
          retryable: true,
          userMessage: 'Too many requests. Please wait a moment and try again.',
          technicalDetails: error.message
        }
      )
    }

    if (statusCode >= 500) {
      return new FileHandlingError(
        FileErrorType.API_ERROR,
        'Server error',
        {
          statusCode,
          code,
          retryable: true,
          userMessage: 'The server encountered an error. Please try again in a few moments.',
          technicalDetails: error.message
        }
      )
    }

    if (statusCode >= 400) {
      return new FileHandlingError(
        FileErrorType.API_ERROR,
        'Request failed',
        {
          statusCode,
          code,
          retryable: false,
          userMessage: error.message || 'The request could not be completed. Please check your input and try again.',
          technicalDetails: error.message
        }
      )
    }
  }

  // Generic Error objects
  if (error instanceof Error) {
    return new FileHandlingError(
      FileErrorType.UNKNOWN_ERROR,
      error.message,
      {
        retryable: false,
        userMessage: error.message || 'An unexpected error occurred. Please try again.',
        technicalDetails: error.stack
      }
    )
  }

  // Unknown error types
  return new FileHandlingError(
    FileErrorType.UNKNOWN_ERROR,
    'An unknown error occurred',
    {
      retryable: false,
      userMessage: 'An unexpected error occurred. Please try again.',
      technicalDetails: String(error)
    }
  )
}

/**
 * Display user-friendly error notifications
 */
export function showErrorNotification(error: unknown, context?: string): void {
  const parsedError = parseError(error)
  
  const title = context ? `${context}: ${parsedError.userMessage}` : parsedError.userMessage
  
  toast.error(title, {
    description: parsedError.retryable ? 'You can try again.' : undefined,
    duration: parsedError.retryable ? 5000 : 7000
  })
}

/**
 * Display success notifications
 */
export function showSuccessNotification(message: string, description?: string): void {
  toast.success(message, {
    description,
    duration: 3000
  })
}

/**
 * Display info notifications
 */
export function showInfoNotification(message: string, description?: string): void {
  toast.info(message, {
    description,
    duration: 4000
  })
}

/**
 * Display warning notifications
 */
export function showWarningNotification(message: string, description?: string): void {
  toast.warning(message, {
    description,
    duration: 5000
  })
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const parsedError = parseError(error)
  return parsedError.retryable
}

/**
 * Get user-friendly error message
 */
export function getUserErrorMessage(error: unknown): string {
  const parsedError = parseError(error)
  return parsedError.userMessage
}

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number
    initialDelay?: number
    maxDelay?: number
    backoffMultiplier?: number
    onRetry?: (attempt: number, error: unknown) => void
    shouldRetry?: (error: unknown) => boolean
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry,
    shouldRetry = isRetryableError
  } = options

  let lastError: unknown
  let delay = initialDelay

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      // Check if we should retry
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error
      }

      // Notify about retry
      if (onRetry) {
        onRetry(attempt, error)
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))

      // Increase delay for next attempt
      delay = Math.min(delay * backoffMultiplier, maxDelay)
    }
  }

  throw lastError
}

/**
 * Handle graceful degradation when features are unavailable
 */
export function handleFeatureUnavailable(
  featureName: string,
  fallbackAction?: () => void
): void {
  showWarningNotification(
    `${featureName} is currently unavailable`,
    fallbackAction 
      ? 'Using alternative method...' 
      : 'Please try again later or contact support if the issue persists.'
  )

  if (fallbackAction) {
    try {
      fallbackAction()
    } catch (error) {
      showErrorNotification(error, 'Fallback action failed')
    }
  }
}

/**
 * Batch error handler for multiple operations
 */
export function handleBatchErrors(
  results: Array<{ success: boolean; error?: unknown; item?: any }>,
  itemName: string = 'item'
): void {
  const successCount = results.filter(r => r.success).length
  const failCount = results.length - successCount

  if (successCount > 0 && failCount === 0) {
    showSuccessNotification(
      `All ${itemName}s processed successfully`,
      `${successCount} ${itemName}${successCount > 1 ? 's' : ''} completed`
    )
  } else if (successCount > 0 && failCount > 0) {
    showWarningNotification(
      `Partially completed`,
      `${successCount} ${itemName}${successCount > 1 ? 's' : ''} succeeded, ${failCount} failed`
    )
  } else if (failCount > 0) {
    showErrorNotification(
      new Error(`All ${itemName}s failed to process`),
      'Batch operation'
    )
  }
}

/**
 * Validation error formatter
 */
export function formatValidationErrors(errors: string[]): string {
  if (errors.length === 0) return ''
  if (errors.length === 1) return errors[0]
  
  return `Multiple validation errors:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
}

/**
 * Create a user-friendly error summary
 */
export function createErrorSummary(errors: unknown[]): string {
  if (errors.length === 0) return 'No errors'
  if (errors.length === 1) return getUserErrorMessage(errors[0])
  
  const errorMessages = errors.map(e => getUserErrorMessage(e))
  const uniqueMessages = [...new Set(errorMessages)]
  
  if (uniqueMessages.length === 1) {
    return `${uniqueMessages[0]} (${errors.length} occurrences)`
  }
  
  return `${errors.length} errors occurred: ${uniqueMessages.slice(0, 3).join(', ')}${uniqueMessages.length > 3 ? '...' : ''}`
}
