// Estado compartido: la red editable (formato dataConfig.json) y los últimos resultados.
// La red se guarda en el navegador para no perder los cambios al recargar.
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { obtenerEscenario } from '../api/red.js'
import { aProblema, balance, validarConfig } from '../utils/red.js'

const RedContext = createContext(null)
const CLAVE = 'ecoresiduos.red'

function leerGuardado() {
  try { return JSON.parse(localStorage.getItem(CLAVE)) } catch { return null }
}

export function RedProvider({ children }) {
  const [config, setConfig] = useState(leerGuardado)
  const [cargando, setCargando] = useState(!config)
  const [error, setError] = useState(null)
  const [resultados, setResultados] = useState({ exacto: null, genetico: null, sensibilidad: null, escalabilidad: null })

  const cargarEscenario = async (nombre = 'dataConfig') => {
    setCargando(true); setError(null)
    try {
      setConfig(await obtenerEscenario(nombre))
      setResultados({ exacto: null, genetico: null, sensibilidad: null, escalabilidad: null })
    } catch (e) { setError(e.message) } finally { setCargando(false) }
  }

  useEffect(() => { if (!config) cargarEscenario() }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (config) { try { localStorage.setItem(CLAVE, JSON.stringify(config)) } catch { /* sin almacenamiento */ } }
  }, [config])

  const valor = useMemo(() => {
    const errores = config ? validarConfig(config) : []
    return {
      config, cargando, error, errores,
      problema: config && !errores.length ? aProblema(config) : null,
      balance: config ? balance(config) : null,
      // Cada cambio en la red invalida los resultados anteriores
      actualizarConfig: (fn) => {
        setConfig((c) => fn(structuredClone(c)))
        setResultados({ exacto: null, genetico: null, sensibilidad: null, escalabilidad: null })
      },
      cargarEscenario,
      resultados,
      guardarResultado: (clave, valor) => setResultados((r) => ({ ...r, [clave]: valor })),
    }
  }, [config, cargando, error, resultados])

  return <RedContext.Provider value={valor}>{children}</RedContext.Provider>
}

export const useRed = () => useContext(RedContext)
