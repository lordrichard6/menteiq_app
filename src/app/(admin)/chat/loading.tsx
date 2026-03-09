export default function Loading() {
  return (
    <div className="flex flex-col gap-4 p-6 h-full animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-slate-200" />
      <div className="flex-1 rounded-xl bg-slate-100 min-h-[500px]" />
      <div className="h-12 rounded-xl bg-slate-200" />
    </div>
  )
}
