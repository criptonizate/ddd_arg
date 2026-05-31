import { z } from 'zod'

export const EgresoSchema = z.object({
  categoria: z.enum([
    'filamento_insumos',
    'electricidad',
    'repuestos_impresora',
    'envios',
    'comisiones',
    'otros',
  ]),
  monto: z
    .number({ message: 'Ingresá un monto válido' })
    .min(0.01, 'El monto debe ser mayor a 0'),
  descripcion: z.string().optional().default(''),
  fecha: z.string().min(1, 'Seleccioná una fecha'),
})

export const IngresoManualSchema = z.object({
  monto: z
    .number({ message: 'Ingresá un monto válido' })
    .min(0.01, 'El monto debe ser mayor a 0'),
  descripcion: z.string().min(1, 'Ingresá una descripción').trim(),
  fecha: z.string().min(1, 'Seleccioná una fecha'),
})

export type EgresoValues = z.infer<typeof EgresoSchema>
export type IngresoManualValues = z.infer<typeof IngresoManualSchema>
