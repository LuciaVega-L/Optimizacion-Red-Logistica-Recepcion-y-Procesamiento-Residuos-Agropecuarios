
export default function EncabezadoPagina({ titulo, descripcion, children }) {
  return (
    <header className="encabezado">
      <div className="encabezado__texto">
        <h1>{titulo}</h1>
        {descripcion && <p className="encabezado__descripcion">{descripcion}</p>}
      </div>
      {children && <div className="acciones no-imprimir">{children}</div>}
    </header>
  )
}
