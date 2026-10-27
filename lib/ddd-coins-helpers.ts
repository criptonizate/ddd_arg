// Constantes y helpers puros de DDD Coins — sin 'use server', importable desde cliente y servidor

export const PUNTOS_POR_CANJE = 150
export const PESOS_POR_CANJE = 1000

export function calcularDescuentoCoins(puntosACanjear: number): number {
  const bloques = Math.floor(puntosACanjear / PUNTOS_POR_CANJE)
  return bloques * PESOS_POR_CANJE
}
