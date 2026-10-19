import { getFilamentosDisponibles } from '@/lib/actions/filamentos'
import type { Filamento } from '@/lib/filamentos-helpers'

export const metadata = { title: 'Filamentos disponibles — DDD ARG' }
export const dynamic = 'force-dynamic'

function colorToCss(color: string): string {
  const c = color.toLowerCase()
  if (c.includes('black'))                            return '#111111'
  if (c.includes('white'))                            return '#f5f5f5'
  if (c.includes('grey') || c.includes('gray'))       return '#9ca3af'
  if (c.includes('vermilion') || c.includes('ruby'))  return '#c0392b'
  if (c.includes('berry') || c.includes('red'))       return '#e53e3e'
  if (c.includes('blue'))                             return '#3b82f6'
  if (c.includes('teal'))                             return '#14b8a6'
  if (c.includes('olive'))                            return '#84a830'
  if (c.includes('green'))                            return '#22c55e'
  if (c.includes('yellow') || c.includes('sunshine')) return '#eab308'
  if (c.includes('orange'))                           return '#f97316'
  if (c.includes('taro') || c.includes('purple'))     return '#a855f7'
  if (c.includes('pink'))                             return '#ec4899'
  if (c.includes('brown') || c.includes('madera'))    return '#92400e'
  if (c.includes('silk') || c.includes('gold'))       return '#d97706'
  return '#94a3b8'
}

function shortNombre(nombre: string): string {
  return nombre.replace(/\s+high\s+speed\b/gi, '').replace(/\s+hs\b/gi, '').trim()
}

function totalGramos(f: Pick<Filamento, 'rollos_cerrados' | 'gramos_sueltos' | 'peso_rollo_gr'>): number {
  return f.rollos_cerrados * f.peso_rollo_gr + f.gramos_sueltos
}

function stockBadge(f: Pick<Filamento, 'rollos_cerrados' | 'gramos_sueltos' | 'peso_rollo_gr'>): { label: string; cls: string } {
  const rollos = f.rollos_cerrados
  if (rollos >= 5) return { label: 'Disponible', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' }
  if (rollos >= 2) return { label: 'Pocas unidades', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' }
  return { label: 'Última unidad', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' }
}

const MATERIAL_BADGE: Record<string, string> = {
  PLA:  'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
  PETG: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  TPU:  'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
  ABS:  'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
  ASA:  'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
  Otro: 'bg-secondary text-muted-foreground border-border',
}

export default async function FilamentosPage() {
  const filamentos = await getFilamentosDisponibles()

  const grupos = ['PLA', 'PETG', 'TPU', 'ABS', 'ASA', 'Otro']
    .map(mat => ({ mat, items: filamentos.filter(f => f.material === mat) }))
    .filter(g => g.items.length > 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Filamentos disponibles</h1>
        <p className="text-muted-foreground text-sm">
          Stock actualizado. Todos los colores disponibles para tu próxima impresión.
        </p>
      </div>

      {filamentos.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <p className="text-5xl mb-4">🎨</p>
          <p className="text-lg font-medium">Consultá disponibilidad</p>
          <p className="text-sm mt-1">Escribinos por WhatsApp para saber qué colores tenemos.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {grupos.map(({ mat, items }) => (
            <section key={mat}>
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${MATERIAL_BADGE[mat] ?? MATERIAL_BADGE.Otro}`}>
                  {mat}
                </span>
                <span className="text-sm text-muted-foreground">{items.length} color{items.length !== 1 ? 'es' : ''}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {items.map(f => {
                  const badge = stockBadge(f)
                  const kgDisp = (totalGramos(f) / 1000).toFixed(1)
                  return (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:border-foreground/20 transition-colors"
                    >
                      {/* Color dot */}
                      <span
                        className="w-8 h-8 rounded-full shrink-0 border border-black/10 shadow-sm"
                        style={{ backgroundColor: colorToCss(f.color) }}
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{f.color}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {f.marca} · {shortNombre(f.nombre)}
                        </p>
                      </div>

                      {/* Stock */}
                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {f.rollos_cerrados > 0 ? `${f.rollos_cerrados} rol · ` : ''}{kgDisp} kg
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="mt-14 text-center py-10 bg-secondary/30 rounded-2xl border border-border">
        <p className="text-base font-semibold mb-1">¿No encontrás el color que buscás?</p>
        <p className="text-sm text-muted-foreground mb-5">Escribinos y te avisamos cuando llegue o conseguimos el color para vos.</p>
        <a
          href="https://wa.me/5493834000000?text=Hola!%20Vi%20el%20stock%20de%20filamentos%20y%20quería%20consultar."
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5a] text-white rounded-xl px-6 py-3 text-sm font-semibold shadow-sm transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.936.53 3.744 1.452 5.29L2.046 22l4.799-1.396A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 11.999 2zm.001 18a7.96 7.96 0 01-4.073-1.117l-.291-.174-3.028.881.86-3.105-.19-.3A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
          </svg>
          Consultar por WhatsApp
        </a>
      </div>
    </div>
  )
}
