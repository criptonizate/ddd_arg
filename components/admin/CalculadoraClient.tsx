'use client'

import { useState, useTransition } from 'react'
import type { CalculadoraConfig } from '@/lib/actions/calculadora'
import { updateCalculadoraConfig } from '@/lib/actions/calculadora'

const PRINTER_MODELS: { label: string; consumo: number }[] = [
  { label: 'Ender 3 / Pro', consumo: 120 },
  { label: 'Ender 3 V2 / S1', consumo: 150 },
  { label: 'CR-10', consumo: 350 },
  { label: 'Bambu Lab A1 mini', consumo: 250 },
  { label: 'Bambu Lab P1P', consumo: 300 },
  { label: 'Prusa i3 MK3S+', consumo: 120 },
  { label: 'Otro / Personalizado', consumo: 0 },
]

function num(v: string | number): number {
  const n = typeof v === 'string' ? parseFloat(v) : v
  return isNaN(n) ? 0 : n
}

function fmtARS(v: number) {
  return v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props {
  initialConfig: CalculadoraConfig
}

export default function CalculadoraClient({ initialConfig }: Props) {
  // Gastos fijos
  const [config, setConfig] = useState<CalculadoraConfig>(initialConfig)
  const [editando, setEditando] = useState(false)
  const [draft, setDraft] = useState<Omit<CalculadoraConfig, 'updated_at'>>(initialConfig)
  const [printerModel, setPrinterModel] = useState('Otro / Personalizado')
  const [saving, startSave] = useTransition()
  const [saveError, setSaveError] = useState('')

  // Pieza
  const [horas, setHoras] = useState('')
  const [minutos, setMinutos] = useState('')
  const [gramos, setGramos] = useState('')
  const [insumos, setInsumos] = useState('')

  // Ganancia
  const [multiplicador, setMultiplicador] = useState('3')

  function handleModelChange(label: string) {
    setPrinterModel(label)
    const found = PRINTER_MODELS.find((m) => m.label === label)
    if (found && found.consumo > 0) {
      setDraft((d) => ({ ...d, consumo_w: found.consumo }))
    }
  }

  function handleSaveConfig() {
    setSaveError('')
    startSave(async () => {
      const res = await updateCalculadoraConfig(draft)
      if (!res.ok) {
        setSaveError(res.error ?? 'Error al guardar')
        return
      }
      setConfig({ ...draft, updated_at: new Date().toISOString() })
      setEditando(false)
    })
  }

  function handleCancelEdit() {
    setDraft(config)
    setEditando(false)
    setSaveError('')
  }

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const horasTotales = num(horas) + num(minutos) / 60
  const precioMaterial = (num(gramos) / 1000) * num(config.precio_filamento_kg)
  const precioLuz = horasTotales * (num(config.consumo_w) / 1000) * num(config.precio_kwh)
  const desgasteMaquina =
    config.vida_util_horas > 0
      ? (horasTotales / num(config.vida_util_horas)) * num(config.costo_repuestos)
      : 0
  const margenError = (precioMaterial + precioLuz + desgasteMaquina) * (num(config.margen_error_pct) / 100)
  const costoBase = precioMaterial + precioLuz + desgasteMaquina + margenError
  const insumosVal = num(insumos)
  const totalSinGanancia = costoBase + insumosVal
  const totalACobrar = totalSinGanancia * num(multiplicador)
  const precioML = totalACobrar * 1.2

  const inputCls =
    'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50'
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Calculadora de costos</h1>

      {/* ── Gastos fijos ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base">Gastos fijos</h2>
          {!editando ? (
            <button
              onClick={() => { setDraft(config); setEditando(true) }}
              className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
            >
              Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancelEdit}
                className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="text-xs px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          )}
        </div>

        {saveError && <p className="text-xs text-red-500">{saveError}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Precio del filamento ($/kg)</label>
            <input
              type="number"
              className={inputCls}
              disabled={!editando}
              value={editando ? draft.precio_filamento_kg : config.precio_filamento_kg}
              onChange={(e) => setDraft((d) => ({ ...d, precio_filamento_kg: num(e.target.value) }))}
            />
          </div>
          <div>
            <label className={labelCls}>Precio del kWh ($)</label>
            <input
              type="number"
              className={inputCls}
              disabled={!editando}
              value={editando ? draft.precio_kwh : config.precio_kwh}
              onChange={(e) => setDraft((d) => ({ ...d, precio_kwh: num(e.target.value) }))}
            />
          </div>

          {editando && (
            <div>
              <label className={labelCls}>Modelo de impresora</label>
              <select
                className={inputCls}
                value={printerModel}
                onChange={(e) => handleModelChange(e.target.value)}
              >
                {PRINTER_MODELS.map((m) => (
                  <option key={m.label} value={m.label}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={labelCls}>Consumo de la impresora (W)</label>
            <input
              type="number"
              className={inputCls}
              disabled={!editando}
              value={editando ? draft.consumo_w : config.consumo_w}
              onChange={(e) => setDraft((d) => ({ ...d, consumo_w: num(e.target.value) }))}
            />
          </div>

          <div>
            <label className={labelCls}>Vida útil de la máquina (horas)</label>
            <input
              type="number"
              className={inputCls}
              disabled={!editando}
              value={editando ? draft.vida_util_horas : config.vida_util_horas}
              onChange={(e) => setDraft((d) => ({ ...d, vida_util_horas: num(e.target.value) }))}
            />
          </div>

          <div>
            <label className={labelCls}>Costo de repuestos ($)</label>
            <input
              type="number"
              className={inputCls}
              disabled={!editando}
              value={editando ? draft.costo_repuestos : config.costo_repuestos}
              onChange={(e) => setDraft((d) => ({ ...d, costo_repuestos: num(e.target.value) }))}
            />
          </div>

          <div>
            <label className={labelCls}>Margen de error (%)</label>
            <input
              type="number"
              className={inputCls}
              disabled={!editando}
              value={editando ? draft.margen_error_pct : config.margen_error_pct}
              onChange={(e) => setDraft((d) => ({ ...d, margen_error_pct: num(e.target.value) }))}
            />
          </div>
        </div>

        {!editando && (
          <p className="text-xs text-muted-foreground">
            Última actualización:{' '}
            {new Date(config.updated_at).toLocaleDateString('es-AR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
            })}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Pieza + Ganancia ──────────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="font-bold text-base">Pieza</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Horas de impresión</label>
                <input type="number" min="0" className={inputCls} value={horas} onChange={(e) => setHoras(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className={labelCls}>Minutos adicionales</label>
                <input type="number" min="0" max="59" className={inputCls} value={minutos} onChange={(e) => setMinutos(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className={labelCls}>Gramos de filamento</label>
                <input type="number" min="0" className={inputCls} value={gramos} onChange={(e) => setGramos(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className={labelCls}>Insumos extra ($)</label>
                <input type="number" min="0" className={inputCls} value={insumos} onChange={(e) => setInsumos(e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="font-bold text-base">Ganancia</h2>
            <div>
              <label className={labelCls}>Margen de ganancia (multiplicador)</label>
              <input
                type="number"
                min="1"
                step="0.5"
                className={inputCls}
                value={multiplicador}
                onChange={(e) => setMultiplicador(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
              <p className="font-semibold text-red-500">Referencias:</p>
              <p>• Mayorista → 3</p>
              <p>• Minorista → 4</p>
              <p>• Llaveros → 5</p>
            </div>
          </div>
        </div>

        {/* ── Resultados ───────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🧮</span>
            <h2 className="font-bold text-base">Resultados</h2>
          </div>

          <ResultRow label="Precio material" value={precioMaterial} />
          <ResultRow label="Precio luz" value={precioLuz} />
          <ResultRow label="Desgaste máquina" value={desgasteMaquina} />
          <ResultRow label="Margen de error" value={margenError} />

          <div className="border-t border-border pt-3 space-y-2">
            <ResultRow label="Costo total (sin insumos)" value={costoBase} bold />
            {insumosVal > 0 && <ResultRow label="Insumos" value={insumosVal} />}
          </div>

          <div className="rounded-lg p-4 mt-3" style={{ background: 'rgba(200,0,0,0.12)', border: '1px solid rgba(200,0,0,0.3)' }}>
            <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-1">Total a cobrar</p>
            <p className="text-3xl font-bold">$ {fmtARS(totalACobrar)}</p>
          </div>

          <div className="rounded-lg p-4" style={{ background: 'rgba(180,150,0,0.12)', border: '1px solid rgba(180,150,0,0.3)' }}>
            <p className="text-xs font-bold text-yellow-500 uppercase tracking-wide mb-1">Precio MercadoLibre (+20%)</p>
            <p className="text-3xl font-bold text-yellow-400">$ {fmtARS(precioML)}</p>
          </div>

          <button
            onClick={() => {
              setHoras('')
              setMinutos('')
              setGramos('')
              setInsumos('')
              setMultiplicador('3')
            }}
            className="w-full mt-2 text-xs px-3 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors"
          >
            Limpiar pieza
          </button>
        </div>
      </div>
    </div>
  )
}

function ResultRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'font-semibold' : ''}`}>
      <span className={bold ? '' : 'text-muted-foreground'}>{label}</span>
      <span>$ {fmtARS(value)}</span>
    </div>
  )
}
