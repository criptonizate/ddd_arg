import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const ADMIN_EMAIL = 'iarnaudojuanpablo@gmail.com'
const FROM = process.env.RESEND_FROM_EMAIL || 'DDD ARG <onboarding@resend.dev>'
const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '543804559909'

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

        <a href="https://wa.me/${WA_NUMBER}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
          Hablar por WhatsApp →
        </a>
      </div>
    `,
  })
  if (error) console.error('[email] sendPedidoConfirmadoCliente error:', error)
}

export async function sendCarritoAbandonado({
  to,
  nombre,
  items,
  siteUrl,
}: {
  to: string
  nombre: string
  items: { nombre: string; kg: number; precioUnitario: number }[]
  siteUrl: string
}): Promise<void> {
  const totalKg = items.reduce((s, i) => s + i.kg, 0)
  const itemsHtml = items.map(i => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;color:#f0fdf4">${i.nombre}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:center;color:#86efac">${i.kg} kg</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:right;color:#fcd34d">${fmtARS(i.precioUnitario * i.kg)}</td>
    </tr>
  `).join('')

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `🧵 ${nombre !== 'amigo' ? `${nombre}, ¡t` : '¡T'}u carrito te está esperando — DDD ARG`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f0fdf4;padding:0;border-radius:12px;overflow:hidden">

        <div style="background:#111;padding:20px 24px;border-bottom:1px solid #1a1a1a">
          <span style="color:#f97316;font-weight:900;font-size:18px;letter-spacing:-0.5px">DDD ARG</span>
          <span style="color:#6b7280;font-size:13px;margin-left:8px">Filamentos para impresión 3D</span>
        </div>

        <div style="padding:28px 24px">
          <h2 style="color:#f0fdf4;margin:0 0 8px;font-size:22px">Hola ${nombre} 👋</h2>
          <p style="color:#9ca3af;margin:0 0 24px;font-size:15px;line-height:1.6">
            Te escribimos porque dejaste algunos filamentos en tu carrito y todavía no finalizaste la compra.
            Acá tenés un resumen de lo que elegiste:
          </p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;background:#111;border-radius:8px;overflow:hidden">
            <thead>
              <tr style="background:#1a1a1a">
                <th style="padding:10px 12px;text-align:left;color:#9ca3af;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Filamento</th>
                <th style="padding:10px 12px;text-align:center;color:#9ca3af;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Cantidad</th>
                <th style="padding:10px 12px;text-align:right;color:#9ca3af;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Precio</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr style="background:#1a1a1a">
                <td style="padding:10px 12px;font-weight:bold;color:#f0fdf4" colspan="1">Total</td>
                <td style="padding:10px 12px;text-align:center;color:#86efac;font-weight:bold">${totalKg} kg</td>
                <td style="padding:10px 12px;text-align:right;color:#fcd34d;font-weight:900;font-size:16px">${fmtARS(items.reduce((s, i) => s + i.precioUnitario * i.kg, 0))}</td>
              </tr>
            </tbody>
          </table>

          <div style="background:#1a0e00;border:1px solid #92400e;border-radius:8px;padding:14px 16px;margin-bottom:24px">
            <p style="color:#fcd34d;margin:0;font-size:14px;line-height:1.5">
              🚨 <strong style="color:#f0fdf4">Stock limitado</strong> — algunos de estos filamentos tienen pocas unidades disponibles y pueden agotarse antes de que vuelvan a reponer. No te quedés sin el tuyo.
            </p>
          </div>

          <a href="${siteUrl}/filamentos" style="display:inline-block;background:#f97316;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;letter-spacing:-0.2px">
            Completar mi compra →
          </a>

          <p style="color:#6b7280;margin:24px 0 0;font-size:13px;line-height:1.6">
            Si ya no te interesa, no te preocupes — podés ignorar este mail 😊<br>
            No te vamos a volver a escribir por este carrito.
          </p>
        </div>

        <div style="background:#111;padding:16px 24px;border-top:1px solid #1a1a1a">
          <p style="color:#6b7280;margin:0;font-size:12px">
            El equipo de <strong style="color:#f97316">DDD ARG</strong> · Capital, La Rioja, Argentina<br>
            <a href="${siteUrl}/privacidad" style="color:#6b7280">Política de privacidad</a>
          </p>
        </div>
      </div>
    `,
  })
  if (error) console.error('[email] sendCarritoAbandonado error:', error)
}

export async function sendColorDisponibleCliente(data: {
  clienteEmail: string
  clienteNombre: string
  color: string
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ddd-arg.vercel.app'
  const { error } = await resend.emails.send({
    from: FROM,
    to: data.clienteEmail,
    subject: `🎨 Ya tenemos "${data.color}" en stock — DDD ARG`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f0fdf4;padding:24px;border-radius:12px">
        <h2 style="color:#c084fc;margin:0 0 4px">✨ ¡Ya hay stock del color que pediste!</h2>
        <p style="color:#86efac;margin:0 0 20px">Hola <strong style="color:#f0fdf4">${data.clienteNombre}</strong>, repusimos el color que nos pediste:</p>

        <div style="background:#1a0f2e;border:1px solid #7c3aed;border-radius:8px;padding:16px 20px;margin-bottom:20px;text-align:center">
          <p style="color:#c084fc;font-size:14px;margin:0 0 6px">Color disponible:</p>
          <p style="color:#f0fdf4;font-weight:900;font-size:22px;margin:0">${data.color}</p>
        </div>

        <a href="${siteUrl}/filamentos" style="display:inline-block;background:#7c3aed;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-bottom:12px">
          Ver en la tienda y hacer tu pedido →
        </a>
        <p style="color:#86efac;font-size:12px;margin:16px 0 0">Si otro cliente lo pide también, puede agotarse rápido — te avisamos primero por ser el que lo encargó.</p>
      </div>
    `,
  })
  if (error) console.error('[email] sendColorDisponibleCliente error:', error)
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

export async function sendExtensionSolicitadaAdmin(data: {
  userId: string
  clienteNombre: string
  clienteEmail: string
  nivel: string
  costo: number
  dias: number
  numeroCliente?: number | null
}) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `⚡ Solicitud de extensión de membresía — ${data.clienteNombre}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f0fdf4;padding:24px;border-radius:12px">
        <h2 style="color:#fcd34d;margin:0 0 4px">⚡ Nueva solicitud de extensión</h2>
        <p style="color:#86efac;margin:0 0 20px">Un cliente solicitó extender su membresía y dice que ya realizó el pago.</p>

        <div style="background:#1a1500;border:1px solid #d97706;border-radius:8px;padding:16px;margin-bottom:20px">
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:6px 0;color:#86efac;font-size:13px;width:140px">Nombre</td>
              <td style="padding:6px 0;color:#f0fdf4;font-weight:bold">${data.clienteNombre}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#86efac;font-size:13px">Email</td>
              <td style="padding:6px 0;color:#f0fdf4">${data.clienteEmail}</td>
            </tr>
            ${data.numeroCliente ? `
            <tr>
              <td style="padding:6px 0;color:#86efac;font-size:13px">N° cliente</td>
              <td style="padding:6px 0;color:#fcd34d;font-weight:bold">N° ${data.numeroCliente}</td>
            </tr>` : ''}
            <tr>
              <td style="padding:6px 0;color:#86efac;font-size:13px">User ID</td>
              <td style="padding:6px 0;color:#9ca3af;font-size:12px;word-break:break-all">${data.userId}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#86efac;font-size:13px">Membresía actual</td>
              <td style="padding:6px 0;color:#f0fdf4;font-weight:bold">${data.nivel}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#86efac;font-size:13px">Extensión</td>
              <td style="padding:6px 0;color:#f0fdf4">${data.dias} días</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#86efac;font-size:13px">Monto a recibir</td>
              <td style="padding:6px 0;color:#fcd34d;font-weight:900;font-size:16px">$${data.costo.toLocaleString('es-AR')}</td>
            </tr>
          </table>
        </div>

        <div style="background:#0a1a0a;border:1px solid #166534;border-radius:8px;padding:14px 16px;margin-bottom:20px">
          <p style="color:#86efac;margin:0;font-size:14px">
            📲 El cliente te va a enviar el comprobante por WhatsApp al <strong style="color:#f0fdf4">+${WA_NUMBER}</strong>.
            Una vez que confirmes el pago, aprobá la extensión desde el panel de admin.
          </p>
        </div>

        <a href="https://ddd-arg.vercel.app/admin/cuentas" style="display:inline-block;background:#d97706;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
          Ver panel de Cuentas →
        </a>
      </div>
    `,
  })
  if (error) console.error('[email] sendExtensionSolicitadaAdmin error:', error)
}
