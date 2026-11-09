import { Link } from 'react-router-dom'
import Aviso from './Aviso.jsx'

// Se muestra cuando la red tiene errores y no se puede resolver.
export default function SinDatos({ errores }) {
  return (
    <Aviso tipo="alerta" titulo="La red tiene errores de datos" mensajes={errores.slice(0, 6)}>
      <p>Corrígelos en <Link to="/parametrizacion">Parametrización</Link> antes de resolver.</p>
    </Aviso>
  )
}
