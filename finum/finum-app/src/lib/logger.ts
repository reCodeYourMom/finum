/**
 * Structured Logging System
 * Provides consistent, structured logging across the application
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  userId?: string
  requestId?: string
  operation?: string
  [key: string]: any
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
  environment: string
}

class Logger {
  private context: LogContext = {}
  private minLevel: LogLevel

  constructor() {
    // Set minimum log level based on environment
    const env = process.env.NODE_ENV || 'development'
    this.minLevel = env === 'production' ? 'info' : 'debug'
  }

  /**
   * Set global context that will be included in all logs
   */
  setContext(context: LogContext) {
    this.context = { ...this.context, ...context }
  }

  /**
   * Clear global context
   */
  clearContext() {
    this.context = {}
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    const currentIndex = levels.indexOf(level)
    const minIndex = levels.indexOf(this.minLevel)
    return currentIndex >= minIndex
  }

  /**
   * Format log entry
   */
  private formatLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
      environment: process.env.NODE_ENV || 'development',
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }

    return entry
  }

  /**
   * Output log entry
   */
  private output(entry: LogEntry) {
    const { level, message, context, error } = entry

    // Console output with colors
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
    }
    const reset = '\x1b[0m'

    if (process.env.NODE_ENV === 'development') {
      // Pretty print for development
      console.log(
        `${colors[level]}[${level.toUpperCase()}]${reset} ${message}`,
        context && Object.keys(context).length > 0 ? context : '',
        error || ''
      )
    } else {
      // JSON for production (easier to parse by log aggregators)
      console.log(JSON.stringify(entry))
    }

    // TODO: Send to external logging service (e.g., Datadog, LogRocket, Sentry)
    // if (process.env.LOGGING_SERVICE_URL) {
    //   this.sendToService(entry)
    // }
  }

  /**
   * Debug log
   */
  debug(message: string, context?: LogContext) {
    if (!this.shouldLog('debug')) return
    const entry = this.formatLogEntry('debug', message, context)
    this.output(entry)
  }

  /**
   * Info log
   */
  info(message: string, context?: LogContext) {
    if (!this.shouldLog('info')) return
    const entry = this.formatLogEntry('info', message, context)
    this.output(entry)
  }

  /**
   * Warning log
   */
  warn(message: string, context?: LogContext) {
    if (!this.shouldLog('warn')) return
    const entry = this.formatLogEntry('warn', message, context)
    this.output(entry)
  }

  /**
   * Error log
   */
  error(message: string, error?: Error, context?: LogContext) {
    if (!this.shouldLog('error')) return
    const entry = this.formatLogEntry('error', message, context, error)
    this.output(entry)
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger()
    childLogger.context = { ...this.context, ...context }
    childLogger.minLevel = this.minLevel
    return childLogger
  }
}

// Export singleton instance
export const logger = new Logger()

// Export factory for creating child loggers
export function createLogger(context: LogContext): Logger {
  return logger.child(context)
}

// Convenience function for API route logging
export function createAPILogger(operation: string, userId?: string, requestId?: string) {
  return logger.child({
    operation,
    userId,
    requestId,
    type: 'api',
  })
}

// Convenience function for service logging
export function createServiceLogger(service: string, operation: string) {
  return logger.child({
    service,
    operation,
    type: 'service',
  })
}
