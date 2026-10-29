import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMembresiaCliente } from '@/lib/actions/filamento-pedidos'
import { sendMembresiaPorVencerCliente } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Dispara recordatorios de vencimiento a usuarios con membresía activa
// cuyo período vence en 7 o 2 días. Dedup vía membresia_recordatorios.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Usuarios con al menos un pedido confirmado (fuente para armar la membresía)
  const { data: usuarios } = await supabase
    .from('filamento_pedidos')
    .select('user_id')
    .eq('estado', 'confirmado')
    .not('user_id', 'is', null)

  const uniqueUserIds = Array.from(new Set((usuarios ?? []).map(u => u.user_id as string)))

  let sent = 0
  let skipped = 0
  let errors = 0

  for (const userId of uniqueUserIds) {
    try {
      const membresia = await getMembresiaCliente(userId)
      if (!membresia?.nivel) { skipped++; continue }

      const dias = membresia.diasRestantes
      // Enviar aviso solo en los umbrales 7d (6-7) y 2d (1-2)
      const tipo = (dias === 7 || dias === 6) ? '7d'
        : (dias === 2 || dias === 1) ? '2d'
        : null
      if (!tipo) { skipped++; continue }

      const periodoFinDate = membresia.periodoFin.slice(0, 10) // YYYY-MM-DD

      // Dedup: ya se envió este tipo para este período?
      const { data: existente } = await supabase
        .from('membresia_recordatorios')
        .select('user_id')
        .eq('user_id', userId)
        .eq('periodo_fin', periodoFinDate)
        .eq('tipo', tipo)
        .maybeSingle()
      if (existente) { skipped++; continue }

      // Obtener email + nombre
      const { data: authUser } = await supabase.auth.admin.getUserById(userId)
      const clienteEmail = authUser?.user?.email
      if (!clienteEmail) { skipped++; continue }
      const clienteNombre = authUser.user?.user_metadata?.full_name
        ?? authUser.user?.email?.split('@')[0]
        ?? 'Cliente'

      await sendMembresiaPorVencerCliente({
        clienteEmail,
        clienteNombre,
        nivel: membresia.nivel,
        diasRestantes: dias,
        periodoFin: membresia.periodoFin,
      })

      // Marcar como enviado
      await supabase.from('membresia_recordatorios').insert({
        user_id: userId,
        periodo_fin: periodoFinDate,
        tipo,
      })

      sent++
    } catch (err) {
      console.error(`[cron vencimientos] user ${userId}:`, err)
      errors++
    }
  }

  return NextResponse.json({ sent, skipped, errors, procesados: uniqueUserIds.length })
}
