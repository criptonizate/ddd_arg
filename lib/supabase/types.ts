// Tipos generados del esquema de Supabase

export type ProductEstado = 'activo' | 'pausado' | 'agotado' | 'archivado'
export type OrderEstado = 'pendiente' | 'confirmada' | 'listo' | 'entregada' | 'cancelada'
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
  cliente_telefono: string
  cliente_email: string | null
  entrega: 'retiro' | 'envio'
  direccion_envio: string | null
  nota: string | null
  total: number
  sena: number
  prioridad: boolean
  fecha_entrega: string | null
  origen: OrderOrigen
  estado: OrderEstado
  metodo_pago: MetodoPago
  mercadopago_payment_id: string | null
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  variant_id: string
  cantidad: number
  precio_unitario: number
  created_at: string
}

export interface OrderWithItems extends Order {
  order_items: (OrderItem & {
    products: Product
    product_variants: ProductVariant
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
    product_id: string
    variant_id: string
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
  totalVentas: number
  totalIngresos: number
  pedidosPorEstado: { estado: OrderEstado; count: number }[]
  ventasPorDia: { fecha: string; total: number; cantidad: number }[]
  topVariantes: {
    nombre_variante: string
    producto: string
    vendidos: number
    ingresos: number
  }[]
  stockBajo: (ProductVariant & { product_nombre: string })[]
}
