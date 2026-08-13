'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getAdminUser } from './auth'

export interface HistorialEntry {
  id: string
  nombre_pieza: string
  horas: number
  minutos: number
  gramos: number
  insumos: number
  multiplicador: number
  resultado_total: number
  resultado_ml: number
  created_at: string
}

export async function saveCalculoHistorial(entry: Omit<HistorialEntry, 'id' | 'created_at'>): Promise<{ ok: boolean; error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('calculadora_historial').insert(entry)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/calculadora')
  return { ok: true }
}

export async function getCalculoHistorial(): Promise<HistorialEntry[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('calculadora_historial')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as HistorialEntry[]
}

export async function deleteCalculoHistorial(id: string): Promise<{ ok: boolean }> {
  await getAdminUser()
  const supabase = createServiceClient()
  await supabase.from('calculadora_historial').delete().eq('id', id)
  revalidatePath('/admin/calculadora')
  return { ok: true }
}

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

export interface LogPublicoEntry {
  id: string
  created_at: string
  gramos: number
  horas: number
  costo_base: number
  precio_x3: number
  precio_x4: number
}

export async function logCalculadoraPublica(entry: {
  gramos: number
  horas: number
  costo_base: number
  precio_x3: number
  precio_x4: number
}): Promise<void> {
  const supabase = createServiceClient()
  await supabase.from('calculadora_publica_log').insert(entry)
}

export async function getLogCalculadoraPublica(): Promise<LogPublicoEntry[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('calculadora_publica_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  return (data ?? []) as LogPublicoEntry[]
}
