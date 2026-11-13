
export default function Tarjeta({ titulo, valor, detalle, tono, destacada = false, acciones, children, className = '' }) {
  return (
    <section className={`tarjeta ${destacada ? 'tarjeta--destacada' : ''} ${className}`}>
      {(titulo || acciones) && (
        <div className="tarjeta__cabecera">
          {titulo && <h2 className="tarjeta__titulo">{titulo}</h2>}
          {acciones && <div className="tarjeta__acciones no-imprimir">{acciones}</div>}
        </div>
      )}
      {valor !== undefined && <div className={`tarjeta__valor ${tono ? `tarjeta__valor--${tono}` : ''}`}>{valor}</div>}
      {detalle && <div className="tarjeta__detalle">{detalle}</div>}
      {children}
    </section>
  )
}
