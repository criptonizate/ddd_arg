export const MATERIALES = ['PLA', 'PETG', 'TPU', 'ABS', 'ASA', 'Otro'] as const
export type Material = (typeof MATERIALES)[number]

export const TIPOS_FILAMENTO = ['Común', 'Silk', 'Matte', 'GLOW', 'Fluorescente', 'Madera', 'Mármol', 'Otro'] as const
export type TipoFilamento = (typeof TIPOS_FILAMENTO)[number]

export const MARCAS_SUGERIDAS = ['GST3D', 'GST3D - LITE', 'Fremover']

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
  nota: string
  fecha: string
  created_at: string
  // joined
  filamento_nombre?: string
  filamento_color?: string
  filamento_material?: string
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
