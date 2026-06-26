'use client'

import { useState, useTransition } from 'react'
import type { CalculadoraConfig, HistorialEntry } from '@/lib/actions/calculadora'
import { updateCalculadoraConfig, saveCalculoHistorial, deleteCalculoHistorial } from '@/lib/actions/calculadora'
import { Plus, Trash2, Save, ChevronDown, ChevronUp } from 'lucide-react'

const PRINTER_MODELS: { label: string; consumo: number }[] = [
  { label: 'Ender 3 / Pro', consumo: 120 },
  { label: 'Ender 3 V2 / S1', consumo: 150 },
  { label: 'CR-10', consumo: 350 },
  { label: 'Bambu Lab A1 mini', consumo: 250 },
  { label: 'Bambu Lab P1P', consumo: 300 },
  { label: 'Prusa i3 MK3S+', consumo: 120 },
  { label: 'Otro / Personalizado', consumo: 0 },
]

interface Pieza {
  nombre: string
  horas: string
  minutos: string
  gramos: string
  insumos: string
  multiplicador: string
}

function defaultPieza(): Pieza {
  return { nombre: '', horas: '', minutos: '', gramos: '', insumos: '', multiplicador: '3' }
}

function num(v: string | number): number {
  const n = typeof v === 'string' ? parseFloat(v) : v
  return isNaN(n) ? 0 : n
}

function fmtARS(v: number) {
  return v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function calcPieza(p: Pieza, config: CalculadoraConfig) {
  const horasTotales = num(p.horas) + num(p.minutos) / 60
  const material = (num(p.gramos) / 1000) * num(config.precio_filamento_kg)
  const luz = horasTotales * (num(config.consumo_w) / 1000) * num(config.precio_kwh)
  const desgaste = config.vida_util_horas > 0 ? (horasTotales / num(config.vida_util_horas)) * num(config.costo_repuestos) : 0
  const margen = (material + luz + desgaste) * (num(config.margen_error_pct) / 100)
  const costoBase = material + luz + desgaste + margen
  const insumosVal = num(p.insumos)
  const totalSinGanancia = costoBase + insumosVal
  const total = totalSinGanancia * num(p.multiplicador)
  const ml = total * 1.2
  return { material, luz, desgaste, margen, costoBase, insumosVal, totalSinGanancia, total, ml }
}

interface Props {
  initialConfig: CalculadoraConfig
  initialHistorial: HistorialEntry[]
}

export default function CalculadoraClient({ initialConfig, initialHistorial }: Props) {
  const [config, setConfig] = useState<CalculadoraConfig>(initialConfig)
  const [editando, setEditando] = useState(false)
  const [draft, setDraft] = useState<Omit<CalculadoraConfig, 'updated_at'>>(initialConfig)
  const [printerModel, setPrinterModel] = useState('Otro / Personalizado')
  const [saving, startSave] = useTransition()
  const [saveError, setSaveError] = useState('')
  const [historial, setHistorial] = useState<HistorialEntry[]>(initialHistorial)
  const [showHistorial, setShowHistorial] = useState(false)

  // Múltiples piezas
  const [piezas, setPiezas] = useState<Pieza[]>([defaultPieza()])

  function addPieza() { setPiezas((prev) => [...prev, defaultPieza()]) }
  function removePieza(i: number) { setPiezas((prev) => prev.filter((_, idx) => idx !== i)) }
  function updatePieza(i: number, field: keyof Pieza, value: string) {
    setPiezas((prev) => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  function handleModelChange(label: string) {
    setPrinterModel(label)
    const found = PRINTER_MODELS.find((m) => m.label === label)
    if (found && found.consumo > 0) setDraft((d) => ({ ...d, consumo_w: found.consumo }))
  }

  function handleSaveConfig() {
    setSaveError('')
    startSave(async () => {
      const res = await updateCalculadoraConfig(draft)
      if (!res.ok) { setSaveError(res.error ?? 'Error al guardar'); return }
      setConfig({ ...draft, updated_at: new Date().toISOString() })
      setEditando(false)
    })
  }

  async function handleGuardarHistorial(idx: number) {
    const p = piezas[idx]
    const c = calcPieza(p, config)
    const entry = {
      nombre_pieza: p.nombre || `Pieza ${idx + 1}`,
      horas: num(p.horas),
      minutos: num(p.minutos),
      gramos: num(p.gramos),
      insumos: num(p.insumos),
      multiplicador: num(p.multiplicador),
      resultado_total: c.total,
      resultado_ml: c.ml,
    }
    const res = await saveCalculoHistorial(entry)
    if (res.ok) {
      const now = new Date().toISOString()
      setHistorial((prev) => [{ ...entry, id: now, created_at: now }, ...prev])
    }
  }

  async function handleDeleteHistorial(id: string) {
    await deleteCalculoHistorial(id)
    setHistorial((prev) => prev.filter((e) => e.id !== id))
  }

  const resultados = piezas.map((p) => calcPieza(p, config))
  const totalGeneral = resultados.reduce((s, r) => s + r.total, 0)
  const totalGeneralML = resultados.reduce((s, r) => s + r.ml, 0)

  const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50'
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Calculadora de costos</h1>

      {/* Gastos fijos */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base">Gastos fijos</h2>
          {!editando ? (
            <button onClick={() => { setDraft(config); setEditando(true) }}
              className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors">
              Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setDraft(config); setEditando(false); setSaveError('') }}
                className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors">
                Cancelar
              </button>
              <button onClick={handleSaveConfig} disabled={saving}
                className="text-xs px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-opacity">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          )}
        </div>
        {saveError && <p className="text-xs text-red-500">{saveError}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Precio del filamento ($/kg)', field: 'precio_filamento_kg' as const },
            { label: 'Precio del kWh ($)', field: 'precio_kwh' as const },
            { label: 'Consumo de la impresora (W)', field: 'consumo_w' as const },
            { label: 'Vida útil de la máquina (horas)', field: 'vida_util_horas' as const },
            { label: 'Costo de repuestos ($)', field: 'costo_repuestos' as const },
            { label: 'Margen de error (%)', field: 'margen_error_pct' as const },
          ].map(({ label, field }) => (
            <div key={field}>
              <label className={labelCls}>{label}</label>
              <input type="number" className={inputCls} disabled={!editando}
                value={editando ? draft[field] : config[field]}
                onChange={(e) => setDraft((d) => ({ ...d, [field]: num(e.target.value) }))} />
            </div>
          ))}
          {editando && (
            <div>
              <label className={labelCls}>Modelo de impresora</label>
              <select className={inputCls} value={printerModel} onChange={(e) => handleModelChange(e.target.value)}>
                {PRINTER_MODELS.map((m) => <option key={m.label} value={m.label}>{m.label}</option>)}
              </select>
            </div>
          )}
        </div>
        {!editando && (
          <p className="text-xs text-muted-foreground">
            Última actualización: {new Date(config.updated_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Piezas */}
      <div className="space-y-4">
        {piezas.map((pieza, idx) => {
          const r = resultados[idx]
          return (
            <div key={idx} className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  placeholder={`Pieza ${idx + 1}`}
                  value={pieza.nombre}
                  onChange={(e) => updatePieza(idx, 'nombre', e.target.value)}
                  className="font-bold text-base bg-transparent border-none focus:outline-none focus:ring-0 w-full placeholder:text-muted-foreground/50"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleGuardarHistorial(idx)} title="Guardar en historial"
                    className="p-1.5 rounded-lg border border-border hover:bg-secondary transition-colors">
                    <Save size={13} />
                  </button>
                  {piezas.length > 1 && (
                    <button onClick={() => removePieza(idx)}
                      className="p-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Horas de impresión</label>
                  <input type="number" min="0" className={inputCls} value={pieza.horas}
                    onChange={(e) => updatePieza(idx, 'horas', e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Minutos adicionales</label>
                  <input type="number" min="0" max="59" className={inputCls} value={pieza.minutos}
                    onChange={(e) => updatePieza(idx, 'minutos', e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Gramos de filamento</label>
                  <input type="number" min="0" className={inputCls} value={pieza.gramos}
                    onChange={(e) => updatePieza(idx, 'gramos', e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Insumos extra ($)</label>
                  <input type="number" min="0" className={inputCls} value={pieza.insumos}
                    onChange={(e) => updatePieza(idx, 'insumos', e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Multiplicador ganancia</label>
                  <input type="number" min="1" step="0.5" className={inputCls} value={pieza.multiplicador}
                    onChange={(e) => updatePieza(idx, 'multiplicador', e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">Mayor→3 · Minorista→4 · Llaveros→5</p>
                </div>
              </div>

              {/* Resultado inline */}
              <div className="border-t border-border pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Material</p>
                  <p className="font-semibold">$ {fmtARS(r.material)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Luz + Desgaste</p>
                  <p className="font-semibold">$ {fmtARS(r.luz + r.desgaste)}</p>
                </div>
                <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(200,0,0,0.10)', border: '1px solid rgba(200,0,0,0.25)' }}>
                  <p className="text-xs font-bold text-red-500">Total a cobrar</p>
                  <p className="font-bold text-base">$ {fmtARS(r.total)}</p>
                </div>
                <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(180,150,0,0.10)', border: '1px solid rgba(180,150,0,0.25)' }}>
                  <p className="text-xs font-bold text-yellow-500">Precio ML (+20%)</p>
                  <p className="font-bold text-base text-yellow-400">$ {fmtARS(r.ml)}</p>
                </div>
              </div>
            </div>
          )
        })}

        <button onClick={addPieza}
          className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors">
          <Plus size={14} /> Agregar pieza
        </button>
      </div>

      {/* Total general si hay más de 1 pieza */}
      {piezas.length > 1 && (
        <div className="rounded-xl border border-border bg-card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg p-4" style={{ background: 'rgba(200,0,0,0.12)', border: '1px solid rgba(200,0,0,0.3)' }}>
            <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-1">Total general ({piezas.length} piezas)</p>
            <p className="text-3xl font-bold">$ {fmtARS(totalGeneral)}</p>
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(180,150,0,0.12)', border: '1px solid rgba(180,150,0,0.3)' }}>
            <p className="text-xs font-bold text-yellow-500 uppercase tracking-wide mb-1">Total ML (+20%)</p>
            <p className="text-3xl font-bold text-yellow-400">$ {fmtARS(totalGeneralML)}</p>
          </div>
        </div>
      )}

      {/* Historial */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          onClick={() => setShowHistorial((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/20 transition-colors"
        >
          <span className="font-semibold text-sm">Historial de cálculos ({historial.length})</span>
          {showHistorial ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showHistorial && (
          <div className="border-t border-border">
            {historial.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sin cálculos guardados. Usá el botón 💾 en cada pieza.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/20 text-xs text-muted-foreground">
                      <th className="text-left px-4 py-3">Pieza</th>
                      <th className="text-right px-4 py-3">Horas</th>
                      <th className="text-right px-4 py-3">Gramos</th>
                      <th className="text-right px-4 py-3">×</th>
                      <th className="text-right px-4 py-3">Total</th>
                      <th className="text-right px-4 py-3">ML</th>
                      <th className="text-right px-4 py-3">Fecha</th>
                      <th className="px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historial.map((e) => (
                      <tr key={e.id} className="hover:bg-secondary/10">
                        <td className="px-4 py-2.5 font-medium">{e.nombre_pieza || '—'}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{e.horas}h {e.minutos}m</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{e.gramos}g</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{e.multiplicador}×</td>
                        <td className="px-4 py-2.5 text-right font-semibold">$ {fmtARS(e.resultado_total)}</td>
                        <td className="px-4 py-2.5 text-right text-yellow-500">$ {fmtARS(e.resultado_ml)}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground text-xs">
                          {new Date(e.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </td>
                        <td className="px-2 py-2.5">
                          <button onClick={() => handleDeleteHistorial(e.id)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
