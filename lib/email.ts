import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const ADMIN_EMAIL = 'iarnaudojuanpablo@gmail.com'
const FROM = 'DDD ARG <onboarding@resend.dev>'

export interface PedidoEmailData {
  numero: number
  clienteNombre: string
  clienteEmail?: string
  items: { color: string; marca: string; rollos: number; precio_unitario: number }[]
  totalRollos: number
  descuentoPorRollo: number
  total: number
}

function fmtARS(n: number) {
  return `$${n.toLocaleString('es-AR')}`
}

function pedidoItemsHtml(items: PedidoEmailData['items'], descuento: number) {
  return items.map(i => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a">${i.marca} — ${i.color}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:center">${i.rollos} kg</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:right">${fmtARS((i.precio_unitario - descuento) * i.rollos)}</td>
    </tr>
  `).join('')
}

export async function sendNuevoPedidoAdmin(data: PedidoEmailData) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `🛒 Nuevo pedido #${data.numero} — ${data.clienteNombre}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f0fdf4;padding:24px;border-radius:12px">
        <h2 style="color:#fcd34d;margin:0 0 4px">Nuevo pedido #${data.numero}</h2>
        <p style="color:#86efac;margin:0 0 20px">De: <strong style="color:#f0fdf4">${data.clienteNombre}</strong>${data.clienteEmail ? ` (${data.clienteEmail})` : ''}</p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <thead>
            <tr style="background:#1a1a1a">
              <th style="padding:8px 12px;text-align:left;color:#86efac;font-size:12px">Filamento</th>
              <th style="padding:8px 12px;text-align:center;color:#86efac;font-size:12px">Kg</th>
              <th style="padding:8px 12px;text-align:right;color:#86efac;font-size:12px">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${pedidoItemsHtml(data.items, data.descuentoPorRollo)}
          </tbody>
        </table>

        <div style="background:#1a1a1a;padding:12px 16px;border-radius:8px;margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="color:#86efac;font-size:13px">Total rollos</span>
            <span style="color:#f0fdf4;font-weight:bold">${data.totalRollos} kg</span>
          </div>
          ${data.descuentoPorRollo > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="color:#86efac;font-size:13px">Descuento aplicado</span>
            <span style="color:#4ade80;font-weight:bold">−${fmtARS(data.descuentoPorRollo)}/kg</span>
          </div>
          ` : ''}
          <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid #2a2a2a">
            <span style="color:#f0fdf4;font-weight:bold">Total</span>
            <span style="color:#fcd34d;font-size:18px;font-weight:900">${fmtARS(data.total)}</span>
          </div>
        </div>

        <a href="https://ddd-arg.vercel.app/admin/filamentos" style="display:inline-block;background:#d97706;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
          Ver pedido en el panel →
        </a>
      </div>
    `,
  })
  if (error) console.error('[email] sendNuevoPedidoAdmin error:', error)
}

export async function sendPedidoRecibidoCliente(data: PedidoEmailData & { clienteEmail: string }) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: data.clienteEmail,
    subject: `✅ Pedido #${data.numero} recibido — DDD ARG`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f0fdf4;padding:24px;border-radius:12px">
        <h2 style="color:#4ade80;margin:0 0 4px">¡Pedido recibido! 🎉</h2>
        <p style="color:#86efac;margin:0 0 20px">Hola <strong style="color:#f0fdf4">${data.clienteNombre}</strong>, tu pedido <strong style="color:#fcd34d">#${data.numero}</strong> fue registrado correctamente.</p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <thead>
            <tr style="background:#1a1a1a">
              <th style="padding:8px 12px;text-align:left;color:#86efac;font-size:12px">Filamento</th>
              <th style="padding:8px 12px;text-align:center;color:#86efac;font-size:12px">Kg</th>
              <th style="padding:8px 12px;text-align:right;color:#86efac;font-size:12px">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${pedidoItemsHtml(data.items, data.descuentoPorRollo)}
          </tbody>
        </table>

        <div style="background:#1a1a1a;padding:12px 16px;border-radius:8px;margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;padding-top:4px">
            <span style="color:#f0fdf4;font-weight:bold">Total</span>
            <span style="color:#fcd34d;font-size:18px;font-weight:900">${fmtARS(data.total)}</span>
          </div>
        </div>

        <div style="background:#0f2618;border:1px solid #166534;border-radius:8px;padding:12px 16px;margin-bottom:20px">
          <p style="color:#86efac;margin:0;font-size:13px">⏳ <strong style="color:#f0fdf4">Estado: pendiente de aprobación</strong><br>
          Te avisamos por este mail cuando confirmemos el pedido.</p>
        </div>

        <a href="https://ddd-arg.vercel.app/cuenta?tab=pedidos" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
          Ver mis pedidos →
        </a>
      </div>
    `,
  })
  if (error) console.error('[email] sendPedidoRecibidoCliente error:', error)
}

export async function sendPedidoConfirmadoCliente(data: PedidoEmailData & { clienteEmail: string }) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: data.clienteEmail,
    subject: `🚀 Pedido #${data.numero} confirmado — DDD ARG`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f0fdf4;padding:24px;border-radius:12px">
        <h2 style="color:#4ade80;margin:0 0 4px">¡Pedido confirmado! 🚀</h2>
        <p style="color:#86efac;margin:0 0 20px">Hola <strong style="color:#f0fdf4">${data.clienteNombre}</strong>, tu pedido <strong style="color:#fcd34d">#${data.numero}</strong> fue confirmado y el stock está reservado para vos.</p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <thead>
            <tr style="background:#1a1a1a">
              <th style="padding:8px 12px;text-align:left;color:#86efac;font-size:12px">Filamento</th>
              <th style="padding:8px 12px;text-align:center;color:#86efac;font-size:12px">Kg</th>
              <th style="padding:8px 12px;text-align:right;color:#86efac;font-size:12px">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${pedidoItemsHtml(data.items, data.descuentoPorRollo)}
          </tbody>
        </table>

        <div style="background:#1a1a1a;padding:12px 16px;border-radius:8px;margin-bottom:20px">
          <div style="display:flex;justify-content:space-between">
            <span style="color:#f0fdf4;font-weight:bold">Total</span>
            <span style="color:#fcd34d;font-size:18px;font-weight:900">${fmtARS(data.total)}</span>
          </div>
        </div>

        <div style="background:#0e1e35;border:1px solid #1e40af;border-radius:8px;padding:12px 16px;margin-bottom:20px">
          <p style="color:#93c5fd;margin:0;font-size:13px">📦 <strong style="color:#f0fdf4">Próximos pasos</strong><br>
          Coordinamos la entrega por WhatsApp. ¡Gracias por elegirnos!</p>
        </div>

        <a href="https://wa.me/543804559909" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
          Hablar por WhatsApp →
        </a>
      </div>
    `,
  })
  if (error) console.error('[email] sendPedidoConfirmadoCliente error:', error)
}

export async function sendMembresiaPorVencerCliente(data: {
  clienteEmail: string
  clienteNombre: string
  nivel: string
  diasRestantes: number
  periodoFin: string
}) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: data.clienteEmail,
    subject: `⚠️ Tu membresía ${data.nivel} vence en ${data.diasRestantes} días — DDD ARG`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f0fdf4;padding:24px;border-radius:12px">
        <h2 style="color:#fcd34d;margin:0 0 4px">⚠️ Tu membresía está por vencer</h2>
        <p style="color:#86efac;margin:0 0 20px">Hola <strong style="color:#f0fdf4">${data.clienteNombre}</strong>, tu membresía <strong style="color:#fcd34d">${data.nivel}</strong> vence en <strong style="color:#f0fdf4">${data.diasRestantes} días</strong> (${new Date(data.periodoFin).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}).</p>

        <div style="background:#1a1500;border:1px solid #d97706;border-radius:8px;padding:16px;margin-bottom:20px">
          <p style="color:#fcd34d;font-weight:bold;margin:0 0 8px">¿Cómo renovar automáticamente?</p>
          <p style="color:#86efac;margin:0;font-size:13px">Comprá <strong style="color:#f0fdf4">5 kg o más</strong> antes de que venza y tu membresía se renueva sola por 30 días más.</p>
        </div>

        <a href="https://ddd-arg.vercel.app/filamentos" style="display:inline-block;background:#d97706;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-bottom:12px">
          Ver filamentos y hacer un pedido →
        </a>
        <br>
        <a href="https://ddd-arg.vercel.app/cuenta?tab=membresia" style="display:inline-block;color:#86efac;font-size:13px;margin-top:8px">
          Ver estado de membresía →
        </a>
      </div>
    `,
  })
  if (error) console.error('[email] sendMembresiaPorVencerCliente error:', error)
}
