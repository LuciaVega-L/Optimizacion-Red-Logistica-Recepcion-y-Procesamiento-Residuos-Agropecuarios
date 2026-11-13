// Guarda una solución (respuesta de /exacto/resolver o /genetico/resolver) en el historial

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { guardarSolucion } from '../../api/historial.js'
import { useNotificaciones } from '../../context/NotificacionesContext.jsx'
import { useRed } from '../../context/RedContext.jsx'
import { useBD } from '../../hooks/useBD.js'
import { porcentaje } from '../../utils/formato.js'
import Boton from '../comunes/Boton.jsx'
import Icono from '../comunes/Icono.jsx'

export default function GuardarResultado({ solucion, extra = {} }) {
  const { escenario } = useRed()
  const bd = useBD()
  const { notificar } = useNotificaciones()
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(null)
  const [error, setError] = useState(null)

  // Una solución nueva se puede guardar de nuevo
  useEffect(() => { setGuardado(null); setError(null) }, [solucion])

  if (!solucion || bd.activa === false) return null
  const sinEscenario = !escenario.nombre || escenario.modificado

  const guardar = async () => {
    setGuardando(true); setError(null)
    try {
      const r = await guardarSolucion(escenario.nombre, solucion, extra)
      setGuardado(r)
      notificar(`Resultado guardado en el historial de «${escenario.nombre}»`)
    } catch (e) { setError(e.message) } finally { setGuardando(false) }
  }

  return (
    <div className="guardar-resultado no-imprimir">
      {guardado ? (
        <p className="texto-ok">
          <Icono nombre="ok" tamano={16} /> Guardado en el historial de «{guardado.escenario ?? escenario.nombre}»
          {guardado.algoritmo_utilizado === 'Genético' && guardado.gap_desviacion != null &&
            ` · gap contra el último exacto: ${porcentaje(guardado.gap_desviacion)}`}.
        </p>
      ) : (
        <>
          <Boton variante="secundario" className="boton--mini" onClick={guardar} cargando={guardando}
            disabled={sinEscenario || bd.activa === null}>
            <Icono nombre="descargar" tamano={16} />Guardar en historial
          </Boton>
          {sinEscenario && (
            <span className="texto-suave">
              {escenario.nombre ? `La red tiene cambios sin guardar respecto a «${escenario.nombre}».` : 'La red no está guardada como escenario.'}
              {' '}<Link to="/parametrizacion">Guárdala en Parametrización</Link> para poder guardar el resultado.
            </span>
          )}
        </>
      )}
      {error && <p className="texto-error">{error}</p>}
    </div>
  )
}
