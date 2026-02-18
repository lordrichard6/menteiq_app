'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center font-sans antialiased">
        <h2 className="mb-2 text-2xl font-bold text-[#3D4A67]">Critical error</h2>
        <p className="mb-6 max-w-sm text-sm text-slate-500">
          A critical error occurred. Please refresh the page or contact support.
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-[#3D4A67] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2e3a55]"
        >
          Refresh
        </button>
      </body>
    </html>
  )
}
