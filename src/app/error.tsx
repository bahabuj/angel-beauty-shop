'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <h2 className="text-2xl font-bold text-foreground mb-4">Something went wrong</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        An unexpected error occurred. Please try refreshing the page.
      </p>
      {error?.message && (
        <details className="mb-6 text-sm text-muted-foreground max-w-lg">
          <summary className="cursor-pointer hover:text-foreground transition-colors">Error details</summary>
          <pre className="mt-2 p-4 bg-muted rounded-lg overflow-auto text-left whitespace-pre-wrap">
            {error.message}
          </pre>
        </details>
      )}
      <button
        onClick={reset}
        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
