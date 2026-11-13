import { peticion } from './cliente.js'

const q = (params) => {
  const limpio = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
  const s = new URLSearchParams(limpio).toString()
  return s ? `?${s}` : ''
}
const n = (nombre) => encodeURIComponent(nombre)

// ---------------------------------------------------------------- escenarios
export const listarHistorialEscenarios = () => peticion('/escenarios')
export const obtenerEscenarioGuardado = (nombre) => peticion(`/escenarios/${n(nombre)}`)
export const obtenerConfigEscenario = (nombre) => peticion(`/escenarios/${n(nombre)}/config`)

export const guardarEscenario = (datos) =>
  peticion('/escenarios', { metodo: 'POST', cuerpo: datos })

export const clonarEscenario = (nombre, datos) =>
  peticion(`/escenarios/${n(nombre)}/clonar`, { metodo: 'POST', cuerpo: datos })

export const eliminarEscenario = (nombre) =>
  peticion(`/escenarios/${n(nombre)}`, { metodo: 'DELETE' })

export const guardarResultado = (datos) =>
  peticion('/resultados', { metodo: 'POST', cuerpo: datos })


export const listarResultados = (filtros = {}) => peticion(`/resultados${q(filtros)}`)
export const obtenerResultado = (id) => peticion(`/resultados/${id}`)

export const obtenerComparativo = (escenario) => peticion(`/resultados/comparativo${q({ escenario })}`)

const ALGORITMO_BD = { exacto: 'Exacto', genetico: 'Genético', 'genético': 'Genético' }
const normalizarAlgoritmo = (m) => ALGORITMO_BD[String(m ?? '').trim().toLowerCase()] ?? m

export const guardarSolucion = (escenario, solucion, extra = {}) =>
  guardarResultado({
    escenario,
    algoritmo_utilizado: normalizarAlgoritmo(solucion.metodo),
    costo_total: solucion.costo_total,
    tiempo_ejecucion_ms: solucion.tiempo_s * 1000,
    matriz_flujos: solucion.asignacion,
    factible: solucion.factible,
    historial_fitness: solucion.historial_fitness,
    precios_sombra_oferta: solucion.precios_sombra_oferta,
    precios_sombra_demanda: solucion.precios_sombra_demanda,
    ...extra,
  })