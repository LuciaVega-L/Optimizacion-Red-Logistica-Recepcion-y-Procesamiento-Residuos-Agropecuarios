// Evolución del mejor costo del AG por generación (0 = población inicial), con la línea del óptimo exacto.
import { Line } from 'react-chartjs-2'
import { COLORES, millones } from './registro.js'

export default function GraficaConvergencia({ historial, optimo, etiqueta = 'Mejor valor por generación' }) {
  if (!historial?.length) return <p className="texto-suave">El AG no devolvió historial de convergencia.</p>
  const series = [{ label: etiqueta, data: historial, borderColor: COLORES.genetico, pointRadius: 0, borderWidth: 2 }]
  if (optimo) series.push({ label: 'Óptimo exacto', data: historial.map(() => optimo), borderColor: COLORES.exacto, borderDash: [6, 4], pointRadius: 0 })
  return (
    <div className="grafica">
      <Line role="img" aria-label={`${etiqueta} de la generación 0 a la ${historial.length - 1}: de ${Number(historial[0]).toPrecision(4)} a ${Number(historial[historial.length - 1]).toPrecision(4)}`}
        data={{ labels: historial.map((_, k) => k), datasets: series }} options={{
        responsive: true, maintainAspectRatio: false, animation: false,
        scales: { x: { title: { display: true, text: 'Generación' } },
          y: { ticks: { callback: (v) => (Math.abs(v) >= 1e5 ? millones(v) : v) } } },
      }} />
    </div>
  )
}
