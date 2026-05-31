'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={copy}
      className="p-1 rounded hover:bg-secondary transition-colors shrink-0"
      title="Copiar"
    >
      {copied
        ? <Check size={12} className="text-green-600" />
        : <Copy size={12} className="text-muted-foreground" />
      }
    </button>
  )
}
