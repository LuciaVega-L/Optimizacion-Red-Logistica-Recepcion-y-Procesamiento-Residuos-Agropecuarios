// Contenedor visual para resultados/KPIs.
export default function Tarjeta({ titulo, valor, detalle, children, className = '' }) {
  return (
    <section className={`tarjeta ${className}`}>
      {titulo && <h3 className="tarjeta__titulo">{titulo}</h3>}
      {valor !== undefined && <div className="tarjeta__valor">{valor}</div>}
      {detalle && <div className="tarjeta__detalle">{detalle}</div>}
      {children}
    </section>
  )
}
