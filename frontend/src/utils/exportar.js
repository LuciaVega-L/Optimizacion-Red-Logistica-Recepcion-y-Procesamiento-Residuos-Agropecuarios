// Exportación de resultados (HU6). CSV con ';' para que Excel en español lo abra bien.
const celda = (v) => {
  if (v === null || v === undefined) return ''
  const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v)
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function descargarCSV(nombre, encabezados, filas) {
  const texto = [encabezados, ...filas].map((f) => f.map(celda).join(';')).join('\n')
  const blob = new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre.endsWith('.csv') ? nombre : `${nombre}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// PDF: se usa el diálogo de impresión del navegador ("Guardar como PDF").
export const exportarPDF = () => window.print()
