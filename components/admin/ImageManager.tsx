'use client'

import { useTransition, useRef } from 'react'
import Image from 'next/image'
import { uploadProductImage, deleteProductImage } from '@/lib/actions/products'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import type { ProductImage } from '@/lib/supabase/types'

interface Props {
  productId: string
  images: ProductImage[]
}

export default function ImageManager({ productId, images }: Props) {
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar 5 MB')
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    const fd = new FormData()
    fd.append('file', file)
    startTransition(async () => {
      await uploadProductImage(productId, fd)
    })
    // Reset input
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleDelete(imageId: string, url: string) {
    if (!confirm('¿Eliminar esta imagen?')) return
    startTransition(async () => {
      await deleteProductImage(imageId, url, productId)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {images.map((img, idx) => (
          <div key={img.id} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border group">
            <Image src={img.url} alt="Imagen producto" fill className="object-cover" />
            {idx === 0 && (
              <span className="absolute bottom-0 left-0 right-0 text-center text-white text-[10px] font-medium bg-black/50 py-0.5">
                Principal
              </span>
            )}
            <button
              onClick={() => handleDelete(img.id, img.url)}
              disabled={isPending}
              className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {/* Upload button */}
        <label className="flex flex-col items-center justify-center w-24 h-24 rounded-xl border border-dashed border-border hover:border-foreground cursor-pointer transition-colors">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
            disabled={isPending}
          />
          {isPending ? (
            <Loader2 size={20} className="text-muted-foreground animate-spin" />
          ) : (
            <>
              <ImagePlus size={20} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground mt-1">Agregar</span>
            </>
          )}
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        JPG, PNG o WebP. La primera imagen es la principal.
      </p>
    </div>
  )
}
