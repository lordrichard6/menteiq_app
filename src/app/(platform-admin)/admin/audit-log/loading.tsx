import { Loader2 } from 'lucide-react'

export default function AuditLogLoading() {
    return (
        <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
    )
}
