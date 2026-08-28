'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react'
import { createCategoria, renameCategoria, deleteCategoria } from '@/lib/actions/categorias'
import type { Categoria } from '@/lib/actions/categorias'

export default function CategoriasManager({ categorias: initial }: { categorias: Categoria[] }) {
  const [categorias, setCategorias] = useState(initial)
  const [nueva, setNueva] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingNombre, setEditingNombre] = useState('')
  const [, startTransition] = useTransition()

  function handleAdd() {
    const n = nueva.trim()
    if (!n) return
    if (categorias.some((c) => c.nombre.toLowerCase() === n.toLowerCase())) {
      toast.error('Ya existe esa categoría')
      return
    }
    const temp: Categoria = { id: crypto.randomUUID(), nombre: n }
    setCategorias((prev) => [...prev, temp].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    setNueva('')
    startTransition(async () => {
      const res = await createCategoria(n)
      if (res.error) {
        toast.error(res.error)
        setCategorias((prev) => prev.filter((c) => c.id !== temp.id))
      } else {
        toast.success(`Categoría "${n}" creada`)
      }
    })
  }

  function startEdit(cat: Categoria) {
    setEditingId(cat.id)
    setEditingNombre(cat.nombre)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingNombre('')
  }

  function handleRename(cat: Categoria) {
    const n = editingNombre.trim()
    if (!n || n === cat.nombre) { cancelEdit(); return }
    setCategorias((prev) =>
      prev.map((c) => c.id === cat.id ? { ...c, nombre: n } : c)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
    )
    cancelEdit()
    startTransition(async () => {
      const res = await renameCategoria(cat.id, cat.nombre, n)
      if (res.error) {
        toast.error(res.error)
        setCategorias((prev) =>
          prev.map((c) => c.id === cat.id ? { ...c, nombre: cat.nombre } : c)
        )
      } else {
        toast.success(`Renombrada a "${n}"`)
      }
    })
  }

  function handleDelete(cat: Categoria) {
    if (!confirm(`¿Eliminar la categoría "${cat.nombre}"? Se quitará de todos los productos que la tengan.`)) return
    setCategorias((prev) => prev.filter((c) => c.id !== cat.id))
    startTransition(async () => {
      const res = await deleteCategoria(cat.id, cat.nombre)
      if (res.error) {
        toast.error(res.error)
        setCategorias((prev) => [...prev, cat].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      } else {
        toast.success(`Categoría "${cat.nombre}" eliminada`)
      }
    })
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Agregar nueva */}
      <div className="p-4 border-b border-border">
        <p className="text-sm font-medium mb-3">Nueva categoría</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Ej: Mascotas"
            className="flex-1 border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleAdd}
            disabled={!nueva.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-primary-foreground text-sm font-medium disabled:opacity-40 hover:bg-foreground/90 transition-colors"
          >
            <Plus size={15} />
            Agregar
          </button>
        </div>
      </div>

      {/* Lista */}
      <ul className="divide-y divide-border">
        {categorias.map((cat) => (
          <li key={cat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors">
            {editingId === cat.id ? (
              <>
                <input
                  autoFocus
                  type="text"
                  value={editingNombre}
                  onChange={(e) => setEditingNombre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(cat)
                    if (e.key === 'Escape') cancelEdit()
                  }}
                  className="flex-1 border border-input rounded-lg px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button onClick={() => handleRename(cat)} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                  <Check size={15} />
                </button>
                <button onClick={cancelEdit} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
                  <X size={15} />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{cat.nombre}</span>
                <button onClick={() => startEdit(cat)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(cat)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
