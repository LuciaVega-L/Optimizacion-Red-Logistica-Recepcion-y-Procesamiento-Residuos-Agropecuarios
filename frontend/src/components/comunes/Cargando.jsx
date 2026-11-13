
export default function Cargando({ texto = 'Resolviendo…', children }) {
  return (
    <div className="cargando-bloque" role="status" aria-live="polite" aria-busy="true">
      <div className="cargando"><span className="cargando__punto" aria-hidden="true" />{texto}</div>
      {children}
    </div>
  )
}
