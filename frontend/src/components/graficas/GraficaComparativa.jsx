// Barras agrupadas: compara exacto vs. genético en una métrica (costo, tiempo…) por categoría.
import { Bar } from 'react-chartjs-2'
import { COLORES } from './registro.js'

export default function GraficaComparativa({ etiquetas, exacto, genetico, tituloEje, formato = (v) => v, logaritmica = false }) {
  const series = [{ label: 'Exacto', data: exacto, backgroundColor: COLORES.exacto }]
  if (genetico?.some((v) => v !== null && v !== undefined)) {
    series.push({ label: 'Algoritmo genético', data: genetico, backgroundColor: COLORES.genetico })
  }
  return (
    <div className="grafica">
      <Bar role="img"
        aria-label={`${tituloEje ?? 'Comparación'}: ${etiquetas.map((e, k) => `${e}, exacto ${formato(exacto[k])}${genetico?.[k] != null ? `, AG ${formato(genetico[k])}` : ''}`).join('; ')}`}
        data={{ labels: etiquetas, datasets: series }} options={{
        responsive: true, maintainAspectRatio: false,
        plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formato(c.raw)}` } } },
        scales: { y: { type: logaritmica ? 'logarithmic' : 'linear', title: { display: !!tituloEje, text: tituloEje },
          ticks: { callback: (v) => formato(v) } } },
      }} />
    </div>
  )
}
