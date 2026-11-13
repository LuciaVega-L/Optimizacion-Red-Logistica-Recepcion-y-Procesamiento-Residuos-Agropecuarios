// Variación del costo óptimo (%) en cada escenario simulado, frente al caso base.
import { Bar } from 'react-chartjs-2'
import { COLORES } from './registro.js'

export default function GraficaSensibilidad({ escenarios }) {
  const validos = escenarios.filter((e) => !e.error)
  const datos = validos.map((e) => e.variacion_costo_pct)
  return (
    <div className="grafica">
      <Bar role="img"
        aria-label={`Variación de Z* por escenario: ${validos.map((e) => `${e.nombre} ${e.variacion_costo_pct.toFixed(2)} %`).join('; ')}`}
        data={{
        labels: validos.map((e) => e.nombre),
        datasets: [{
          label: 'Variación de Z* frente al caso base (%)', data: datos,
          backgroundColor: datos.map((v) => (v > 0 ? COLORES.negativo : COLORES.exacto)),
        }],
      }} options={{
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false },
          tooltip: { callbacks: { label: (c) => `${c.raw.toFixed(2)} %` } } },
        scales: { x: { title: { display: true, text: 'Variación de Z* (%)' } } },
      }} />
    </div>
  )
}
