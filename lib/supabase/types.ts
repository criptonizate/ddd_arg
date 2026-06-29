// Tipos generados del esquema de Supabase

export type ProductEstado = 'activo' | 'pausado' | 'agotado' | 'archivado'
export type OrderEstado = 'pendiente' | 'confirmada' | 'imprimiendo' | 'listo' | 'entregada' | 'cancelada' | 'local'
export type OrderOrigen = 'web' | 'manual'
export type MetodoPago = 'whatsapp' | 'mercadopago' | 'efectivo' | 'transferencia'
export type TransactionTipo = 'ingreso' | 'egreso'
export type EgresoCategoria =
  | 'filamento_insumos'
  | 'electricidad'
  | 'repuestos_impresora'
  | 'envios'
  | 'comisiones'
  | 'otros'

export interface Product {
  id: string
  nombre: string
  descripcion: string | null
  precio_base: number
  categoria: string | null
  estado: ProductEstado
  created_at: string
}

export interface ProductVariant {
  id: string
  product_id: string
  nombre_variante: string
  color: string | null
  tamaño: string | null
  precio: number | null
  stock: number
  stock_minimo: number
  created_at: string
}

export interface ProductImage {
  id: string
  product_id: string
  url: string
  orden: number
  created_at: string
}

export interface ProductWithVariants extends Product {
  product_variants: ProductVariant[]
  product_images: ProductImage[]
}

export interface Order {
  id: string
  cliente_nombre: string
  cliente_telefono: string | null
  cliente_email: string | null
  cliente_id: string | null
  entrega: 'retiro' | 'envio'
  direccion_envio: string | null
  nota: string | null
  nota_interna: string | null
  total: number
  sena: number | null
  prioridad: boolean
  fecha_entrega: string | null
  origen: OrderOrigen
  estado: OrderEstado
  metodo_pago: MetodoPago | null
  mercadopago_payment_id: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  variant_id: string | null
  nombre_producto: string
  nombre_variante: string | null
  cantidad: number
  precio_unitario: number
  impreso: boolean
  created_at: string
}

export interface OrderWithItems extends Order {
  order_items: (OrderItem & {
    products: Product | null
    product_variants: ProductVariant | null
  })[]
}

export interface Transaction {
  id: string
  tipo: TransactionTipo
  categoria: string
  monto: number
  descripcion: string | null
  fecha: string
  order_id: string | null
  created_at: string
}

// DTOs para formularios
export interface ProductFormData {
  nombre: string
  descripcion: string
  precio_base: number
  categoria: string
  estado: ProductEstado
}

export interface VariantFormData {
  nombre_variante: string
  color: string
  tamaño: string
  precio: number | null
  stock: number
  stock_minimo: number
}

export interface ManualSaleFormData {
  cliente_nombre: string
  cliente_telefono: string
  entrega: 'retiro' | 'envio'
  direccion_envio: string
  nota: string
  metodo_pago: MetodoPago
  items: {
    product_id: string | null
    variant_id: string | null
    cantidad: number
    precio_unitario: number
  }[]
}

export interface EgresoFormData {
  categoria: EgresoCategoria
  monto: number
  descripcion: string
  fecha: string
}

// Stats para el dashboard
export interface DashboardStats {
  ventasMes: number
  ingresosMes: number
  egresosMes: number
  balanceMes: number
  ventasPorDia: { fecha: string; total: number; cantidad: number }[]
  stockBajo: (ProductVariant & { product_nombre: string })[]
  cobroPendiente: number
  pedidosPendientes: number
  ventasHoy: number
  montoHoy: number
  clientesNuevosMes: number
}
