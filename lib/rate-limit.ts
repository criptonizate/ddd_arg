import { createServiceClient } from '@/lib/supabase/server'

/**
 * Rate limit por (user_id, action) con backend en Postgres.
 *
 * Uso típico en una server action:
 *   const ok = await checkRateLimit(user.id, 'crear_pedido', 3600, 5)
 *   if (!ok) return { error: 'Muchos pedidos en poco tiempo, probá en un rato' }
 *
 * Devuelve true si está permitido (y registra el hit), false si excede.
 * Ante error de DB, deja pasar (fail-open) para no romper la funcionalidad.
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  windowSeconds: number,
  maxHits: number,
): Promise<boolean> {
  try {
    const db = createServiceClient()
    const { data } = await db.rpc('check_and_log_rate_limit', {
      p_user_id: userId,
      p_action: action,
      p_window_seconds: windowSeconds,
      p_max_hits: maxHits,
    })
    return data !== false
  } catch (e) {
    console.error('[rate-limit]', action, e)
    return true
  }
}
