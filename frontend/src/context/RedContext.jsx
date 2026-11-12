// Estado compartido: la red editable (formato dataConfig.json) y los últimos resultados.
// La red se guarda en el navegador para no perder los cambios al recargar.
//
// Base de datos: los resultados se guardan en la tabla `resultados` asociados a un
// escenario. El backend los valida contra la red GUARDADA de ese escenario, así que solo
// se registran cuando la red en pantalla es la misma que se cargó o guardó por última vez.
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { guardarEscenario, guardarSolucion } from '../api/historial.js'
import { peticion } from '../api/cliente.js'
import { obtenerEscenario } from '../api/red.js'
import { aProblema, balance, validarConfig, normalizarConfig } from '../utils/red.js'

const RedContext = createContext(null)
const CLAVE = 'ecoresiduos.red'
const CLAVE_ESCENARIO = 'ecoresiduos.escenario'   // { nombre, firma } de la red cargada o guardada
const SIN_RESULTADOS = { exacto: null, genetico: null, sensibilidad: null, escalabilidad: null }

const firmar = (config) => JSON.stringify(config)

function leer(clave, normalizar = (x) => x) {
  try { return normalizar(JSON.parse(localStorage.getItem(clave))) } catch { return null }
}
function escribir(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)) } catch { /* sin almacenamiento */ }
}

// true = base activa, false = FUENTE_DATOS no es bd (503), null = no se pudo saber (backend caído)
async function detectarBD() {
  try { await peticion('/escenarios'); return true } catch (e) { return e.status === 503 ? false : null }
}

export function RedProvider({ children }) {
  const [config, setConfig] = useState(() => leer(CLAVE, normalizarConfig))
  const [escenario, setEscenario] = useState(() => leer(CLAVE_ESCENARIO))
  const [cargando, setCargando] = useState(!config)
  const [error, setError] = useState(null)
  const [resultados, setResultados] = useState(SIN_RESULTADOS)
  const [bdActiva, setBdActiva] = useState(null)

  const fijarEscenario = (nombre, cfg) => {
    const e = { nombre, firma: firmar(cfg) }
    setEscenario(e)
    escribir(CLAVE_ESCENARIO, e)
  }

  // Devuelve true si el escenario se cargó; si falla, deja el mensaje en `error`.
  const cargarEscenario = async (nombre = 'dataConfig') => {
    setError(null)
    if (!config) setCargando(true)
    try {
      const cfg = normalizarConfig(await obtenerEscenario(nombre))
      if (!cfg) throw new Error('El escenario recibido no tiene el formato esperado')
      setConfig(cfg)
      fijarEscenario(nombre, cfg)
      setResultados(SIN_RESULTADOS)
      return true
    } catch (e) { setError(e.message); return false } finally { setCargando(false) }
  }

  useEffect(() => { if (!config) cargarEscenario() }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { detectarBD().then(setBdActiva) }, [])
  useEffect(() => { if (config) escribir(CLAVE, config) }, [config])

  const valor = useMemo(() => {
    const errores = config ? validarConfig(config) : []
    const sinGuardar = !escenario || !config || firmar(config) !== escenario.firma

    // Guarda la red actual como escenario en la base. Lanza el error del backend
    // (409 si ya existe y no se pidió reemplazar).
    const guardarRed = async ({ nombre, descripcion, reemplazar = false }) => {
      await guardarEscenario({ nombre, config, descripcion: descripcion || undefined, reemplazar })
      fijarEscenario(nombre, config)
      setBdActiva(true)
    }

    // Registra una solución (respuesta de /exacto/resolver o /genetico/resolver) en la base.
    // Nunca lanza: devuelve { estado: 'guardado' | 'sin_bd' | 'sin_guardar' | 'error', ... }.
    const registrarSolucion = async (solucion, extra = {}) => {
      let activa = bdActiva
      if (activa === null) { activa = await detectarBD(); setBdActiva(activa) }
      if (!activa) return { estado: 'sin_bd' }
      if (sinGuardar) return { estado: 'sin_guardar' }
      try {
        return { estado: 'guardado', resultado: await guardarSolucion(escenario.nombre, solucion, extra) }
      } catch (e) {
        if (e.status === 503) setBdActiva(false)
        return { estado: 'error', mensaje: e.message }
      }
    }

    return {
      config, cargando, error, errores,
      problema: config && !errores.length ? aProblema(config) : null,
      balance: config ? balance(config) : null,
      // Cada cambio en la red invalida los resultados anteriores
      actualizarConfig: (fn) => {
        setConfig((c) => fn(structuredClone(c)))
        setResultados(SIN_RESULTADOS)
      },
      cargarEscenario,
      resultados,
      guardarResultado: (clave, valor) => setResultados((r) => ({ ...r, [clave]: valor })),
      // Base de datos
      bdActiva,
      escenario: escenario?.nombre ?? null,
      sinGuardar,
      guardarRed,
      registrarSolucion,
    }
  }, [config, cargando, error, resultados, escenario, bdActiva])  // eslint-disable-line react-hooks/exhaustive-deps

  return <RedContext.Provider value={valor}>{children}</RedContext.Provider>
}

export const useRed = () => useContext(RedContext)
