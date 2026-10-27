export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
      <div className="h-8 w-40 bg-secondary rounded animate-pulse" />
      {[1, 2, 3].map(i => (
        <div key={i} className="h-24 bg-secondary rounded-2xl animate-pulse" />
      ))}
      <div className="h-14 bg-secondary rounded-xl animate-pulse" />
    </div>
  )
}
