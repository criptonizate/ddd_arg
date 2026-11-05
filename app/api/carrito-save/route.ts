// Endpoint puente para que el cliente pueda flushear el carrito con
// `navigator.sendBeacon` o `fetch(..., { keepalive: true })` cuando la tab se
// está cerrando o la red está inestable. Los server actions no soportan
// keepalive, así que esta ruta lo hace por ellos.
//
// La autenticación la hace Supabase vía cookies — createClient() lee la sesión.
import { NextResponse } from 'next/server'
import { saveCarritoUsuario } from '@/lib/actions/filamentos'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const MAX_PAYLOAD = 10_000      // 10 KB
const MAX_ITEMS   = 50          // nadie compra 50 filamentos distintos
const DEDUP_WINDOW_MS = 2_000   // ignorar escrituras idénticas dentro de 2 s
const SAVE_TIMEOUT_MS = 4_000   // si Supabase tarda >4 s, devolvemos 202

// De-dup en memoria: user_id → { hash, ts }. En Next serverless cada instancia
// tiene el suyo, eso está bien — queremos filtrar las N llamadas rápidas que
// manda `pagehide` + `visibilitychange` desde una misma tab, no las de otra
// instancia distinta del cliente.
const lastWrite = new Map<string, { hash: string; ts: number }>()

function hashString(s: string): string {
  // FNV-1a — chico y rápido, no cripto. Suficiente para de-dup oportunista.
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h.toString(16)
}

export async function POST(req: Request) {
  try {
    const raw = await req.text()
    if (raw.length > MAX_PAYLOAD) {
      return NextResponse.json({ ok: false, error: 'payload too large' }, { status: 413, headers: { 'Cache-Control': 'no-store' } })
    }
    let body: unknown
    try { body = JSON.parse(raw) } catch { return NextResponse.json({ ok: false }, { status: 400, headers: { 'Cache-Control': 'no-store' } }) }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }
    const items = (body as { items?: unknown }).items
    if (!Array.isArray(items) || items.length > MAX_ITEMS) {
      return NextResponse.json({ ok: false, error: 'bad items' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }
    const normalized = items
      .map(it => (typeof it === 'object' && it !== null ? it as Record<string, unknown> : null))
      .filter((it): it is Record<string, unknown> => !!it)
      .map(it => ({
        filamento_id: String(it.filamento_id ?? ''),
        rollos: Math.max(0, Math.min(999, Math.floor(Number(it.rollos ?? 0) || 0))),
      }))
      .filter(it => it.filamento_id && it.rollos > 0)

    // De-dup por user_id + hash del payload normalizado.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const hash = hashString(JSON.stringify(normalized))
      const prev = lastWrite.get(user.id)
      const now = Date.now()
      if (prev && prev.hash === hash && now - prev.ts < DEDUP_WINDOW_MS) {
        return NextResponse.json({ ok: true, dedup: true }, { headers: { 'Cache-Control': 'no-store' } })
      }
      lastWrite.set(user.id, { hash, ts: now })
      // GC simple: si el Map crece mucho, borramos las entradas viejas.
      if (lastWrite.size > 500) {
        for (const [uid, entry] of lastWrite) {
          if (now - entry.ts > 60_000) lastWrite.delete(uid)
        }
      }
    }

    // Timeout: si Supabase está lento, devolvemos 202 y dejamos la escritura
    // en vuelo (el cliente ya se cerró, no espera). Evita que la ruta cuelgue
    // en Next 16 bloqueando el worker.
    const timeout = new Promise<{ timeout: true }>(res =>
      setTimeout(() => res({ timeout: true }), SAVE_TIMEOUT_MS)
    )
    const result = await Promise.race([
      saveCarritoUsuario(normalized).then(() => ({ timeout: false })),
      timeout,
    ])
    if ('timeout' in result && result.timeout) {
      return NextResponse.json({ ok: true, deferred: true }, { status: 202, headers: { 'Cache-Control': 'no-store' } })
    }
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('carrito-save route:', err)
    return NextResponse.json({ ok: false }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
