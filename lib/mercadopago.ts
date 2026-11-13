// Cliente de Mercado Pago para Checkout Pro.
//
// Env vars requeridas (no se exponen al cliente):
//   MP_ACCESS_TOKEN     — Access Token de producción (APP_USR-...)
//   MP_WEBHOOK_SECRET   — Clave secreta del webhook, para verificar x-signature
//
// La URL pública del sitio viene de NEXT_PUBLIC_SITE_URL (ya existe).

import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import type { FilamentoPedidoItem } from '@/lib/actions/filamento-pedidos'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dddarg.com.ar').replace(/\/$/, '')

function getClient(): MercadoPagoConfig {
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) throw new Error('MP_ACCESS_TOKEN no configurado')
  return new MercadoPagoConfig({
    accessToken: token,
    options: { timeout: 7000 },
  })
}

export interface CrearPreferenciaInput {
  pedidoId: string
  numero: number
  items: FilamentoPedidoItem[]
  total: number
  cliente_nombre: string
  cliente_email?: string | null
  cliente_telefono?: string | null
}

export interface PreferenciaResultado {
  id: string
  init_point: string
}

/**
 * Crea una Preference en MP para un pedido de filamentos.
 * Devuelve el `init_point` donde redirigir al cliente.
 *
 * Decisiones:
 * - Un solo ítem por preferencia con `unit_price = total` (ya con descuentos
 *   aplicados). Mantiene la caja de MP legible y evita que los descuentos
 *   se calculen en dos lugares (web + MP).
 * - El detalle de filamentos va en `description` para que figure en el ticket.
 * - `external_reference = pedidoId` → el webhook reencuentra el pedido.
 * - `auto_return: 'approved'` → vuelta directa a la web si paga ok.
 * - Excluimos "ticket" (RapiPago/Pago Fácil) y "atm" (cajero) porque esos
 *   pagos quedan en limbo y demoran días en confirmarse.
 */
export async function crearPreferenciaFilamento(
  input: CrearPreferenciaInput,
): Promise<PreferenciaResultado> {
  const client = getClient()
  const preference = new Preference(client)

  const detalle = input.items
    .map(i => `${i.rollos} kg ${i.color} (${i.material} ${i.marca})`)
    .join(', ')
    .slice(0, 250)

  const body = {
    items: [
      {
        id: input.pedidoId,
        title: `Filamentos DDD ARG — Pedido N° ${input.numero}`,
        description: detalle,
        quantity: 1,
        unit_price: Math.round(input.total),
        currency_id: 'ARS',
      },
    ],
    payer: {
      name: input.cliente_nombre.slice(0, 80),
      email: input.cliente_email ?? undefined,
      phone: input.cliente_telefono
        ? { number: input.cliente_telefono }
        : undefined,
    },
    external_reference: input.pedidoId,
    notification_url: `${SITE_URL}/api/mp/webhook`,
    back_urls: {
      success: `${SITE_URL}/cuenta?mp=success&pedido=${input.numero}`,
      pending: `${SITE_URL}/cuenta?mp=pending&pedido=${input.numero}`,
      failure: `${SITE_URL}/cuenta?mp=failure&pedido=${input.numero}`,
    },
    auto_return: 'approved' as const,
    payment_methods: {
      // Solo tarjeta + saldo MP + transferencia. Sin RapiPago/Pago Fácil/cajero.
      excluded_payment_types: [
        { id: 'ticket' },
        { id: 'atm' },
      ],
      installments: 12,
    },
    statement_descriptor: 'DDD ARG',
  }

  const res = await preference.create({ body })
  if (!res.id || !res.init_point) {
    throw new Error('MP no devolvió init_point')
  }
  return { id: res.id, init_point: res.init_point }
}

export interface PaymentInfo {
  id: string
  status: 'pending' | 'approved' | 'in_process' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back' | string
  external_reference?: string | null
  transaction_amount?: number | null
}

/** Consulta el detalle de un pago en MP (lo usa el webhook para confirmar). */
export async function obtenerPayment(paymentId: string): Promise<PaymentInfo | null> {
  const client = getClient()
  const payment = new Payment(client)
  try {
    const res = await payment.get({ id: paymentId })
    if (!res || !res.id) return null
    return {
      id: String(res.id),
      status: String(res.status ?? 'pending'),
      external_reference: res.external_reference ?? null,
      transaction_amount: res.transaction_amount ?? null,
    }
  } catch (err) {
    console.error('[mercadopago] obtenerPayment fallo:', err)
    return null
  }
}

/**
 * Verifica la firma del webhook (x-signature + x-request-id).
 * MP envía: `ts=1234567890,v1=abc...` en el header x-signature.
 * La firma se arma como HMAC-SHA256(secret, `id:<payment_id>;request-id:<req_id>;ts:<ts>;`).
 *
 * Doc: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks#firma-secreta
 */
export async function verificarFirmaWebhook(args: {
  signatureHeader: string | null
  requestId: string | null
  dataId: string | null
}): Promise<boolean> {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) {
    // Sin secret configurado, aceptamos (modo dev). En prod, configurar el secret.
    console.warn('[mercadopago] MP_WEBHOOK_SECRET no configurado — firma no verificada')
    return true
  }
  if (!args.signatureHeader || !args.requestId || !args.dataId) return false

  // Parseamos "ts=...,v1=..."
  const parts = args.signatureHeader.split(',').reduce<Record<string, string>>((acc, p) => {
    const [k, v] = p.split('=').map(s => s.trim())
    if (k && v) acc[k] = v
    return acc
  }, {})
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false

  const payload = `id:${args.dataId};request-id:${args.requestId};ts:${ts};`
  const { createHmac, timingSafeEqual } = await import('crypto')
  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1, 'hex'))
  } catch {
    return false
  }
}
