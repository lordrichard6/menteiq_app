'use client'

import dynamic from 'next/dynamic'

const DocumentManager = dynamic(
  () => import('@/components/modules/vault/document-manager').then(m => ({ default: m.DocumentManager })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse h-64 rounded-xl bg-slate-100" />,
  }
)

export default function DocumentsPage() {
  return (
    <div className="p-8">
      <DocumentManager />
    </div>
  )
}
