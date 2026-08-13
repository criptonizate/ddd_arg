'use client'

import { useState, useTransition } from 'react'
import { logCalculadoraPublica } from '@/lib/actions/calculadora'
import type { CalculadoraConfig } from '@/lib/actions/calculadora'

function fmtARS(v: number) {
  return v.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
}

function calcular(gramos: number, horas: number, config: CalculadoraConfig) {
  const material = (gramos / 1000) * config.precio_filamento_kg
  const luz = horas * (config.consumo_w / 1000) * config.precio_kwh
  const desgaste = config.vida_util_horas > 0 ? (horas / config.vida_util_horas) * config.costo_repuestos : 0
  const margen = (material + luz + desgaste) * (config.margen_error_pct / 100)
  const costoBase = material + luz + desgaste + margen
  return {
    costoBase,
    x3: costoBase * 3,
    x4: costoBase * 4,
  }
}

export default function CalculadoraPublica({ config }: { config: CalculadoraConfig }) {
  const [gramos, setGramos] = useState('')
  const [horas, setHoras] = useState('')
  const [resultado, setResultado] = useState<{ costoBase: number; x3: number; x4: number } | null>(null)
  const [, startLog] = useTransition()

  function handleCalcular() {
    const g = parseFloat(gramos)
    const h = parseFloat(horas)
    if (!g || !h || g <= 0 || h <= 0) return

    const res = calcular(g, h, config)
    setResultado(res)

    startLog(async () => {
      await logCalculadoraPublica({
        gramos: g,
        horas: h,
        costo_base: res.costoBase,
        precio_x3: res.x3,
        precio_x4: res.x4,
      })
    })
  }

  const valid = parseFloat(gramos) > 0 && parseFloat(horas) > 0

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h2 className="text-xl font-bold">Calculadora de precio</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ingresá los datos de tu pieza y obtené un precio de referencia.
          </p>
        </div>

        {/* Inputs */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Filamento utilizado
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                placeholder="ej. 150"
                value={gramos}
                onChange={(e) => { setGramos(e.target.value); setResultado(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleCalcular()}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring pr-14"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                gramos
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Tiempo de impresión
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.1"
                step="0.5"
                placeholder="ej. 4"
                value={horas}
                onChange={(e) => { setHoras(e.target.value); setResultado(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleCalcular()}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring pr-14"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                horas
              </span>
            </div>
          </div>

          <button
            onClick={handleCalcular}
            disabled={!valid}
            className="w-full bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-xl py-3 text-sm font-semibold"
          >
            Calcular precio
          </button>
        </div>

        {/* Resultado */}
        {resultado && (
          <div className="border-t border-border px-6 py-5 bg-secondary/20 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Precios de referencia
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Precio mayorista</p>
                <p className="text-2xl font-bold">{fmtARS(resultado.x3)}</p>
              </div>
              <div className="bg-foreground text-primary-foreground rounded-xl p-4 text-center">
                <p className="text-xs opacity-70 mb-1">Precio minorista</p>
                <p className="text-2xl font-bold">{fmtARS(resultado.x4)}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-1">
              Estos son precios estimados. El precio final puede variar según el diseño y
              complejidad de la pieza.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
