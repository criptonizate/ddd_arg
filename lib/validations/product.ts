import { z } from 'zod'

export const ProductSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').trim(),
  descripcion: z.string().optional().default(''),
  precio_base: z
    .number({ invalid_type_error: 'Ingresá un precio válido' })
    .min(0, 'El precio no puede ser negativo'),
  categoria: z.string().optional().default(''),
  estado: z.enum(['activo', 'pausado']).default('activo'),
})

export const VariantSchema = z.object({
  nombre_variante: z
    .string()
    .min(1, 'El nombre de la variante es requerido')
    .trim(),
  color: z.string().optional().default(''),
  tamaño: z.string().optional().default(''),
  precio: z.number().nullable().optional(),
  stock: z
    .number({ invalid_type_error: 'Ingresá stock válido' })
    .int()
    .min(0, 'El stock no puede ser negativo'),
  stock_minimo: z
    .number({ invalid_type_error: 'Ingresá stock mínimo válido' })
    .int()
    .min(0)
    .default(3),
})

export type ProductFormValues = z.infer<typeof ProductSchema>
export type VariantFormValues = z.infer<typeof VariantSchema>
