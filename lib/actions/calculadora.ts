'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getAdminUser } from './auth'

export interface CalculadoraConfig {
  precio_filamento_kg: number
  precio_kwh: number
  consumo_w: number
  vida_util_horas: number
  costo_repuestos: number
  margen_error_pct: number
  updated_at: string
}

export async function getCalculadoraConfig(): Promise<CalculadoraConfig> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('calculadora_config')
    .select('*')
    .eq('id', 1)
    .single()

  if (error || !data) {
    return {
      precio_filamento_kg: 20000,
      precio_kwh: 140,
      consumo_w: 120,
      vida_util_horas: 4320,
      costo_repuestos: 150000,
      margen_error_pct: 15,
      updated_at: new Date().toISOString(),
    }
  }
  return data as CalculadoraConfig
}

export async function updateCalculadoraConfig(
  values: Omit<CalculadoraConfig, 'updated_at'>
): Promise<{ ok: boolean; error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('calculadora_config')
    .upsert({ id: 1, ...values, updated_at: new Date().toISOString() })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/calculadora')
  return { ok: true }
}
