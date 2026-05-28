import { NextResponse } from 'next/server'

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
}

export interface ApiSuccess<T = any> {
  success: true
  data: T
  message?: string
}

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const ErrorCodes = {
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_EMAIL: 'INVALID_EMAIL',
  PASSWORD_TOO_WEAK: 'PASSWORD_TOO_WEAK',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
} as const

export function errorResponse(
  code: string,
  message: string,
  statusCode: number = 400,
  details?: any
): NextResponse<ApiError> {
  const response: ApiError = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  }

  return NextResponse.json(response, { status: statusCode })
}

export function successResponse<T>(
  data: T,
  message?: string,
  statusCode: number = 200
): NextResponse<ApiSuccess<T>> {
  const response: ApiSuccess<T> = {
    success: true,
    data,
    ...(message && { message }),
  }

  return NextResponse.json(response, { status: statusCode })
}

export function handleApiError(error: unknown): NextResponse<ApiError> {
  console.error('API Error:', error)

  if (error instanceof AppError) {
    return errorResponse(
      error.code,
      error.message,
      error.statusCode,
      error.details
    )
  }

  if (error instanceof Error) {
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      '服务器内部错误',
      500,
      process.env.NODE_ENV === 'development' ? error.message : undefined
    )
  }

  return errorResponse(
    ErrorCodes.INTERNAL_ERROR,
    '发生未知错误',
    500
  )
}
