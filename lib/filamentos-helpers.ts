export const MATERIALES = ['PLA', 'PETG', 'TPU', 'ABS', 'ASA', 'Otro'] as const
export type Material = (typeof MATERIALES)[number]

export interface Filamento {
  id: string
  nombre: string
  material: Material
  color: string
  rollos_cerrados: number
  gramos_sueltos: number
  peso_rollo_gr: number
  nota: string
  created_at: string
  updated_at: string
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
