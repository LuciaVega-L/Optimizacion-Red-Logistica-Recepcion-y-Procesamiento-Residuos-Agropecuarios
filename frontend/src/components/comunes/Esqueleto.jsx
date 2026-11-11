// Esqueletos de carga: muestran la forma del contenido que viene (KPIs, tablas, gráficas)
// en lugar de dejar la pestaña vacía. Son decorativos (aria-hidden); el texto para lectores
// de pantalla lo pone el contenedor <Cargando>.

export function Esqueleto({ ancho = '100%', alto = '1rem', redondo = false, className = '' }) {
  return (
    <span className={`esqueleto ${redondo ? 'esqueleto--redondo' : ''} ${className}`}
      style={{ width: ancho, height: alto }} aria-hidden="true" />
  )
}

export function EsqueletoKpis({ cantidad = 4 }) {
  return (
    <div className="kpis" aria-hidden="true">
      {Array.from({ length: cantidad }, (_, k) => (
        <div key={k} className="tarjeta">
          <Esqueleto ancho="45%" alto="0.75rem" />
          <Esqueleto ancho="75%" alto="1.75rem" className="esqueleto--separado" />
        </div>
      ))}
    </div>
  )
}

export function EsqueletoTabla({ filas = 6, columnas = 5, titulo = true }) {
  return (
    <div className="tarjeta" aria-hidden="true">
      {titulo && <Esqueleto ancho="35%" alto="1rem" className="esqueleto--titulo" />}
      <div className="esqueleto-tabla" style={{ gridTemplateColumns: `1.4fr repeat(${columnas - 1}, 1fr)` }}>
        {Array.from({ length: columnas }, (_, k) => <Esqueleto key={`c${k}`} alto="0.75rem" ancho="60%" />)}
        {Array.from({ length: filas * columnas }, (_, k) => (
          <Esqueleto key={k} alto="0.875rem" ancho={k % columnas === 0 ? '70%' : '85%'} />
        ))}
      </div>
    </div>
  )
}

export function EsqueletoGrafica({ alto = 280, titulo = true }) {
  const barras = [55, 80, 40, 95, 65, 75, 50]
  return (
    <div className="tarjeta" aria-hidden="true">
      {titulo && <Esqueleto ancho="30%" alto="1rem" className="esqueleto--titulo" />}
      <div className="esqueleto-grafica" style={{ height: alto }}>
        {barras.map((h, k) => <Esqueleto key={k} alto={`${h}%`} ancho="100%" />)}
      </div>
    </div>
  )
}

export function EsqueletoTarjetas({ cantidad = 5 }) {
  return (
    <div className="rejilla" aria-hidden="true">
      {Array.from({ length: cantidad }, (_, k) => (
        <div key={k} className="tarjeta">
          <Esqueleto ancho="50%" alto="1rem" />
          <Esqueleto ancho="90%" alto="0.75rem" className="esqueleto--separado" />
          <Esqueleto ancho="70%" alto="0.75rem" className="esqueleto--separado-sm" />
        </div>
      ))}
    </div>
  )
}
