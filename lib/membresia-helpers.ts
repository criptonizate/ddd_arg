// Helpers de membresía mayorista — sin 'use server', importable desde cliente y servidor

export const KG_RENOVACION = 5   // kg mínimos en un solo pedido para renovar/activar
export const DIAS_PERIODO = 30

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
