'use client'

import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error?: Error
}

/**
 * Error Boundary Component
 *
 * Catches React errors and displays a fallback UI
 * In production, errors should be logged to error tracking service (e.g., Sentry)
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log to console in development
        console.error('Error caught by boundary:', error, errorInfo)

        // In production, log to error tracking service
        if (process.env.NODE_ENV === 'production') {
            // Example: Sentry.captureException(error, { extra: errorInfo })
            // Or send to your own error logging API
            this.logErrorToService(error, errorInfo)
        }
    }

    async logErrorToService(error: Error, errorInfo: React.ErrorInfo) {
        try {
            // Send error to your error logging endpoint
            await fetch('/api/errors/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: error.message,
                    stack: error.stack,
                    componentStack: errorInfo.componentStack,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                }),
            })
        } catch (logError) {
            console.error('Failed to log error:', logError)
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined })
    }

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback
            }

            // Default fallback UI
            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
                    <Card className="max-w-lg w-full border-red-200">
                        <CardContent className="pt-6">
                            <div className="text-center">
                                {/* Icon */}
                                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                    <AlertTriangle className="h-8 w-8 text-red-600" />
                                </div>

                                {/* Title */}
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                    Something went wrong
                                </h2>

                                {/* Description */}
                                <p className="text-slate-600 mb-6">
                                    We're sorry, but something unexpected happened. Our team has been
                                    notified and we're working on a fix.
                                </p>

                                {/* Error details (only in development) */}
                                {process.env.NODE_ENV === 'development' && this.state.error && (
                                    <div className="mb-6 p-4 bg-slate-100 rounded-lg text-left">
                                        <p className="text-sm font-mono text-red-600 mb-2">
                                            {this.state.error.message}
                                        </p>
                                        <pre className="text-xs text-slate-600 overflow-auto max-h-32">
                                            {this.state.error.stack}
                                        </pre>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3 justify-center">
                                    <Button
                                        onClick={this.handleReset}
                                        className="bg-[#3D4A67] hover:bg-[#2D3A57] text-white"
                                    >
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Try Again
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => (window.location.href = '/dashboard')}
                                        className="border-slate-300"
                                    >
                                        Go to Dashboard
                                    </Button>
                                </div>

                                {/* Support contact */}
                                <p className="text-xs text-slate-500 mt-6">
                                    If this problem persists, please contact{' '}
                                    <a
                                        href="mailto:support@menteiq.ch"
                                        className="text-blue-600 hover:underline"
                                    >
                                        support@menteiq.ch
                                    </a>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )
        }

        return this.props.children
    }
}

/**
 * Simpler error boundary for specific components
 */
export function SimpleErrorBoundary({ children }: { children: ReactNode }) {
    return (
        <ErrorBoundary
            fallback={
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-medium text-red-900 mb-1">Error loading component</h3>
                            <p className="text-sm text-red-700">
                                This component failed to load. Try refreshing the page.
                            </p>
                        </div>
                    </div>
                </div>
            }
        >
            {children}
        </ErrorBoundary>
    )
}
