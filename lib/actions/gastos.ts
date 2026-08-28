'use server'

import { createServiceClient } from '@/lib/supabase/server'

export interface GastoEntry {
  id: string
  concept: string
  type: 'gasto' | 'ingreso'
  category: 'fijo' | 'variable'
  amount: number
  date: string
  status: 'pagado' | 'pendiente'
  due: string | null
}

export async function getGastos(): Promise<GastoEntry[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('gastos_personales')
    .select('id, concept, type, category, amount, date, status, due')
    .order('date', { ascending: true })
  return (data ?? []) as GastoEntry[]
}

export async function upsertGasto(entry: GastoEntry): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from('gastos_personales')
    .upsert({ ...entry, updated_at: new Date().toISOString() }, { onConflict: 'id' })
}

export async function upsertGastos(entries: GastoEntry[]): Promise<void> {
  if (!entries.length) return
  const supabase = createServiceClient()
  const now = new Date().toISOString()
  // Supabase upsert en lotes de 200 para no exceder límites
  const BATCH = 200
  for (let i = 0; i < entries.length; i += BATCH) {
    await supabase
      .from('gastos_personales')
      .upsert(
        entries.slice(i, i + BATCH).map(e => ({ ...e, updated_at: now })),
        { onConflict: 'id' }
      )
  }
}

export async function deleteGasto(id: string): Promise<void> {
  const supabase = createServiceClient()
  await supabase.from('gastos_personales').delete().eq('id', id)
}
