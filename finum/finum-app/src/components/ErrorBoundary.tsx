'use client'

import React from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // TODO: Send to error logging service (Sentry, LogRocket, etc.)
    // logErrorToService(error, errorInfo)

    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-finum-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg border border-finum-gray-200 p-8">
            {/* Icon */}
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 bg-red-100 rounded-full">
                <AlertCircle className="w-12 h-12 text-finum-red" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-finum-gray-900 text-center mb-4">
              Oups, quelque chose s'est mal passé
            </h1>

            {/* Description */}
            <p className="text-finum-gray-600 text-center mb-6">
              Une erreur inattendue s'est produite. Nos équipes ont été notifiées et travaillent sur le problème.
            </p>

            {/* Error Details (in dev mode) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-mono text-red-900 mb-2">
                  <strong>Error:</strong> {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <details className="text-xs font-mono text-red-800 mt-2">
                    <summary className="cursor-pointer hover:text-red-900">
                      Stack trace
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap overflow-x-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-finum-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </button>
              <a
                href="/"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-finum-gray-700 border border-finum-gray-300 rounded-lg hover:bg-finum-gray-50 transition-colors font-medium"
              >
                <Home className="w-4 h-4" />
                Retour à l'accueil
              </a>
            </div>

            {/* Support */}
            <p className="text-sm text-finum-gray-500 text-center mt-6">
              Si le problème persiste, contactez le support à{' '}
              <a href="mailto:support@finum.com" className="text-finum-blue hover:underline">
                support@finum.com
              </a>
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Lightweight error boundary for specific components
export function ErrorFallback({ error, reset }: { error: Error; reset?: () => void }) {
  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-finum-red mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-finum-red mb-1">
            Erreur lors du chargement
          </h3>
          <p className="text-sm text-red-700 mb-3">{error.message}</p>
          {reset && (
            <button
              onClick={reset}
              className="text-sm text-finum-red hover:text-red-800 font-medium underline"
            >
              Réessayer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
