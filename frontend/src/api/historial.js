// Historial en base de datos: escenarios guardados y resultados de cada ejecución.
// Requiere FUENTE_DATOS=bd en backend/.env (si no, el backend responde 503).
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

// datos = { nombre, config (formato dataConfig.json), descripcion?, reemplazar? }
export const guardarEscenario = (datos) =>
  peticion('/escenarios', { metodo: 'POST', cuerpo: datos })

// datos = { nuevo, variaciones?, descripcion? }
export const clonarEscenario = (nombre, datos) =>
  peticion(`/escenarios/${n(nombre)}/clonar`, { metodo: 'POST', cuerpo: datos })

export const eliminarEscenario = (nombre) =>
  peticion(`/escenarios/${n(nombre)}`, { metodo: 'DELETE' })

// ---------------------------------------------------------------- resultados
// datos = { escenario, algoritmo_utilizado: 'Exacto' | 'Genético', costo_total,
//           tiempo_ejecucion_ms, matriz_flujos: [[...]], factible?, parametros_algoritmo?,
//           historial_fitness?, precios_sombra_oferta?, precios_sombra_demanda? }
export const guardarResultado = (datos) =>
  peticion('/resultados', { metodo: 'POST', cuerpo: datos })

// filtros = { escenario?, algoritmo?, limite?, incluir_matriz? }
export const listarResultados = (filtros = {}) => peticion(`/resultados${q(filtros)}`)
export const obtenerResultado = (id) => peticion(`/resultados/${id}`)

// último Exacto vs. último Genético por escenario (costo, tiempo y gap)
export const obtenerComparativo = (escenario) => peticion(`/resultados/comparativo${q({ escenario })}`)

// Atajo: convierte la respuesta de /exacto/resolver o /genetico/... y la guarda.
export const guardarSolucion = (escenario, solucion, extra = {}) =>
  guardarResultado({
    escenario,
    algoritmo_utilizado: solucion.metodo,
    costo_total: solucion.costo_total,
    tiempo_ejecucion_ms: solucion.tiempo_s * 1000,
    matriz_flujos: solucion.asignacion,
    factible: solucion.factible,
    historial_fitness: solucion.historial_fitness,
    precios_sombra_oferta: solucion.precios_sombra_oferta,
    precios_sombra_demanda: solucion.precios_sombra_demanda,
    ...extra,
  })
