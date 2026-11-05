// Endpoint puente para que el cliente pueda flushear el carrito con
// `navigator.sendBeacon` o `fetch(..., { keepalive: true })` cuando la tab se
// está cerrando o la red está inestable. Los server actions no soportan
// keepalive, así que esta ruta lo hace por ellos.
//
// La autenticación la hace Supabase vía cookies — createClient() lee la sesión.
import { NextResponse } from 'next/server'
import { saveCarritoUsuario } from '@/lib/actions/filamentos'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as
      | { items?: { filamento_id: string; rollos: number }[] }
      | null
    if (!body || !Array.isArray(body.items)) {
      return NextResponse.json({ ok: false, error: 'bad payload' }, { status: 400 })
    }
    await saveCarritoUsuario(body.items)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('carrito-save route:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
