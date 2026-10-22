// Helpers de membresía mayorista — sin 'use server', importable desde cliente y servidor

export const KG_RENOVACION = 5   // kg mínimos en un solo pedido para renovar/activar
export const DIAS_PERIODO = 30

export type EventoCompra = { fecha_iso: string; kg: number }

export function addDias(date: Date, dias: number): Date {
  return new Date(date.getTime() + dias * 24 * 60 * 60 * 1000)
}

export function calcularPeriodo(eventos: EventoCompra[]): { periodoInicio: Date; periodoFin: Date; kgPeriodo: number } {
  let periodoInicio = new Date(eventos[0].fecha_iso)
  let periodoFin = addDias(periodoInicio, DIAS_PERIODO)
  let kgPeriodo = 0
  for (const e of eventos) {
    const fecha = new Date(e.fecha_iso)
    const kg = e.kg
    if (fecha < periodoFin) {
      kgPeriodo += kg
      if (kg >= KG_RENOVACION) {
        const nuevaFin = addDias(fecha, DIAS_PERIODO)
        if (nuevaFin > periodoFin) periodoFin = nuevaFin
      }
    } else {
      periodoInicio = fecha
      periodoFin = addDias(fecha, DIAS_PERIODO)
      kgPeriodo = kg
    }
  }
  return { periodoInicio, periodoFin, kgPeriodo }
}

// Los tiers expresan DESCUENTO sobre el precio base del filamento, no precio fijo
export const TIERS_MEMBRESIA = [
  { min: 15, descuento: 4000, label: 'Elite',     emoji: '💎', color: 'violet' as const },
  { min: 10, descuento: 3000, label: 'Plus',      emoji: '⭐', color: 'blue'   as const },
  { min:  5, descuento: 2000, label: 'Mayorista', emoji: '🏆', color: 'amber'  as const },
] as const

export type NivelMembresia = 'Elite' | 'Plus' | 'Mayorista' | null

export interface MembresiaStatus {
  kgPeriodo: number
  periodoInicio: string
  periodoFin: string
  diasRestantes: number
  nivel: NivelMembresia
  descuento: number
  totalHistorico: number
}
