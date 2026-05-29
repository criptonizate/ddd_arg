import { z } from 'zod'

export const OrderItemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid(),
  cantidad: z.number().int().min(1, 'La cantidad mínima es 1'),
  precio_unitario: z.number().min(0),
})

export const ManualSaleSchema = z.object({
  cliente_nombre: z.string().min(2, 'Ingresá el nombre del cliente').trim(),
  cliente_telefono: z.string().min(6, 'Ingresá un teléfono válido').trim(),
  cliente_email: z.string().email().optional().or(z.literal('')),
  entrega: z.enum(['retiro', 'envio']),
  direccion_envio: z.string().optional().default(''),
  nota: z.string().optional().default(''),
  metodo_pago: z.enum(['whatsapp', 'mercadopago', 'efectivo', 'transferencia']),
  items: z.array(OrderItemSchema).min(1, 'Agregá al menos un producto'),
})

export const StoreCheckoutSchema = z.object({
  cliente_nombre: z.string().min(2, 'Ingresá tu nombre').trim(),
  cliente_telefono: z.string().min(6, 'Ingresá tu teléfono').trim(),
  cliente_email: z.string().email().optional().or(z.literal('')),
  entrega: z.enum(['retiro', 'envio']),
  direccion_envio: z.string().optional().default(''),
  nota: z.string().optional().default(''),
  items: z.array(OrderItemSchema).min(1),
})

export type ManualSaleValues = z.infer<typeof ManualSaleSchema>
export type StoreCheckoutValues = z.infer<typeof StoreCheckoutSchema>
