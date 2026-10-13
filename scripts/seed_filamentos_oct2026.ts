/**
 * Carga de filamentos — compra Octubre 2026
 * Ejecutar: npx tsx scripts/seed_filamentos_oct2026.ts
 *
 * Si el filamento (mismo nombre+color+marca) ya existe → suma rollos al stock.
 * Si no existe → crea el registro nuevo.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const COMPRAS = [
  { nombre: 'PLA+ High Speed',       marca: 'Filanova', tipo: 'Común', material: 'PLA',  color: 'Vermilion Orange', rollos: 3,  costo_kg: 14488 },
  { nombre: 'Chroma PLA+ High Speed', marca: 'Filanova', tipo: 'Común', material: 'PLA',  color: 'Berry Red',        rollos: 5,  costo_kg: 14956 },
  { nombre: 'Chroma PLA+ High Speed', marca: 'Filanova', tipo: 'Común', material: 'PLA',  color: 'Black',            rollos: 20, costo_kg: 14956 },
  { nombre: 'Chroma PLA+ High Speed', marca: 'Filanova', tipo: 'Común', material: 'PLA',  color: 'Green',            rollos: 5,  costo_kg: 14956 },
  { nombre: 'Chroma PLA+ High Speed', marca: 'Filanova', tipo: 'Común', material: 'PLA',  color: 'Grey',             rollos: 4,  costo_kg: 14956 },
  { nombre: 'Chroma PLA+ High Speed', marca: 'Filanova', tipo: 'Común', material: 'PLA',  color: 'Blue',             rollos: 6,  costo_kg: 14956 },
  { nombre: 'Chroma PLA+ High Speed', marca: 'Filanova', tipo: 'Común', material: 'PLA',  color: 'Olive Green',      rollos: 4,  costo_kg: 14956 },
  { nombre: 'Chroma PLA+ High Speed', marca: 'Filanova', tipo: 'Común', material: 'PLA',  color: 'Taro Purple',      rollos: 3,  costo_kg: 14956 },
  { nombre: 'Chroma PLA+ High Speed', marca: 'Filanova', tipo: 'Común', material: 'PLA',  color: 'White',            rollos: 20, costo_kg: 14956 },
  { nombre: 'Chroma PLA+ High Speed', marca: 'Filanova', tipo: 'Común', material: 'PLA',  color: 'Yellow',           rollos: 7,  costo_kg: 14956 },
  { nombre: 'Cosmos PETG HS',         marca: 'GST3D',    tipo: 'Común', material: 'PETG', color: 'Yellow',           rollos: 1,  costo_kg: 12990 },
  { nombre: 'Cosmos PETG HS',         marca: 'GST3D',    tipo: 'Común', material: 'PETG', color: 'Green',            rollos: 1,  costo_kg: 12990 },
  { nombre: 'PLA+ Matte High Speed',  marca: 'Toolbox',  tipo: 'Matte', material: 'PLA',  color: 'Orange',           rollos: 2,  costo_kg: 15990 },
  { nombre: 'PLA+ Matte High Speed',  marca: 'Toolbox',  tipo: 'Matte', material: 'PLA',  color: 'Ruby',             rollos: 8,  costo_kg: 15990 },
  { nombre: 'PLA+ Matte High Speed',  marca: 'Toolbox',  tipo: 'Matte', material: 'PLA',  color: 'Sunshine',         rollos: 3,  costo_kg: 15990 },
  { nombre: 'PLA+ Matte High Speed',  marca: 'Toolbox',  tipo: 'Matte', material: 'PLA',  color: 'Teal',             rollos: 5,  costo_kg: 15990 },
  { nombre: 'PETG High Speed',        marca: 'Filanova',  tipo: 'Común', material: 'PETG', color: 'Black',           rollos: 1,  costo_kg: 12690 },
  { nombre: 'PETG High Speed',        marca: 'Filanova',  tipo: 'Común', material: 'PETG', color: 'White',           rollos: 1,  costo_kg: 12690 },
]

async function run() {
  let creados = 0
  let actualizados = 0

  for (const c of COMPRAS) {
    // Buscar si ya existe
    const { data: existing } = await supabase
      .from('filamentos')
      .select('id, rollos_cerrados')
      .eq('nombre', c.nombre)
      .eq('marca', c.marca)
      .eq('color', c.color)
      .maybeSingle()

    if (existing) {
      // Sumar rollos al stock existente
      const { error } = await supabase
        .from('filamentos')
        .update({
          rollos_cerrados: existing.rollos_cerrados + c.rollos,
          costo_kg: c.costo_kg, // actualizar precio al más reciente
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
      if (error) {
        console.error(`❌ Error actualizando ${c.marca} ${c.nombre} ${c.color}:`, error.message)
      } else {
        console.log(`↑  Actualizado: ${c.marca} ${c.nombre} - ${c.color} (+${c.rollos} rollos)`)
        actualizados++
      }
    } else {
      // Insertar nuevo
      const { error } = await supabase
        .from('filamentos')
        .insert({
          nombre:          c.nombre,
          marca:           c.marca,
          tipo:            c.tipo,
          material:        c.material,
          color:           c.color,
          rollos_cerrados: c.rollos,
          gramos_sueltos:  0,
          peso_rollo_gr:   1000,
          costo_kg:        c.costo_kg,
          nota:            '',
        })
      if (error) {
        console.error(`❌ Error insertando ${c.marca} ${c.nombre} ${c.color}:`, error.message)
      } else {
        console.log(`✓  Creado:      ${c.marca} ${c.nombre} - ${c.color} (${c.rollos} rollos @ $${c.costo_kg}/kg)`)
        creados++
      }
    }
  }

  console.log(`\nListo: ${creados} creados, ${actualizados} actualizados.`)
}

run().catch(console.error)
