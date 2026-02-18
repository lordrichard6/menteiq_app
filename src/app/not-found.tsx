import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
        <span className="text-4xl font-bold text-slate-400">4</span>
        <span className="text-4xl font-bold text-[#3D4A67]">0</span>
        <span className="text-4xl font-bold text-slate-400">4</span>
      </div>

      <h1 className="mb-2 text-3xl font-bold text-[#3D4A67]">Page not found</h1>
      <p className="mb-8 max-w-sm text-slate-500">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/dashboard"
          className="rounded-lg bg-[#3D4A67] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2e3a55]"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          Sign in
        </Link>
      </div>
    </div>
  )
}
