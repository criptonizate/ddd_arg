import { createServiceClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

/**
 * Registra una acción admin en `admin_audit_log`. Fire-and-forget: errores de
 * logueo nunca bloquean la acción principal (se muestran en consola).
 *
 * Uso típico, dentro de una server action admin tras getAdminUser():
 *   const admin = await getAdminUser()
 *   ...
 *   await logAdminAction(admin, 'pedido_confirmado', 'filamento_pedidos', id, { nota })
 */
export async function logAdminAction(
  actor: Pick<User, 'id' | 'email'> | null,
  action: string,
  target?: string,
  targetId?: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    const db = createServiceClient()
    await db.from('admin_audit_log').insert({
      actor_id: actor?.id ?? null,
      actor_email: actor?.email ?? null,
      action,
      target: target ?? null,
      target_id: targetId ?? null,
      meta: meta ?? null,
    })
  } catch (e) {
    console.error('[audit-log]', action, e)
  }
}
