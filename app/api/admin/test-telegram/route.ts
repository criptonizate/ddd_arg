// Endpoint temporal: manda un ping a Telegram para verificar que el bot
// está bien configurado en Vercel. Solo accesible por admin.
//
// Uso: abrir en el navegador estando logueado como admin:
//   https://ddd-arg.vercel.app/api/admin/test-telegram
//
// Borrar este archivo cuando terminemos de probar.
import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/actions/auth'
import { notifyAdmin } from '@/lib/telegram'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getAdminUser()
    const result = await notifyAdmin({
      emoji: '🧪',
      titulo: 'Ping de prueba',
      detalle: [
        'Si ves este mensaje, las notificaciones están OK.',
        '',
        `Disparado por: ${user.email ?? user.id}`,
        `Hora: ${new Date().toLocaleString('es-AR')}`,
      ].join('\n'),
    })

    return NextResponse.json({
      sent: result.ok,
      skipped: result.skipped ?? false,
      env: {
        bot_token_present: !!process.env.TELEGRAM_BOT_TOKEN,
        chat_id_present:   !!process.env.TELEGRAM_CHAT_ID,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unauthorized' },
      { status: 401 },
    )
  }
}
