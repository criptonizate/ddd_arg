export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-secondary animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className="h-6 w-40 bg-secondary rounded animate-pulse" />
          <div className="h-4 w-56 bg-secondary rounded animate-pulse" />
        </div>
      </div>
      <div className="flex gap-2 border-b border-border pb-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-8 w-24 bg-secondary rounded animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-secondary rounded-2xl animate-pulse" />
    </div>
  )
}
