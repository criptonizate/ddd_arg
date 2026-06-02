import { z } from 'zod'

// Items de la tienda online: product_id y variant_id siempre requeridos como UUID
const StoreOrderItemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid(),
  cantidad: z.number().int().min(1, 'La cantidad mínima es 1'),
  precio_unitario: z.number().min(0),
})

// Items de venta manual: soporta ítems libres sin product_id/variant_id
const AdminOrderItemSchema = z.object({
  product_id: z.string().optional().default(''),
  variant_id: z.string().optional().default(''),
  cantidad: z.number().int().min(1, 'La cantidad mínima es 1'),
  precio_unitario: z.number().min(0),
  nombre_producto: z.string().optional().default(''),
  nombre_variante: z.string().optional().default(''),
})

export const ManualSaleSchema = z.object({
  cliente_nombre: z.string().min(2, 'Ingresá el nombre del cliente').trim(),
  cliente_telefono: z.string().optional().default(''),
  cliente_email: z.string().email().optional().or(z.literal('')),
  entrega: z.enum(['retiro', 'envio']),
  direccion_envio: z.string().optional().default(''),
  nota: z.string().optional().default(''),
  metodo_pago: z.enum(['whatsapp', 'mercadopago', 'efectivo', 'transferencia']),
  sena: z.number().min(0).default(0),
  prioridad: z.boolean().default(false),
  items: z.array(AdminOrderItemSchema).min(1, 'Agregá al menos un producto'),
})

export const StoreCheckoutSchema = z.object({
  cliente_nombre: z.string().min(2, 'Ingresá tu nombre').trim(),
  cliente_telefono: z.string().min(6, 'Ingresá tu teléfono').trim(),
  cliente_email: z.string().email().optional().or(z.literal('')),
  entrega: z.enum(['retiro', 'envio']),
  direccion_envio: z.string().optional().default(''),
  nota: z.string().optional().default(''),
  items: z.array(StoreOrderItemSchema).min(1),
})

export type ManualSaleValues = z.infer<typeof ManualSaleSchema>
export type StoreCheckoutValues = z.infer<typeof StoreCheckoutSchema>
