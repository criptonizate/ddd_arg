// Helpers de membresía — sin 'use server', importable desde cliente y servidor

export const DIAS_PERIODO = 30
export const DIAS_EXTENSION = 15

// Costo de extensión según nivel activo
export const COSTO_EXTENSION_POR_NIVEL: Record<string, number> = {
  Plata:    2000,
  Oro:      4000,
  Platino:  10000,
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
// extensionDias: días extra confirmados por admin (extensiones pagas),
// se aplican UNA sola vez al período activo final.
export function calcularPeriodo(
  eventos: EventoCompra[],
  extensionDias = 0,
): { periodoInicio: Date; periodoFin: Date; kgPeriodo: number } {
  // Primer evento siempre arranca un período
  let periodoInicio = new Date(eventos[0].fecha_iso)
  let periodoFin = addDias(periodoInicio, DIAS_PERIODO)
  let kgPeriodo = 0

  for (const e of eventos) {
    const fecha = new Date(e.fecha_iso)

    if (fecha > periodoFin) {
      // Período vencido — empieza uno nuevo con este evento
      periodoInicio = fecha
      periodoFin = addDias(fecha, DIAS_PERIODO)
      kgPeriodo = e.kg
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

  // Aplicar días de extensión paga al período activo final (una sola vez)
  if (extensionDias > 0) {
    periodoFin = addDias(periodoFin, extensionDias)
  }

  return { periodoInicio, periodoFin, kgPeriodo }
}

// Los tiers expresan DESCUENTO sobre el precio base del filamento (ARS por kg)
export const TIERS_MEMBRESIA = [
  { min: 15, descuento: 4000, label: 'Platino', emoji: '💎', color: 'violet' as const },
  { min: 10, descuento: 3000, label: 'Oro',     emoji: '⭐', color: 'blue'   as const },
  { min:  5, descuento: 2000, label: 'Plata',   emoji: '🥈', color: 'amber'  as const },
] as const

export const KG_ACTIVACION_MEMBRESIA = Math.min(...TIERS_MEMBRESIA.map(t => t.min))  // 5 kg

// Devuelve el próximo tier (el de min más chico que sea mayor al min actual).
// Si ya es el nivel máximo (Platino), devuelve undefined.
// Si no tiene nivel, devuelve el tier más bajo (Plata).
export function siguienteTier(nivelActual: string | null) {
  const tiersAsc = [...TIERS_MEMBRESIA].sort((a, b) => a.min - b.min)
  if (!nivelActual) return tiersAsc[0]
  const actual = tiersAsc.find(t => t.label === nivelActual)
  if (!actual) return tiersAsc[0]
  return tiersAsc.find(t => t.min > actual.min)
}

export type NivelMembresia = 'Platino' | 'Oro' | 'Plata' | null

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
  ultimoNivel: NivelMembresia  // nivel que tenía en el último período (aunque haya vencido)
  kgUltimoPeriodo: number      // kg que compró en el último período (aunque haya vencido)
  diasDesdeVencimiento: number // 0 si está activa, >0 si venció hace N días
}
