'use client'
import { useEffect, useState } from 'react'

export default function MembresiaProgressBar({
  pct,
  color,
  barBg,
}: {
  pct: number
  color: string
  barBg: string
}) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 100)
    return () => clearTimeout(t)
  }, [pct])

  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: barBg }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          background: color,
          transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </div>
  )
}
