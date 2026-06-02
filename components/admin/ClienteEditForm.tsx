'use client'

import { useState, useTransition } from 'react'
import { updateCliente, deleteCliente } from '@/lib/actions/clientes'
import { useToast } from './ToastProvider'
import { useConfirm } from './ConfirmModal'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X, Trash2, Phone, Mail, MapPin, StickyNote } from 'lucide-react'
import type { ClienteDetalle } from '@/lib/actions/clientes'

export default function ClienteEditForm({ cliente }: { cliente: ClienteDetalle }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    nombre: cliente.nombre,
    telefono: cliente.telefono ?? '',
    email: cliente.email ?? '',
    direccion: cliente.direccion ?? '',
    notas: cliente.notas ?? '',
  })
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const router = useRouter()

  function handleSave() {
    if (!form.nombre.trim()) { toast('El nombre es obligatorio', 'error'); return }
    startTransition(async () => {
      const res = await updateCliente(cliente.id, form)
      if (res?.error) toast(res.error, 'error')
      else { toast('Datos actualizados ✓'); setEditing(false) }
    })
  }

  async function handleDelete() {
    const ok = await confirm(`¿Eliminar a ${cliente.nombre}? Sus pedidos no se borrarán.`, { confirmLabel: 'Eliminar cliente' })
    if (!ok) return
    startTransition(async () => {
      const res = await deleteCliente(cliente.id)
      if (res?.error) toast(res.error, 'error')
      else { toast('Cliente eliminado', 'info'); router.push('/admin/clientes') }
    })
  }

  return (
    <>
      {ConfirmDialog}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Datos del cliente</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Pencil size={12} /> Editar
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Nombre *</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Teléfono</label>
              <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="11 1234-5678" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="cliente@email.com" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Dirección</label>
              <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Notas</label>
              <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
                rows={3}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Preferencias, detalles importantes..." />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={isPending}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium bg-foreground text-primary-foreground hover:bg-foreground/90 rounded-lg disabled:opacity-60 transition-colors">
                <Check size={13} /> {isPending ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => setEditing(false)}
                className="px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {cliente.telefono ? (
              <div className="flex items-center gap-2 text-sm">
                <Phone size={13} className="text-muted-foreground shrink-0" />
                <a href={`tel:${cliente.telefono}`} className="hover:underline">{cliente.telefono}</a>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone size={13} className="shrink-0" />
                <span className="italic opacity-60 text-xs">sin teléfono</span>
              </div>
            )}
            {cliente.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail size={13} className="text-muted-foreground shrink-0" />
                <a href={`mailto:${cliente.email}`} className="hover:underline truncate">{cliente.email}</a>
              </div>
            )}
            {cliente.direccion && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin size={13} className="text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{cliente.direccion}</span>
              </div>
            )}
            {cliente.notas && (
              <div className="flex items-start gap-2 text-sm">
                <StickyNote size={13} className="text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground italic text-xs">{cliente.notas}</span>
              </div>
            )}
            {!cliente.telefono && !cliente.email && !cliente.direccion && !cliente.notas && (
              <p className="text-xs text-muted-foreground italic">Sin datos adicionales — hacé clic en Editar para completar</p>
            )}
          </div>
        )}

        {/* Borrar cliente */}
        {!editing && (
          <div className="pt-2 border-t border-border">
            <button onClick={handleDelete} disabled={isPending}
              className="flex items-center gap-1.5 text-xs text-destructive hover:underline transition-colors disabled:opacity-50">
              <Trash2 size={11} /> Eliminar cliente
            </button>
          </div>
        )}
      </div>
    </>
  )
}
