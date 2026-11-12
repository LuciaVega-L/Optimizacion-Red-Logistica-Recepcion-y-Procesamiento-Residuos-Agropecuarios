// Guarda una solución en la base de datos y avisa con una notificación.
// Si la base no está activa (FUENTE_DATOS=json) no hace nada ni muestra avisos.
import { useNotificaciones } from '../context/NotificacionesContext.jsx'
import { useRed } from '../context/RedContext.jsx'

export function useRegistroBD() {
  const { registrarSolucion } = useRed()
  const { notificar } = useNotificaciones()

  return async (solucion, extra = {}) => {
    const r = await registrarSolucion(solucion, extra)
    if (r.estado === 'guardado') {
      notificar(`Guardado en la base de datos (${r.resultado.algoritmo_utilizado})`)
    } else if (r.estado === 'sin_guardar') {
      notificar('No se guardó en la base: la red tiene cambios sin guardar. Guárdala como escenario en Parametrización.', 'alerta')
    } else if (r.estado === 'error') {
      notificar(`No se pudo guardar en la base de datos. ${r.mensaje}`, 'error')
    }
    return r
  }
}
