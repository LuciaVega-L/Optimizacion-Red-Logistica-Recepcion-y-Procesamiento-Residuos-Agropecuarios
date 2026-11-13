import { Link } from 'react-router-dom'
import EstadoVacio from './EstadoVacio.jsx'

// Se muestra cuando la red tiene errores y no se puede resolver.
export default function SinDatos({ errores = [] }) {
  const extra = errores.length - 3
  return (
    <EstadoVacio tono="alerta" icono="alerta" titulo="La red tiene datos por corregir"
      descripcion={`${errores.slice(0, 3).join(' · ')}${extra > 0 ? ` y ${extra} más.` : ''}`}>
      <Link to="/parametrizacion" className="boton boton--primario">Corregir la red</Link>
    </EstadoVacio>
  )
}
