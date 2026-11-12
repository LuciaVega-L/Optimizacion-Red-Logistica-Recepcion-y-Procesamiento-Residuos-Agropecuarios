// Historial guardado en la base de datos para un escenario:
// el último Exacto vs. el último Genético (con gap) y las ejecuciones más recientes.
import { useCallback, useEffect, useState } from 'react'
import { listarResultados, obtenerComparativo } from '../api/historial.js'

export function useHistorialBD(escenario, bdActiva, limite = 10) {
  const [datos, setDatos] = useState({ comparativo: null, resultados: [] })
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const recargar = useCallback(async () => {
    if (!bdActiva || !escenario) { setDatos({ comparativo: null, resultados: [] }); return }
    setCargando(true); setError(null)
    try {
      const [comp, res] = await Promise.all([
        obtenerComparativo(escenario),
        listarResultados({ escenario, limite }),
      ])
      setDatos({ comparativo: comp[0] ?? null, resultados: res })
    } catch (e) { setError(e.message) } finally { setCargando(false) }
  }, [escenario, bdActiva, limite])

  useEffect(() => { recargar() }, [recargar])

  return { ...datos, cargando, error, recargar }
}
