// Guarda la red actual como escenario en la base de datos (POST /escenarios).

import { useState } from 'react'
import { guardarEscenario } from '../../api/historial.js'
import { useNotificaciones } from '../../context/NotificacionesContext.jsx'
import { useRed } from '../../context/RedContext.jsx'
import { useBD } from '../../hooks/useBD.js'
import Boton from '../comunes/Boton.jsx'

export default function GuardarEscenario({ escenarios = [], onGuardado }) {
  const { config, errores, escenario, marcarGuardado } = useRed()
  const bd = useBD()
  const { notificar } = useNotificaciones()
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const estado = escenario.nombre
    ? `Red actual: «${escenario.nombre}»${escenario.modificado ? ', con cambios sin guardar' : ', sin cambios'}.`
    : 'La red actual no está guardada en la base de datos.'

  if (bd.activa === false) {
    return <p className="texto-suave">{estado} Para guardar escenarios hace falta la base de datos (FUENTE_DATOS=bd).</p>
  }

  const limpio = nombre.trim()
  const existente = escenarios.find((e) => (typeof e === 'string' ? e : e.nombre) === limpio)
  const esBase = Boolean(existente?.es_base)

  const guardar = async () => {
    if (existente && !window.confirm(`Ya existe el escenario «${limpio}». ¿Reemplazarlo con la red actual?`)) return
    setGuardando(true); setError(null)
    try {
      await guardarEscenario({ nombre: limpio, config, reemplazar: Boolean(existente) })
      marcarGuardado(limpio)
      notificar(`Escenario «${limpio}» guardado en la base de datos`)
      setNombre('')
      onGuardado?.(limpio)
    } catch (e) { setError(e.message) } finally { setGuardando(false) }
  }

  return (
    <div className="guardar-escenario">
      <p className="texto-suave">{estado}</p>
      <div className="formulario formulario--linea">
        <label className="campo">Guardar como
          <input value={nombre} placeholder="Nombre del escenario" onChange={(e) => setNombre(e.target.value)}
            disabled={guardando || bd.activa === null} />
        </label>
        <Boton variante="secundario" onClick={guardar} cargando={guardando}
          disabled={!limpio || esBase || errores.length > 0 || bd.activa === null}
          title={esBase ? 'El escenario base no se puede reemplazar desde aquí' : undefined}>
          Guardar en BD
        </Boton>
      </div>
      {esBase && <p className="texto-alerta">«{limpio}» es el escenario base: usa otro nombre.</p>}
      {errores.length > 0 && <p className="texto-suave">Corrige los datos marcados antes de guardar.</p>}
      {error && <p className="texto-error">{error}</p>}
    </div>
  )
}
