// Cliente de Telegram para notificaciones al admin.
//
// Requiere 2 env vars:
//   TELEGRAM_BOT_TOKEN   — token que da @BotFather
//   TELEGRAM_CHAT_ID     — tu chat_id personal (lo da @userinfobot)
//
// Si alguna de las dos falta, las funciones no-opean (log de warning y listo).
// El token puede incluir el ":" tal cual sale de BotFather.
//
// Uso:
//   import { notifyAdmin } from '@/lib/telegram'
//   void notifyAdmin({ emoji: '📦', titulo: 'Pedido nuevo', detalle: '...' })

const TELEGRAM_API = 'https://api.telegram.org'

function escapeMarkdownV2(text: string): string {
  // Lista oficial de caracteres a escapar en MarkdownV2.
  // Ver: https://core.telegram.org/bots/api#markdownv2-style
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (c) => `\\${c}`)
}

export interface NotifyPayload {
  /** Emoji al principio para que en el feed se identifique rápido. */
  emoji?: string
  /** Título corto en negrita. */
  titulo: string
  /** Cuerpo libre — texto plano (lo escapamos para MarkdownV2). */
  detalle: string
  /** Si lo pasás, lo renderizamos como botón "Ver" abajo del mensaje. */
  url?: string
  /** Opcional: chat_id distinto al default (grupos, canales, etc). */
  chatId?: string
  /** Si es true, loguea el envío sin bloquear. Default true. */
  silent?: boolean
}

/**
 * Envía un mensaje al admin. Nunca throwea: errores se loguean.
 */
export async function notifyAdmin(payload: NotifyPayload): Promise<{ ok: boolean; skipped?: boolean }> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = payload.chatId ?? process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID no seteadas — notificación salteada:', payload.titulo)
    return { ok: false, skipped: true }
  }

  const titulo = escapeMarkdownV2(payload.titulo)
  const detalle = escapeMarkdownV2(payload.detalle)
  const emoji = payload.emoji ?? ''

  const text = `${emoji} *${titulo}*\n\n${detalle}`

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
  }
  if (payload.url) {
    body.reply_markup = {
      inline_keyboard: [[{ text: '👁️ Abrir', url: payload.url }]],
    }
  }

  try {
    // Timeout 5s para que el server action no se trabe si Telegram está lento.
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    clearTimeout(t)
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[telegram] sendMessage non-OK:', res.status, errText)
      return { ok: false }
    }
    return { ok: true }
  } catch (err) {
    console.error('[telegram] fetch failed:', err)
    return { ok: false }
  }
}

/**
 * Helper para formatear ARS sin depender de Intl del lado donde se llame.
 */
export function fmtARS(n: number): string {
  return `$${n.toLocaleString('es-AR')}`
}
