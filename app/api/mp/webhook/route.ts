// Webhook de Mercado Pago. Recibe notificaciones de pago (topic=payment)
// y confirma el pedido si corresponde.
//
// MP reintenta 3-5 veces con backoff si no respondemos 200 en < 22s.
// Por eso: respondemos 200 rápido y procesamos sin bloquear demasiado.
//
// Configuración en MP: panel → Webhooks → URL = https://dddarg.com.ar/api/mp/webhook
// Eventos: solo "Pagos" (payment).

import { NextRequest, NextResponse } from 'next/server'
import { verificarFirmaWebhook } from '@/lib/mercadopago'
import { procesarPagoMP } from '@/lib/mp-webhook-handler'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  const signature = req.headers.get('x-signature')
  const requestId = req.headers.get('x-request-id')

  // MP manda el payment_id tanto en el body JSON como en query (?data.id=...).
  let body: unknown = null
  try { body = await req.json() } catch { /* body puede venir vacío en pruebas */ }

  const bodyData = (body ?? {}) as { data?: { id?: string | number }; type?: string }
  const paymentId =
    (bodyData.data?.id ? String(bodyData.data.id) : null) ??
    url.searchParams.get('data.id') ??
    url.searchParams.get('id')

  const topic = bodyData.type ?? url.searchParams.get('topic') ?? url.searchParams.get('type')

  if (!paymentId) {
    // MP a veces pingea sin data (health check). Respondemos 200 para no cortar
    // el reintento, pero no hay nada que procesar.
    return NextResponse.json({ ok: true, note: 'no payment id' })
  }

  // Verificación de firma: si MP_WEBHOOK_SECRET está configurado, bloqueamos
  // requests con firma inválida. Si no está, logueamos y aceptamos (modo dev).
  const firmaOk = await verificarFirmaWebhook({
    signatureHeader: signature,
    requestId,
    dataId: paymentId,
  })
  if (!firmaOk) {
    console.warn('[mp webhook] firma inválida para payment', paymentId)
    return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 401 })
  }

  // Solo nos interesan eventos de pago.
  if (topic && topic !== 'payment' && topic !== 'payment.created' && topic !== 'payment.updated') {
    return NextResponse.json({ ok: true, note: `topic ignorado: ${topic}` })
  }

  const r = await procesarPagoMP(paymentId)
  if (!r.ok) {
    // Devolvemos 200 para que MP no siga reintentando por errores de aplicación
    // (ej. pago no encontrado, pedido borrado). Logueamos para debug.
    console.error('[mp webhook] procesarPagoMP ok=false:', r.error)
    return NextResponse.json({ ok: false, error: r.error }, { status: 200 })
  }
  return NextResponse.json({ ok: true })
}
