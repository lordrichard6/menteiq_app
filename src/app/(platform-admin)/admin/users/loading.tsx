export default function UsersLoading() {
    return (
        <div className="max-w-6xl mx-auto animate-pulse">
            <div className="h-8 w-40 bg-slate-200 rounded-lg mb-6" />
            <div className="bg-white rounded-xl border p-4 space-y-3">
                <div className="h-9 bg-slate-200 rounded-lg w-64" />
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-12 bg-slate-100 rounded-lg" />
                ))}
            </div>
        </div>
    )
}
