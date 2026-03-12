export default function Loading() {
  return (
    <div className="flex flex-col gap-6 p-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-lg bg-slate-200" />
        <div className="h-9 w-32 rounded-lg bg-slate-200" />
      </div>
      {/* KPI cards skeleton (4 cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-100" />
        ))}
      </div>
      {/* Main content skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-80 rounded-xl bg-slate-100" />
        <div className="h-80 rounded-xl bg-slate-100" />
      </div>
      <div className="h-48 rounded-xl bg-slate-100" />
    </div>
  )
}
