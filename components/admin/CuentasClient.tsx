'use client'

import { useState, useTransition, useEffect } from 'react'
import { Search, X, ChevronDown, ChevronUp, Package, Clock, CheckCircle2, Truck, Ban, ShoppingBag, Loader2, AlertCircle, Plus, Pencil } from 'lucide-react'
import { getVentasDeUsuario, registrarVentaFilamento, getVentasAgrupadasSinUsuario, asignarUserAVentas, editarClienteVenta, type UsuarioRegistrado, type GrupoVentasSinUsuario } from '@/lib/actions/filamentos'
import type { VentaFilamento, Filamento } from '@/lib/filamentos-helpers'
import { getPedidosByUser, getMembresiasAdmin, getExtensionesAdmin, resolverExtensionMembresia, type FilamentoPedido, type MembresiaAdminRow, type ExtensionPendiente } from '@/lib/actions/filamento-pedidos'
import { getAdminUserNotes, saveAdminUserNotes, getAdminApodoMap, type AdminUserNotes } from '@/lib/actions/perfil'
import { getSaldoCoins } from '@/lib/actions/ddd-coins'
import { TIERS_MEMBRESIA } from '@/lib/membresia-helpers'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtARS(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
}

function fmtDate(d: string) {
  return new Date(d + (d.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

const ESTADO_CONFIG = {
  pendiente:  { label: 'Pendiente',  cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300', Icon: Clock },
  confirmado: { label: 'Confirmado', cls: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',   Icon: CheckCircle2 },
  cancelado:  { label: 'Cancelado',  cls: 'bg-secondary text-muted-foreground',                                      Icon: Ban },
  entregado:  { label: 'Entregado',  cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',        Icon: Truck },
} as const

const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20'

// ── Modal de registro de venta manual ─────────────────────────────────────────

function RegistrarVentaModal({
  usuario,
  filamentos,
  onClose,
  onSaved,
}: {
  usuario: UsuarioRegistrado
  filamentos: Filamento[]
  onClose: () => void
  onSaved: (v: VentaFilamento) => void
}) {
  const [filId, setFilId] = useState(filamentos[0]?.id ?? '')
  const [kg, setKg] = useState('')
  const [precio, setPrecio] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const filSel = filamentos.find(f => f.id === filId)

  function handleSave() {
    const gramos = Math.round(parseFloat(kg) * 1000)
    const precioKg = parseFloat(precio)
    if (!filId) { setError('Seleccioná un filamento'); return }
    if (isNaN(gramos) || gramos <= 0) { setError('Ingresá una cantidad válida en kg'); return }
    if (isNaN(precioKg) || precioKg <= 0) { setError('Ingresá un precio por kg válido'); return }
    setError('')
    startTransition(async () => {
      const res = await registrarVentaFilamento(filId, {
        gramos,
        precio_kg: precioKg,
        costo_kg: filSel?.costo_kg ?? 0,
        cliente: usuario.nombre,
        user_id: usuario.id,
        nota: nota.trim() || `Venta manual registrada por admin`,
        fecha,
      })
      if (res.error) { setError(res.error); return }
      if (res.venta) onSaved(res.venta)
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold">📦 Registrar venta para {usuario.nombre.split(' ')[0]}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5 text-xs text-red-700 dark:text-red-400">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />{error}
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Filamento</label>
            <select className={inputCls} value={filId} onChange={e => setFilId(e.target.value)}>
              {filamentos.map(f => (
                <option key={f.id} value={f.id}>{f.color} — {f.material} {f.marca}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Cantidad (kg)</label>
              <input type="number" min="0.001" step="0.5" className={inputCls} value={kg}
                onChange={e => setKg(e.target.value)} placeholder="1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Precio / kg</label>
              <input type="number" min="0" step="100" className={inputCls} value={precio}
                onChange={e => setPrecio(e.target.value)} placeholder="22000" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Fecha</label>
            <input type="date" className={inputCls} value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Nota (opcional)</label>
            <input type="text" className={inputCls} value={nota} onChange={e => setNota(e.target.value)}
              placeholder="ej. Pagó en efectivo" />
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={isPending}
            className="flex-1 py-2 text-sm font-medium bg-foreground text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Registrar venta
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal editar cliente de una venta ────────────────────────────────────────

function EditarVentaModal({
  venta,
  usuarios,
  onClose,
  onSaved,
}: {
  venta: VentaFilamento
  usuarios: UsuarioRegistrado[]
  onClose: () => void
  onSaved: (ventaId: string, nuevoCliente: string, nuevoUserId: string | null) => void
}) {
  const [cliente, setCliente] = useState(venta.cliente)
  const [userId, setUserId] = useState<string>(venta.user_id ?? '__none__')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!cliente.trim()) { setError('El nombre del cliente es requerido'); return }
    setError('')
    const uid = userId === '__none__' ? null : userId
    startTransition(async () => {
      const res = await editarClienteVenta(venta.id, { cliente: cliente.trim(), userId: uid })
      if (res.error) { setError(res.error); return }
      onSaved(venta.id, cliente.trim(), uid)
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold">✏️ Editar cliente de venta</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5 text-xs text-red-700 dark:text-red-400">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />{error}
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Nombre del cliente</label>
            <input
              type="text"
              className={inputCls}
              value={cliente}
              onChange={e => setCliente(e.target.value)}
              placeholder="Nombre del cliente"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Vincular a cuenta registrada</label>
            <select className={inputCls} value={userId} onChange={e => setUserId(e.target.value)}>
              <option value="__none__">— Sin vincular —</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nombre} ({u.email})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={isPending}
            className="flex-1 py-2 text-sm font-medium bg-foreground text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal vincular ventas históricas ─────────────────────────────────────────

function VincularHistoricasModal({
  usuario,
  onClose,
  onVinculadas,
}: {
  usuario: UsuarioRegistrado
  onClose: () => void
  onVinculadas: () => void
}) {
  const [grupos, setGrupos] = useState<GrupoVentasSinUsuario[] | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [procesando, setProcesando] = useState<string | null>(null)
  const [vinculados, setVinculados] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  useEffect(() => {
    getVentasAgrupadasSinUsuario().then(setGrupos)
  }, [])

  const filtrados = grupos?.filter(g =>
    !busqueda || g.cliente.toLowerCase().includes(busqueda.toLowerCase())
  ) ?? []

  function vincular(grupo: GrupoVentasSinUsuario) {
    setProcesando(grupo.cliente)
    setError('')
    startTransition(async () => {
      const res = await asignarUserAVentas(usuario.id, grupo.cliente)
      if (res.error) { setError(res.error); setProcesando(null); return }
      setVinculados(prev => new Set([...prev, grupo.cliente]))
      setProcesando(null)
      onVinculadas()
    })
  }

  function fmtARS(n: number) {
    return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-semibold">🔗 Vincular ventas históricas</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Vinculando a <span className="font-medium text-foreground">{usuario.nombre}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X size={16} /></button>
        </div>

        <div className="px-5 pt-4 pb-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre del cliente..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20"
              autoFocus
            />
          </div>
        </div>

        {error && (
          <div className="mx-5 mb-2 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5 text-xs text-red-700 dark:text-red-400">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />{error}
          </div>
        )}

        <div className="max-h-80 overflow-y-auto px-5 pb-5 space-y-2">
          {grupos === null && (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2 text-sm">
              <Loader2 size={15} className="animate-spin" /> Cargando...
            </div>
          )}
          {grupos !== null && filtrados.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              {busqueda ? 'Sin coincidencias' : 'No hay ventas sin vincular'}
            </p>
          )}
          {filtrados.map(g => {
            const yaVinculado = vinculados.has(g.cliente)
            const enProceso = procesando === g.cliente
            return (
              <div key={g.cliente} className={`flex items-center gap-3 bg-secondary/40 rounded-xl px-4 py-3 ${yaVinculado ? 'opacity-60' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{g.cliente}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.totalKg.toFixed(1)} kg · {fmtARS(g.totalPesos)} · {g.ids.length} venta{g.ids.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => vincular(g)}
                  disabled={yaVinculado || !!enProceso}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    yaVinculado
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-foreground text-primary-foreground hover:opacity-90 disabled:opacity-50'
                  }`}
                >
                  {enProceso ? <Loader2 size={11} className="animate-spin" /> : yaVinculado ? '✓ Vinculado' : 'Vincular'}
                </button>
              </div>
            )
          })}
        </div>

        <div className="px-5 pb-5">
          <button onClick={onClose} className="w-full py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Panel de detalle de usuario ───────────────────────────────────────────────

function UserDetail({
  usuario,
  filamentos,
  usuarios,
}: {
  usuario: UsuarioRegistrado
  filamentos: Filamento[]
  usuarios: UsuarioRegistrado[]
}) {
  const [pedidos, setPedidos] = useState<FilamentoPedido[] | null>(null)
  const [ventas, setVentas] = useState<VentaFilamento[] | null>(null)
  const [tab, setTab] = useState<'pedidos' | 'ventas'>('pedidos')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [showVenta, setShowVenta] = useState(false)
  const [showVincular, setShowVincular] = useState(false)
  const [editarVenta, setEditarVenta] = useState<VentaFilamento | null>(null)
  const [loading, setLoading] = useState(true)
  const [saldoCoins, setSaldoCoins] = useState<number | null>(null)
  const [notas, setNotas] = useState<AdminUserNotes | null>(null)
  const [editNotas, setEditNotas] = useState(false)
  const [editTel, setEditTel] = useState('')
  const [editApodo, setEditApodo] = useState('')
  const [savingNotas, setSavingNotas] = useState(false)
  const [, startTransitionNotas] = useTransition()

  useEffect(() => {
    let cancel = false
    getAdminUserNotes(usuario.id).then(n => { if (!cancel) setNotas(n) })
    return () => { cancel = true }
  }, [usuario.id])

  useEffect(() => {
    let cancel = false
    setLoading(true)
    setPedidos(null)
    setVentas(null)
    setExpandido(null)
    Promise.all([
      getPedidosByUser(usuario.id),
      getVentasDeUsuario(usuario.id),
      getSaldoCoins(usuario.id).catch(() => 0),
    ]).then(([p, v, coins]) => {
      // Si el admin cambió de usuario antes de que esta Promise resolviera,
      // no pintar los datos del usuario anterior sobre el nuevo panel.
      if (cancel) return
      setPedidos(p)
      setVentas(v)
      setSaldoCoins(coins)
      setLoading(false)
    })
    return () => { cancel = true }
  }, [usuario.id])

  const pedidosFiltrados = pedidos?.filter(p =>
    filtroEstado === 'todos' ? true : p.estado === filtroEstado
  ) ?? []

  const totalKg = (pedidos?.filter(p => p.estado === 'confirmado' || p.estado === 'entregado')
    .reduce((s, p) => s + p.total_rollos, 0) ?? 0)
    + (ventas?.reduce((s, v) => s + v.gramos / 1000, 0) ?? 0)
  const totalGastado = (pedidos?.filter(p => p.estado === 'confirmado' || p.estado === 'entregado')
    .reduce((s, p) => s + p.total, 0) ?? 0)
    + (ventas?.reduce((s, v) => s + (v.gramos / 1000) * v.precio_kg, 0) ?? 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header del usuario */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          {usuario.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={usuario.avatar_url} alt="" className="w-12 h-12 rounded-full ring-2 ring-border shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-lg font-bold shrink-0">
              {usuario.nombre[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold truncate">{usuario.nombre}</p>
              {usuario.numero_cliente && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: 'oklch(0.25 0.02 145)', color: '#4ade80' }}>
                  Cliente N° {usuario.numero_cliente}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{usuario.email}</p>
            {/* Datos del propio perfil del cliente — útiles para identificarlo en el local */}
            {(usuario.dni || usuario.telefono) && (
              <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                {usuario.dni && (
                  <span className="font-mono">
                    <strong className="text-foreground">DNI</strong> {usuario.dni}
                  </span>
                )}
                {usuario.telefono && (
                  <a
                    href={`https://wa.me/${usuario.telefono.replace(/[^\d]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground underline-offset-2 hover:underline"
                  >
                    📱 {usuario.telefono}
                  </a>
                )}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-0.5">Registrado el {fmtDate(usuario.created_at)}</p>
            {notas && (notas.admin_apodo || notas.admin_telefono) && !editNotas && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {notas.admin_apodo && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: 'oklch(0.35 0.05 85 / 30%)', color: '#f59e0b' }}>
                    🏷️ {notas.admin_apodo}
                  </span>
                )}
                {notas.admin_telefono && (
                  <span className="text-[10px] text-muted-foreground">📱 {notas.admin_telefono}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => { setEditTel(notas?.admin_telefono ?? ''); setEditApodo(notas?.admin_apodo ?? ''); setEditNotas(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-secondary transition-colors"
            >
              <Pencil size={11} /> Editar
            </button>
            <button
              onClick={() => setShowVincular(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-secondary transition-colors"
            >
              🔗 Vincular
            </button>
            <button
              onClick={() => setShowVenta(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-foreground text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Plus size={12} />
              Venta
            </button>
          </div>
        </div>

        {/* Formulario de notas admin */}
        {editNotas && (
          <div className="mt-3 p-3 rounded-xl border border-amber-400/30 space-y-2" style={{ backgroundColor: 'oklch(0.20 0.02 85 / 20%)' }}>
            <p className="text-[10px] font-semibold text-amber-500">🔒 Notas privadas — solo visibles para vos</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={editTel}
                onChange={e => setEditTel(e.target.value)}
                placeholder="Teléfono de referencia"
                className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none"
              />
              <input
                value={editApodo}
                onChange={e => setEditApodo(e.target.value)}
                placeholder='Apodo (ej: "el del taller")'
                className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditNotas(false)}
                className="flex-1 text-xs border border-border rounded-lg py-1.5 hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={savingNotas}
                onClick={() => {
                  setSavingNotas(true)
                  startTransitionNotas(async () => {
                    await saveAdminUserNotes(usuario.id, { admin_telefono: editTel || null, admin_apodo: editApodo || null })
                    setNotas({ admin_telefono: editTel || null, admin_apodo: editApodo || null })
                    setSavingNotas(false)
                    setEditNotas(false)
                  })
                }}
                className="flex-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg py-1.5 transition-colors disabled:opacity-50"
              >
                {savingNotas ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {!loading && pedidos !== null && (
        <div className="grid grid-cols-4 gap-2 px-5 py-3 border-b border-border">
          <div className="text-center">
            <p className="text-lg font-bold">{pedidos.length}</p>
            <p className="text-[10px] text-muted-foreground">pedidos</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{totalKg} kg</p>
            <p className="text-[10px] text-muted-foreground">comprados</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-green-600">{fmtARS(totalGastado)}</p>
            <p className="text-[10px] text-muted-foreground">gastado</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold" style={{ color: '#f59e0b' }}>
              {saldoCoins ?? '—'} 🪙
            </p>
            <p className="text-[10px] text-muted-foreground">DDD Coins</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(['pedidos', 'ventas'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'pedidos' ? (
              <span className="flex items-center justify-center gap-1.5">
                <Package size={13} /> Pedidos web
                {pedidos !== null && pedidos.length > 0 && (
                  <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full">{pedidos.length}</span>
                )}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <ShoppingBag size={13} /> Ventas registradas
                {ventas !== null && ventas.length > 0 && (
                  <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full">{ventas.length}</span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2 text-sm">
            <Loader2 size={16} className="animate-spin" /> Cargando...
          </div>
        )}

        {/* TAB PEDIDOS */}
        {!loading && tab === 'pedidos' && (
          <>
            {/* Filtro de estado */}
            <div className="flex gap-1.5 flex-wrap">
              {(['todos', 'pendiente', 'confirmado', 'entregado', 'cancelado'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setFiltroEstado(st)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${
                    filtroEstado === st
                      ? 'bg-foreground text-primary-foreground border-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {st === 'todos' ? 'Todos' : ESTADO_CONFIG[st as keyof typeof ESTADO_CONFIG]?.label ?? st}
                  {st !== 'todos' && pedidos && (() => {
                    const c = pedidos.filter(p => p.estado === st).length
                    return c > 0 ? <span className="ml-1 opacity-60">{c}</span> : null
                  })()}
                </button>
              ))}
            </div>

            {pedidosFiltrados.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Package size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No hay pedidos {filtroEstado !== 'todos' ? filtroEstado + 's' : ''}</p>
              </div>
            ) : (
              pedidosFiltrados.map(p => {
                const cfg = ESTADO_CONFIG[p.estado as keyof typeof ESTADO_CONFIG] ?? ESTADO_CONFIG.pendiente
                const { Icon } = cfg
                const isExp = expandido === p.id
                return (
                  <div key={p.id} className={`bg-card border rounded-xl overflow-hidden ${
                    p.estado === 'pendiente' ? 'border-yellow-300 dark:border-yellow-700' : 'border-border'
                  }`}>
                    <button
                      className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
                      onClick={() => setExpandido(isExp ? null : p.id)}
                    >
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${cfg.cls}`}>
                        <Icon size={10} />{cfg.label}
                      </span>
                      <span className="font-semibold text-sm flex-1 text-left">N° {p.numero}</span>
                      <span className="text-xs text-muted-foreground">{fmtDateTime(p.created_at)}</span>
                      <span className="text-xs font-bold tabular-nums">{fmtARS(p.total)}</span>
                      {isExp ? <ChevronUp size={13} className="shrink-0 text-muted-foreground" /> : <ChevronDown size={13} className="shrink-0 text-muted-foreground" />}
                    </button>

                    {isExp && (
                      <div className="border-t border-border px-4 py-3 space-y-3">
                        <div className="space-y-1.5">
                          {p.items.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className="flex-1 min-w-0 text-muted-foreground">{item.rollos} kg · {item.color} — {item.material} {item.marca}</span>
                              <span className="tabular-nums text-xs shrink-0">{fmtARS(item.precio_unitario)}/kg</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-sm font-bold pt-2 border-t border-border">
                          <span>{p.total_rollos} kg</span>
                          <span>{fmtARS(p.total)}</span>
                        </div>
                        {p.nota && (
                          <p className="text-xs text-muted-foreground italic">Nota: {p.nota}</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </>
        )}

        {/* TAB VENTAS */}
        {!loading && tab === 'ventas' && (
          <>
            {ventas && ventas.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <ShoppingBag size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin ventas registradas para esta cuenta</p>
                <button onClick={() => setShowVenta(true)} className="mt-3 text-xs underline hover:no-underline">
                  Registrar primera venta
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {ventas?.map(v => (
                  <div key={v.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {v.filamento_color ?? v.filamento_nombre} · {v.filamento_material} {v.filamento_marca}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fmtDate(v.fecha)} · {v.nota || '—'}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Cliente: <span className="font-medium">{v.cliente}</span>
                        {!v.user_id && <span className="ml-1 text-yellow-600 dark:text-yellow-400">(sin cuenta)</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold">{(v.gramos / 1000).toLocaleString('es-AR', { maximumFractionDigits: 2 })} kg</p>
                        <p className="text-xs text-muted-foreground">{fmtARS((v.gramos / 1000) * v.precio_kg)}</p>
                      </div>
                      <button
                        onClick={() => setEditarVenta(v)}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Editar cliente"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modales */}
      {showVenta && (
        <RegistrarVentaModal
          usuario={usuario}
          filamentos={filamentos}
          onClose={() => setShowVenta(false)}
          onSaved={(v) => setVentas(prev => prev ? [v, ...prev] : [v])}
        />
      )}
      {showVincular && (
        <VincularHistoricasModal
          usuario={usuario}
          onClose={() => setShowVincular(false)}
          onVinculadas={() => {
            getVentasDeUsuario(usuario.id).then(setVentas)
          }}
        />
      )}
      {editarVenta && (
        <EditarVentaModal
          venta={editarVenta}
          usuarios={usuarios}
          onClose={() => setEditarVenta(null)}
          onSaved={(ventaId, nuevoCliente, nuevoUserId) => {
            setVentas(prev => prev?.map(v =>
              v.id === ventaId ? { ...v, cliente: nuevoCliente, user_id: nuevoUserId } : v
            ) ?? prev)
          }}
        />
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CuentasClient({
  usuarios,
  filamentos,
}: {
  usuarios: UsuarioRegistrado[]
  filamentos: Filamento[]
}) {
  const [busqueda, setBusqueda] = useState('')
  const [selId, setSelId] = useState<string | null>(null)
  const [apodoMap, setApodoMap] = useState<Record<string, string>>({})
  const [membresias, setMembresias] = useState<MembresiaAdminRow[] | null>(null)
  const [extensiones, setExtensiones] = useState<ExtensionPendiente[] | null>(null)
  const [resolviendoExt, setResolviendoExt] = useState<string | null>(null)

  useEffect(() => {
    getAdminApodoMap().then(setApodoMap)
    getMembresiasAdmin().then(setMembresias)
    getExtensionesAdmin().then(setExtensiones)
  }, [])

  const filtrados = usuarios.filter(u => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase().trim()
    // Para DNI/teléfono/N° cliente, también comparar números sin espacios ni puntos
    const qSoloNumeros = q.replace(/[^\d]/g, '')
    const dni = (u.dni ?? '').replace(/[^\d]/g, '')
    const telefono = (u.telefono ?? '').replace(/[^\d]/g, '')
    const numeroCliente = String(u.numero_cliente ?? '')
    return u.nombre.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (apodoMap[u.id] ?? '').toLowerCase().includes(q) ||
      (u.apodo ?? '').toLowerCase().includes(q) ||
      (qSoloNumeros !== '' && (
        dni.includes(qSoloNumeros) ||
        telefono.includes(qSoloNumeros) ||
        numeroCliente === qSoloNumeros ||
        numeroCliente.includes(qSoloNumeros)
      ))
  })

  const selUsuario = usuarios.find(u => u.id === selId) ?? null

  const tierCounts = TIERS_MEMBRESIA.map(t => ({
    ...t,
    count: (membresias ?? []).filter(m => m.nivel === t.label).length,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">🧑‍💻 Cuentas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {usuarios.length} cuenta{usuarios.length !== 1 ? 's' : ''} registrada{usuarios.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Layout split */}
      <div className="flex gap-4 h-[calc(100vh-180px)] min-h-[500px]">

        {/* Lista de usuarios */}
        <div className="w-72 shrink-0 bg-card border border-border rounded-xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Nombre, email, DNI, N° cliente, teléfono..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {filtrados.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Sin resultados</p>
            ) : (
              filtrados.map(u => (
                <button
                  key={u.id}
                  onClick={() => setSelId(u.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50 ${
                    selId === u.id ? 'bg-secondary' : ''
                  }`}
                >
                  {u.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-secondary border border-border shrink-0 flex items-center justify-center text-xs font-bold">
                      {u.nombre[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{u.nombre}</p>
                      {u.numero_cliente && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: 'oklch(0.25 0.02 145)', color: '#4ade80' }}>
                          N° {u.numero_cliente}
                        </span>
                      )}
                    </div>
                    {apodoMap[u.id] && (
                      <p className="text-[10px] font-semibold truncate" style={{ color: '#f59e0b' }}>🏷️ {apodoMap[u.id]}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                    {(u.dni || u.telefono) && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {u.dni && <span>DNI {u.dni}</span>}
                        {u.dni && u.telefono && <span> · </span>}
                        {u.telefono && <span>📱 {u.telefono}</span>}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Panel de detalle */}
        <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden">
          {selUsuario ? (
            <UserDetail usuario={selUsuario} filamentos={filamentos} usuarios={usuarios} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <span className="text-4xl">👈</span>
              <p className="text-sm font-medium">Seleccioná una cuenta para ver el detalle</p>
              <p className="text-xs">{usuarios.length} cuenta{usuarios.length !== 1 ? 's' : ''} disponible{usuarios.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      </div>

      {/* Extensiones pendientes */}
      {extensiones && extensiones.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
            <span className="text-lg">⏳</span>
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-200">Extensiones pendientes de confirmación</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Confirmar una vez recibida la transferencia</p>
            </div>
          </div>
          <div className="divide-y divide-amber-100 dark:divide-amber-900">
            {extensiones.map(ext => (
              <div key={ext.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{ext.nombre}</p>
                  <p className="text-xs text-muted-foreground">{ext.email} · solicitó +{ext.dias} días · ${ext.costo.toLocaleString('es-AR')}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={resolviendoExt === ext.id}
                    onClick={async () => {
                      setResolviendoExt(ext.id)
                      await resolverExtensionMembresia(ext.id, 'confirmado')
                      setExtensiones(prev => prev?.filter(e => e.id !== ext.id) ?? null)
                      setResolviendoExt(null)
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors"
                  >
                    {resolviendoExt === ext.id ? '...' : '✓ Confirmar'}
                  </button>
                  <button
                    disabled={resolviendoExt === ext.id}
                    onClick={async () => {
                      setResolviendoExt(ext.id)
                      await resolverExtensionMembresia(ext.id, 'rechazado')
                      setExtensiones(prev => prev?.filter(e => e.id !== ext.id) ?? null)
                      setResolviendoExt(null)
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    ✗ Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard membresías */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <p className="font-bold">⭐ Membresías activas</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {membresias === null ? 'Cargando...' : `${membresias.length} cliente${membresias.length !== 1 ? 's' : ''} con membresía vigente`}
            </p>
          </div>
          <div className="flex gap-3">
            {tierCounts.map(t => (
              <div key={t.label} className="text-center">
                <p className="text-lg font-black">{t.count}</p>
                <p className="text-[10px] text-muted-foreground">{t.emoji} {t.label}</p>
              </div>
            ))}
          </div>
        </div>

        {membresias === null ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">Cargando membresías...</div>
        ) : membresias.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">Ningún cliente tiene membresía activa en este momento.</div>
        ) : (
          <div className="divide-y divide-border">
            {membresias.map(m => {
              const tier = TIERS_MEMBRESIA.find(t => t.label === m.nivel)
              const pct = Math.min(100, Math.round((m.diasRestantes / 30) * 100))
              return (
                <div key={m.userId} className="flex items-center gap-4 px-5 py-3">
                  <button
                    onClick={() => setSelId(m.userId)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black hover:opacity-80 transition-opacity shrink-0"
                    style={{ backgroundColor: tier?.color === 'violet' ? '#7c3aed22' : tier?.color === 'blue' ? '#2563eb22' : '#d9770622', color: tier?.color === 'violet' ? '#7c3aed' : tier?.color === 'blue' ? '#2563eb' : '#d97706' }}
                    title="Ver cuenta"
                  >
                    {tier?.emoji}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">
                        {m.admin_apodo ? `${m.admin_apodo}` : m.nombre}
                      </span>
                      {m.admin_apodo && (
                        <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">{m.nombre}</span>
                      )}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                        m.nivel === 'Platino' ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                        : m.nivel === 'Oro' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                      }`}>
                        {tier?.emoji} {m.nivel}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: m.diasRestantes <= 5 ? '#ef4444' : m.diasRestantes <= 10 ? '#f59e0b' : '#22c55e' }}
                        />
                      </div>
                      <span className={`text-[10px] font-semibold shrink-0 ${m.diasRestantes <= 5 ? 'text-red-500' : m.diasRestantes <= 10 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                        {m.diasRestantes}d restantes
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold tabular-nums">{m.kgPeriodo.toFixed(1)} kg</p>
                    <p className="text-[10px] text-muted-foreground">en el período</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
