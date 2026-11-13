// ¿Está activa la base de datos? El historial (/escenarios, /resultados) responde 503 con
// FUENTE_DATOS=json, así que se consulta una sola vez y la respuesta se comparte entre páginas.
// activa: null mientras se averigua, true / false después. recargar() vuelve a preguntar.
import { useEffect, useState } from 'react'
import { listarHistorialEscenarios } from '../api/historial.js'

let consulta = null

function consultar() {
  if (!consulta) {
    consulta = listarHistorialEscenarios()
      .then((escenarios) => ({ activa: true, escenarios }))
      .catch((e) => ({ activa: false, motivo: e.message }))
  }
  return consulta
}

export function useBD() {
  const [estado, setEstado] = useState({ activa: null, escenarios: [], motivo: null })

  const cargar = () => consultar().then((r) => setEstado({ escenarios: [], motivo: null, ...r }))
  useEffect(() => { cargar() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...estado,
    recargar: () => { consulta = null; return cargar() },
  }
}
