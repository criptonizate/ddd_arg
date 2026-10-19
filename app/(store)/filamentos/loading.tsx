export default function FilamentosLoading() {
  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
      {/* Header skeleton */}
      <div className="mb-4 sm:mb-6">
        <div className="h-7 w-32 bg-secondary rounded animate-pulse mb-1.5" />
        <div className="h-4 w-72 bg-secondary rounded animate-pulse" />
      </div>

      <div className="flex gap-6 items-start">
        {/* Sidebar skeleton — desktop only */}
        <aside className="hidden lg:block w-52 shrink-0 bg-card border border-border rounded-2xl p-4 space-y-5">
          <div className="relative">
            <div className="h-10 w-full bg-secondary rounded-xl animate-pulse" />
          </div>
          {['Material', 'Marca', 'Descuentos'].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 bg-secondary rounded animate-pulse" />
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-7 w-full bg-secondary rounded-lg animate-pulse" />
              ))}
            </div>
          ))}
        </aside>

        {/* Product grid */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-card rounded-2xl overflow-hidden border border-border"
            >
              {/* Color area with spinning spool */}
              <div className="h-36 bg-secondary/40 flex items-center justify-center">
                <SpoolSvg delay={i * 200} />
              </div>
              {/* Info skeleton */}
              <div className="p-3.5 space-y-2">
                <div className="h-4 w-3/4 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-secondary rounded animate-pulse" />
                <div className="flex items-end justify-between mt-1">
                  <div className="space-y-1">
                    <div className="h-5 w-20 bg-secondary rounded animate-pulse" />
                    <div className="h-3 w-10 bg-secondary rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-9 w-full bg-secondary rounded-xl animate-pulse mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SpoolSvg({ delay = 0 }: { delay?: number }) {
  return (
    <svg
      className="w-14 h-14 text-muted-foreground/20 animate-spin"
      style={{
        animationDuration: '3s',
        animationTimingFunction: 'linear',
        animationDelay: `${delay}ms`,
      }}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer flange */}
      <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="3" />
      {/* Thread area */}
      <circle cx="40" cy="40" r="26" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.12" />
      {/* Core hub */}
      <circle cx="40" cy="40" r="9" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.2" />
      {/* 3 spokes at 120° apart */}
      {/* Spoke 1 — 0° (top) */}
      <line x1="40" y1="31" x2="40" y2="14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Spoke 2 — 120° (bottom-right) */}
      <line x1="47.8" y1="44.5" x2="62.5" y2="53" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Spoke 3 — 240° (bottom-left) */}
      <line x1="32.2" y1="44.5" x2="17.5" y2="53" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Center hole */}
      <circle cx="40" cy="40" r="3.5" fill="currentColor" fillOpacity="0.5" />
    </svg>
  )
}
