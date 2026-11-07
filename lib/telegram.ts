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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

async function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
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

  const titulo = escapeHtml(payload.titulo)
  const detalle = escapeHtml(payload.detalle)
  const emoji = payload.emoji ?? ''

  const text = `${emoji} <b>${titulo}</b>\n\n${detalle}`

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  }
  if (payload.url) {
    body.reply_markup = {
      inline_keyboard: [[{ text: '👁️ Abrir', url: payload.url }]],
    }
  }

  // Reintento con backoff si Telegram devuelve 429 (rate limit) o 5xx.
  const MAX_ATTEMPTS = 3
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 5000)
      const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      })
      clearTimeout(t)
      if (res.ok) return { ok: true }

      const retryable = res.status === 429 || res.status >= 500
      const errText = await res.text().catch(() => '')
      console.error(`[telegram] sendMessage non-OK (intento ${attempt}/${MAX_ATTEMPTS}):`, res.status, errText)

      if (!retryable || attempt === MAX_ATTEMPTS) return { ok: false }

      // Respeto `retry_after` si Telegram lo manda; sino backoff exponencial.
      let waitMs = 500 * Math.pow(2, attempt - 1)
      try {
        const parsed = JSON.parse(errText) as { parameters?: { retry_after?: number } }
        if (parsed?.parameters?.retry_after) waitMs = parsed.parameters.retry_after * 1000
      } catch { /* body no es JSON — usamos backoff */ }
      await sleep(Math.min(waitMs, 5000))
    } catch (err) {
      console.error(`[telegram] fetch failed (intento ${attempt}/${MAX_ATTEMPTS}):`, err)
      if (attempt === MAX_ATTEMPTS) return { ok: false }
      await sleep(500 * Math.pow(2, attempt - 1))
    }
  }
  return { ok: false }
}

/**
 * Helper para formatear ARS sin depender de Intl del lado donde se llame.
 */
export function fmtARS(n: number): string {
  return `$${n.toLocaleString('es-AR')}`
}
