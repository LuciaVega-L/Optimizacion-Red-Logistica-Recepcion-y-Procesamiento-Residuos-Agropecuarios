// Evolución del mejor costo (o fitness) del AG por generación, con la línea del óptimo exacto.
import { Line } from 'react-chartjs-2'
import { COLORES, millones } from './registro.js'

export default function GraficaConvergencia({ historial, optimo, etiqueta = 'Mejor valor por generación' }) {
  if (!historial?.length) return <p className="texto-suave">El AG no devolvió historial de convergencia.</p>
  const series = [{ label: etiqueta, data: historial, borderColor: COLORES.genetico, pointRadius: 0, borderWidth: 2 }]
  if (optimo) series.push({ label: 'Óptimo exacto', data: historial.map(() => optimo), borderColor: COLORES.exacto, borderDash: [6, 4], pointRadius: 0 })
  return (
    <div className="grafica">
      <Line data={{ labels: historial.map((_, k) => k + 1), datasets: series }} options={{
        responsive: true, maintainAspectRatio: false, animation: false,
        scales: { x: { title: { display: true, text: 'Generación' } },
          y: { ticks: { callback: (v) => (Math.abs(v) >= 1e5 ? millones(v) : v) } } },
      }} />
    </div>
  )
}
