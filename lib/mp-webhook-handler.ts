// Lógica para procesar una notificación de pago de MP.
// NO es un server action — es helper interno del route handler /api/mp/webhook.
// Evitamos ponerlo en un archivo 'use server' para que no se exponga como RPC.

import { createServiceClient } from '@/lib/supabase/server'
import { obtenerPayment } from '@/lib/mercadopago'
import { notifyAdmin, fmtARS } from '@/lib/telegram'
import { sendPedidoConfirmadoCliente } from '@/lib/email'
import { revalidatePath, updateTag } from 'next/cache'
import type { FilamentoPedidoItem } from '@/lib/actions/filamento-pedidos'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dddarg.com.ar').replace(/\/$/, '')

/**
 * Procesa una notificación de pago de MP. Idempotente.
 *
 * - approved → confirma pedido y descuenta stock atómicamente.
 * - rejected/cancelled → marca mp_status; deja pedido pendiente para que el
 *   admin / cliente decidan (reintentar pago o cancelar).
 */
export async function procesarPagoMP(paymentId: string): Promise<{ ok: boolean; error?: string }> {
  const pago = await obtenerPayment(paymentId)
  if (!pago) return { ok: false, error: 'Pago no encontrado en MP' }
  if (!pago.external_reference) return { ok: false, error: 'Pago sin external_reference' }

  const db = createServiceClient()
  const pedidoId = pago.external_reference

  const { data: ya } = await db
    .from('filamento_pedidos')
    .select('id, numero, estado, mp_payment_id, total')
    .eq('id', pedidoId)
    .single()
  if (!ya) return { ok: false, error: 'Pedido no encontrado' }

  // Idempotencia: si ya procesamos este payment_id y el pedido ya salió de
  // "pendiente", no volver a hacer nada.
  if (ya.mp_payment_id === pago.id && ya.estado !== 'pendiente') {
    return { ok: true }
  }

  // Guardamos payment_id + status siempre.
  await db
    .from('filamento_pedidos')
    .update({
      mp_payment_id: pago.id,
      mp_status: pago.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pedidoId)

  if (pago.status === 'approved' && ya.estado === 'pendiente') {
    const { data: rpcResult, error: rpcErr } = await db.rpc(
      'confirmar_pedido_filamento_atomico',
      { p_pedido_id: pedidoId, p_nota: 'Confirmado automáticamente por pago MP' },
    )
    const result = rpcResult as { ok?: boolean; error?: string } | null
    if (rpcErr || !result?.ok) {
      console.error('[procesarPagoMP] fallo confirmar atomico:', rpcErr ?? result?.error)
      return { ok: false, error: result?.error ?? rpcErr?.message ?? 'Error confirmando' }
    }

    const { data: pedido } = await db.from('filamento_pedidos').select('*').eq('id', pedidoId).single()

    if (pedido?.user_id && pedido.total_rollos > 0) {
      try {
        const { sumarPuntosPorCompra } = await import('./actions/ddd-coins')
        await sumarPuntosPorCompra(pedido.user_id, pedido.total_rollos, { pedidoId })
      } catch (e) { console.error('[sumarPuntosPorCompra webhook]', e) }
    }

    if (pedido?.user_id) {
      const { data: { user } } = await db.auth.admin.getUserById(pedido.user_id)
      if (user?.email) {
        void sendPedidoConfirmadoCliente({
          numero: pedido.numero,
          clienteNombre: pedido.cliente_nombre,
          clienteEmail: user.email,
          items: pedido.items as FilamentoPedidoItem[],
          totalRollos: pedido.total_rollos,
          descuentoPorRollo: pedido.descuento_por_rollo,
          total: pedido.total,
        })
      }
    }

    void notifyAdmin({
      emoji: '💳',
      titulo: `Pago MP aprobado — Pedido N° ${pedido?.numero ?? '?'}`,
      detalle: `Total ${fmtARS(pedido?.total ?? 0)} · Confirmado y stock descontado automáticamente.`,
      url: `${SITE_URL}/admin/filamentos`,
    })

    revalidatePath('/admin/filamentos'); updateTag('filamentos')
    revalidatePath('/cuenta')
  } else if (pago.status === 'rejected' || pago.status === 'cancelled') {
    void notifyAdmin({
      emoji: '⚠️',
      titulo: `Pago MP ${pago.status} — Pedido N° ${ya.numero}`,
      detalle: `Total esperado: ${fmtARS(ya.total)}. El pedido sigue pendiente.`,
    })
  }

  return { ok: true }
}
