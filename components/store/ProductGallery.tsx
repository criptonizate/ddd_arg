'use client'

import { useState } from 'react'
import Image from 'next/image'

interface GalleryImage {
  id: string
  url: string
}

export default function ProductGallery({
  images,
  productName,
}: {
  images: GalleryImage[]
  productName: string
}) {
  const [activeIdx, setActiveIdx] = useState(0)

  if (images.length === 0) {
    return (
      <div className="aspect-square rounded-2xl bg-secondary flex items-center justify-center">
        <span className="text-6xl text-muted-foreground/30 font-bold">3D</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="aspect-square rounded-2xl overflow-hidden bg-secondary relative">
        <Image
          src={images[activeIdx].url}
          alt={productName}
          fill
          className="object-cover"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setActiveIdx(idx)}
              className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 relative border-2 transition-colors ${
                activeIdx === idx ? 'border-foreground' : 'border-transparent hover:border-foreground/30'
              }`}
            >
              <Image src={img.url} alt={`${productName} ${idx + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
