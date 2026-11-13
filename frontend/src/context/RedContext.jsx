// Estado compartido: la red editable (formato dataConfig.json) y los últimos resultados.
// La red se guarda en el navegador para no perder los cambios al recargar.
// `escenario` = { nombre, modificado }: de qué escenario guardado viene la red y si se editó
// después. Los resultados solo se pueden guardar en la BD contra un escenario sin cambios.
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { obtenerEscenario } from '../api/red.js'
import { aProblema, balance, validarConfig, normalizarConfig } from '../utils/red.js'

const RedContext = createContext(null)
const CLAVE = 'ecoresiduos.red'
const CLAVE_ESCENARIO = 'ecoresiduos.escenario'
const SIN_ESCENARIO = { nombre: null, modificado: true }

function leerGuardado() {
  try { return normalizarConfig(JSON.parse(localStorage.getItem(CLAVE))) } catch { return null }
}

function leerEscenario() {
  try {
    const e = JSON.parse(localStorage.getItem(CLAVE_ESCENARIO))
    return e && typeof e === 'object' ? { nombre: e.nombre ?? null, modificado: Boolean(e.modificado) } : SIN_ESCENARIO
  } catch { return SIN_ESCENARIO }
}

export function RedProvider({ children }) {
  const [config, setConfig] = useState(leerGuardado)
  const [escenario, setEscenario] = useState(leerEscenario)
  const [cargando, setCargando] = useState(!config)
  const [error, setError] = useState(null)
  const [resultados, setResultados] = useState({ exacto: null, genetico: null, sensibilidad: null, escalabilidad: null })

  // Devuelve true si el escenario se cargó; si falla, deja el mensaje en `error`.
  const cargarEscenario = async (nombre = 'dataConfig') => {
    setError(null)
    if (!config) setCargando(true)
    try {
      const cfg = normalizarConfig(await obtenerEscenario(nombre))
      if (!cfg) throw new Error('El escenario recibido no tiene el formato esperado')
      setConfig(cfg)
      setEscenario({ nombre, modificado: false })
      setResultados({ exacto: null, genetico: null, sensibilidad: null, escalabilidad: null })
      return true
    } catch (e) { setError(e.message); return false } finally { setCargando(false) }
  }

  useEffect(() => { if (!config) cargarEscenario() }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (config) { try { localStorage.setItem(CLAVE, JSON.stringify(config)) } catch { /* sin almacenamiento */ } }
  }, [config])
  useEffect(() => {
    try { localStorage.setItem(CLAVE_ESCENARIO, JSON.stringify(escenario)) } catch { /* sin almacenamiento */ }
  }, [escenario])

  const valor = useMemo(() => {
    const errores = config ? validarConfig(config) : []
    return {
      config, cargando, error, errores, escenario,
      problema: config && !errores.length ? aProblema(config) : null,
      balance: config ? balance(config) : null,
      // Cada cambio en la red invalida los resultados anteriores
      actualizarConfig: (fn) => {
        setConfig((c) => fn(structuredClone(c)))
        setEscenario((e) => (e.modificado ? e : { ...e, modificado: true }))
        setResultados({ exacto: null, genetico: null, sensibilidad: null, escalabilidad: null })
      },
      cargarEscenario,
      // Tras guardar la red en la BD con ese nombre: la red actual ES ese escenario
      marcarGuardado: (nombre) => setEscenario({ nombre, modificado: false }),
      resultados,
      guardarResultado: (clave, valor) => setResultados((r) => ({ ...r, [clave]: valor })),
    }
  }, [config, cargando, error, resultados, escenario])

  return <RedContext.Provider value={valor}>{children}</RedContext.Provider>
}

export const useRed = () => useContext(RedContext)
