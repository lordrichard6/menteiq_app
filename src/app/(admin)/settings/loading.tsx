export default function Loading() {
  return (
    <div className="flex gap-6 p-6 animate-pulse">
      <div className="w-48 flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 rounded-lg bg-slate-200" />
        ))}
      </div>
      <div className="flex-1 flex flex-col gap-4">
        <div className="h-8 w-64 rounded-lg bg-slate-200" />
        <div className="h-64 rounded-xl bg-slate-100" />
      </div>
    </div>
  )
}
