import {
  errorResponse,
  successResponse,
  AppError,
  ErrorCodes,
  handleApiError,
} from '@/lib/api-errors'

describe('API Errors', () => {
  describe('errorResponse', () => {
    it('should create error response with correct structure', async () => {
      const response = errorResponse('TEST_ERROR', 'Test message', 400)

      expect(response.status).toBe(400)
      const parsed = await response.json()
      expect(parsed.success).toBe(false)
      expect(parsed.error.code).toBe('TEST_ERROR')
      expect(parsed.error.message).toBe('Test message')
    })

    it('should include details when provided', async () => {
      const details = { field: 'email', reason: 'invalid' }
      const response = errorResponse('VALIDATION_ERROR', 'Validation failed', 400, details)

      const parsed = await response.json()
      expect(parsed.error.details).toEqual(details)
    })
  })

  describe('successResponse', () => {
    it('should create success response with correct structure', async () => {
      const data = { id: 1, name: 'Test' }
      const response = successResponse(data)

      expect(response.status).toBe(200)
      const parsed = await response.json()
      expect(parsed.success).toBe(true)
      expect(parsed.data).toEqual(data)
    })

    it('should include message when provided', async () => {
      const data = { id: 1 }
      const response = successResponse(data, 'Operation successful')

      const parsed = await response.json()
      expect(parsed.message).toBe('Operation successful')
    })
  })

  describe('AppError', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError('TEST_ERROR', 'Test message', 400, { extra: 'data' })

      expect(error.code).toBe('TEST_ERROR')
      expect(error.message).toBe('Test message')
      expect(error.statusCode).toBe(400)
      expect(error.details).toEqual({ extra: 'data' })
      expect(error.name).toBe('AppError')
    })

    it('should use default statusCode when not provided', () => {
      const error = new AppError('TEST_ERROR', 'Test message')
      expect(error.statusCode).toBe(400)
    })
  })

  describe('handleApiError', () => {
    it('should handle AppError correctly', async () => {
      const appError = new AppError('CUSTOM_ERROR', 'Custom message', 404)
      const response = handleApiError(appError)

      expect(response.status).toBe(404)
      const parsed = await response.json()
      expect(parsed.error.code).toBe('CUSTOM_ERROR')
      expect(parsed.error.message).toBe('Custom message')
    })

    it('should handle generic Error', async () => {
      const error = new Error('Generic error')
      const response = handleApiError(error)

      expect(response.status).toBe(500)
      const parsed = await response.json()
      expect(parsed.error.code).toBe(ErrorCodes.INTERNAL_ERROR)
    })

    it('should handle unknown errors', async () => {
      const response = handleApiError('Unknown error')

      expect(response.status).toBe(500)
      const parsed = await response.json()
      expect(parsed.error.code).toBe(ErrorCodes.INTERNAL_ERROR)
    })
  })

  describe('ErrorCodes', () => {
    it('should have all required error codes', () => {
      expect(ErrorCodes.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS')
      expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED')
      expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND')
      expect(ErrorCodes.ALREADY_EXISTS).toBe('ALREADY_EXISTS')
      expect(ErrorCodes.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED')
      expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR')
    })
  })
})
