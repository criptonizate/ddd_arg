// Helpers de membresía mayorista — sin 'use server', importable desde cliente y servidor

export const DIAS_PERIODO = 30
export const DIAS_EXTENSION = 15

// Costo de extensión según nivel activo
export const COSTO_EXTENSION_POR_NIVEL: Record<string, number> = {
  Mayorista: 2000,
  Plus:      4000,
  Elite:     10000,
}

export function costoExtension(nivel: string | null): number {
  return COSTO_EXTENSION_POR_NIVEL[nivel ?? ''] ?? 2000
}

// Hitos de kg acumulados que reinician el período y suben el tier
export const HITOS_KG = [5, 10, 15] as const

export type EventoCompra = { fecha_iso: string; kg: number }

export function addDias(date: Date, dias: number): Date {
  return new Date(date.getTime() + dias * 24 * 60 * 60 * 1000)
}

// Calcula el período activo y los kg acumulados.
// Lógica: los kg se acumulan dentro del período activo.
// Cada vez que se cruza un hito (5, 10, 15 kg), periodoFin se reinicia a +30 días
// desde la fecha de ese último pedido (no se suman días restantes).
// Si el período vence, el contador vuelve a 0 y empieza un período nuevo.
// extensionDias: días extra confirmados por admin (extensiones pagas)
export function calcularPeriodo(
  eventos: EventoCompra[],
  extensionDias = 0,
): { periodoInicio: Date; periodoFin: Date; kgPeriodo: number } {
  // Primer evento siempre arranca un período
  let periodoInicio = new Date(eventos[0].fecha_iso)
  let periodoFin = addDias(periodoInicio, DIAS_PERIODO + extensionDias)
  let kgPeriodo = 0

  for (const e of eventos) {
    const fecha = new Date(e.fecha_iso)

    if (fecha > periodoFin) {
      // Período vencido — empieza uno nuevo con este evento
      periodoInicio = fecha
      periodoFin = addDias(fecha, DIAS_PERIODO)
      kgPeriodo = e.kg
      // Verificar si este primer evento ya cruza un hito
      for (const hito of HITOS_KG) {
        if (kgPeriodo >= hito) {
          periodoFin = addDias(fecha, DIAS_PERIODO)
        }
      }
    } else {
      // Dentro del período activo — acumular kg
      const kgAntes = kgPeriodo
      kgPeriodo += e.kg

      // Verificar si se cruzó algún hito nuevo con este pedido
      for (const hito of HITOS_KG) {
        if (kgAntes < hito && kgPeriodo >= hito) {
          // Reiniciar exactamente 30 días desde este pedido (sin sumar días restantes)
          periodoFin = addDias(fecha, DIAS_PERIODO)
        }
      }
    }
  }

  // Aplicar días de extensión paga al período activo final
  if (extensionDias > 0) {
    periodoFin = addDias(periodoFin, extensionDias)
  }

  return { periodoInicio, periodoFin, kgPeriodo }
}

// Los tiers expresan DESCUENTO sobre el precio base del filamento
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
  extensionPendiente: boolean  // hay una solicitud de extensión esperando confirmación
  esTrial: boolean             // período de prueba gratuito para nuevos usuarios
}
