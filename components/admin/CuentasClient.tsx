'use client'

import { useState, useTransition, useEffect } from 'react'
import { Search, X, ChevronDown, ChevronUp, Package, Clock, CheckCircle2, Truck, Ban, ShoppingBag, Loader2, AlertCircle, Plus } from 'lucide-react'
import { getVentasDeUsuario, registrarVentaFilamento, type UsuarioRegistrado } from '@/lib/actions/filamentos'
import type { VentaFilamento, Filamento } from '@/lib/filamentos-helpers'
import { getPedidosByUser, type FilamentoPedido } from '@/lib/actions/filamento-pedidos'

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

// ── Panel de detalle de usuario ───────────────────────────────────────────────

function UserDetail({
  usuario,
  filamentos,
}: {
  usuario: UsuarioRegistrado
  filamentos: Filamento[]
}) {
  const [pedidos, setPedidos] = useState<FilamentoPedido[] | null>(null)
  const [ventas, setVentas] = useState<VentaFilamento[] | null>(null)
  const [tab, setTab] = useState<'pedidos' | 'ventas'>('pedidos')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [showVenta, setShowVenta] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setPedidos(null)
    setVentas(null)
    setExpandido(null)
    Promise.all([
      getPedidosByUser(usuario.id),
      getVentasDeUsuario(usuario.id),
    ]).then(([p, v]) => {
      setPedidos(p)
      setVentas(v)
      setLoading(false)
    })
  }, [usuario.id])

  const pedidosFiltrados = pedidos?.filter(p =>
    filtroEstado === 'todos' ? true : p.estado === filtroEstado
  ) ?? []

  const totalKg = pedidos?.filter(p => p.estado === 'confirmado' || p.estado === 'entregado')
    .reduce((s, p) => s + p.total_rollos, 0) ?? 0
  const totalGastado = pedidos?.filter(p => p.estado === 'confirmado' || p.estado === 'entregado')
    .reduce((s, p) => s + p.total, 0) ?? 0

  return (
    <div className="flex flex-col h-full">
      {/* Header del usuario */}
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        {usuario.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={usuario.avatar_url} alt="" className="w-12 h-12 rounded-full ring-2 ring-border" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-lg font-bold">
            {usuario.nombre[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{usuario.nombre}</p>
          <p className="text-xs text-muted-foreground truncate">{usuario.email}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Registrado el {fmtDate(usuario.created_at)}</p>
        </div>
        <button
          onClick={() => setShowVenta(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-foreground text-primary-foreground hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={12} />
          Registrar venta
        </button>
      </div>

      {/* Stats */}
      {!loading && pedidos !== null && (
        <div className="grid grid-cols-3 gap-2 px-5 py-3 border-b border-border">
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
                      <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(v.fecha)} · {v.nota || '—'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{(v.gramos / 1000).toLocaleString('es-AR', { maximumFractionDigits: 2 })} kg</p>
                      <p className="text-xs text-muted-foreground">{fmtARS((v.gramos / 1000) * v.precio_kg)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showVenta && (
        <RegistrarVentaModal
          usuario={usuario}
          filamentos={filamentos}
          onClose={() => setShowVenta(false)}
          onSaved={(v) => setVentas(prev => prev ? [v, ...prev] : [v])}
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

  const filtrados = usuarios.filter(u =>
    !busqueda ||
    u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email.toLowerCase().includes(busqueda.toLowerCase())
  )

  const selUsuario = usuarios.find(u => u.id === selId) ?? null

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
                placeholder="Buscar por nombre o email..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20"
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
                    <p className="text-sm font-medium truncate">{u.nombre}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Panel de detalle */}
        <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden">
          {selUsuario ? (
            <UserDetail usuario={selUsuario} filamentos={filamentos} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <span className="text-4xl">👈</span>
              <p className="text-sm font-medium">Seleccioná una cuenta para ver el detalle</p>
              <p className="text-xs">{usuarios.length} cuenta{usuarios.length !== 1 ? 's' : ''} disponible{usuarios.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
