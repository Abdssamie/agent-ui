import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toast } from 'sonner'
import {
    FileErrorType,
    FileHandlingError,
    parseError,
    showErrorNotification,
    showSuccessNotification,
    showInfoNotification,
    showWarningNotification,
    isRetryableError,
    getUserErrorMessage,
    retryOperation,
    handleFeatureUnavailable,
    handleBatchErrors,
    formatValidationErrors,
    createErrorSummary
} from '../errorHandling'

// Mock sonner toast
vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
        info: vi.fn(),
        warning: vi.fn()
    }
}))

describe('FileHandlingError', () => {
    it('should create error with all properties', () => {
        const error = new FileHandlingError(
            FileErrorType.VALIDATION_ERROR,
            'Test error',
            {
                code: 'TEST_CODE',
                statusCode: 400,
                retryable: true,
                userMessage: 'User friendly message',
                technicalDetails: 'Technical details'
            }
        )

        expect(error.name).toBe('FileHandlingError')
        expect(error.type).toBe(FileErrorType.VALIDATION_ERROR)
        expect(error.message).toBe('Test error')
        expect(error.code).toBe('TEST_CODE')
        expect(error.statusCode).toBe(400)
        expect(error.retryable).toBe(true)
        expect(error.userMessage).toBe('User friendly message')
        expect(error.technicalDetails).toBe('Technical details')
    })

    it('should use default values when options not provided', () => {
        const error = new FileHandlingError(
            FileErrorType.UPLOAD_ERROR,
            'Upload failed'
        )

        expect(error.retryable).toBe(false)
        expect(error.userMessage).toBe('Upload failed')
        expect(error.code).toBeUndefined()
        expect(error.statusCode).toBeUndefined()
    })
})

describe('parseError', () => {
    it('should return FileHandlingError as-is', () => {
        const originalError = new FileHandlingError(
            FileErrorType.VALIDATION_ERROR,
            'Test error'
        )
        const parsed = parseError(originalError)

        expect(parsed).toBe(originalError)
    })

    it('should parse network fetch errors', () => {
        const networkError = new TypeError('fetch failed')
        const parsed = parseError(networkError)

        expect(parsed.type).toBe(FileErrorType.NETWORK_ERROR)
        expect(parsed.retryable).toBe(true)
        expect(parsed.userMessage).toContain('Unable to connect')
    })

    it('should parse timeout errors', () => {
        const timeoutError = new DOMException('Timeout', 'TimeoutError')
        const parsed = parseError(timeoutError)

        expect(parsed.type).toBe(FileErrorType.TIMEOUT_ERROR)
        expect(parsed.retryable).toBe(true)
        expect(parsed.userMessage).toContain('took too long')
    })

    it('should parse 401 authentication errors', () => {
        const authError = Object.assign(new Error('Unauthorized'), { status: 401 })
        const parsed = parseError(authError)

        expect(parsed.type).toBe(FileErrorType.AUTHENTICATION_ERROR)
        expect(parsed.statusCode).toBe(401)
        expect(parsed.retryable).toBe(false)
        expect(parsed.userMessage).toContain('not authorized')
    })

    it('should parse 403 authentication errors', () => {
        const authError = Object.assign(new Error('Forbidden'), { status: 403 })
        const parsed = parseError(authError)

        expect(parsed.type).toBe(FileErrorType.AUTHENTICATION_ERROR)
        expect(parsed.statusCode).toBe(403)
        expect(parsed.retryable).toBe(false)
    })

    it('should parse 429 rate limit errors', () => {
        const rateLimitError = Object.assign(new Error('Too many requests'), { status: 429 })
        const parsed = parseError(rateLimitError)

        expect(parsed.type).toBe(FileErrorType.RATE_LIMIT_ERROR)
        expect(parsed.statusCode).toBe(429)
        expect(parsed.retryable).toBe(true)
        expect(parsed.userMessage).toContain('Too many requests')
    })

    it('should parse 500 server errors', () => {
        const serverError = Object.assign(new Error('Internal server error'), { status: 500 })
        const parsed = parseError(serverError)

        expect(parsed.type).toBe(FileErrorType.API_ERROR)
        expect(parsed.statusCode).toBe(500)
        expect(parsed.retryable).toBe(true)
        expect(parsed.userMessage).toContain('server encountered an error')
    })

    it('should parse 400 client errors', () => {
        const clientError = Object.assign(new Error('Bad request'), { status: 400 })
        const parsed = parseError(clientError)

        expect(parsed.type).toBe(FileErrorType.API_ERROR)
        expect(parsed.statusCode).toBe(400)
        expect(parsed.retryable).toBe(false)
    })

    it('should parse generic Error objects', () => {
        const genericError = new Error('Something went wrong')
        const parsed = parseError(genericError)

        expect(parsed.type).toBe(FileErrorType.UNKNOWN_ERROR)
        expect(parsed.message).toBe('Something went wrong')
        expect(parsed.retryable).toBe(false)
    })

    it('should parse unknown error types', () => {
        const unknownError = 'string error'
        const parsed = parseError(unknownError)

        expect(parsed.type).toBe(FileErrorType.UNKNOWN_ERROR)
        expect(parsed.retryable).toBe(false)
        expect(parsed.technicalDetails).toBe('string error')
    })
})

describe('showErrorNotification', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should show error toast with context', () => {
        const error = new FileHandlingError(
            FileErrorType.UPLOAD_ERROR,
            'Upload failed',
            { userMessage: 'File upload failed' }
        )

        showErrorNotification(error, 'File operation')

        expect(toast.error).toHaveBeenCalledWith(
            'File operation: File upload failed',
            expect.objectContaining({
                duration: 7000
            })
        )
    })

    it('should show error toast without context', () => {
        const error = new FileHandlingError(
            FileErrorType.UPLOAD_ERROR,
            'Upload failed',
            { userMessage: 'File upload failed' }
        )

        showErrorNotification(error)

        expect(toast.error).toHaveBeenCalledWith(
            'File upload failed',
            expect.any(Object)
        )
    })

    it('should show retry message for retryable errors', () => {
        const error = new FileHandlingError(
            FileErrorType.NETWORK_ERROR,
            'Network failed',
            { retryable: true, userMessage: 'Connection lost' }
        )

        showErrorNotification(error)

        expect(toast.error).toHaveBeenCalledWith(
            'Connection lost',
            expect.objectContaining({
                description: 'You can try again.',
                duration: 5000
            })
        )
    })
})

describe('showSuccessNotification', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should show success toast', () => {
        showSuccessNotification('Operation successful')

        expect(toast.success).toHaveBeenCalledWith(
            'Operation successful',
            expect.objectContaining({
                duration: 3000
            })
        )
    })

    it('should show success toast with description', () => {
        showSuccessNotification('Upload complete', 'File uploaded successfully')

        expect(toast.success).toHaveBeenCalledWith(
            'Upload complete',
            expect.objectContaining({
                description: 'File uploaded successfully',
                duration: 3000
            })
        )
    })
})

describe('showInfoNotification', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should show info toast', () => {
        showInfoNotification('Processing file')

        expect(toast.info).toHaveBeenCalledWith(
            'Processing file',
            expect.objectContaining({
                duration: 4000
            })
        )
    })
})

describe('showWarningNotification', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should show warning toast', () => {
        showWarningNotification('File size is large')

        expect(toast.warning).toHaveBeenCalledWith(
            'File size is large',
            expect.objectContaining({
                duration: 5000
            })
        )
    })
})

describe('isRetryableError', () => {
    it('should return true for retryable errors', () => {
        const error = new FileHandlingError(
            FileErrorType.NETWORK_ERROR,
            'Network failed',
            { retryable: true }
        )

        expect(isRetryableError(error)).toBe(true)
    })

    it('should return false for non-retryable errors', () => {
        const error = new FileHandlingError(
            FileErrorType.VALIDATION_ERROR,
            'Invalid file',
            { retryable: false }
        )

        expect(isRetryableError(error)).toBe(false)
    })
})

describe('getUserErrorMessage', () => {
    it('should return user-friendly message', () => {
        const error = new FileHandlingError(
            FileErrorType.UPLOAD_ERROR,
            'Technical error',
            { userMessage: 'User friendly message' }
        )

        expect(getUserErrorMessage(error)).toBe('User friendly message')
    })
})

describe('retryOperation', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('should succeed on first attempt', async () => {
        const operation = vi.fn().mockResolvedValue('success')

        const result = await retryOperation(operation)

        expect(result).toBe('success')
        expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on retryable error', async () => {
        const operation = vi.fn()
            .mockRejectedValueOnce(new FileHandlingError(
                FileErrorType.NETWORK_ERROR,
                'Network failed',
                { retryable: true }
            ))
            .mockResolvedValue('success')

        const promise = retryOperation(operation, { maxAttempts: 3 })

        await vi.advanceTimersByTimeAsync(1000)
        const result = await promise

        expect(result).toBe('success')
        expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should not retry on non-retryable error', async () => {
        const operation = vi.fn().mockRejectedValue(
            new FileHandlingError(
                FileErrorType.VALIDATION_ERROR,
                'Invalid',
                { retryable: false }
            )
        )

        await expect(retryOperation(operation)).rejects.toThrow('Invalid')
        expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should call onRetry callback', async () => {
        const operation = vi.fn()
            .mockRejectedValueOnce(new FileHandlingError(
                FileErrorType.NETWORK_ERROR,
                'Failed',
                { retryable: true }
            ))
            .mockResolvedValue('success')

        const onRetry = vi.fn()

        const promise = retryOperation(operation, { onRetry })

        await vi.advanceTimersByTimeAsync(1000)
        await promise

        expect(onRetry).toHaveBeenCalledWith(1, expect.any(FileHandlingError))
    })

    it('should use exponential backoff', async () => {
        const operation = vi.fn()
            .mockRejectedValueOnce(new FileHandlingError(
                FileErrorType.NETWORK_ERROR,
                'Failed',
                { retryable: true }
            ))
            .mockRejectedValueOnce(new FileHandlingError(
                FileErrorType.NETWORK_ERROR,
                'Failed',
                { retryable: true }
            ))
            .mockResolvedValue('success')

        const promise = retryOperation(operation, {
            initialDelay: 1000,
            backoffMultiplier: 2
        })

        // First retry after 1000ms
        await vi.advanceTimersByTimeAsync(1000)
        // Second retry after 2000ms
        await vi.advanceTimersByTimeAsync(2000)

        const result = await promise

        expect(result).toBe('success')
        expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should respect maxDelay', async () => {
        const operation = vi.fn()
            .mockRejectedValue(new FileHandlingError(
                FileErrorType.NETWORK_ERROR,
                'Failed',
                { retryable: true }
            ))

        const promise = retryOperation(operation, {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 1500,
            backoffMultiplier: 3
        }).catch((err: FileHandlingError) => err) // Catch to prevent unhandled rejection

        // Advance timers to complete all retry attempts
        await vi.advanceTimersByTimeAsync(1000) // First retry
        await vi.advanceTimersByTimeAsync(1500) // Second retry (capped at maxDelay)

        // Wait for the promise to resolve/reject
        const result = await promise

        // Verify it's the expected error
        expect(result).toBeInstanceOf(FileHandlingError)
        expect((result as FileHandlingError).message).toBe('Failed')
        expect(operation).toHaveBeenCalledTimes(3)
    })
})

describe('handleFeatureUnavailable', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should show warning without fallback', () => {
        handleFeatureUnavailable('Test feature')

        expect(toast.warning).toHaveBeenCalledWith(
            'Test feature is currently unavailable',
            expect.objectContaining({
                description: expect.stringContaining('try again later')
            })
        )
    })

    it('should execute fallback action', () => {
        const fallback = vi.fn()
        handleFeatureUnavailable('Test feature', fallback)

        expect(fallback).toHaveBeenCalled()
        expect(toast.warning).toHaveBeenCalledWith(
            'Test feature is currently unavailable',
            expect.objectContaining({
                description: 'Using alternative method...'
            })
        )
    })

    it('should handle fallback errors', () => {
        const fallback = vi.fn().mockImplementation(() => {
            throw new Error('Fallback failed')
        })

        handleFeatureUnavailable('Test feature', fallback)

        expect(toast.error).toHaveBeenCalled()
    })
})

describe('handleBatchErrors', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should show success for all successful operations', () => {
        const results = [
            { success: true },
            { success: true },
            { success: true }
        ]

        handleBatchErrors(results, 'file')

        expect(toast.success).toHaveBeenCalledWith(
            'All files processed successfully',
            expect.objectContaining({
                description: '3 files completed'
            })
        )
    })

    it('should show warning for partial success', () => {
        const results = [
            { success: true },
            { success: false, error: new Error('Failed') },
            { success: true }
        ]

        handleBatchErrors(results, 'file')

        expect(toast.warning).toHaveBeenCalledWith(
            'Partially completed',
            expect.objectContaining({
                description: '2 files succeeded, 1 failed'
            })
        )
    })

    it('should show error for all failures', () => {
        const results = [
            { success: false, error: new Error('Failed 1') },
            { success: false, error: new Error('Failed 2') }
        ]

        handleBatchErrors(results, 'file')

        expect(toast.error).toHaveBeenCalled()
    })

    it('should use default item name', () => {
        const results = [{ success: true }]

        handleBatchErrors(results)

        expect(toast.success).toHaveBeenCalledWith(
            'All items processed successfully',
            expect.objectContaining({
                description: '1 item completed'
            })
        )
    })
})

describe('formatValidationErrors', () => {
    it('should return empty string for no errors', () => {
        expect(formatValidationErrors([])).toBe('')
    })

    it('should return single error as-is', () => {
        expect(formatValidationErrors(['Error 1'])).toBe('Error 1')
    })

    it('should format multiple errors', () => {
        const errors = ['Error 1', 'Error 2', 'Error 3']
        const result = formatValidationErrors(errors)

        expect(result).toContain('Multiple validation errors')
        expect(result).toContain('1. Error 1')
        expect(result).toContain('2. Error 2')
        expect(result).toContain('3. Error 3')
    })
})

describe('createErrorSummary', () => {
    it('should return "No errors" for empty array', () => {
        expect(createErrorSummary([])).toBe('No errors')
    })

    it('should return single error message', () => {
        const errors = [
            new FileHandlingError(
                FileErrorType.UPLOAD_ERROR,
                'Upload failed',
                { userMessage: 'File upload failed' }
            )
        ]

        expect(createErrorSummary(errors)).toBe('File upload failed')
    })

    it('should show count for duplicate errors', () => {
        const errors = [
            new FileHandlingError(
                FileErrorType.NETWORK_ERROR,
                'Network failed',
                { userMessage: 'Connection lost' }
            ),
            new FileHandlingError(
                FileErrorType.NETWORK_ERROR,
                'Network failed',
                { userMessage: 'Connection lost' }
            ),
            new FileHandlingError(
                FileErrorType.NETWORK_ERROR,
                'Network failed',
                { userMessage: 'Connection lost' }
            )
        ]

        const result = createErrorSummary(errors)
        expect(result).toContain('Connection lost')
        expect(result).toContain('3 occurrences')
    })

    it('should summarize multiple different errors', () => {
        const errors = [
            new FileHandlingError(
                FileErrorType.NETWORK_ERROR,
                'Network failed',
                { userMessage: 'Connection lost' }
            ),
            new FileHandlingError(
                FileErrorType.UPLOAD_ERROR,
                'Upload failed',
                { userMessage: 'Upload error' }
            ),
            new FileHandlingError(
                FileErrorType.VALIDATION_ERROR,
                'Validation failed',
                { userMessage: 'Invalid file' }
            )
        ]

        const result = createErrorSummary(errors)
        expect(result).toContain('3 errors occurred')
        expect(result).toContain('Connection lost')
        expect(result).toContain('Upload error')
        expect(result).toContain('Invalid file')
    })

    it('should truncate long error lists', () => {
        const errors = [
            new FileHandlingError(FileErrorType.UPLOAD_ERROR, 'Error 1', { userMessage: 'Error 1' }),
            new FileHandlingError(FileErrorType.UPLOAD_ERROR, 'Error 2', { userMessage: 'Error 2' }),
            new FileHandlingError(FileErrorType.UPLOAD_ERROR, 'Error 3', { userMessage: 'Error 3' }),
            new FileHandlingError(FileErrorType.UPLOAD_ERROR, 'Error 4', { userMessage: 'Error 4' }),
            new FileHandlingError(FileErrorType.UPLOAD_ERROR, 'Error 5', { userMessage: 'Error 5' })
        ]

        const result = createErrorSummary(errors)
        expect(result).toContain('5 errors occurred')
        expect(result).toContain('...')
    })
})
