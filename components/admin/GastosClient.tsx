'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GastoEntry } from '@/lib/actions/gastos'
import { upsertGasto, upsertGastos } from '@/lib/actions/gastos'

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const SEED_DELETES = Array.from({ length: 10 }, (_, i) => `e-albanil-${i + 2}`)

function buildSeedEntries(): GastoEntry[] {
  const arr: GastoEntry[] = [
    // Julio 2026
    { id: 'e-2026-07-cuota-berni',     concept: 'Escuela Sagrado Corazón - Berni',          type: 'gasto',   category: 'fijo',     amount: 130000,  date: '2026-07-05', status: 'pagado',    due: '2026-07-05' },
    { id: 'e-2026-07-cochera',          concept: 'Cochera (1 lugar y medio)',                 type: 'gasto',   category: 'fijo',     amount: 105000,  date: '2026-07-01', status: 'pagado',    due: null },
    { id: 'e-2026-07-luz',              concept: 'Luz (donde vivo) - NIS 5149223',           type: 'gasto',   category: 'fijo',     amount: 130000,  date: '2026-07-01', status: 'pagado',    due: null },
    { id: 'e-2026-07-internet',         concept: 'Internet',                                  type: 'gasto',   category: 'fijo',     amount: 26000,   date: '2026-07-01', status: 'pagado',    due: null },
    { id: 'e-2026-07-seguro-auto',      concept: 'Seguro auto',                               type: 'gasto',   category: 'fijo',     amount: 80000,   date: '2026-07-01', status: 'pagado',    due: null },
    { id: 'e-2026-07-ingreso',          concept: 'Ingreso mensual',                           type: 'ingreso', category: 'fijo',     amount: 2800000, date: '2026-07-01', status: 'pagado',    due: null },
    { id: 'e-albanil-1',                concept: 'Deuda albañil Diego Bazán - cuota 1',      type: 'gasto',   category: 'fijo',     amount: 150000,  date: '2026-07-15', status: 'pagado',    due: '2026-07-15' },
    // Agosto 2026
    { id: 'e-2026-08-seguro-auto',      concept: 'Seguro auto',                               type: 'gasto',   category: 'fijo',     amount: 45000,   date: '2026-08-01', status: 'pendiente', due: null },
    { id: 'e-2026-08-luz-actual',       concept: 'Luz (donde vivo) - NIS 5149223',           type: 'gasto',   category: 'fijo',     amount: 179000,  date: '2026-08-01', status: 'pendiente', due: null },
    { id: 'e-2026-08-luz-terreno',      concept: 'Luz (terreno, futura casa) - NIS 5186797', type: 'gasto',   category: 'fijo',     amount: 12000,   date: '2026-08-01', status: 'pagado',    due: null },
    { id: 'e-2026-08-multa-auto',       concept: 'Multa auto',                                type: 'gasto',   category: 'variable', amount: 220000,  date: '2026-08-01', status: 'pagado',    due: null },
    { id: 'e-2026-08-visa-bbva',        concept: 'Tarjeta Visa BBVA',                         type: 'gasto',   category: 'fijo',     amount: 2300000, date: '2026-08-01', status: 'pagado',    due: null },
    { id: 'e-2026-08-master-bbva',      concept: 'Tarjeta Mastercard BBVA',                   type: 'gasto',   category: 'fijo',     amount: 520000,  date: '2026-08-01', status: 'pagado',    due: null },
    { id: 'e-2026-08-ingreso',          concept: 'Ingreso mensual',                           type: 'ingreso', category: 'fijo',     amount: 2800000, date: '2026-08-01', status: 'pagado',    due: null },
    { id: 'e-2026-08-naranja-x',        concept: 'Tarjeta Naranja X',                         type: 'gasto',   category: 'fijo',     amount: 98000,   date: '2026-08-01', status: 'pagado',    due: null },
    { id: 'e-2026-08-patagonia-master', concept: 'Tarjeta Patagonia Mastercard',               type: 'gasto',   category: 'fijo',     amount: 1265951, date: '2026-08-01', status: 'pendiente', due: null },
    { id: 'e-2026-08-futbol-changuito', concept: 'Fútbol niños - Changuito',                  type: 'gasto',   category: 'fijo',     amount: 70000,   date: '2026-08-01', status: 'pendiente', due: null },
    { id: 'e-2026-08-cochera',          concept: 'Cochera (1 lugar y medio)',                 type: 'gasto',   category: 'fijo',     amount: 105000,  date: '2026-08-01', status: 'pendiente', due: null },
    { id: 'e-2026-08-internet',         concept: 'Internet',                                  type: 'gasto',   category: 'fijo',     amount: 26000,   date: '2026-08-01', status: 'pagado',    due: null },
    { id: 'e-2026-08-cuota-berni',      concept: 'Escuela Sagrado Corazón - Berni',          type: 'gasto',   category: 'fijo',     amount: 130000,  date: '2026-08-05', status: 'pendiente', due: '2026-08-05' },
    { id: 'e-2026-08-psicologa-paula',  concept: 'Psicóloga Paula',                           type: 'gasto',   category: 'fijo',     amount: 50000,   date: '2026-08-01', status: 'pendiente', due: null },
    { id: 'e-2026-08-profesor-padel',   concept: 'Profesor Pádel',                            type: 'gasto',   category: 'fijo',     amount: 108000,  date: '2026-08-01', status: 'pagado',    due: null },
    // Septiembre 2026
    { id: 'e-2026-09-cocina-electrica', concept: 'Cocina eléctrica (MercadoLibre, tarjeta)', type: 'gasto',   category: 'variable', amount: 900000,  date: '2026-09-01', status: 'pendiente', due: null },
  ]

  // Descuento préstamo por sueldo — 6 cuotas de $500.000
  ;[
    { n: 1, year: 2026, month: 5,  status: 'pagado'    as const },
    { n: 2, year: 2026, month: 6,  status: 'pagado'    as const },
    { n: 3, year: 2026, month: 7,  status: 'pagado'    as const },
    { n: 4, year: 2026, month: 8,  status: 'pendiente' as const },
    { n: 5, year: 2026, month: 9,  status: 'pendiente' as const },
    { n: 6, year: 2026, month: 10, status: 'pendiente' as const },
  ].forEach(m => {
    const mm = String(m.month).padStart(2, '0')
    arr.push({
      id: `e-descuento-sueldo-${m.n}`,
      concept: `Descuento préstamo (sueldo) - cuota ${m.n}/6`,
      type: 'gasto', category: 'fijo', amount: 500000,
      date: `${m.year}-${mm}-01`, status: m.status, due: `${m.year}-${mm}-01`,
    })
  })

  // Créditos MercadoPago
  function addSeries(prefix: string, name: string, from: number, total: number, amount: number, yr: number, mo: number) {
    for (let n = from; n <= total; n++) {
      const mm = String(mo).padStart(2, '0')
      arr.push({
        id: `e-${prefix}-${n}`,
        concept: `${name} - cuota ${n}/${total}`,
        type: 'gasto', category: 'fijo', amount,
        date: `${yr}-${mm}-18`, status: 'pendiente', due: `${yr}-${mm}-18`,
      })
      mo++; if (mo > 12) { mo = 1; yr++ }
    }
  }
  addSeries('mp-a', 'Crédito MercadoPago A', 5, 12, 126400, 2026, 8)
  addSeries('mp-b', 'Crédito MercadoPago B', 4, 12,  68446, 2026, 8)
  addSeries('mp-c', 'Crédito MercadoPago C', 1, 12,  55723, 2026, 8)
  addSeries('mp-d', 'Crédito MercadoPago D', 1,  6,  35482, 2026, 8)
  const mpb5 = arr.find(x => x.id === 'e-mp-b-5')
  if (mpb5) mpb5.status = 'pagado'

  // Albañil Diego Bazán — $100.000/mes desde sep 2026
  let restante = 1623902 - 150000
  let ayr = 2026, amo = 9, ai = 2
  while (restante > 0) {
    const monto = Math.min(100000, restante)
    const mm = String(amo).padStart(2, '0')
    arr.push({
      id: `e-albanil2-${ai}`,
      concept: `Deuda albañil Diego Bazán - cuota ${ai}`,
      type: 'gasto', category: 'fijo', amount: monto,
      date: `${ayr}-${mm}-15`, status: 'pendiente', due: `${ayr}-${mm}-15`,
    })
    restante -= monto; amo++; if (amo > 12) { amo = 1; ayr++ }; ai++
  }

  // Préstamo Patagonia (Marta) — 24 cuotas de $1.000.000 desde oct 2026
  let pyr = 2026, pmo = 10
  for (let n = 1; n <= 24; n++) {
    const mm = String(pmo).padStart(2, '0')
    arr.push({
      id: `e-prestamo-${n}`,
      concept: `Préstamo Patagonia (Marta) - cuota ${n}/24`,
      type: 'gasto', category: 'fijo', amount: 1000000,
      date: `${pyr}-${mm}-05`, status: 'pendiente', due: `${pyr}-${mm}-05`,
    })
    pmo++; if (pmo > 12) { pmo = 1; pyr++ }
  }

  // Proyecciones recurrentes desde sep 2026 (12 meses)
  const recurrentes = [
    { prefix: 'escuela-berni',    concept: 'Escuela Sagrado Corazón - Berni',          amount: 130000, day: '05', status: 'pendiente' as const },
    { prefix: 'cochera',          concept: 'Cochera (1 lugar y medio)',                 amount: 105000, day: '01', status: 'pendiente' as const },
    { prefix: 'luz-actual',       concept: 'Luz (donde vivo) - NIS 5149223',           amount: 179000, day: '01', status: 'pendiente' as const },
    { prefix: 'luz-terreno',      concept: 'Luz (terreno, futura casa) - NIS 5186797', amount: 12000,  day: '01', status: 'pendiente' as const },
    { prefix: 'futbol-changuito', concept: 'Fútbol niños - Changuito',                 amount: 70000,  day: '01', status: 'pendiente' as const },
    { prefix: 'psicologa-paula',  concept: 'Psicóloga Paula',                           amount: 50000,  day: '01', status: 'pendiente' as const },
    { prefix: 'profesor-padel',   concept: 'Profesor Pádel',                            amount: 108000, day: '01', status: 'pendiente' as const },
    { prefix: 'internet',         concept: 'Internet',                                  amount: 26000,  day: '01', status: 'pagado'    as const },
  ]
  recurrentes.forEach(r => {
    let yr = 2026, mo = 9
    for (let i = 0; i < 12; i++) {
      const mm = String(mo).padStart(2, '0')
      arr.push({
        id: `e-${r.prefix}-${yr}-${mm}`,
        concept: r.concept, type: 'gasto', category: 'fijo', amount: r.amount,
        date: `${yr}-${mm}-${r.day}`, status: r.status, due: null,
      })
      mo++; if (mo > 12) { mo = 1; yr++ }
    }
  })

  return arr
}

const fmt = (n: number) =>
  '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

function conceptIcon(concept: string): string {
  const c = concept.toLowerCase()
  if (c.includes('luz'))                                          return '💡'
  if (c.includes('cochera') || c.includes('garage'))             return '🚗'
  if (c.includes('internet') || c.includes('wifi'))              return '📡'
  if (c.includes('seguro'))                                       return '🛡️'
  if (c.includes('escuela') || c.includes('colegio'))            return '🏫'
  if (c.includes('ingreso') || c.includes('sueldo'))             return '💰'
  if (c.includes('tarjeta') || c.includes('visa') || c.includes('mastercard') || c.includes('naranja') || c.includes('patagonia')) return '💳'
  if (c.includes('mercadopago') || c.includes('crédito mp') || c.includes('mp-') || c.includes('mp ')) return '📲'
  if (c.includes('psicoló') || c.includes('psicolo') || c.includes('terapeuta')) return '🧠'
  if (c.includes('fútbol') || c.includes('futbol'))              return '⚽'
  if (c.includes('pádel') || c.includes('padel') || c.includes('profesor')) return '🎾'
  if (c.includes('albañil') || c.includes('albanil') || c.includes('obra')) return '🏗️'
  if (c.includes('préstamo') || c.includes('prestamo') || c.includes('pagatonia')) return '🏦'
  if (c.includes('multa'))                                        return '🚔'
  if (c.includes('cocina') || c.includes('electrodom'))          return '🍳'
  if (c.includes('descuento') || c.includes('cuota'))            return '📅'
  if (c.includes('gas'))                                          return '🔥'
  if (c.includes('alquiler'))                                     return '🏠'
  if (c.includes('combustible') || c.includes('nafta'))          return '⛽'
  if (c.includes('médico') || c.includes('medico') || c.includes('salud') || c.includes('farmacia')) return '🩺'
  return '📌'
}

export default function GastosClient({ initialEntries }: { initialEntries: GastoEntry[] }) {
  const [entries, setEntries] = useState<GastoEntry[]>([])
  const [viewMonth, setViewMonth] = useState({ year: 0, month: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editConcept, setEditConcept] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [, startTransition] = useTransition()
  // form
  const [fConcept,  setFConcept]  = useState('')
  const [fType,     setFType]     = useState<'gasto' | 'ingreso'>('gasto')
  const [fCategory, setFCategory] = useState<'fijo' | 'variable'>('fijo')
  const [fAmount,   setFAmount]   = useState('')
  const [fDate,     setFDate]     = useState('')
  const [fStatus,   setFStatus]   = useState<'pagado' | 'pendiente'>('pagado')
  const [fDue,      setFDue]      = useState('')

  useEffect(() => {
    // Merge seeds + DB (DB gana para preservar ediciones del usuario)
    const byId: Record<string, GastoEntry> = {}
    buildSeedEntries().forEach(e => { byId[e.id] = e })
    initialEntries.forEach(e => { byId[e.id] = e })
    SEED_DELETES.forEach(id => { delete byId[id] })
    const merged = Object.values(byId)
    setEntries(merged)

    // Guarda en DB los seeds que aún no existen
    const dbIds = new Set(initialEntries.map(e => e.id))
    const newSeeds = merged.filter(e => !dbIds.has(e.id))
    if (newSeeds.length > 0) {
      startTransition(() => upsertGastos(newSeeds))
    }

    const now = new Date()
    setViewMonth({ year: now.getFullYear(), month: now.getMonth() })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function mutate(updated: GastoEntry) {
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
    startTransition(() => upsertGasto(updated))
  }

  function toggleStatus(id: string) {
    const entry = entries.find(e => e.id === id)
    if (!entry) return
    mutate({ ...entry, status: entry.status === 'pagado' ? 'pendiente' : 'pagado' })
  }

  function startEdit(entry: GastoEntry) {
    setEditingId(entry.id)
    setEditConcept(entry.concept)
    setEditAmount(String(entry.amount))
  }

  function saveEdit(id: string) {
    const entry = entries.find(e => e.id === id)
    if (!entry) return
    mutate({
      ...entry,
      concept: editConcept.trim() || entry.concept,
      amount: parseFloat(editAmount) || entry.amount,
    })
    setEditingId(null)
  }

  function handleAdd(ev: React.FormEvent) {
    ev.preventDefault()
    const newEntry: GastoEntry = {
      id: 'manual-' + Date.now(),
      concept: fConcept, type: fType, category: fCategory,
      amount: parseFloat(fAmount), date: fDate, status: fStatus, due: fDue || null,
    }
    setEntries(prev => [...prev, newEntry])
    startTransition(() => upsertGasto(newEntry))
    setFConcept(''); setFAmount(''); setFDate(''); setFDue('')
    setFType('gasto'); setFCategory('fijo'); setFStatus('pagado')
  }

  const monthEntries = useMemo(() => entries
    .filter(e => {
      const d = new Date(e.date + 'T00:00:00')
      return d.getFullYear() === viewMonth.year && d.getMonth() === viewMonth.month
    })
    .sort((a, b) => a.date.localeCompare(b.date)),
    [entries, viewMonth]
  )

  const totalIngresos = useMemo(() => monthEntries.filter(e => e.type === 'ingreso').reduce((s, e) => s + e.amount, 0), [monthEntries])
  const totalGastos   = useMemo(() => monthEntries.filter(e => e.type === 'gasto').reduce((s, e) => s + e.amount, 0), [monthEntries])

  const pendientes = useMemo(() =>
    monthEntries.filter(e => e.status === 'pendiente')
      .sort((a, b) => (a.due || a.date).localeCompare(b.due || b.date)),
    [monthEntries]
  )
  const totalPendiente = useMemo(() => pendientes.reduce((s, e) => s + e.amount, 0), [pendientes])

  const trends = useMemo(() => {
    const byName: Record<string, GastoEntry[]> = {}
    entries.filter(e => e.category === 'fijo').forEach(e => {
      const k = e.concept.trim().toLowerCase()
      if (!byName[k]) byName[k] = []
      byName[k].push(e)
    })
    return Object.values(byName)
      .filter(arr => arr.length > 1)
      .map(arr => {
        arr.sort((a, b) => a.date.localeCompare(b.date))
        const first = arr[0], last = arr[arr.length - 1]
        const diff = last.amount - first.amount
        const pct = first.amount !== 0 ? (diff / first.amount) * 100 : 0
        return { concept: last.concept, latest: last.amount, first: first.amount, firstDate: first.date.slice(0, 7), diff, pct }
      })
      .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
  }, [entries])

  function prevMonth() {
    setViewMonth(vm => vm.month === 0 ? { year: vm.year - 1, month: 11 } : { year: vm.year, month: vm.month - 1 })
  }
  function nextMonth() {
    setViewMonth(vm => vm.month === 11 ? { year: vm.year + 1, month: 0 } : { year: vm.year, month: vm.month + 1 })
  }

  if (!viewMonth.year) return null

  const balance = totalIngresos - totalGastos
  const inputCls = 'w-full border border-input rounded-lg px-2.5 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Registro mensual</p>
          <h1 className="text-2xl font-bold mt-0.5">💸 Mis gastos</h1>
        </div>
        <div className="flex items-center gap-1 bg-card border border-border rounded-full px-1 py-1 shadow-sm">
          <button onClick={prevMonth} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-medium min-w-[140px] text-center capitalize">
            {MONTH_NAMES[viewMonth.month].toLowerCase()} {viewMonth.year}
          </span>
          <button onClick={nextMonth} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5 items-start">
        {/* Columna izquierda */}
        <section className="space-y-4">
          {/* Totales */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Ingresos', value: totalIngresos, color: 'text-green-600 dark:text-green-400' },
              { label: 'Gastos',   value: totalGastos,   color: 'text-red-500' },
              { label: 'Balance',  value: balance,       color: balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500' },
            ].map(c => (
              <div key={c.label} className="bg-card border border-border rounded-xl p-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{c.label}</p>
                <p className={cn('font-mono font-semibold text-base mt-1', c.color)}>{fmt(c.value)}</p>
              </div>
            ))}
          </div>

          {/* Lista de entradas */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {monthEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Sin movimientos para este mes.</p>
            ) : monthEntries.map(entry => {
              const isEditing = editingId === entry.id
              const day = entry.date.split('-')[2]
              return (
                <div key={entry.id} className={cn('border-b border-border last:border-0', !isEditing && entry.status === 'pagado' && 'opacity-50')}>
                  {isEditing ? (
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-secondary/20">
                      <input value={editConcept} onChange={ev => setEditConcept(ev.target.value)}
                        className="flex-1 min-w-[160px] border border-input rounded-lg px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                      <input type="number" value={editAmount} onChange={ev => setEditAmount(ev.target.value)}
                        className="w-32 border border-input rounded-lg px-2.5 py-1.5 text-sm font-mono bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                      <button onClick={() => saveEdit(entry.id)} className="p-1.5 rounded-lg bg-foreground text-primary-foreground hover:bg-foreground/90 transition-colors">
                        <Check size={13} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg border border-border hover:bg-secondary transition-colors">
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="group grid items-center gap-2 py-3 px-4 cursor-pointer hover:bg-secondary/20 transition-colors"
                      style={{ gridTemplateColumns: '32px 1fr auto auto 26px' }}
                      onClick={() => toggleStatus(entry.id)}
                      title={entry.status === 'pagado' ? 'Click para volver a pendiente' : 'Click para marcar como pagado'}
                    >
                      <span className="text-xs font-mono text-muted-foreground">{day}</span>
                      <div className="min-w-0">
                        <span className={cn('text-sm', entry.status === 'pagado' && 'line-through')}>
                          <span className="mr-1.5">{conceptIcon(entry.concept)}</span>{entry.concept}
                        </span>
                        <span className="ml-2 text-[9px] bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                          {entry.category}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                        {entry.status === 'pendiente' ? 'Pendiente' : ''}
                      </span>
                      <span className={cn(
                        'text-sm font-mono font-semibold whitespace-nowrap',
                        entry.type === 'ingreso' ? 'text-green-600 dark:text-green-400' : 'text-red-500',
                        entry.status === 'pagado' && 'line-through'
                      )}>
                        {entry.type === 'gasto' ? '−' : '+'}{fmt(entry.amount)}
                      </span>
                      <button
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-border text-muted-foreground transition-all"
                        title="Editar"
                        onClick={ev => { ev.stopPropagation(); startEdit(entry) }}
                      >
                        <Pencil size={11} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Columna derecha */}
        <aside className="space-y-4">
          {/* Pendientes del mes */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground">Pendientes del mes</h2>
              <span className="text-sm font-mono font-bold text-red-500">{fmt(totalPendiente)}</span>
            </div>
            {pendientes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">Sin pendientes para este mes.</p>
            ) : pendientes.map(entry => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-2 py-2 px-1 rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors border-b border-border/50 last:border-0"
                title="Click para marcar como pagado"
                onClick={() => toggleStatus(entry.id)}
              >
                <div className="min-w-0">
                  <p className="text-sm truncate"><span className="mr-1">{conceptIcon(entry.concept)}</span>{entry.concept}</p>
                  <p className="text-[10px] font-mono text-blue-500 dark:text-blue-300">vence {entry.due || entry.date}</p>
                </div>
                <span className="text-sm font-mono font-semibold text-muted-foreground shrink-0">{fmt(entry.amount)}</span>
              </div>
            ))}
          </div>

          {/* Cómo fue subiendo */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-4">
            <h2 className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground mb-3">Cómo fue subiendo</h2>
            {trends.length === 0 ? (
              <p className="text-xs text-muted-foreground">Cuando un gasto fijo se repita más de un mes, vas a ver cómo varió.</p>
            ) : (
              <div className="divide-y divide-border">
                {trends.slice(0, 8).map(t => (
                  <div key={t.concept} className="py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs truncate">{t.concept}</span>
                      <span className="text-xs font-mono font-semibold shrink-0">{fmt(t.latest)}</span>
                    </div>
                    <p className={cn('text-[10px] mt-0.5 font-mono',
                      t.diff > 0 ? 'text-red-500' : t.diff < 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                    )}>
                      {t.diff > 0 ? '↑' : t.diff < 0 ? '↓' : '→'} {Math.abs(t.pct).toFixed(0)}% desde {t.firstDate} ({fmt(t.first)})
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agregar movimiento */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-4">
            <h2 className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground mb-3">Agregar movimiento</h2>
            <form onSubmit={handleAdd} className="space-y-2">
              <input value={fConcept} onChange={ev => setFConcept(ev.target.value)} required
                placeholder="Concepto (ej: Alquiler)" className={inputCls} />
              <div className="grid grid-cols-2 gap-2">
                <select value={fType} onChange={ev => setFType(ev.target.value as 'gasto' | 'ingreso')} className={inputCls}>
                  <option value="gasto">Gasto</option>
                  <option value="ingreso">Ingreso</option>
                </select>
                <select value={fCategory} onChange={ev => setFCategory(ev.target.value as 'fijo' | 'variable')} className={inputCls}>
                  <option value="fijo">Fijo</option>
                  <option value="variable">Variable</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" value={fAmount} onChange={ev => setFAmount(ev.target.value)} required
                  placeholder="Monto" step="1" className={inputCls} />
                <input type="date" value={fDate} onChange={ev => setFDate(ev.target.value)} required className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={fStatus} onChange={ev => setFStatus(ev.target.value as 'pagado' | 'pendiente')} className={inputCls}>
                  <option value="pagado">Pagado</option>
                  <option value="pendiente">Pendiente</option>
                </select>
                <input type="date" value={fDue} onChange={ev => setFDue(ev.target.value)} className={inputCls} />
              </div>
              <button type="submit" className="w-full mt-1 bg-foreground text-primary-foreground hover:bg-foreground/90 transition-colors rounded-lg py-2 text-sm font-semibold">
                Agregar
              </button>
            </form>
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
              También podés contarme los movimientos por chat — yo los cargo acá actualizando el código.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
