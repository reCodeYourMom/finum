/**
 * Error Service - Centralized error handling and logging
 * Tracks errors in database and provides error reporting functionality
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export type ErrorType = 'client' | 'server' | 'api' | 'service'

export interface ErrorLogInput {
  userId?: string
  errorType: ErrorType
  errorCode?: string
  message: string
  stack?: string
  context?: Record<string, any>
}

/**
 * Log an error to database
 */
export async function logError(input: ErrorLogInput): Promise<void> {
  try {
    await prisma.errorLog.create({
      data: {
        userId: input.userId,
        errorType: input.errorType,
        errorCode: input.errorCode,
        message: input.message,
        stack: input.stack,
        context: input.context,
      },
    })

    logger.error(`${input.errorType} error logged`, undefined, {
      errorCode: input.errorCode,
      userId: input.userId,
    })
  } catch (err) {
    // Fallback to console if database logging fails
    console.error('Failed to log error to database:', err)
    console.error('Original error:', input)
  }
}

/**
 * Handle and log an error
 */
export async function handleError(
  error: Error | unknown,
  errorType: ErrorType,
  context?: {
    userId?: string
    operation?: string
    [key: string]: any
  }
) {
  const err = error instanceof Error ? error : new Error(String(error))

  await logError({
    userId: context?.userId,
    errorType,
    errorCode: (err as any).code,
    message: err.message,
    stack: err.stack,
    context,
  })

  // Also log to application logger
  logger.error(`Handled ${errorType} error`, err, context)
}

/**
 * Get error logs with filters
 */
export async function getErrorLogs(options: {
  userId?: string
  errorType?: ErrorType
  resolved?: boolean
  limit?: number
  startDate?: Date
  endDate?: Date
} = {}) {
  const { userId, errorType, resolved, limit = 50, startDate, endDate } = options

  return prisma.errorLog.findMany({
    where: {
      ...(userId && { userId }),
      ...(errorType && { errorType }),
      ...(resolved !== undefined && { resolved }),
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Mark error as resolved
 */
export async function resolveError(errorId: string): Promise<void> {
  await prisma.errorLog.update({
    where: { id: errorId },
    data: {
      resolved: true,
      resolvedAt: new Date(),
    },
  })
}

/**
 * Get error statistics
 */
export async function getErrorStats(days: number = 7) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const errors = await prisma.errorLog.findMany({
    where: {
      createdAt: { gte: startDate },
    },
    select: {
      errorType: true,
      errorCode: true,
      resolved: true,
      createdAt: true,
    },
  })

  const total = errors.length
  const resolved = errors.filter(e => e.resolved).length
  const unresolved = total - resolved

  // Count by type
  const byType = errors.reduce((acc, error) => {
    acc[error.errorType] = (acc[error.errorType] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Count by code
  const byCode = errors.reduce((acc, error) => {
    if (error.errorCode) {
      acc[error.errorCode] = (acc[error.errorCode] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  // Count by day
  const byDay = errors.reduce((acc, error) => {
    const day = error.createdAt.toISOString().split('T')[0]
    acc[day] = (acc[day] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    total,
    resolved,
    unresolved,
    resolutionRate: total > 0 ? (resolved / total) * 100 : 0,
    byType,
    byCode,
    byDay,
    period: { days, startDate, endDate: new Date() },
  }
}

/**
 * Clean up old resolved errors (run periodically)
 */
export async function cleanupOldErrors(daysOld: number = 90): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  const result = await prisma.errorLog.deleteMany({
    where: {
      resolved: true,
      resolvedAt: {
        lt: cutoffDate,
      },
    },
  })

  logger.info('Cleaned up old errors', {
    count: result.count,
    cutoffDate: cutoffDate.toISOString(),
  })

  return result.count
}

/**
 * Custom error classes for better error handling
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, any>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, context)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: Record<string, any>) {
    super(message, 'AUTH_ERROR', 401, context)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', context?: Record<string, any>) {
    super(message, 'AUTHZ_ERROR', 403, context)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, context?: Record<string, any>) {
    super(`${resource} not found`, 'NOT_FOUND', 404, context)
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context?: Record<string, any>) {
    super(message, 'RATE_LIMIT', 429, context)
    this.name = 'RateLimitError'
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string, context?: Record<string, any>) {
    super(`${service} is currently unavailable`, 'SERVICE_UNAVAILABLE', 503, context)
    this.name = 'ServiceUnavailableError'
  }
}
