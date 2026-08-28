import { z } from 'zod'

export const ProductSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').trim(),
  descripcion: z.string().optional().default(''),
  precio_base: z
    .number({ message: 'Ingresá un precio válido' })
    .min(0, 'El precio no puede ser negativo'),
  descuento_mayoreo_pct: z
    .number()
    .min(0)
    .max(99)
    .default(0),
  categoria: z.string().optional().default(''),
  categorias: z.array(z.string()).default([]),
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
    .number({ message: 'Ingresá stock válido' })
    .int()
    .min(0, 'El stock no puede ser negativo'),
  stock_minimo: z
    .number({ message: 'Ingresá stock mínimo válido' })
    .int()
    .min(0)
    .default(3),
})

export type ProductFormValues = z.infer<typeof ProductSchema>
export type VariantFormValues = z.infer<typeof VariantSchema>
