export default function AdminLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-8 w-48 bg-slate-200 rounded-lg" />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-32 bg-slate-200 rounded-xl" />
                ))}
            </div>
            <div className="h-64 bg-slate-200 rounded-xl" />
        </div>
    )
}
