// Endpoint puente para que el cliente pueda flushear el carrito con
// `navigator.sendBeacon` o `fetch(..., { keepalive: true })` cuando la tab se
// está cerrando o la red está inestable. Los server actions no soportan
// keepalive, así que esta ruta lo hace por ellos.
//
// La autenticación la hace Supabase vía cookies — createClient() lee la sesión.
import { NextResponse } from 'next/server'
import { saveCarritoUsuario } from '@/lib/actions/filamentos'

export const runtime = 'nodejs'

const MAX_PAYLOAD = 10_000      // 10 KB
const MAX_ITEMS   = 50          // nadie compra 50 filamentos distintos

export async function POST(req: Request) {
  try {
    const raw = await req.text()
    if (raw.length > MAX_PAYLOAD) {
      return NextResponse.json({ ok: false, error: 'payload too large' }, { status: 413 })
    }
    let body: unknown
    try { body = JSON.parse(raw) } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    const items = (body as { items?: unknown }).items
    if (!Array.isArray(items) || items.length > MAX_ITEMS) {
      return NextResponse.json({ ok: false, error: 'bad items' }, { status: 400 })
    }
    // Normalizamos defensivamente: solo filamento_id (string) y rollos (number entero positivo).
    const normalized = items
      .map(it => (typeof it === 'object' && it !== null ? it as Record<string, unknown> : null))
      .filter((it): it is Record<string, unknown> => !!it)
      .map(it => ({
        filamento_id: String(it.filamento_id ?? ''),
        rollos: Math.max(0, Math.min(999, Math.floor(Number(it.rollos ?? 0) || 0))),
      }))
      .filter(it => it.filamento_id && it.rollos > 0)

    await saveCarritoUsuario(normalized)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('carrito-save route:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
