// Estado de carga: una línea de texto corta y, debajo, el esqueleto del contenido que viene.
// children: los esqueletos propios de cada pestaña (si no se pasan, solo se ve el texto).
export default function Cargando({ texto = 'Resolviendo…', children }) {
  return (
    <div className="cargando-bloque" role="status" aria-live="polite" aria-busy="true">
      <div className="cargando"><span className="cargando__punto" aria-hidden="true" />{texto}</div>
      {children}
    </div>
  )
}
