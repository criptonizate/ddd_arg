'use client'

import { useState, useMemo, useTransition } from 'react'
import { asignarUserAVentas } from '@/lib/actions/filamentos'
import type { GrupoVentasSinUsuario, UsuarioRegistrado } from '@/lib/actions/filamentos'
import { Search, CheckCircle2, ChevronDown, ChevronUp, User } from 'lucide-react'
import { useRouter } from 'next/navigation'

function fmtARS(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }
function fmtKg(n: number) { return `${n % 1 === 0 ? n : n.toFixed(1)} kg` }
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function VincularVentasClient({
  grupos,
  usuarios,
}: {
  grupos: GrupoVentasSinUsuario[]
  usuarios: UsuarioRegistrado[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busquedaGrupo, setBusquedaGrupo] = useState('')
  const [busquedaUsuario, setBusquedaUsuario] = useState('')
  const [selGrupo, setSelGrupo] = useState<GrupoVentasSinUsuario | null>(null)
  const [asignando, setAsignando] = useState(false)
  const [asignados, setAsignados] = useState<Record<string, string>>({}) // clienteNombre → userName
  const [error, setError] = useState('')

  const gruposFiltrados = useMemo(() => {
    const q = busquedaGrupo.toLowerCase()
    return q ? grupos.filter(g => g.cliente.toLowerCase().includes(q)) : grupos
  }, [grupos, busquedaGrupo])

  const usuariosFiltrados = useMemo(() => {
    const q = busquedaUsuario.toLowerCase()
    return q
      ? usuarios.filter(u => u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      : usuarios
  }, [usuarios, busquedaUsuario])

  async function asignar(usuario: UsuarioRegistrado) {
    if (!selGrupo) return
    setAsignando(true)
    setError('')
    const result = await asignarUserAVentas(usuario.id, selGrupo.cliente)
    setAsignando(false)
    if (result.error) { setError(result.error); return }
    setAsignados(prev => ({ ...prev, [selGrupo.cliente]: usuario.nombre }))
    setSelGrupo(null)
    setBusquedaUsuario('')
    startTransition(() => router.refresh())
  }

  if (!grupos.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center">
        <p className="text-4xl mb-3">✅</p>
        <p className="font-semibold">Todas las ventas ya tienen usuario asignado</p>
        <p className="text-sm text-muted-foreground mt-1">No hay registros pendientes de vincular</p>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-2 gap-5">

      {/* ── Panel izquierdo: grupos sin usuario ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{grupos.length} nombre{grupos.length !== 1 ? 's' : ''} sin vincular</p>
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={busquedaGrupo}
            onChange={e => setBusquedaGrupo(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full text-sm border border-border rounded-lg pl-8 pr-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {gruposFiltrados.map(g => {
            const yaAsignado = asignados[g.cliente]
            const activo = selGrupo?.cliente === g.cliente
            return (
              <button
                key={g.cliente}
                onClick={() => { setSelGrupo(activo ? null : g); setBusquedaUsuario(''); setError('') }}
                disabled={!!yaAsignado}
                className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                  yaAsignado
                    ? 'border-green-500/40 bg-green-500/10 opacity-70 cursor-default'
                    : activo
                      ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                      : 'border-border bg-card hover:border-orange-300 hover:bg-secondary/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{g.cliente}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {g.totalVentas} venta{g.totalVentas !== 1 ? 's' : ''} · {fmtKg(g.totalKg)} · {fmtARS(g.totalPesos)}
                    </p>
                    <p className="text-xs text-muted-foreground">Última: {fmtFecha(g.ultimaFecha)}</p>
                  </div>
                  {yaAsignado ? (
                    <span className="shrink-0 flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle2 size={14} />
                      Vinculado
                    </span>
                  ) : (
                    <span className="shrink-0 text-muted-foreground">
                      {activo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  )}
                </div>
                {yaAsignado && (
                  <p className="text-xs text-green-700 dark:text-green-400 mt-1 font-medium">→ {yaAsignado}</p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Panel derecho: seleccionar usuario ── */}
      <div>
        {selGrupo ? (
          <div className="space-y-3 sticky top-20">
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl px-4 py-3">
              <p className="text-xs text-muted-foreground">Vinculando ventas de:</p>
              <p className="font-bold text-base">{selGrupo.cliente}</p>
              <p className="text-xs text-muted-foreground">
                {selGrupo.totalVentas} venta{selGrupo.totalVentas !== 1 ? 's' : ''} · {fmtKg(selGrupo.totalKg)} · {fmtARS(selGrupo.totalPesos)}
              </p>
            </div>

            <p className="text-sm font-semibold">Seleccioná el usuario registrado:</p>

            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={busquedaUsuario}
                onChange={e => setBusquedaUsuario(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="w-full text-sm border border-border rounded-lg pl-8 pr-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
              {usuariosFiltrados.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Sin resultados</p>
              )}
              {usuariosFiltrados.map(u => (
                <button
                  key={u.id}
                  onClick={() => asignar(u)}
                  disabled={asignando}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-card hover:border-orange-300 hover:bg-secondary/50 transition-all disabled:opacity-50"
                >
                  {u.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <User size={14} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{u.nombre}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => { setSelGrupo(null); setBusquedaUsuario('') }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="border border-dashed border-border rounded-xl flex items-center justify-center h-48 text-muted-foreground">
            <p className="text-sm">← Seleccioná un cliente para asignarle un usuario</p>
          </div>
        )}
      </div>
    </div>
  )
}
