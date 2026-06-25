'use client'

import { useState, useTransition } from 'react'
import { addOrderEvent, getOrderEvents, deleteOrderEvent } from '@/lib/actions/order-events'
import type { OrderEvent } from '@/lib/actions/order-events'
import { ChevronDown, ChevronUp, Send, Trash2, MessageSquare } from 'lucide-react'

interface Props {
  orderId: string
}

export default function OrderEventLog({ orderId }: Props) {
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<OrderEvent[]>([])
  const [loaded, setLoaded] = useState(false)
  const [texto, setTexto] = useState('')
  const [isPending, startTransition] = useTransition()

  async function handleOpen() {
    setOpen((v) => !v)
    if (!loaded) {
      const data = await getOrderEvents(orderId)
      setEvents(data)
      setLoaded(true)
    }
  }

  function handleAdd() {
    if (!texto.trim()) return
    const t = texto.trim()
    setTexto('')
    startTransition(async () => {
      const res = await addOrderEvent(orderId, t)
      if (res.ok) {
        const fresh = await getOrderEvents(orderId)
        setEvents(fresh)
      }
    })
  }

  async function handleDelete(id: string) {
    await deleteOrderEvent(id)
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="border-t border-border pt-2 mt-2">
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageSquare size={11} />
        Log de eventos
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {/* Input nuevo evento */}
          <div className="flex gap-2">
            <input
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Agregar nota o evento..."
              className="flex-1 text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleAdd}
              disabled={isPending || !texto.trim()}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Send size={11} />
            </button>
          </div>

          {/* Lista de eventos */}
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">Sin eventos registrados</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {events.map((ev) => (
                <div key={ev.id} className="flex items-start justify-between gap-2 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs">{ev.descripcion}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ev.created_at).toLocaleDateString('es-AR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(ev.id)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
