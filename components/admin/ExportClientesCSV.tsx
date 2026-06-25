'use client'

import { Download } from 'lucide-react'

interface Cliente {
  nombre: string
  telefono?: string | null
  email?: string | null
  direccion?: string | null
  totalPedidos: number
  totalPagado: number
  totalPendiente: number
}

export default function ExportClientesCSV({ clientes }: { clientes: Cliente[] }) {
  function downloadCSV() {
    const headers = ['Nombre', 'Teléfono', 'Email', 'Dirección', 'Pedidos', 'Total pagado', 'Pendiente']
    const rows = clientes.map((c) => [
      c.nombre,
      c.telefono ?? '',
      c.email ?? '',
      c.direccion ?? '',
      c.totalPedidos,
      c.totalPagado,
      c.totalPendiente,
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ddd-arg-clientes-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={downloadCSV}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors"
    >
      <Download size={16} />
      Exportar CSV
    </button>
  )
}
