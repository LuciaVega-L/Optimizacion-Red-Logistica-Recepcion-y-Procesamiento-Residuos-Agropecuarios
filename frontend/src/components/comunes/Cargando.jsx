// Indicador de carga mientras el backend resuelve.
export default function Cargando({ texto = 'Resolviendo…' }) {
  return <div className="cargando" role="status"><span className="cargando__punto" />{texto}</div>
}
