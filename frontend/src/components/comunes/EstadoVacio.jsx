// Estado vacío: qué falta, por qué y la acción que lo resuelve.
// tono: 'neutro' (aún no hay datos) | 'alerta' (no se puede continuar)
import Icono from './Icono.jsx'

export default function EstadoVacio({ titulo, descripcion, icono = 'vacio', tono = 'neutro', compacto = false, children }) {
  return (
    <div className={`estado-vacio estado-vacio--${tono} ${compacto ? 'estado-vacio--compacto' : ''}`}>
      <span className="estado-vacio__icono"><Icono nombre={icono} tamano={compacto ? 20 : 28} /></span>
      <div>
        <p className="estado-vacio__titulo">{titulo}</p>
        {descripcion && <p className="estado-vacio__texto">{descripcion}</p>}
        {children && <div className="estado-vacio__acciones">{children}</div>}
      </div>
    </div>
  )
}
