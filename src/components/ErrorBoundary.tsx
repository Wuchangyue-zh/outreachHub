'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { t, getLocale } from '@/lib/i18n'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800">{t('errorBoundary.loadFailed', getLocale())}</h3>
          <p className="mt-1 text-sm text-red-600">
            {this.state.error?.message || t('errorBoundary.unknownError', getLocale())}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
          >
            {t('errorBoundary.retry', getLocale())}
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
