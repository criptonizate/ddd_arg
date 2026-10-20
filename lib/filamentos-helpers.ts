export const MATERIALES = ['PLA', 'PETG', 'TPU', 'ABS', 'ASA', 'Otro'] as const
export type Material = (typeof MATERIALES)[number]

export const TIPOS_FILAMENTO = ['Común', 'Silk', 'Matte', 'GLOW', 'Fluorescente', 'Madera', 'Mármol', 'Otro'] as const
export type TipoFilamento = (typeof TIPOS_FILAMENTO)[number]

export const MARCAS_SUGERIDAS = ['GST3D', 'GST3D - LITE', 'Fremover', 'Filanova', 'Toolbox']

// Escala de precios por volumen mensual (kg acumulados en el mes, incluyendo esta venta)
export const PRECIO_TIERS = [
  { min: 15, precio: 18000 },
  { min: 10, precio: 19000 },
  { min: 5,  precio: 20000 },
  { min: 0,  precio: 22000 },
] as const

export function tierPrecio(totalKgMes: number): number {
  return PRECIO_TIERS.find(t => totalKgMes >= t.min)?.precio ?? 22000
}

export interface Filamento {
  id: string
  nombre: string
  marca: string
  tipo: string
  material: Material
  color: string
  rollos_cerrados: number
  gramos_sueltos: number
  peso_rollo_gr: number
  costo_kg: number
  nota: string
  imagen_url?: string | null
  imagen_url_2?: string | null
  imagen_url_3?: string | null
  created_at: string
  updated_at: string
}

export interface VentaFilamento {
  id: string
  filamento_id: string
  gramos: number
  precio_kg: number
  costo_kg: number
  cliente: string
  cliente_id?: string | null
  nota: string
  fecha: string
  created_at: string
  // joined
  filamento_nombre?: string
  filamento_color?: string
  filamento_material?: string
  filamento_marca?: string
}

export interface FilamentoMovimiento {
  id: string
  filamento_id: string
  rollos: number
  gramos: number
  fecha: string
  nota: string
  created_at: string
}
