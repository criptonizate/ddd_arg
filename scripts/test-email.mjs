import { Resend } from 'resend'
import { readFileSync } from 'fs'

// Leer .env.local manualmente
const env = readFileSync('.env.local', 'utf-8')
const apiKey = env.match(/RESEND_API_KEY=(.+)/)?.[1]?.trim()

if (!apiKey) { console.error('No se encontró RESEND_API_KEY en .env.local'); process.exit(1) }

const resend = new Resend(apiKey)

const { data, error } = await resend.emails.send({
  from: 'DDD ARG <onboarding@resend.dev>',
  to: 'iarnaudojuanpablo@gmail.com',
  subject: '🛒 [TEST] Nuevo pedido #42 — María García',
  html: `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f0fdf4;padding:24px;border-radius:12px">
      <h2 style="color:#fcd34d;margin:0 0 4px">Nuevo pedido #42</h2>
      <p style="color:#86efac;margin:0 0 20px">De: <strong style="color:#f0fdf4">María García</strong> (maria@ejemplo.com)</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <thead><tr style="background:#1a1a1a">
          <th style="padding:8px 12px;text-align:left;color:#86efac;font-size:12px">Filamento</th>
          <th style="padding:8px 12px;text-align:center;color:#86efac;font-size:12px">Kg</th>
          <th style="padding:8px 12px;text-align:right;color:#86efac;font-size:12px">Subtotal</th>
        </tr></thead>
        <tbody>
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a">Bambu — Negro</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:center">3 kg</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:right">$36.000</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a">Bambu — Blanco</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:center">2 kg</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:right">$24.000</td>
          </tr>
        </tbody>
      </table>
      <div style="background:#1a1a1a;padding:12px 16px;border-radius:8px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="color:#86efac;font-size:13px">Descuento aplicado</span>
          <span style="color:#4ade80;font-weight:bold">−$2.000/kg</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid #2a2a2a">
          <span style="color:#f0fdf4;font-weight:bold">Total</span>
          <span style="color:#fcd34d;font-size:18px;font-weight:900">$60.000</span>
        </div>
      </div>
      <a href="https://ddd-arg.vercel.app/admin/filamentos" style="display:inline-block;background:#d97706;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
        Ver pedido en el panel →
      </a>
      <p style="color:#555;font-size:11px;margin-top:20px">Este es un email de prueba — no es un pedido real.</p>
    </div>
  `,
})

if (error) {
  console.error('❌ Error al enviar:', error)
} else {
  console.log('✅ Email enviado! ID:', data.id)
}
