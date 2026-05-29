'use client'

import { Download } from 'lucide-react'
import type { Transaction } from '@/lib/supabase/types'
import { EGRESO_CATEGORIA_LABELS } from '@/lib/utils'

export default function ExportCSVButton({ transactions }: { transactions: Transaction[] }) {
  function downloadCSV() {
    const headers = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto']
    const rows = transactions.map((tx) => [
      tx.fecha,
      tx.tipo,
      EGRESO_CATEGORIA_LABELS[tx.categoria as keyof typeof EGRESO_CATEGORIA_LABELS] ?? tx.categoria,
      tx.descripcion ?? '',
      tx.monto,
    ])

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ddd-arg-finanzas-${new Date().toISOString().split('T')[0]}.csv`
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
