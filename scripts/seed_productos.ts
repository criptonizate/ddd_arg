/**
 * Seed inicial de productos DDD ARG.
 * Ejecutar una sola vez: npx tsx scripts/seed_productos.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function descuento(precioBase: number, opts: { pct?: number; precioFinal?: number }): number {
  if (opts.precioFinal) {
    return Math.round((1 - opts.precioFinal / precioBase) * 100)
  }
  return opts.pct ?? 0
}

const productos = [
  {
    nombre: 'Virgen del Milagro',
    descripcion: '🙏✨ Llevá tu fe con vos a donde vayas. Llavero con todos los detalles de la Virgen del Milagro, impreso en PLA de alta calidad.',
    categorias: ['Religión', 'Llaveros'],
    precio_base: 3500,
    descuento_mayoreo_pct: descuento(3500, { pct: 10 }),
    variante: 'Único',
    stock: 0,
  },
  {
    nombre: 'Sagrado Corazón de Jesús — Llavero',
    descripcion: '❤️‍🔥🙏 Un clásico de la devoción popular, ahora en formato llavero para acompañarte siempre. Liviano y resistente.',
    categorias: ['Religión', 'Llaveros'],
    precio_base: 1000,
    descuento_mayoreo_pct: descuento(1000, { precioFinal: 800 }),
    variante: 'Único',
    stock: 0,
  },
  {
    nombre: 'Sagrado Corazón de Jesús — Flexible',
    descripcion: '❤️‍🔥✨ Versión flexible con acabado suave al tacto. Perfecto para decorar, regalar o llevar como recuerdo de fe.',
    categorias: ['Religión'],
    precio_base: 2500,
    descuento_mayoreo_pct: descuento(2500, { precioFinal: 2000 }),
    variante: 'Único',
    stock: 0,
  },
  {
    nombre: 'Cubo Anti-stress',
    descripcion: '🧊🔄 6 caras, infinitas posibilidades. El compañero ideal para calmar la ansiedad, concentrarte o simplemente jugar. Impreso en PLA rígido.',
    categorias: ['Sensorial - Anti stress'],
    precio_base: 2500,
    descuento_mayoreo_pct: descuento(2500, { precioFinal: 2000 }),
    variante: 'Único',
    stock: 0,
  },
  {
    nombre: 'Cartel PlayStation',
    descripcion: '🎮⚡ Decoración gamer de nivel. 37cm de pura vibra retro para transformar cualquier rincón de tu cuarto o setup. Altura 8cm.',
    categorias: ['Gamer'],
    precio_base: 20000,
    descuento_mayoreo_pct: descuento(20000, { pct: 10 }),
    variante: 'Único',
    stock: 0,
  },
  {
    nombre: 'Soporte Xbox 360',
    descripcion: '🎮🕹️ Dale un lugar de honor a tu joystick. Diseño sólido y ajuste perfecto para el mando de Xbox 360.',
    categorias: ['Gamer'],
    precio_base: 3500,
    descuento_mayoreo_pct: descuento(3500, { precioFinal: 3200 }),
    variante: 'Único',
    stock: 0,
  },
  {
    nombre: 'Figura Shrek',
    descripcion: '🟢👑 El ogro más querido en versión 3D. Aproximadamente 18cm de pura actitud pantanosa. Ideal para coleccionar o regalar.',
    categorias: ['Figuras y Personajes'],
    precio_base: 5500,
    descuento_mayoreo_pct: 0,
    variante: 'Único',
    stock: 0,
  },
  {
    nombre: 'Burro — Shrek',
    descripcion: '🫏🎉 ¡Soy el burro! El fiel e inseparable compañero de Shrek, ahora en 3D para tu colección. ¿Hacemos el set completo?',
    categorias: ['Figuras y Personajes'],
    precio_base: 6000,
    descuento_mayoreo_pct: 0,
    variante: 'Único',
    stock: 0,
  },
  {
    nombre: 'Cortante Toy Story 5',
    descripcion: '🤠🚀 ¡Al infinito y más allá de tu torta! Cortante temático de Toy Story para galletitas y masas. Para los fans de siempre.',
    categorias: ['Pastelería - Cortadores'],
    precio_base: 1500,
    descuento_mayoreo_pct: descuento(1500, { pct: 20 }),
    variante: 'Único',
    stock: 0,
  },
  {
    nombre: 'Paleta de Pádel + Pelotas',
    descripcion: '🎾🏆 Topping único para tortas de cumpleaños deportivas. Paleta de 13cm de alto con 2 pelotas de pádel de 2cm. ¡Un detalle que sorprende!',
    categorias: ['Pastelería - Cortadores', 'Deportes'],
    precio_base: 9800,
    descuento_mayoreo_pct: descuento(9800, { pct: 10 }),
    variante: 'Único',
    stock: 0,
  },
  {
    nombre: 'Llavero Stitch',
    descripcion: '💙🌺 ¡Ohana significa familia! Llavero de Stitch para los que aman lo kawaii. Terminado suave, colores vibrantes.',
    categorias: ['Llaveros', 'Personalizado'],
    precio_base: 2500,
    descuento_mayoreo_pct: descuento(2500, { pct: 20 }),
    variante: 'Único',
    stock: 0,
  },
  {
    nombre: 'Medallas Personalizadas',
    descripcion: '🏅⭐ Reconocé a quien se lo merece. Personalizables con nombre, fecha o texto. Perfectas para premiaciones, eventos y regalos especiales.',
    categorias: ['Personalizado'],
    precio_base: 2500,
    descuento_mayoreo_pct: descuento(2500, { pct: 20 }),
    variante: 'Único',
    stock: 0,
  },
  {
    nombre: 'Thanos',
    descripcion: '💜⚡ Con el guantelete del infinito puesto y listo para el snap. Figura de aproximadamente 23cm del villano más poderoso del universo Marvel.',
    categorias: ['Figuras y Personajes'],
    precio_base: 20000,
    descuento_mayoreo_pct: descuento(20000, { pct: 10 }),
    variante: 'Único',
    stock: 0,
  },
  {
    nombre: 'Piedra — Proyecto Fin del Mundo',
    descripcion: '🪨🔮 Misteriosa, imponente y única. Aproximadamente 10cm de presencia pura. Ideal para coleccionistas y amantes de lo diferente.',
    categorias: ['Figuras y Personajes'],
    precio_base: 8000,
    descuento_mayoreo_pct: descuento(8000, { pct: 10 }),
    variante: 'Único',
    stock: 0,
  },
]

async function main() {
  console.log(`Importando ${productos.length} productos...`)
  let ok = 0
  for (const p of productos) {
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        nombre: p.nombre,
        descripcion: p.descripcion,
        categoria: p.categorias[0] ?? '',
        categorias: p.categorias,
        precio_base: p.precio_base,
        descuento_mayoreo_pct: p.descuento_mayoreo_pct,
        estado: 'activo',
      })
      .select('id')
      .single()

    if (error || !product) {
      console.error(`  ✗ ${p.nombre}:`, error?.message)
      continue
    }

    await supabase.from('product_variants').insert({
      product_id: product.id,
      nombre_variante: p.variante,
      stock: p.stock,
      stock_minimo: 3,
    })
    console.log(`  ✓ ${p.nombre}`)
    ok++
  }
  console.log(`\nListo: ${ok}/${productos.length} productos importados.`)
}

main()
